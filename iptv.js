// ==Lampa==
// name: IPTV PRO Rebuild
// version: 1.0.0
// ==/Lampa==

(function () {
    'use strict';

    function IPTVRebuild() {
        var _this = this;

        var storage_key = 'iptv_rebuild_v1';
        var controller_name = 'iptv_rebuild';

        var root;
        var colLeft;
        var colCenter;
        var colRight;

        var state = {
            groups: {},
            channels: [],
            currentList: [],
            leftItems: [],
            rightItems: [],
            activeColumn: 'left',
            leftIndex: 0,
            centerIndex: 0,
            rightIndex: 0
        };

        function defaults() {
            return {
                playlists: [
                    {
                        name: 'MEGA',
                        url: 'https://raw.githubusercontent.com/loganettv/playlists/refs/heads/main/mega.m3u',
                        locked: true
                    }
                ],
                favorites: [],
                currentPlaylist: 0,
                lastGroup: '⭐ Избранное'
            };
        }

        function loadConfig() {
            var cfg = Lampa.Storage.get(storage_key, defaults()) || {};
            var def = defaults();

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

                if (!cfg.playlists.length) cfg.playlists = def.playlists.slice();
            }

            if (!Array.isArray(cfg.favorites)) cfg.favorites = [];

            cfg.favorites = cfg.favorites.filter(function (item) {
                return item && typeof item.url === 'string' && item.url.indexOf('http') === 0;
            }).map(function (item) {
                return {
                    name: item.name || 'Без названия',
                    url: item.url,
                    group: item.group || 'ОБЩИЕ'
                };
            });

            if (typeof cfg.currentPlaylist !== 'number' || cfg.currentPlaylist < 0 || cfg.currentPlaylist >= cfg.playlists.length) {
                cfg.currentPlaylist = 0;
            }

            if (typeof cfg.lastGroup !== 'string') cfg.lastGroup = '⭐ Избранное';

            return cfg;
        }

        var config = loadConfig();

        function saveConfig() {
            Lampa.Storage.set(storage_key, config);
        }

        function currentPlaylist() {
            return config.playlists[config.currentPlaylist] || null;
        }

        function safeText(value) {
            return value == null ? '' : String(value);
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

            var i;
            var found = -1;

            for (i = 0; i < config.favorites.length; i++) {
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
            buildGroups();
            buildLeftItems();
            renderLeft();
            renderCenter();
            renderRight();
            updateFocus();
        }

        function selectedLeftItem() {
            return state.leftItems[state.leftIndex] || null;
        }

        function selectedChannel() {
            if (!state.currentList.length) return null;
            if (state.centerIndex < 0) state.centerIndex = 0;
            if (state.centerIndex >= state.currentList.length) state.centerIndex = state.currentList.length - 1;
            return state.currentList[state.centerIndex] || null;
        }

        function selectedRightItem() {
            return state.rightItems[state.rightIndex] || null;
        }

        function activateController() {
            try {
                Lampa.Controller.toggle(controller_name);
            } catch (e) {}
        }

        function buildGroups() {
            var groups = {
                '⭐ Избранное': config.favorites.slice()
            };

            state.channels.forEach(function (channel) {
                if (!groups[channel.group]) groups[channel.group] = [];
                groups[channel.group].push(channel);
            });

            state.groups = groups;
        }

        function buildLeftItems() {
            var items = [
                { type: 'action', title: 'Добавить плейлист', action: 'add_playlist' },
                { type: 'action', title: 'Выбрать плейлист', action: 'select_playlist' },
                { type: 'action', title: 'Поиск', action: 'search' }
            ];

            Object.keys(state.groups).forEach(function (group) {
                items.push({
                    type: 'group',
                    title: group,
                    count: (state.groups[group] || []).length,
                    group: group
                });
            });

            state.leftItems = items;

            if (state.leftIndex >= state.leftItems.length) state.leftIndex = 0;
        }

        function restoreSelectedGroup() {
            var i;
            var target = -1;

            for (i = 0; i < state.leftItems.length; i++) {
                if (state.leftItems[i].type === 'group' && state.leftItems[i].group === config.lastGroup) {
                    target = i;
                    break;
                }
            }

            if (target >= 0) state.leftIndex = target;
        }

        function setGroup(groupName) {
            state.currentList = (state.groups[groupName] || []).slice();
            state.centerIndex = 0;
            state.rightIndex = 0;
            config.lastGroup = groupName;
            saveConfig();
            renderCenter();
            renderRight();
            updateFocus();
        }

        function ensureCurrentGroupLoaded() {
            var item = selectedLeftItem();

            if (item && item.type === 'group') {
                setGroup(item.group);
                return;
            }

            var i;
            for (i = 0; i < state.leftItems.length; i++) {
                if (state.leftItems[i].type === 'group') {
                    state.leftIndex = i;
                    setGroup(state.leftItems[i].group);
                    return;
                }
            }

            state.currentList = [];
        }

        function buildRightItems() {
            var channel = selectedChannel();

            if (!channel) {
                state.rightItems = [];
                return;
            }

            state.rightItems = [
                { title: 'Смотреть', action: 'play' },
                { title: isFavorite(channel) ? 'Убрать из избранного' : 'Добавить в избранное', action: 'favorite' },
                { title: 'Удалить текущий плейлист', action: 'remove_playlist' }
            ];

            if (state.rightIndex >= state.rightItems.length) state.rightIndex = 0;
        }

        function renderLeft() {
            colLeft.empty();

            var title = $('<div class="iptv-head"></div>').text(currentPlaylist() ? currentPlaylist().name : 'IPTV');
            colLeft.append(title);

            state.leftItems.forEach(function (item) {
                var row = $('<div class="iptv-item"></div>');

                if (item.type === 'group') row.text(item.title + ' (' + item.count + ')');
                else row.text(item.title);

                colLeft.append(row);
            });
        }

        function renderCenter() {
            colCenter.empty();

            if (!state.currentList.length) {
                colCenter.append($('<div class="iptv-empty"></div>').text('Список пуст'));
                buildRightItems();
                return;
            }

            state.currentList.forEach(function (channel) {
                var row = $('<div class="iptv-item"></div>');
                row.text(safeText(channel.name) + (isFavorite(channel) ? ' ★' : ''));
                colCenter.append(row);
            });

            buildRightItems();
        }

        function renderRight() {
            colRight.empty();

            var channel = selectedChannel();

            if (!channel) {
                colRight.append($('<div class="iptv-empty"></div>').text('Выберите канал'));
                state.rightItems = [];
                return;
            }

            colRight.append($('<div class="iptv-title"></div>').text(safeText(channel.name)));
            colRight.append($('<div class="iptv-meta"></div>').text('Группа: ' + safeText(channel.group)));
            colRight.append($('<div class="iptv-url"></div>').text(safeText(channel.url)));

            buildRightItems();

            state.rightItems.forEach(function (item) {
                var row = $('<div class="iptv-item"></div>').text(item.title);
                colRight.append(row);
            });
        }

        function updateFocus() {
            colLeft.find('.iptv-item').removeClass('active');
            colCenter.find('.iptv-item').removeClass('active');
            colRight.find('.iptv-item').removeClass('active');

            if (state.activeColumn === 'left') {
                colLeft.find('.iptv-item').eq(state.leftIndex).addClass('active');
            } else if (state.activeColumn === 'center') {
                colCenter.find('.iptv-item').eq(state.centerIndex).addClass('active');
            } else if (state.activeColumn === 'right') {
                colRight.find('.iptv-item').eq(state.rightIndex).addClass('active');
            }
        }

        function parsePlaylist(text) {
            var lines = (text || '').split(/\r?\n/);
            state.channels = [];

            for (var i = 0; i < lines.length; i++) {
                var line = (lines[i] || '').trim();

                if (line.indexOf('#EXTINF') === 0) {
                    var name = (line.match(/,(.*)$/) || ['', ''])[1].trim();
                    var group = (line.match(/group-title="([^"]+)"/i) || ['', 'ОБЩИЕ'])[1].trim();
                    var url = lines[i + 1] ? lines[i + 1].trim() : '';

                    if (!name) name = 'Без названия';
                    if (!group) group = 'ОБЩИЕ';

                    if (url && url.indexOf('http') === 0) {
                        state.channels.push({
                            name: name,
                            url: url,
                            group: group
                        });
                    }
                }
            }

            buildGroups();
            buildLeftItems();
            restoreSelectedGroup();
            ensureCurrentGroupLoaded();
        }

        function reloadAll() {
            renderLeft();
            renderCenter();
            renderRight();
            updateFocus();
            activateController();
        }

        function loadPlaylist() {
            config = loadConfig();
            saveConfig();

            var playlist = currentPlaylist();

            if (!playlist || !playlist.url) {
                Lampa.Noty.show('Плейлист не найден');
                parsePlaylist('');
                reloadAll();
                return;
            }

            $.ajax({
                url: playlist.url,
                method: 'GET',
                dataType: 'text',
                timeout: 15000,
                success: function (text) {
                    parsePlaylist(text || '');
                    reloadAll();
                },
                error: function () {
                    Lampa.Noty.show('Ошибка загрузки плейлиста');
                    parsePlaylist('');
                    reloadAll();
                }
            });
        }

        function addPlaylist() {
            Lampa.Input.show({
                title: 'URL плейлиста',
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

                    config.currentPlaylist = config.playlists.length - 1;
                    config.lastGroup = '⭐ Избранное';
                    saveConfig();
                    loadPlaylist();
                }
            });
        }

        function selectPlaylist() {
            var lines = config.playlists.map(function (pl, i) {
                return (i + 1) + '. ' + pl.name;
            }).join(' | ');

            Lampa.Input.show({
                title: 'Выберите плейлист: ' + lines,
                value: String(config.currentPlaylist + 1),
                free: true,
                onEnter: function (value) {
                    var index = parseInt(value, 10) - 1;

                    if (isNaN(index) || index < 0 || index >= config.playlists.length) {
                        Lampa.Noty.show('Неверный номер');
                        return;
                    }

                    config.currentPlaylist = index;
                    config.lastGroup = '⭐ Избранное';
                    saveConfig();
                    loadPlaylist();
                }
            });
        }

        function searchChannels() {
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

                    state.currentList = state.channels.filter(function (channel) {
                        return channel.name.toLowerCase().indexOf(query) !== -1;
                    });

                    state.centerIndex = 0;
                    state.rightIndex = 0;
                    state.activeColumn = 'center';

                    renderCenter();
                    renderRight();
                    updateFocus();

                    if (!state.currentList.length) {
                        Lampa.Noty.show('Ничего не найдено');
                    }
                }
            });
        }

        function removeCurrentPlaylist() {
            var playlist = currentPlaylist();

            if (!playlist) return;

            if (playlist.locked || config.playlists.length <= 1) {
                Lampa.Noty.show('Этот плейлист нельзя удалить');
                return;
            }

            config.playlists.splice(config.currentPlaylist, 1);

            if (config.currentPlaylist >= config.playlists.length) {
                config.currentPlaylist = config.playlists.length - 1;
            }

            if (config.currentPlaylist < 0) config.currentPlaylist = 0;

            config.lastGroup = '⭐ Избранное';
            saveConfig();
            loadPlaylist();
        }

        function playCurrent() {
            var channel = selectedChannel();

            if (!channel || !channel.url) {
                Lampa.Noty.show('Канал не выбран');
                return;
            }

            Lampa.Player.play({
                url: channel.url,
                title: channel.name
            });

            setTimeout(function () {
                activateController();
                updateFocus();
            }, 500);
        }

        function handleLeftAction(item) {
            if (!item) return;

            if (item.type === 'group') {
                setGroup(item.group);
                state.activeColumn = 'center';
                updateFocus();
                return;
            }

            if (item.action === 'add_playlist') addPlaylist();
            else if (item.action === 'select_playlist') selectPlaylist();
            else if (item.action === 'search') searchChannels();
        }

        function handleRightAction(item) {
            var channel = selectedChannel();
            if (!item || !channel) return;

            if (item.action === 'play') playCurrent();
            else if (item.action === 'favorite') toggleFavorite(channel);
            else if (item.action === 'remove_playlist') removeCurrentPlaylist();
        }

        function bindLifecycle() {
            if (Lampa.Listener && Lampa.Listener.follow) {
                Lampa.Listener.follow('player', function () {
                    setTimeout(function () {
                        activateController();
                        updateFocus();
                    }, 300);
                });

                Lampa.Listener.follow('app', function (e) {
                    if (!root || !root.parent().length) return;

                    if (e && (e.type === 'visible' || e.type === 'focus' || e.type === 'resume')) {
                        setTimeout(function () {
                            activateController();
                            updateFocus();
                        }, 150);
                    }
                });
            }
        }

        this.create = function () {
            root = $('<div class="iptv-root"></div>');
            var wrap = $('<div class="iptv-wrap"></div>');

            colLeft = $('<div class="iptv-col iptv-left"></div>');
            colCenter = $('<div class="iptv-col iptv-center"></div>');
            colRight = $('<div class="iptv-col iptv-right"></div>');

            wrap.append(colLeft, colCenter, colRight);
            root.append(wrap);

            if (!$('#iptv-rebuild-style').length) {
                $('head').append(
                    '<style id="iptv-rebuild-style">' +
                    '.iptv-root{position:fixed;top:0;left:0;right:0;bottom:0;z-index:1000;background:#0b0d10;color:#fff;padding-top:5rem;}' +
                    '.iptv-wrap{display:flex;width:100%;height:100%;}' +
                    '.iptv-col{height:100%;overflow-y:auto;box-sizing:border-box;border-right:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);}' +
                    '.iptv-left{width:23rem;}' +
                    '.iptv-center{flex:1;}' +
                    '.iptv-right{width:26rem;padding:2rem;border-right:none;background:#080a0d;}' +
                    '.iptv-head{padding:1rem;font-size:1.3rem;font-weight:700;}' +
                    '.iptv-item{margin:0.4rem;padding:1rem;border-radius:0.5rem;background:rgba(255,255,255,0.04);word-break:break-word;}' +
                    '.iptv-item.active{background:#2962ff!important;}' +
                    '.iptv-empty{padding:1rem;color:rgba(255,255,255,0.6);}' +
                    '.iptv-title{font-size:1.5rem;font-weight:700;margin-bottom:1rem;word-break:break-word;}' +
                    '.iptv-meta{opacity:0.8;margin-bottom:1rem;}' +
                    '.iptv-url{opacity:0.6;margin-bottom:1.5rem;word-break:break-all;font-size:0.9rem;}' +
                    '</style>'
                );
            }

            bindLifecycle();
            loadPlaylist();

            return root;
        };

        this.start = function () {
            Lampa.Controller.add(controller_name, {
                up: function () {
                    if (state.activeColumn === 'left' && state.leftIndex > 0) state.leftIndex--;
                    else if (state.activeColumn === 'center' && state.centerIndex > 0) state.centerIndex--;
                    else if (state.activeColumn === 'right' && state.rightIndex > 0) state.rightIndex--;

                    if (state.activeColumn === 'center') renderRight();
                    updateFocus();
                },
                down: function () {
                    if (state.activeColumn === 'left' && state.leftIndex < state.leftItems.length - 1) state.leftIndex++;
                    else if (state.activeColumn === 'center' && state.centerIndex < state.currentList.length - 1) state.centerIndex++;
                    else if (state.activeColumn === 'right' && state.rightIndex < state.rightItems.length - 1) state.rightIndex++;

                    if (state.activeColumn === 'center') renderRight();
                    updateFocus();
                },
                left: function () {
                    if (state.activeColumn === 'right') state.activeColumn = 'center';
                    else if (state.activeColumn === 'center') state.activeColumn = 'left';
                    else Lampa.Activity.back();

                    updateFocus();
                },
                right: function () {
                    if (state.activeColumn === 'left') {
                        var item = selectedLeftItem();

                        if (item && item.type === 'group') {
                            handleLeftAction(item);
                        } else {
                            handleLeftAction(item);
                        }
                    } else if (state.activeColumn === 'center') {
                        if (state.currentList.length) state.activeColumn = 'right';
                    }

                    updateFocus();
                },
                enter: function () {
                    if (state.activeColumn === 'left') {
                        handleLeftAction(selectedLeftItem());
                    } else if (state.activeColumn === 'center') {
                        if (state.currentList.length) state.activeColumn = 'right';
                    } else if (state.activeColumn === 'right') {
                        handleRightAction(selectedRightItem());
                    }

                    updateFocus();
                },
                back: function () {
                    if (state.activeColumn === 'right') {
                        state.activeColumn = 'center';
                        updateFocus();
                        return;
                    }

                    if (state.activeColumn === 'center') {
                        state.activeColumn = 'left';
                        updateFocus();
                        return;
                    }

                    Lampa.Activity.back();
                },
                menu: function () {
                    var channel = selectedChannel();
                    if (channel) toggleFavorite(channel);
                }
            });

            activateController();
            updateFocus();
        };

        this.pause = function () {
            activateController();
        };

        this.stop = function () {
            activateController();
        };

        this.render = function () {
            return root;
        };

        this.destroy = function () {
            try {
                Lampa.Controller.remove(controller_name);
            } catch (e) {}
            if (root) root.remove();
        };
    }

    function init() {
        Lampa.Component.add('iptv_rebuild', IPTVRebuild);

        if ($('.menu .menu__list').find('.iptv-rebuild-item').length) return;

        var item = $('<li class="menu__item selector iptv-rebuild-item"></li>');
        item.append($('<div class="menu__text"></div>').text('IPTV PRO'));

        item.on('hover:enter', function () {
            Lampa.Activity.push({
                title: 'IPTV',
                component: 'iptv_rebuild'
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
