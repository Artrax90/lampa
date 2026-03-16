// ==Lampa==
// name: IPTV PRO Final Fix
// version: 14.0
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

        var controller_name = 'iptv_pro';
        var storage_key = 'iptv_pro_v14';

        var left_actions = [];
        var detail_actions = [];

        var left_mode = 'actions';
        var active_zone = 'left';
        var index_left = 0;
        var index_c = 0;
        var index_d = 0;

        var current_channel = null;
        var listeners_bound = false;

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
                last_zone: 'left',
                last_left_mode: 'actions'
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
            if (cfg.last_zone !== 'left' && cfg.last_zone !== 'channels' && cfg.last_zone !== 'details') cfg.last_zone = 'left';
            if (cfg.last_left_mode !== 'actions' && cfg.last_left_mode !== 'groups') cfg.last_left_mode = 'actions';

            return cfg;
        }

        var config = normalizeConfig(Lampa.Storage.get(storage_key, defaultConfig()));

        function saveConfig() {
            config = normalizeConfig(config);
            Lampa.Storage.set(storage_key, config);
        }

        function currentPlaylist() {
            return config.playlists[config.current_pl_index] || null;
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
            rebuildGroups();
            renderLeftColumn();
            renderChannelsBySelectedGroup();
            renderDetails(getSelectedChannel());
            updateFocus();
        }

        function playChannel(channel) {
            if (!channel || !channel.url) {
                Lampa.Noty.show('Канал не выбран');
                return;
            }

            config.last_channel_url = channel.url;
            persistSelection();

            Lampa.Player.play({
                url: channel.url,
                title: channel.name || 'IPTV'
            });

            setTimeout(function () {
                restoreController();
            }, 300);
        }

        function restoreController() {
            try {
                Lampa.Controller.toggle(controller_name);
                updateFocus();
            } catch (e) {}
        }

        function bindGlobalListeners() {
            if (listeners_bound) return;
            listeners_bound = true;

            if (Lampa.Listener && Lampa.Listener.follow) {
                Lampa.Listener.follow('app', function (event) {
                    if (!root || !root.parent().length) return;

                    if (event && (event.type === 'resume' || event.type === 'visible' || event.type === 'focus')) {
                        setTimeout(function () {
                            restoreController();
                        }, 100);
                    }
                });

                Lampa.Listener.follow('player', function () {
                    if (!root || !root.parent().length) return;

                    setTimeout(function () {
                        restoreController();
                    }, 150);
                });
            }
        }

        function persistSelection() {
            config.last_group = getSelectedGroupName() || '⭐ Избранное';
            config.last_channel_url = current_channel && current_channel.url ? current_channel.url : '';
            config.last_zone = active_zone;
            config.last_left_mode = left_mode;
            saveConfig();
        }

        function createAction(title, onEnter) {
            return {
                title: title,
                onEnter: onEnter
            };
        }

        function rebuildGroups() {
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
                group_names = ['⭐ Избранное'];
                groups_data['⭐ Избранное'] = config.favorites.slice();
            }

            var wanted = group_names.indexOf(config.last_group);
            if (wanted >= 0) {
                index_left = wanted;
                left_mode = 'groups';
            } else if (left_mode === 'groups') {
                index_left = 0;
            }
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

            rebuildGroups();
            restoreSavedSelection();
        }

        function restoreSavedSelection() {
            var groupIndex = group_names.indexOf(config.last_group);
            if (groupIndex < 0) groupIndex = 0;

            left_mode = config.last_left_mode === 'groups' ? 'groups' : 'actions';
            index_left = left_mode === 'groups' ? groupIndex : 0;

            active_zone = config.last_zone;
            if (active_zone !== 'left' && active_zone !== 'channels' && active_zone !== 'details') {
                active_zone = 'left';
            }

            current_list = getSelectedGroupName() ? (groups_data[getSelectedGroupName()] || []) : [];
            index_c = 0;

            if (config.last_channel_url) {
                for (var i = 0; i < current_list.length; i++) {
                    if (current_list[i].url === config.last_channel_url) {
                        index_c = i;
                        break;
                    }
                }
            }

            if (!current_list.length && active_zone !== 'left') {
                active_zone = 'left';
            }

            index_d = 0;
            current_channel = getSelectedChannel();
        }

        function getSelectedGroupName() {
            if (left_mode !== 'groups') return config.last_group || group_names[0] || '⭐ Избранное';
            return group_names[index_left] || group_names[0] || '⭐ Избранное';
        }

        function getSelectedChannel() {
            if (!current_list.length) return null;
            if (index_c < 0) index_c = 0;
            if (index_c >= current_list.length) index_c = current_list.length - 1;
            return current_list[index_c] || null;
        }

        function setGroupByIndex(idx) {
            if (idx < 0 || idx >= group_names.length) return;

            left_mode = 'groups';
            index_left = idx;
            index_c = 0;
            current_list = groups_data[group_names[index_left]] || [];
            current_channel = getSelectedChannel();
            renderChannelsBySelectedGroup();
            renderDetails(current_channel);
            persistSelection();
        }

        function renderLeftColumn() {
            colG.empty();
            left_actions = [];

            left_actions.push(createAction('Добавить плейлист', function () {
                _this.addPlaylist();
            }));

            left_actions.push(createAction('Список плейлистов', function () {
                _this.showPlaylistSelector();
            }));

            left_actions.push(createAction('Поиск', function () {
                _this.searchChannels();
            }));

            var title = $('<div class="iptv-section-title"></div>').text(currentPlaylist() ? currentPlaylist().name : 'IPTV');
            colG.append(title);

            for (var i = 0; i < left_actions.length; i++) {
                (function (action) {
                    var btn = $('<div class="iptv-item iptv-left-action"></div>').text(action.title);
                    btn.on('click', function () {
                        action.onEnter();
                    });
                    colG.append(btn);
                })(left_actions[i]);
            }

            colG.append($('<div class="iptv-section-subtitle"></div>').text('Группы'));

            group_names = Object.keys(groups_data);
            for (var j = 0; j < group_names.length; j++) {
                (function (groupName, idx) {
                    var count = Array.isArray(groups_data[groupName]) ? groups_data[groupName].length : 0;
                    var row = $('<div class="iptv-item iptv-group-item"></div>').text(groupName + ' (' + count + ')');
                    row.on('click', function () {
                        setGroupByIndex(idx);
                        active_zone = 'channels';
                        updateFocus();
                    });
                    colG.append(row);
                })(group_names[j], j);
            }
        }

        function renderChannelsBySelectedGroup() {
            colC.empty();

            var groupName = getSelectedGroupName();
            current_list = groupName ? (groups_data[groupName] || []) : [];

            if (index_c >= current_list.length) index_c = 0;
            if (index_c < 0) index_c = 0;

            if (!current_list.length) {
                current_channel = null;
                colC.append($('<div class="iptv-empty"></div>').text('Список пуст'));
                renderDetails(null);
                persistSelection();
                return;
            }

            for (var i = 0; i < current_list.length; i++) {
                (function (channel, idx) {
                    var row = $('<div class="iptv-item"></div>').text(channel.name + (isFavorite(channel) ? ' ★' : ''));
                    row.on('click', function () {
                        index_c = idx;
                        current_channel = getSelectedChannel();
                        renderDetails(current_channel);
                        active_zone = 'details';
                        index_d = 0;
                        persistSelection();
                        updateFocus();
                    });
                    colC.append(row);
                })(current_list[i], i);
            }

            current_channel = getSelectedChannel();
            renderDetails(current_channel);
            persistSelection();
        }

        function renderDetails(channel) {
            colE.empty();
            detail_actions = [];
            current_channel = channel || null;

            if (!channel) {
                colE.append($('<div class="iptv-empty"></div>').text('Выберите канал'));
                return;
            }

            var wrap = $('<div class="iptv-details"></div>');
            wrap.append($('<div class="iptv-details__title"></div>').text(channel.name || 'Без названия'));
            wrap.append($('<div class="iptv-details__meta"></div>').text('Группа: ' + (channel.group || 'ОБЩИЕ')));
            wrap.append($('<div class="iptv-details__url"></div>').text(channel.url || ''));

            detail_actions.push(createAction('Смотреть', function () {
                playChannel(channel);
            }));

            detail_actions.push(createAction(isFavorite(channel) ? 'Убрать из избранного' : 'Добавить в избранное', function () {
                toggleFavorite(channel);
            }));

            detail_actions.push(createAction('Удалить плейлист', function () {
                _this.removeCurrentPlaylist();
            }));

            for (var i = 0; i < detail_actions.length; i++) {
                (function (action) {
                    var btn = $('<div class="iptv-item iptv-action"></div>').text(action.title);
                    btn.on('click', function () {
                        action.onEnter();
                    });
                    wrap.append(btn);
                })(detail_actions[i]);
            }

            colE.append(wrap);
        }

        function updateFocus() {
            if (!root || !root.parent().length) return;

            colG.find('.iptv-item').removeClass('active');
            colC.find('.iptv-item').removeClass('active');
            colE.find('.iptv-item').removeClass('active');

            if (active_zone === 'left') {
                if (left_mode === 'actions') {
                    colG.find('.iptv-left-action').eq(index_left).addClass('active');
                } else {
                    colG.find('.iptv-group-item').eq(index_left).addClass('active');
                }
            } else if (active_zone === 'channels') {
                colC.find('.iptv-item').eq(index_c).addClass('active');
            } else if (active_zone === 'details') {
                colE.find('.iptv-item').eq(index_d).addClass('active');
            }

            persistSelection();
        }

        function moveLeftList(step) {
            if (left_mode === 'actions') {
                if (!left_actions.length) return;
                index_left += step;
                if (index_left < 0) index_left = 0;
                if (index_left > left_actions.length - 1) index_left = left_actions.length - 1;
            } else {
                if (!group_names.length) return;
                index_left += step;
                if (index_left < 0) index_left = 0;
                if (index_left > group_names.length - 1) index_left = group_names.length - 1;
                current_list = groups_data[getSelectedGroupName()] || [];
                if (index_c >= current_list.length) index_c = 0;
                current_channel = getSelectedChannel();
                renderChannelsBySelectedGroup();
            }
        }

        function switchLeftMode(to) {
            if (to !== 'actions' && to !== 'groups') return;
            left_mode = to;
            index_left = 0;

            if (left_mode === 'groups') {
                var saved = group_names.indexOf(config.last_group);
                index_left = saved >= 0 ? saved : 0;
                current_list = groups_data[getSelectedGroupName()] || [];
                current_channel = getSelectedChannel();
                renderChannelsBySelectedGroup();
            }
        }

        this.create = function () {
            root = $('<div class="iptv-root"></div>');
            var container = $('<div class="iptv-wrapper"></div>');

            colG = $('<div class="iptv-col col-groups"></div>');
            colC = $('<div class="iptv-col col-channels"></div>');
            colE = $('<div class="iptv-col col-details"></div>');

            container.append(colG, colC, colE);
            root.append(container);

            if (!$('#iptv-v14-style').length) {
                $('head').append(
                    '<style id="iptv-v14-style">' +
                    '.iptv-root{position:fixed;top:0;left:0;right:0;bottom:0;background:#0b0d10;z-index:1000;padding-top:5rem;color:#fff;}' +
                    '.iptv-wrapper{display:flex;width:100%;height:100%;}' +
                    '.iptv-col{height:100%;overflow-y:auto;background:rgba(0,0,0,0.2);border-right:1px solid rgba(255,255,255,0.08);box-sizing:border-box;}' +
                    '.col-groups{width:22rem;}' +
                    '.col-channels{flex:1;}' +
                    '.col-details{width:26rem;background:#080a0d;padding:2rem;border-right:none;}' +
                    '.iptv-item{padding:1rem;margin:0.4rem;border-radius:0.5rem;background:rgba(255,255,255,0.04);color:#fff;cursor:pointer;word-break:break-word;}' +
                    '.iptv-item.active{background:#2962ff!important;}' +
                    '.iptv-section-title{padding:1rem 1rem 0.5rem 1rem;font-size:1.3rem;font-weight:700;opacity:0.95;}' +
                    '.iptv-section-subtitle{padding:0.8rem 1rem 0.4rem 1rem;font-size:1rem;opacity:0.7;}' +
                    '.iptv-empty{padding:1rem;margin:0.4rem;color:rgba(255,255,255,0.6);}' +
                    '.iptv-details__title{font-size:1.6rem;font-weight:700;margin-bottom:1rem;word-break:break-word;}' +
                    '.iptv-details__meta{font-size:1rem;opacity:0.8;margin-bottom:1rem;}' +
                    '.iptv-details__url{font-size:0.9rem;opacity:0.6;word-break:break-all;margin-bottom:1.5rem;}' +
                    '.iptv-action,.iptv-left-action{text-align:center;}' +
                    '</style>'
                );
            }

            bindGlobalListeners();
            this.loadPlaylist();
            return root;
        };

        this.loadPlaylist = function () {
            config = normalizeConfig(Lampa.Storage.get(storage_key, defaultConfig()));
            saveConfig();

            var playlist = currentPlaylist();

            if (!playlist || !playlist.url) {
                Lampa.Noty.show('Плейлист не найден');
                all_channels = [];
                rebuildGroups();
                renderLeftColumn();
                renderChannelsBySelectedGroup();
                renderDetails(null);
                active_zone = 'left';
                left_mode = 'actions';
                index_left = 0;
                updateFocus();
                return;
            }

            $.ajax({
                url: playlist.url,
                method: 'GET',
                dataType: 'text',
                timeout: 15000,
                success: function (str) {
                    parsePlaylist(str || '');
                    renderLeftColumn();
                    renderChannelsBySelectedGroup();
                    renderDetails(getSelectedChannel());
                    updateFocus();
                    restoreController();
                },
                error: function () {
                    Lampa.Noty.show('Ошибка загрузки плейлиста');
                    parsePlaylist('');
                    renderLeftColumn();
                    renderChannelsBySelectedGroup();
                    renderDetails(getSelectedChannel());
                    updateFocus();
                    restoreController();
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
                    config.last_zone = 'left';
                    config.last_left_mode = 'actions';
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
                        if (typeof index !== 'number') return;

                        config.current_pl_index = index;
                        config.last_group = '⭐ Избранное';
                        config.last_channel_url = '';
                        config.last_zone = 'left';
                        config.last_left_mode = 'actions';
                        saveConfig();
                        _this.loadPlaylist();
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

                    config.current_pl_index = index;
                    config.last_group = '⭐ Избранное';
                    config.last_channel_url = '';
                    config.last_zone = 'left';
                    config.last_left_mode = 'actions';
                    saveConfig();
                    _this.loadPlaylist();
                }
            });
        };

        this.removeCurrentPlaylist = function () {
            var playlist = currentPlaylist();

            if (!playlist) return;

            if (playlist.locked || config.playlists.length <= 1) {
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
            config.last_zone = 'left';
            config.last_left_mode = 'actions';
            saveConfig();

            Lampa.Noty.show('Плейлист удален');
            this.loadPlaylist();
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
                        current_channel = null;
                        colC.append($('<div class="iptv-empty"></div>').text('Ничего не найдено'));
                        renderDetails(null);
                        updateFocus();
                        restoreController();
                        return;
                    }

                    for (var i = 0; i < current_list.length; i++) {
                        (function (channel, idx) {
                            var row = $('<div class="iptv-item"></div>').text(channel.name + (isFavorite(channel) ? ' ★' : ''));
                            row.on('click', function () {
                                index_c = idx;
                                current_channel = getSelectedChannel();
                                renderDetails(current_channel);
                                active_zone = 'details';
                                index_d = 0;
                                updateFocus();
                            });
                            colC.append(row);
                        })(current_list[i], i);
                    }

                    current_channel = getSelectedChannel();
                    renderDetails(current_channel);
                    updateFocus();
                    restoreController();
                }
            });
        };

        this.start = function () {
            Lampa.Controller.add(controller_name, {
                up: function () {
                    if (active_zone === 'left') {
                        moveLeftList(-1);
                    } else if (active_zone === 'channels') {
                        if (index_c > 0) index_c--;
                        current_channel = getSelectedChannel();
                        renderDetails(current_channel);
                    } else if (active_zone === 'details') {
                        if (index_d > 0) index_d--;
                    }

                    updateFocus();
                },
                down: function () {
                    if (active_zone === 'left') {
                        moveLeftList(1);
                    } else if (active_zone === 'channels') {
                        if (index_c < current_list.length - 1) index_c++;
                        current_channel = getSelectedChannel();
                        renderDetails(current_channel);
                    } else if (active_zone === 'details') {
                        if (index_d < detail_actions.length - 1) index_d++;
                    }

                    updateFocus();
                },
                left: function () {
                    if (active_zone === 'details') {
                        active_zone = 'channels';
                    } else if (active_zone === 'channels') {
                        active_zone = 'left';
                        left_mode = 'groups';
                        var idx = group_names.indexOf(getSelectedGroupName());
                        index_left = idx >= 0 ? idx : 0;
                    } else if (active_zone === 'left') {
                        if (left_mode === 'groups') {
                            switchLeftMode('actions');
                        } else {
                            Lampa.Activity.back();
                            return;
                        }
                    }

                    updateFocus();
                },
                right: function () {
                    if (active_zone === 'left') {
                        if (left_mode === 'actions') {
                            if (left_actions[index_left]) {
                                left_actions[index_left].onEnter();
                            }
                            return;
                        }

                        current_list = groups_data[getSelectedGroupName()] || [];
                        current_channel = getSelectedChannel();

                        if (current_list.length) {
                            active_zone = 'channels';
                        }
                    } else if (active_zone === 'channels') {
                        if (current_list.length) {
                            active_zone = 'details';
                            index_d = 0;
                        }
                    }

                    updateFocus();
                },
                enter: function () {
                    if (active_zone === 'left') {
                        if (left_mode === 'actions') {
                            if (left_actions[index_left]) {
                                left_actions[index_left].onEnter();
                            }
                        } else {
                            current_list = groups_data[getSelectedGroupName()] || [];
                            current_channel = getSelectedChannel();
                            if (current_list.length) {
                                active_zone = 'channels';
                            }
                        }
                    } else if (active_zone === 'channels') {
                        if (current_list.length) {
                            current_channel = getSelectedChannel();
                            renderDetails(current_channel);
                            active_zone = 'details';
                            index_d = 0;
                        }
                    } else if (active_zone === 'details') {
                        if (detail_actions[index_d]) {
                            detail_actions[index_d].onEnter();
                        }
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
                        active_zone = 'left';
                        left_mode = 'groups';
                        index_left = group_names.indexOf(getSelectedGroupName());
                        if (index_left < 0) index_left = 0;
                        updateFocus();
                        return;
                    }

                    if (active_zone === 'left' && left_mode === 'groups') {
                        switchLeftMode('actions');
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

            restoreController();
            renderLeftColumn();
            renderChannelsBySelectedGroup();
            renderDetails(getSelectedChannel());
            updateFocus();
        };

        this.pause = function () {
            restoreController();
        };

        this.stop = function () {
            restoreController();
        };

        this.render = function () {
            return root;
        };

        this.destroy = function () {
            persistSelection();
            try {
                Lampa.Controller.remove(controller_name);
            } catch (e) {}
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
