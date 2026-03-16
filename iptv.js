// ==Lampa==
// name: IPTV PRO Final Fix
// version: 13.0
// ==/Lampa==

(function () {
    'use strict';

    function IPTVComponent() {
        var _this = this;

        var root;
        var colG;
        var colC;
        var colE;

        var groups_data = {};
        var all_channels = [];
        var current_list = [];
        var group_names = [];

        var active_zone = 'groups';
        var index_g = 0;
        var index_c = 0;
        var index_gt = 0;
        var index_dt = 0;

        var controller_name = 'iptv_pro';
        var storage_key = 'iptv_pro_v13';

        var groupTopActions = [];
        var detailActions = [];
        var current_channel = null;

        function defaultConfig() {
            return {
                playlists: [
                    {
                        name: 'MEGA',
                        url: 'https://raw.githubusercontent.com/loganettv/playlists/refs/heads/main/mega.m3u',
                        locked: true
                    }
                ],
                favorites: [],
                current_pl_index: 0,
                last_group: '⭐ Избранное',
                last_channel_url: '',
                last_zone: 'groups'
            };
        }

        function normalizeConfig(raw) {
            var cfg = raw || {};
            var def = defaultConfig();

            if (!Array.isArray(cfg.playlists) || !cfg.playlists.length) {
                cfg.playlists = def.playlists.slice();
            } else {
                cfg.playlists = cfg.playlists.filter(function (pl) {
                    return pl && typeof pl.url === 'string' && pl.url.indexOf('http') === 0;
                }).map(function (pl, i) {
                    return {
                        name: typeof pl.name === 'string' && pl.name.trim() ? pl.name.trim() : ('Плейлист ' + (i + 1)),
                        url: pl.url.trim(),
                        locked: !!pl.locked
                    };
                });

                if (!cfg.playlists.length) {
                    cfg.playlists = def.playlists.slice();
                }
            }

            if (!Array.isArray(cfg.favorites)) {
                cfg.favorites = [];
            } else {
                cfg.favorites = cfg.favorites.filter(function (item) {
                    return item &&
                        typeof item.name === 'string' &&
                        typeof item.url === 'string' &&
                        item.url.indexOf('http') === 0;
                }).map(function (item) {
                    return {
                        name: item.name,
                        url: item.url,
                        group: item.group || 'ОБЩИЕ'
                    };
                });
            }

            if (typeof cfg.current_pl_index !== 'number' || cfg.current_pl_index < 0 || cfg.current_pl_index >= cfg.playlists.length) {
                cfg.current_pl_index = 0;
            }

            if (typeof cfg.last_group !== 'string') cfg.last_group = '⭐ Избранное';
            if (typeof cfg.last_channel_url !== 'string') cfg.last_channel_url = '';
            if (typeof cfg.last_zone !== 'string') cfg.last_zone = 'groups';

            return cfg;
        }

        var config = normalizeConfig(Lampa.Storage.get(storage_key, defaultConfig()));

        function saveConfig() {
            config = normalizeConfig(config);
            Lampa.Storage.set(storage_key, config);
        }

        function isFavorite(channel) {
            if (!channel || !channel.url) return false;

            for (var i = 0; i < config.favorites.length; i++) {
                if (config.favorites[i].url === channel.url) return true;
            }

            return false;
        }

        function toggleFavorite(channel) {
            if (!channel || !channel.url) return;

            var found = -1;
            for (var i = 0; i < config.favorites.length; i++) {
                if (config.favorites[i].url === channel.url) {
                    found = i;
                    break;
                }
            }

            if (found >= 0) {
                config.favorites.splice(found, 1);
                Lampa.Noty.show('Удалено из избранного');
            } else {
                config.favorites.push({
                    name: channel.name,
                    url: channel.url,
                    group: channel.group || 'ОБЩИЕ'
                });
                Lampa.Noty.show('Добавлено в избранное');
            }

            saveConfig();
            rebuildGroupsFromChannels();
            renderGroups();
            renderChannelsBySelectedGroup(false);
            renderDetails(getSelectedChannel());
        }

        function playChannel(channel) {
            if (!channel || !channel.url) {
                Lampa.Noty.show('Канал не выбран');
                return;
            }

            config.last_channel_url = channel.url;
            saveConfig();

            Lampa.Player.play({
                url: channel.url,
                title: channel.name || 'IPTV'
            });
        }

        function setActivePlaylist(index) {
            if (index < 0 || index >= config.playlists.length) return;

            config.current_pl_index = index;
            config.last_group = '⭐ Избранное';
            config.last_channel_url = '';
            config.last_zone = 'groups';
            saveConfig();

            active_zone = 'groups';
            index_g = 0;
            index_c = 0;
            index_gt = 0;
            index_dt = 0;

            _this.loadPlaylist();
        }

        function removeCurrentPlaylist() {
            var current = config.playlists[config.current_pl_index];
            if (!current) return;

            if (current.locked || config.playlists.length <= 1) {
                Lampa.Noty.show('Этот плейлист нельзя удалить');
                return;
            }

            config.playlists.splice(config.current_pl_index, 1);

            if (config.current_pl_index >= config.playlists.length) {
                config.current_pl_index = config.playlists.length - 1;
            }

            if (config.current_pl_index < 0) config.current_pl_index = 0;

            config.last_group = '⭐ Избранное';
            config.last_channel_url = '';
            config.last_zone = 'groups';
            saveConfig();

            active_zone = 'groups';
            index_g = 0;
            index_c = 0;
            index_gt = 0;
            index_dt = 0;

            Lampa.Noty.show('Плейлист удален');
            _this.loadPlaylist();
        }

        function rebuildGroupsFromChannels() {
            var prevGroup = config.last_group;
            groups_data = {
                '⭐ Избранное': config.favorites.slice()
            };

            for (var i = 0; i < all_channels.length; i++) {
                var item = all_channels[i];
                if (!groups_data[item.group]) groups_data[item.group] = [];
                groups_data[item.group].push(item);
            }

            group_names = Object.keys(groups_data);

            if (!group_names.length) {
                groups_data['⭐ Избранное'] = config.favorites.slice();
                group_names = Object.keys(groups_data);
            }

            var foundIndex = group_names.indexOf(prevGroup);
            index_g = foundIndex >= 0 ? foundIndex : 0;
        }

        function parsePlaylist(str) {
            var lines = (str || '').split(/\r?\n/);
            all_channels = [];

            for (var i = 0; i < lines.length; i++) {
                var line = (lines[i] || '').trim();
                if (line.indexOf('#EXTINF') === 0) {
                    var name = (line.match(/,(.*)$/) || ['', ''])[1].trim();
                    var group = (line.match(/group-title="([^"]+)"/i) || ['', 'ОБЩИЕ'])[1].trim();
                    var url = lines[i + 1] ? lines[i + 1].trim() : '';

                    if (!name) name = 'Без названия';
                    if (!group) group = 'ОБЩИЕ';

                    if (url && url.indexOf('http') === 0) {
                        all_channels.push({
                            name: name,
                            url: url,
                            group: group
                        });
                    }
                }
            }

            rebuildGroupsFromChannels();
            restoreSelection();
        }

        function restoreSelection() {
            group_names = Object.keys(groups_data);

            var groupIndex = group_names.indexOf(config.last_group);
            index_g = groupIndex >= 0 ? groupIndex : 0;

            var selectedGroup = getSelectedGroupName();
            current_list = selectedGroup ? (groups_data[selectedGroup] || []) : [];

            index_c = 0;
            if (config.last_channel_url) {
                for (var i = 0; i < current_list.length; i++) {
                    if (current_list[i].url === config.last_channel_url) {
                        index_c = i;
                        break;
                    }
                }
            }

            active_zone = config.last_zone === 'details' || config.last_zone === 'channels' || config.last_zone === 'group_actions'
                ? config.last_zone
                : 'groups';

            index_gt = 0;
            index_dt = 0;
        }

        function getSelectedGroupName() {
            group_names = Object.keys(groups_data);
            return group_names[index_g] || group_names[0] || null;
        }

        function getSelectedChannel() {
            if (!current_list.length) return null;
            if (index_c < 0) index_c = 0;
            if (index_c >= current_list.length) index_c = current_list.length - 1;
            return current_list[index_c] || null;
        }

        function persistSelection() {
            config.last_group = getSelectedGroupName() || '⭐ Избранное';
            config.last_channel_url = current_channel && current_channel.url ? current_channel.url : '';
            config.last_zone = active_zone;
            saveConfig();
        }

        function createAction(title, onEnter) {
            return {
                title: title,
                onEnter: onEnter
            };
        }

        function renderGroups() {
            colG.empty();
            groupTopActions = [];

            var currentPlaylist = config.playlists[config.current_pl_index];
            var title = $('<div class="iptv-section-title"></div>').text(currentPlaylist ? currentPlaylist.name : 'IPTV');
            colG.append(title);

            groupTopActions.push(createAction('Добавить плейлист', function () {
                _this.addPlaylist();
            }));

            groupTopActions.push(createAction('Список плейлистов', function () {
                _this.showPlaylistSelector();
            }));

            groupTopActions.push(createAction('Поиск', function () {
                _this.searchChannels();
            }));

            for (var a = 0; a < groupTopActions.length; a++) {
                (function (action) {
                    var btn = $('<div class="iptv-item iptv-action-btn"></div>').text(action.title);
                    btn.on('click', function () {
                        action.onEnter();
                    });
                    colG.append(btn);
                })(groupTopActions[a]);
            }

            group_names = Object.keys(groups_data);

            for (var i = 0; i < group_names.length; i++) {
                (function (groupName, idx) {
                    var count = Array.isArray(groups_data[groupName]) ? groups_data[groupName].length : 0;
                    var item = $('<div class="iptv-item"></div>').text(groupName + ' (' + count + ')');
                    item.on('click', function () {
                        index_g = idx;
                        active_zone = 'groups';
                        index_c = 0;
                        renderChannelsBySelectedGroup(true);
                    });
                    colG.append(item);
                })(group_names[i], i);
            }
        }

        function renderChannelsBySelectedGroup(moveToChannels) {
            var selectedGroup = getSelectedGroupName();
            current_list = selectedGroup ? (groups_data[selectedGroup] || []) : [];

            if (index_c >= current_list.length) index_c = 0;
            if (index_c < 0) index_c = 0;

            colC.empty();

            if (!current_list.length) {
                current_channel = null;
                colC.append($('<div class="iptv-empty"></div>').text('Список пуст'));
                renderDetails(null);
                if (moveToChannels) active_zone = 'channels';
                persistSelection();
                updateFocus();
                return;
            }

            for (var i = 0; i < current_list.length; i++) {
                (function (channel, idx) {
                    var row = $('<div class="iptv-item"></div>');
                    row.text(channel.name + (isFavorite(channel) ? ' ★' : ''));
                    row.on('click', function () {
                        index_c = idx;
                        active_zone = 'channels';
                        current_channel = getSelectedChannel();
                        renderDetails(current_channel);
                        persistSelection();
                        updateFocus();
                    });
                    colC.append(row);
                })(current_list[i], i);
            }

            current_channel = getSelectedChannel();
            renderDetails(current_channel);

            if (moveToChannels) active_zone = 'channels';
            persistSelection();
            updateFocus();
        }

        function renderDetails(channel) {
            colE.empty();
            detailActions = [];
            current_channel = channel || null;

            if (!channel) {
                colE.append($('<div class="iptv-empty"></div>').text('Выберите канал'));
                return;
            }

            var wrap = $('<div class="iptv-details"></div>');
            var title = $('<div class="iptv-details__title"></div>').text(channel.name || 'Без названия');
            var group = $('<div class="iptv-details__meta"></div>').text('Группа: ' + (channel.group || 'ОБЩИЕ'));
            var url = $('<div class="iptv-details__url"></div>').text(channel.url || '');

            wrap.append(title, group, url);

            detailActions.push(createAction('Смотреть', function () {
                playChannel(channel);
            }));

            detailActions.push(createAction(isFavorite(channel) ? 'Убрать из избранного' : 'Добавить в избранное', function () {
                toggleFavorite(channel);
            }));

            detailActions.push(createAction('Удалить плейлист', function () {
                removeCurrentPlaylist();
            }));

            for (var i = 0; i < detailActions.length; i++) {
                (function (action) {
                    var btn = $('<div class="iptv-item iptv-action"></div>').text(action.title);
                    btn.on('click', function () {
                        action.onEnter();
                    });
                    wrap.append(btn);
                })(detailActions[i]);
            }

            colE.append(wrap);
        }

        function updateFocus() {
            colG.find('.iptv-item').removeClass('active');
            colC.find('.iptv-item').removeClass('active');
            colE.find('.iptv-item').removeClass('active');

            if (active_zone === 'group_actions') {
                colG.find('.iptv-action-btn').eq(index_gt).addClass('active');
            } else if (active_zone === 'groups') {
                colG.find('.iptv-item').not('.iptv-action-btn').eq(index_g).addClass('active');
            } else if (active_zone === 'channels') {
                colC.find('.iptv-item').eq(index_c).addClass('active');
            } else if (active_zone === 'details') {
                colE.find('.iptv-item').eq(index_dt).addClass('active');
            }

            persistSelection();
        }

        this.create = function () {
            root = $('<div class="iptv-root"></div>');
            var container = $('<div class="iptv-wrapper"></div>');

            colG = $('<div class="iptv-col col-groups"></div>');
            colC = $('<div class="iptv-col col-channels"></div>');
            colE = $('<div class="iptv-col col-details"></div>');

            container.append(colG, colC, colE);
            root.append(container);

            if (!$('#iptv-v13-style').length) {
                $('head').append(
                    '<style id="iptv-v13-style">' +
                    '.iptv-root{position:fixed;top:0;left:0;right:0;bottom:0;background:#0b0d10;z-index:1000;padding-top:5rem;color:#fff;}' +
                    '.iptv-wrapper{display:flex;width:100%;height:100%;}' +
                    '.iptv-col{height:100%;overflow-y:auto;background:rgba(0,0,0,0.2);border-right:1px solid rgba(255,255,255,0.08);box-sizing:border-box;}' +
                    '.col-groups{width:22rem;}' +
                    '.col-channels{flex:1;}' +
                    '.col-details{width:26rem;background:#080a0d;padding:2rem;border-right:none;}' +
                    '.iptv-item{padding:1rem;margin:0.4rem;border-radius:0.5rem;background:rgba(255,255,255,0.04);color:#fff;cursor:pointer;word-break:break-word;}' +
                    '.iptv-item.active{background:#2962ff!important;}' +
                    '.iptv-section-title{padding:1rem 1rem 0.5rem 1rem;font-size:1.3rem;font-weight:700;opacity:0.95;}' +
                    '.iptv-empty{padding:1rem;margin:0.4rem;color:rgba(255,255,255,0.6);}' +
                    '.iptv-details__title{font-size:1.6rem;font-weight:700;margin-bottom:1rem;word-break:break-word;}' +
                    '.iptv-details__meta{font-size:1rem;opacity:0.8;margin-bottom:1rem;}' +
                    '.iptv-details__url{font-size:0.9rem;opacity:0.6;word-break:break-all;margin-bottom:1.5rem;}' +
                    '.iptv-action,.iptv-action-btn{text-align:center;}' +
                    '</style>'
                );
            }

            this.loadPlaylist();
            return root;
        };

        this.loadPlaylist = function () {
            config = normalizeConfig(Lampa.Storage.get(storage_key, defaultConfig()));
            saveConfig();

            var current = config.playlists[config.current_pl_index];

            if (!current || !current.url) {
                Lampa.Noty.show('Плейлист не найден');
                all_channels = [];
                rebuildGroupsFromChannels();
                renderGroups();
                renderChannelsBySelectedGroup(false);
                return;
            }

            $.ajax({
                url: current.url,
                method: 'GET',
                dataType: 'text',
                timeout: 15000,
                success: function (str) {
                    parsePlaylist(str || '');
                    renderGroups();
                    renderChannelsBySelectedGroup(false);
                    if (active_zone !== 'group_actions' && active_zone !== 'groups' && active_zone !== 'channels' && active_zone !== 'details') {
                        active_zone = 'groups';
                    }
                    updateFocus();
                },
                error: function () {
                    Lampa.Noty.show('Ошибка загрузки плейлиста');
                    parsePlaylist('');
                    renderGroups();
                    renderChannelsBySelectedGroup(false);
                    updateFocus();
                }
            });
        };

        this.addPlaylist = function () {
            Lampa.Input.show({
                title: 'Введите URL плейлиста',
                value: '',
                free: true,
                onEnter: function (url) {
                    url = (url || '').trim();

                    if (!url || url.indexOf('http') !== 0) {
                        Lampa.Noty.show('Неверный URL');
                        return;
                    }

                    config.playlists.push({
                        name: 'Плейлист ' + (config.playlists.length + 1),
                        url: url,
                        locked: false
                    });
                    config.current_pl_index = config.playlists.length - 1;
                    config.last_group = '⭐ Избранное';
                    config.last_channel_url = '';
                    config.last_zone = 'groups';
                    saveConfig();
                    Lampa.Noty.show('Плейлист добавлен');
                    _this.loadPlaylist();
                }
            });
        };

        this.showPlaylistSelector = function () {
            var items = config.playlists.map(function (pl, i) {
                return {
                    title: (i === config.current_pl_index ? '• ' : '') + pl.name,
                    subtitle: pl.url
                };
            });

            if (Lampa.Select && Lampa.Select.show) {
                Lampa.Select.show({
                    title: 'Плейлисты',
                    items: items,
                    onSelect: function (a) {
                        var index = typeof a === 'number' ? a : a.index;
                        setActivePlaylist(index);
                    }
                });
                return;
            }

            var text = config.playlists.map(function (pl, i) {
                return (i + 1) + '. ' + pl.name;
            }).join(' | ');

            Lampa.Input.show({
                title: 'Выберите плейлист: ' + text,
                value: String(config.current_pl_index + 1),
                free: true,
                onEnter: function (value) {
                    var index = parseInt(value, 10) - 1;
                    if (isNaN(index) || index < 0 || index >= config.playlists.length) {
                        Lampa.Noty.show('Неверный номер');
                        return;
                    }
                    setActivePlaylist(index);
                }
            });
        };

        this.searchChannels = function () {
            Lampa.Input.show({
                title: 'Поиск канала',
                value: '',
                free: true,
                onEnter: function (query) {
                    query = (query || '').trim().toLowerCase();

                    if (!query) {
                        Lampa.Noty.show('Введите запрос');
                        return;
                    }

                    current_list = all_channels.filter(function (channel) {
                        return (channel.name || '').toLowerCase().indexOf(query) !== -1;
                    });

                    colC.empty();
                    index_c = 0;
                    active_zone = 'channels';

                    if (!current_list.length) {
                        colC.append($('<div class="iptv-empty"></div>').text('Ничего не найдено'));
                        renderDetails(null);
                        updateFocus();
                        return;
                    }

                    for (var i = 0; i < current_list.length; i++) {
                        (function (channel, idx) {
                            var row = $('<div class="iptv-item"></div>').text(channel.name + (isFavorite(channel) ? ' ★' : ''));
                            row.on('click', function () {
                                index_c = idx;
                                current_channel = getSelectedChannel();
                                renderDetails(current_channel);
                                updateFocus();
                            });
                            colC.append(row);
                        })(current_list[i], i);
                    }

                    current_channel = getSelectedChannel();
                    renderDetails(current_channel);
                    updateFocus();
                }
            });
        };

        this.start = function () {
            Lampa.Controller.add(controller_name, {
                up: function () {
                    if (active_zone === 'group_actions') {
                        if (index_gt > 0) index_gt--;
                    } else if (active_zone === 'groups') {
                        if (index_g > 0) index_g--;
                    } else if (active_zone === 'channels') {
                        if (index_c > 0) index_c--;
                        current_channel = getSelectedChannel();
                        renderDetails(current_channel);
                    } else if (active_zone === 'details') {
                        if (index_dt > 0) index_dt--;
                    }

                    updateFocus();
                },
                down: function () {
                    if (active_zone === 'group_actions') {
                        if (index_gt < groupTopActions.length - 1) index_gt++;
                    } else if (active_zone === 'groups') {
                        if (index_g < group_names.length - 1) index_g++;
                    } else if (active_zone === 'channels') {
                        if (index_c < current_list.length - 1) index_c++;
                        current_channel = getSelectedChannel();
                        renderDetails(current_channel);
                    } else if (active_zone === 'details') {
                        if (index_dt < detailActions.length - 1) index_dt++;
                    }

                    updateFocus();
                },
                left: function () {
                    if (active_zone === 'channels') {
                        active_zone = 'groups';
                    } else if (active_zone === 'details') {
                        active_zone = 'channels';
                    } else if (active_zone === 'groups') {
                        active_zone = 'group_actions';
                    } else if (active_zone === 'group_actions') {
                        Lampa.Activity.back();
                        return;
                    }

                    updateFocus();
                },
                right: function () {
                    if (active_zone === 'group_actions') {
                        active_zone = 'groups';
                        renderChannelsBySelectedGroup(false);
                    } else if (active_zone === 'groups') {
                        renderChannelsBySelectedGroup(true);
                    } else if (active_zone === 'channels') {
                        if (current_list.length) {
                            active_zone = 'details';
                            index_dt = 0;
                            renderDetails(getSelectedChannel());
                        }
                    }

                    updateFocus();
                },
                enter: function () {
                    if (active_zone === 'group_actions') {
                        if (groupTopActions[index_gt]) groupTopActions[index_gt].onEnter();
                    } else if (active_zone === 'groups') {
                        index_c = 0;
                        renderChannelsBySelectedGroup(true);
                    } else if (active_zone === 'channels') {
                        current_channel = getSelectedChannel();
                        renderDetails(current_channel);
                        active_zone = 'details';
                        index_dt = 0;
                    } else if (active_zone === 'details') {
                        if (detailActions[index_dt]) detailActions[index_dt].onEnter();
                    }

                    updateFocus();
                },
                back: function () {
                    if (active_zone === 'details') {
                        active_zone = 'channels';
                        updateFocus();
                        return;
                    }

                    if (active_zone === 'channels') {
                        active_zone = 'groups';
                        updateFocus();
                        return;
                    }

                    if (active_zone === 'groups') {
                        active_zone = 'group_actions';
                        updateFocus();
                        return;
                    }

                    Lampa.Activity.back();
                },
                menu: function () {
                    var channel = getSelectedChannel();
                    if (channel) {
                        toggleFavorite(channel);
                    }
                }
            });

            Lampa.Controller.toggle(controller_name);
            renderGroups();
            renderChannelsBySelectedGroup(false);
            updateFocus();
        };

        this.pause = function () {
            Lampa.Controller.toggle('');
        };

        this.stop = function () {
            Lampa.Controller.toggle('');
        };

        this.render = function () {
            return root;
        };

        this.destroy = function () {
            persistSelection();
            Lampa.Controller.remove(controller_name);
            if (root) root.remove();
        };
    }

    function init() {
        Lampa.Component.add('iptv_pro', IPTVComponent);

        if ($('.menu .menu__list').find('.iptv-pro-menu-item').length) return;

        var item = $('<li class="menu__item selector iptv-pro-menu-item"></li>');
        item.append($('<div class="menu__text"></div>').text('IPTV PRO'));

        item.on('hover:enter', function () {
            Lampa.Activity.push({
                title: 'IPTV',
                component: 'iptv_pro'
            });
        });

        $('.menu .menu__list').append(item);
    }

    if (window.app_ready) {
        init();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }
})();
