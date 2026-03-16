// ==Lampa==
// name: IPTV PRO Final Fix
// version: 12.0
// ==/Lampa==

(function () {
    'use strict';

    function IPTVComponent(object) {
        var _this = this;
        var root;
        var colG;
        var colC;
        var colE;

        var groups_data = {};
        var all_channels = [];
        var current_list = [];
        var group_names = [];

        var active_col = 'groups';
        var index_g = 0;
        var index_c = 0;

        var controller_name = 'iptv_pro';
        var storage_key = 'iptv_pro_v12';

        function getDefaultConfig() {
            return {
                playlists: [
                    {
                        name: 'MEGA',
                        url: 'https://raw.githubusercontent.com/loganettv/playlists/refs/heads/main/mega.m3u'
                    }
                ],
                favorites: [],
                current_pl_index: 0
            };
        }

        function normalizeConfig(raw) {
            var cfg = raw || {};
            var defaults = getDefaultConfig();

            if (!Array.isArray(cfg.playlists) || !cfg.playlists.length) {
                cfg.playlists = defaults.playlists.slice();
            } else {
                cfg.playlists = cfg.playlists.filter(function (pl) {
                    return pl && typeof pl.url === 'string' && pl.url.indexOf('http') === 0;
                });

                if (!cfg.playlists.length) {
                    cfg.playlists = defaults.playlists.slice();
                }

                cfg.playlists = cfg.playlists.map(function (pl, i) {
                    return {
                        name: typeof pl.name === 'string' && pl.name.trim() ? pl.name : ('Плейлист ' + (i + 1)),
                        url: pl.url
                    };
                });
            }

            if (!Array.isArray(cfg.favorites)) {
                cfg.favorites = [];
            } else {
                cfg.favorites = cfg.favorites.filter(function (item) {
                    return item &&
                        typeof item.name === 'string' &&
                        typeof item.url === 'string' &&
                        item.url.indexOf('http') === 0;
                });
            }

            if (typeof cfg.current_pl_index !== 'number' || cfg.current_pl_index < 0 || cfg.current_pl_index >= cfg.playlists.length) {
                cfg.current_pl_index = 0;
            }

            return cfg;
        }

        var config = normalizeConfig(Lampa.Storage.get(storage_key, getDefaultConfig()));

        function saveConfig() {
            config = normalizeConfig(config);
            Lampa.Storage.set(storage_key, config);
        }

        function isFavorite(channel) {
            if (!channel || !channel.url) return false;

            return config.favorites.some(function (fav) {
                return fav.url === channel.url;
            });
        }

        function toggleFavorite(channel) {
            if (!channel || !channel.url) return;

            var index = -1;

            config.favorites.forEach(function (fav, i) {
                if (fav.url === channel.url) index = i;
            });

            if (index >= 0) {
                config.favorites.splice(index, 1);
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
            renderGroups();

            if (active_col === 'channels') {
                renderChannels(current_list);
            }
        }

        function rebuildGroups() {
            groups_data = {
                '⭐ Избранное': config.favorites.slice()
            };

            all_channels = [];

            all_channels.forEach = Array.prototype.forEach;
        }

        function renderDetails(channel) {
            colE.empty();

            var wrap = $('<div class="iptv-details"></div>');

            if (!channel) {
                wrap.append($('<div class="iptv-empty"></div>').text('Выберите канал'));
                colE.append(wrap);
                return;
            }

            var title = $('<div class="iptv-details__title"></div>').text(channel.name || 'Без названия');
            var group = $('<div class="iptv-details__meta"></div>').text('Группа: ' + (channel.group || 'ОБЩИЕ'));
            var url = $('<div class="iptv-details__url"></div>').text(channel.url || '');

            var playBtn = $('<div class="iptv-item iptv-action"></div>').text('Смотреть');
            playBtn.on('click', function () {
                if (channel.url) {
                    Lampa.Player.play({
                        url: channel.url,
                        title: channel.name || 'IPTV'
                    });
                }
            });

            var favBtn = $('<div class="iptv-item iptv-action"></div>').text(isFavorite(channel) ? 'Убрать из избранного' : 'Добавить в избранное');
            favBtn.on('click', function () {
                toggleFavorite(channel);
                renderDetails(channel);
            });

            wrap.append(title, group, url, playBtn, favBtn);
            colE.append(wrap);
        }

        function rebuildParsedData(str) {
            var lines = (str || '').split(/\r?\n/);

            groups_data = {
                '⭐ Избранное': config.favorites.slice()
            };
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
                        var item = {
                            name: name,
                            url: url,
                            group: group
                        };

                        all_channels.push(item);

                        if (!groups_data[group]) groups_data[group] = [];
                        groups_data[group].push(item);
                    }
                }
            }

            group_names = Object.keys(groups_data);

            if (!group_names.length) {
                groups_data['⭐ Избранное'] = config.favorites.slice();
                group_names = Object.keys(groups_data);
            }

            if (index_g >= group_names.length) index_g = 0;
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

        function playSelectedChannel() {
            var channel = getSelectedChannel();

            if (!channel || !channel.url) {
                Lampa.Noty.show('Канал не выбран');
                return;
            }

            Lampa.Player.play({
                url: channel.url,
                title: channel.name || 'IPTV'
            });
        }

        function renderGroups() {
            colG.empty();

            var current = config.playlists[config.current_pl_index];
            var title = $('<div class="iptv-section-title"></div>').text(current ? current.name : 'IPTV');

            var btnAdd = $('<div class="btn-pl"></div>').text('Добавить плейлист');
            btnAdd.on('click', function () {
                _this.managePlaylists();
            });

            var btnSearch = $('<div class="btn-search"></div>').text('Поиск');
            btnSearch.on('click', function () {
                _this.searchChannels();
            });

            colG.append(title, btnAdd, btnSearch);

            group_names = Object.keys(groups_data);

            group_names.forEach(function (group, i) {
                var count = Array.isArray(groups_data[group]) ? groups_data[group].length : 0;
                var item = $('<div class="iptv-item"></div>');
                item.text(group + ' (' + count + ')');
                item.on('click', function () {
                    index_g = i;
                    active_col = 'groups';
                    index_c = 0;
                    renderChannels(groups_data[group] || []);
                });
                colG.append(item);
            });

            updateFocus();
        }

        function renderChannels(list) {
            colC.empty();

            current_list = Array.isArray(list) ? list.slice() : [];
            if (index_c >= current_list.length) index_c = 0;
            if (index_c < 0) index_c = 0;

            if (!current_list.length) {
                colC.append($('<div class="iptv-empty"></div>').text('Список пуст'));
                renderDetails(null);
                updateFocus();
                return;
            }

            current_list.forEach(function (channel, i) {
                var row = $('<div class="iptv-item"></div>');
                var label = channel.name + (isFavorite(channel) ? ' ★' : '');

                row.text(label);
                row.on('click', function () {
                    index_c = i;
                    active_col = 'channels';
                    updateFocus();
                    renderDetails(channel);
                    playSelectedChannel();
                });

                colC.append(row);
            });

            renderDetails(getSelectedChannel());
            updateFocus();
        }

        function updateFocus() {
            colG.find('.iptv-item').removeClass('active');
            colC.find('.iptv-item').removeClass('active');

            if (active_col === 'groups') {
                var groupOffset = 0;
                colG.find('.iptv-item').eq(index_g + groupOffset).addClass('active');
            } else {
                colC.find('.iptv-item').eq(index_c).addClass('active');
            }

            renderDetails(active_col === 'channels' ? getSelectedChannel() : null);
        }

        this.create = function () {
            root = $('<div class="iptv-root"></div>');
            var container = $('<div class="iptv-wrapper"></div>');

            colG = $('<div class="iptv-col col-groups"></div>');
            colC = $('<div class="iptv-col col-channels"></div>');
            colE = $('<div class="iptv-col col-details"></div>');

            container.append(colG, colC, colE);
            root.append(container);

            if (!$('#iptv-v12-style').length) {
                $('head').append(
                    '<style id="iptv-v12-style">' +
                    '.iptv-root{position:fixed;top:0;left:0;right:0;bottom:0;background:#0b0d10;z-index:1000;padding-top:5rem;color:#fff;}' +
                    '.iptv-wrapper{display:flex;width:100%;height:100%;}' +
                    '.iptv-col{height:100%;overflow-y:auto;background:rgba(0,0,0,0.2);border-right:1px solid rgba(255,255,255,0.08);box-sizing:border-box;}' +
                    '.col-groups{width:20rem;}' +
                    '.col-channels{flex:1;}' +
                    '.col-details{width:25rem;background:#080a0d;padding:2rem;border-right:none;}' +
                    '.iptv-item{padding:1rem;margin:0.4rem;border-radius:0.5rem;background:rgba(255,255,255,0.04);color:#fff;cursor:pointer;word-break:break-word;}' +
                    '.iptv-item.active{background:#2962ff!important;}' +
                    '.btn-pl,.btn-search{padding:1rem;margin:0.5rem 1rem;text-align:center;border-radius:0.5rem;cursor:pointer;color:#fff;font-weight:bold;}' +
                    '.btn-pl{background:#2962ff;}' +
                    '.btn-search{background:#444;}' +
                    '.iptv-section-title{padding:1rem 1rem 0.5rem 1rem;font-size:1.3rem;font-weight:700;opacity:0.95;}' +
                    '.iptv-empty{padding:1rem;margin:0.4rem;color:rgba(255,255,255,0.6);}' +
                    '.iptv-details__title{font-size:1.6rem;font-weight:700;margin-bottom:1rem;word-break:break-word;}' +
                    '.iptv-details__meta{font-size:1rem;opacity:0.8;margin-bottom:1rem;}' +
                    '.iptv-details__url{font-size:0.9rem;opacity:0.6;word-break:break-all;margin-bottom:1.5rem;}' +
                    '.iptv-action{margin:0 0 0.8rem 0;text-align:center;}' +
                    '</style>'
                );
            }

            this.loadPlaylist();
            return root;
        };

        this.loadPlaylist = function () {
            config = normalizeConfig(Lampa.Storage.get(storage_key, getDefaultConfig()));
            saveConfig();

            var current = config.playlists[config.current_pl_index];

            if (!current || !current.url) {
                Lampa.Noty.show('Плейлист не найден');
                rebuildParsedData('');
                renderGroups();
                renderChannels([]);
                return;
            }

            $.ajax({
                url: current.url,
                method: 'GET',
                dataType: 'text',
                timeout: 15000,
                success: function (str) {
                    _this.parse(str || '');
                },
                error: function () {
                    Lampa.Noty.show('Ошибка загрузки плейлиста');
                    _this.parse('');
                }
            });
        };

        this.parse = function (str) {
            rebuildParsedData(str);
            renderGroups();

            var selectedGroup = getSelectedGroupName();
            renderChannels(selectedGroup ? (groups_data[selectedGroup] || []) : []);
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

                    var filtered = all_channels.filter(function (channel) {
                        return (channel.name || '').toLowerCase().indexOf(query) !== -1;
                    });

                    active_col = 'channels';
                    index_c = 0;
                    renderChannels(filtered);

                    if (!filtered.length) {
                        Lampa.Noty.show('Ничего не найдено');
                    }
                }
            });
        };

        this.managePlaylists = function () {
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
                        url: url
                    });

                    config.current_pl_index = config.playlists.length - 1;
                    saveConfig();
                    _this.loadPlaylist();
                }
            });
        };

        this.start = function () {
            Lampa.Controller.add(controller_name, {
                up: function () {
                    if (active_col === 'groups') {
                        if (index_g > 0) index_g--;
                    } else {
                        if (index_c > 0) index_c--;
                    }

                    updateFocus();
                },
                down: function () {
                    if (active_col === 'groups') {
                        group_names = Object.keys(groups_data);
                        if (index_g < group_names.length - 1) index_g++;
                    } else {
                        if (index_c < current_list.length - 1) index_c++;
                    }

                    updateFocus();
                },
                right: function () {
                    if (active_col === 'groups') {
                        active_col = 'channels';
                        index_c = 0;
                        var selectedGroup = getSelectedGroupName();
                        renderChannels(selectedGroup ? (groups_data[selectedGroup] || []) : []);
                    }
                },
                left: function () {
                    if (active_col === 'channels') {
                        active_col = 'groups';
                        updateFocus();
                    } else {
                        Lampa.Activity.back();
                    }
                },
                enter: function () {
                    if (active_col === 'groups') {
                        active_col = 'channels';
                        index_c = 0;
                        var selectedGroup = getSelectedGroupName();
                        renderChannels(selectedGroup ? (groups_data[selectedGroup] || []) : []);
                    } else {
                        playSelectedChannel();
                    }
                },
                back: function () {
                    Lampa.Activity.back();
                },
                menu: function () {
                    if (active_col === 'channels') {
                        var channel = getSelectedChannel();
                        if (channel) {
                            toggleFavorite(channel);
                            renderChannels(current_list);
                        }
                    }
                }
            });

            Lampa.Controller.toggle(controller_name);
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
            Lampa.Controller.remove(controller_name);
            if (root) root.remove();
        };
    }

    function init() {
        if (Lampa.Component) {
            Lampa.Component.add('iptv_pro', IPTVComponent);
        }

        if ($('.menu .menu__list').find('.iptv-pro-menu-item').length) {
            return;
        }

        var item = $('<li class="menu__item selector iptv-pro-menu-item"></li>');
        var text = $('<div class="menu__text"></div>').text('IPTV PRO');

        item.append(text);
        item.on('hover:enter', function () {
            Lampa.Activity.push({
                title: 'IPTV',
                component: 'iptv_pro'
            });
        });

        $('.menu .menu__list').append(item);
    }

    if (window.app_ready) init();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }
})();
