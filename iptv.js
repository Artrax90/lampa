// ==Lampa==
// name: IPTV PRO TV Rebuild
// version: 2.0.0
// ==/Lampa==

(function () {
    'use strict';

    function IPTVTvComponent() {
        var _this = this;

        var storage_key = 'iptv_tv_rebuild_v2';
        var controller_name = 'iptv_tv_rebuild';

        var root;
        var mainScreen;
        var overlayScreen;

        var leftCol;
        var centerCol;
        var rightCol;

        var view = 'browser'; // browser | playlists | keyboard | search
        var keyboardMode = 'add'; // add | search

        var config = loadConfig();

        var state = {
            groups: {},
            allChannels: [],
            currentChannels: [],
            leftItems: [],
            playlistItems: [],
            rightItems: [],

            activeColumn: 'left', // left | center | right
            leftIndex: 0,
            centerIndex: 0,
            rightIndex: 0,

            overlayColumn: 'list', // list | keys
            overlayListIndex: 0,
            overlayKeyIndex: 0,

            keyboardValue: '',
            keyboardTitle: '',
            lastGroup: config.lastGroup || '⭐ Избранное'
        };

        var KEYBOARD_ROWS = [
            ['h','t','t','p',':','/','/','.','-','_'],
            ['a','b','c','d','e','f','g','h','i','j'],
            ['k','l','m','n','o','p','q','r','s','t'],
            ['u','v','w','x','y','z','0','1','2','3'],
            ['4','5','6','7','8','9',':','/','.','?']
        ];

        function loadConfig() {
            var raw = Lampa.Storage.get(storage_key, {
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
            }) || {};

            if (!Array.isArray(raw.playlists) || !raw.playlists.length) {
                raw.playlists = [{
                    name: 'MEGA',
                    url: 'https://raw.githubusercontent.com/loganettv/playlists/refs/heads/main/mega.m3u',
                    locked: true
                }];
            }

            raw.playlists = raw.playlists.filter(function (pl) {
                return pl && typeof pl.url === 'string' && pl.url.indexOf('http') === 0;
            }).map(function (pl, i) {
                return {
                    name: typeof pl.name === 'string' && pl.name.trim() ? pl.name.trim() : ('Плейлист ' + (i + 1)),
                    url: pl.url,
                    locked: !!pl.locked
                };
            });

            if (!raw.playlists.length) {
                raw.playlists = [{
                    name: 'MEGA',
                    url: 'https://raw.githubusercontent.com/loganettv/playlists/refs/heads/main/mega.m3u',
                    locked: true
                }];
            }

            if (!Array.isArray(raw.favorites)) raw.favorites = [];
            raw.favorites = raw.favorites.filter(function (item) {
                return item && typeof item.url === 'string' && item.url.indexOf('http') === 0;
            }).map(function (item) {
                return {
                    name: item.name || 'Без названия',
                    url: item.url,
                    group: item.group || 'ОБЩИЕ'
                };
            });

            if (typeof raw.currentPlaylist !== 'number' || raw.currentPlaylist < 0 || raw.currentPlaylist >= raw.playlists.length) {
                raw.currentPlaylist = 0;
            }

            if (typeof raw.lastGroup !== 'string') raw.lastGroup = '⭐ Избранное';

            return raw;
        }

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

            var found = -1;
            var i;

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
            rebuildGroups();
            buildLeftItems();
            syncGroupSelection();
            renderBrowser();
        }

        function selectedLeftItem() {
            return state.leftItems[state.leftIndex] || null;
        }

        function selectedChannel() {
            if (!state.currentChannels.length) return null;
            if (state.centerIndex < 0) state.centerIndex = 0;
            if (state.centerIndex >= state.currentChannels.length) state.centerIndex = state.currentChannels.length - 1;
            return state.currentChannels[state.centerIndex] || null;
        }

        function selectedRightItem() {
            return state.rightItems[state.rightIndex] || null;
        }

        function selectedPlaylistItem() {
            return state.playlistItems[state.overlayListIndex] || null;
        }

        function ensureStyles() {
            if ($('#iptv-tv-rebuild-style').length) return;

            $('head').append(
                '<style id="iptv-tv-rebuild-style">' +
                '.iptv-root{position:fixed;top:0;left:0;right:0;bottom:0;z-index:1000;background:#0b0d10;color:#fff;padding-top:5rem;font-size:1.05em;}' +
                '.iptv-hidden{display:none!important;}' +
                '.iptv-main{display:flex;width:100%;height:100%;}' +
                '.iptv-col{height:100%;overflow-y:auto;box-sizing:border-box;border-right:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);}' +
                '.iptv-left{width:24rem;}' +
                '.iptv-center{flex:1;}' +
                '.iptv-right{width:27rem;padding:2rem;border-right:none;background:#080a0d;}' +
                '.iptv-head{padding:1rem;font-size:1.3rem;font-weight:700;}' +
                '.iptv-subhead{padding:0.5rem 1rem;color:rgba(255,255,255,0.6);font-size:0.95rem;}' +
                '.iptv-item{margin:0.4rem;padding:1rem;border-radius:0.5rem;background:rgba(255,255,255,0.04);word-break:break-word;}' +
                '.iptv-item.active{background:#2962ff!important;}' +
                '.iptv-empty{padding:1rem;color:rgba(255,255,255,0.6);}' +
                '.iptv-title{font-size:1.5rem;font-weight:700;margin-bottom:1rem;word-break:break-word;}' +
                '.iptv-meta{opacity:0.8;margin-bottom:1rem;}' +
                '.iptv-url{opacity:0.6;margin-bottom:1.5rem;word-break:break-all;font-size:0.9rem;}' +
                '.iptv-overlay{position:absolute;top:5rem;left:0;right:0;bottom:0;background:#0b0d10;display:flex;}' +
                '.iptv-overlay-panel{width:28rem;border-right:1px solid rgba(255,255,255,0.08);overflow-y:auto;background:rgba(255,255,255,0.03);}' +
                '.iptv-overlay-main{flex:1;padding:2rem;overflow-y:auto;}' +
                '.iptv-display{padding:1rem;border-radius:0.5rem;background:rgba(255,255,255,0.06);word-break:break-all;margin-bottom:1.5rem;min-height:3.2rem;}' +
                '.iptv-keyboard{display:grid;grid-template-columns:repeat(10,1fr);gap:0.5rem;}' +
                '.iptv-key{padding:0.8rem 0.4rem;text-align:center;border-radius:0.5rem;background:rgba(255,255,255,0.05);}' +
                '.iptv-key.active{background:#2962ff!important;}' +
                '.iptv-actions{display:grid;grid-template-columns:repeat(3,1fr);gap:0.5rem;margin-top:1rem;}' +
                '.iptv-action-btn{padding:1rem;text-align:center;border-radius:0.5rem;background:rgba(255,255,255,0.05);}' +
                '.iptv-action-btn.active{background:#2962ff!important;}' +
                '</style>'
            );
        }

        function rebuildGroups() {
            var groups = {
                '⭐ Избранное': config.favorites.slice()
            };

            state.allChannels.forEach(function (channel) {
                if (!groups[channel.group]) groups[channel.group] = [];
                groups[channel.group].push(channel);
            });

            state.groups = groups;
        }

        function buildLeftItems() {
            var items = [
                { type: 'action', title: 'Добавить плейлист', action: 'open_add' },
                { type: 'action', title: 'Список плейлистов', action: 'open_playlists' },
                { type: 'action', title: 'Поиск', action: 'open_search' }
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
            if (state.leftIndex >= items.length) state.leftIndex = 0;
        }

        function syncGroupSelection() {
            var i;
            var target = -1;

            for (i = 0; i < state.leftItems.length; i++) {
                if (state.leftItems[i].type === 'group' && state.leftItems[i].group === state.lastGroup) {
                    target = i;
                    break;
                }
            }

            if (target >= 0) state.leftIndex = target;
            else {
                for (i = 0; i < state.leftItems.length; i++) {
                    if (state.leftItems[i].type === 'group') {
                        state.leftIndex = i;
                        state.lastGroup = state.leftItems[i].group;
                        break;
                    }
                }
            }

            applyCurrentGroup();
        }

        function applyCurrentGroup() {
            var item = selectedLeftItem();
            var i;

            if (!item || item.type !== 'group') {
                for (i = 0; i < state.leftItems.length; i++) {
                    if (state.leftItems[i].type === 'group') {
                        state.leftIndex = i;
                        item = state.leftItems[i];
                        break;
                    }
                }
            }

            if (item && item.type === 'group') {
                state.lastGroup = item.group;
                config.lastGroup = item.group;
                saveConfig();
                state.currentChannels = (state.groups[item.group] || []).slice();
            } else {
                state.currentChannels = [];
            }

            state.centerIndex = 0;
            state.rightIndex = 0;
            buildRightItems();
        }

        function buildRightItems() {
            var channel = selectedChannel();

            if (!channel) {
                state.rightItems = [];
                state.rightIndex = 0;
                return;
            }

            state.rightItems = [
                { title: 'Смотреть', action: 'play' },
                { title: isFavorite(channel) ? 'Убрать из избранного' : 'Добавить в избранное', action: 'favorite' },
                { title: 'Удалить текущий плейлист', action: 'remove_playlist' }
            ];

            if (state.rightIndex >= state.rightItems.length) state.rightIndex = 0;
        }

        function parsePlaylist(text) {
            var lines = (text || '').split(/\r?\n/);
            state.allChannels = [];

            for (var i = 0; i < lines.length; i++) {
                var line = (lines[i] || '').trim();

                if (line.indexOf('#EXTINF') === 0) {
                    var name = (line.match(/,(.*)$/) || ['', ''])[1].trim();
                    var group = (line.match(/group-title="([^"]+)"/i) || ['', 'ОБЩИЕ'])[1].trim();
                    var url = lines[i + 1] ? lines[i + 1].trim() : '';

                    if (!name) name = 'Без названия';
                    if (!group) group = 'ОБЩИЕ';

                    if (url && url.indexOf('http') === 0) {
                        state.allChannels.push({
                            name: name,
                            url: url,
                            group: group
                        });
                    }
                }
            }

            rebuildGroups();
            buildLeftItems();
            syncGroupSelection();
        }

        function loadPlaylist() {
            var playlist = currentPlaylist();

            if (!playlist || !playlist.url) {
                Lampa.Noty.show('Плейлист не найден');
                parsePlaylist('');
                renderAll();
                return;
            }

            $.ajax({
                url: playlist.url,
                method: 'GET',
                dataType: 'text',
                timeout: 15000,
                success: function (text) {
                    parsePlaylist(text || '');
                    renderAll();
                },
                error: function () {
                    Lampa.Noty.show('Ошибка загрузки плейлиста');
                    parsePlaylist('');
                    renderAll();
                }
            });
        }

        function renderLeft() {
            leftCol.empty();

            leftCol.append($('<div class="iptv-head"></div>').text(currentPlaylist() ? currentPlaylist().name : 'IPTV'));
            leftCol.append($('<div class="iptv-subhead"></div>').text('Действия и группы'));

            state.leftItems.forEach(function (item) {
                var row = $('<div class="iptv-item"></div>');
                row.text(item.type === 'group' ? (item.title + ' (' + item.count + ')') : item.title);
                leftCol.append(row);
            });
        }

        function renderCenter() {
            centerCol.empty();
            centerCol.append($('<div class="iptv-head"></div>').text('Каналы'));

            if (!state.currentChannels.length) {
                centerCol.append($('<div class="iptv-empty"></div>').text('Список пуст'));
                return;
            }

            state.currentChannels.forEach(function (channel) {
                centerCol.append(
                    $('<div class="iptv-item"></div>').text(safeText(channel.name) + (isFavorite(channel) ? ' ★' : ''))
                );
            });
        }

        function renderRight() {
            rightCol.empty();
            rightCol.append($('<div class="iptv-head"></div>').text('Инфо'));

            var channel = selectedChannel();

            if (!channel) {
                rightCol.append($('<div class="iptv-empty"></div>').text('Выберите канал'));
                return;
            }

            rightCol.append($('<div class="iptv-title"></div>').text(safeText(channel.name)));
            rightCol.append($('<div class="iptv-meta"></div>').text('Группа: ' + safeText(channel.group)));
            rightCol.append($('<div class="iptv-url"></div>').text(safeText(channel.url)));

            buildRightItems();

            state.rightItems.forEach(function (item) {
                rightCol.append($('<div class="iptv-item"></div>').text(item.title));
            });
        }

        function renderBrowser() {
            renderLeft();
            renderCenter();
            renderRight();
            updateFocus();
        }

        function buildPlaylistItems() {
            state.playlistItems = config.playlists.map(function (pl, index) {
                return {
                    title: (index === config.currentPlaylist ? '• ' : '') + pl.name,
                    subtitle: pl.url,
                    index: index,
                    locked: !!pl.locked
                };
            });

            if (state.overlayListIndex >= state.playlistItems.length) state.overlayListIndex = 0;
        }

        function renderPlaylistsOverlay() {
            overlayScreen.empty().removeClass('iptv-hidden');

            buildPlaylistItems();

            var panel = $('<div class="iptv-overlay-panel"></div>');
            var main = $('<div class="iptv-overlay-main"></div>');

            panel.append($('<div class="iptv-head"></div>').text('Плейлисты'));
            state.playlistItems.forEach(function (item) {
                panel.append($('<div class="iptv-item"></div>').text(item.title));
            });

            var selected = selectedPlaylistItem();
            main.append($('<div class="iptv-head"></div>').text('Управление'));
            if (selected) {
                main.append($('<div class="iptv-title"></div>').text(selected.title));
                main.append($('<div class="iptv-url"></div>').text(selected.subtitle || ''));
                main.append($('<div class="iptv-item"></div>').text('Enter: выбрать'));
                main.append($('<div class="iptv-item"></div>').text('Menu: удалить'));
                main.append($('<div class="iptv-item"></div>').text('Back: назад'));
            }

            overlayScreen.append(panel, main);
            updateFocus();
        }

        function renderKeyboardOverlay() {
            overlayScreen.empty().removeClass('iptv-hidden');

            var panel = $('<div class="iptv-overlay-panel"></div>');
            var main = $('<div class="iptv-overlay-main"></div>');

            panel.append($('<div class="iptv-head"></div>').text(keyboardMode === 'add' ? 'Добавить плейлист' : 'Поиск'));
            panel.append($('<div class="iptv-item"></div>').text('OK по клавишам справа'));
            panel.append($('<div class="iptv-item"></div>').text('Back: отмена'));
            panel.append($('<div class="iptv-item"></div>').text('Menu: удалить символ'));

            main.append($('<div class="iptv-head"></div>').text(state.keyboardTitle));
            main.append($('<div class="iptv-display"></div>').text(state.keyboardValue || ' '));

            var grid = $('<div class="iptv-keyboard"></div>');
            KEYBOARD_ROWS.forEach(function (row) {
                row.forEach(function (key) {
                    grid.append($('<div class="iptv-key"></div>').text(key));
                });
            });
            main.append(grid);

            var actions = $('<div class="iptv-actions"></div>');
            actions.append($('<div class="iptv-action-btn"></div>').text('Пробел'));
            actions.append($('<div class="iptv-action-btn"></div>').text('Стереть'));
            actions.append($('<div class="iptv-action-btn"></div>').text('Готово'));
            main.append(actions);

            overlayScreen.append(panel, main);
            updateFocus();
        }

        function renderOverlay() {
            if (view === 'playlists') renderPlaylistsOverlay();
            else if (view === 'keyboard' || view === 'search') renderKeyboardOverlay();
            else overlayScreen.addClass('iptv-hidden').empty();
        }

        function renderAll() {
            renderBrowser();
            renderOverlay();
        }

        function getKeyCount() {
            return KEYBOARD_ROWS.length * KEYBOARD_ROWS[0].length + 3;
        }

        function getKeyboardCellLabel(index) {
            var perRow = KEYBOARD_ROWS[0].length;
            var keyCells = KEYBOARD_ROWS.length * perRow;

            if (index < keyCells) {
                var row = Math.floor(index / perRow);
                var col = index % perRow;
                return KEYBOARD_ROWS[row][col];
            }

            if (index === keyCells) return ' ';
            if (index === keyCells + 1) return '__backspace__';
            return '__submit__';
        }

        function appendKeyboardChar(token) {
            if (token === '__backspace__') {
                if (state.keyboardValue.length) {
                    state.keyboardValue = state.keyboardValue.slice(0, -1);
                }
            } else if (token === '__submit__') {
                submitKeyboard();
                return;
            } else {
                state.keyboardValue += token;
            }

            renderOverlay();
        }

        function submitKeyboard() {
            var value = state.keyboardValue.trim();

            if (keyboardMode === 'add') {
                if (!value || value.indexOf('http') !== 0) {
                    Lampa.Noty.show('Неверный URL');
                    return;
                }

                config.playlists.push({
                    name: 'Плейлист ' + (config.playlists.length + 1),
                    url: value,
                    locked: false
                });
                config.currentPlaylist = config.playlists.length - 1;
                config.lastGroup = '⭐ Избранное';
                saveConfig();

                closeOverlay();
                loadPlaylist();
                return;
            }

            if (keyboardMode === 'search') {
                state.currentChannels = state.allChannels.filter(function (channel) {
                    return channel.name.toLowerCase().indexOf(value.toLowerCase()) !== -1;
                });
                state.centerIndex = 0;
                state.rightIndex = 0;
                closeOverlay();
                state.activeColumn = 'center';
                renderBrowser();
                if (!state.currentChannels.length) Lampa.Noty.show('Ничего не найдено');
            }
        }

        function openAddOverlay() {
            view = 'keyboard';
            keyboardMode = 'add';
            state.keyboardTitle = 'Введите URL плейлиста';
            state.keyboardValue = 'http://';
            state.overlayColumn = 'keys';
            state.overlayKeyIndex = 0;
            renderOverlay();
        }

        function openSearchOverlay() {
            view = 'search';
            keyboardMode = 'search';
            state.keyboardTitle = 'Поиск канала';
            state.keyboardValue = '';
            state.overlayColumn = 'keys';
            state.overlayKeyIndex = 0;
            renderOverlay();
        }

        function openPlaylistsOverlay() {
            view = 'playlists';
            state.overlayColumn = 'list';
            state.overlayListIndex = config.currentPlaylist;
            renderOverlay();
        }

        function closeOverlay() {
            view = 'browser';
            overlayScreen.addClass('iptv-hidden').empty();
            updateFocus();
        }

        function removeCurrentPlaylist() {
            var pl = currentPlaylist();
            if (!pl) return;

            if (pl.locked || config.playlists.length <= 1) {
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

        function selectPlaylist(index) {
            if (index < 0 || index >= config.playlists.length) return;
            config.currentPlaylist = index;
            config.lastGroup = '⭐ Избранное';
            saveConfig();
            closeOverlay();
            loadPlaylist();
        }

        function playSelectedChannel() {
            var channel = selectedChannel();

            if (!channel || !channel.url) {
                Lampa.Noty.show('Канал не выбран');
                return;
            }

            try {
                Lampa.Controller.toggle('');
            } catch (e) {}

            Lampa.Player.play({
                url: channel.url,
                title: channel.name
            });
        }

        function activateLeftItem() {
            var item = selectedLeftItem();
            if (!item) return;

            if (item.type === 'action') {
                if (item.action === 'open_add') openAddOverlay();
                else if (item.action === 'open_playlists') openPlaylistsOverlay();
                else if (item.action === 'open_search') openSearchOverlay();
                return;
            }

            if (item.type === 'group') {
                state.lastGroup = item.group;
                applyCurrentGroup();
                state.activeColumn = 'center';
                renderBrowser();
            }
        }

        function activateRightItem() {
            var item = selectedRightItem();
            var channel = selectedChannel();

            if (!item || !channel) return;

            if (item.action === 'play') playSelectedChannel();
            else if (item.action === 'favorite') toggleFavorite(channel);
            else if (item.action === 'remove_playlist') removeCurrentPlaylist();
        }

        function updateFocus() {
            if (!root) return;

            leftCol.find('.iptv-item').removeClass('active');
            centerCol.find('.iptv-item').removeClass('active');
            rightCol.find('.iptv-item').removeClass('active');
            overlayScreen.find('.iptv-item').removeClass('active');
            overlayScreen.find('.iptv-key').removeClass('active');
            overlayScreen.find('.iptv-action-btn').removeClass('active');

            if (view === 'browser') {
                if (state.activeColumn === 'left') {
                    leftCol.find('.iptv-item').eq(state.leftIndex).addClass('active');
                } else if (state.activeColumn === 'center') {
                    centerCol.find('.iptv-item').eq(state.centerIndex + 0).addClass('active');
                } else if (state.activeColumn === 'right') {
                    rightCol.find('.iptv-item').eq(state.rightIndex + 0).addClass('active');
                }
                return;
            }

            if (view === 'playlists') {
                overlayScreen.find('.iptv-overlay-panel .iptv-item').eq(state.overlayListIndex).addClass('active');
                return;
            }

            if (view === 'keyboard' || view === 'search') {
                var keyCells = KEYBOARD_ROWS.length * KEYBOARD_ROWS[0].length;
                if (state.overlayKeyIndex < keyCells) {
                    overlayScreen.find('.iptv-key').eq(state.overlayKeyIndex).addClass('active');
                } else {
                    overlayScreen.find('.iptv-action-btn').eq(state.overlayKeyIndex - keyCells).addClass('active');
                }
            }
        }

        function bindPlayerReturn() {
            if (Lampa.Listener && Lampa.Listener.follow) {
                Lampa.Listener.follow('player', function () {
                    if (!root || !root.parent().length) return;
                    setTimeout(function () {
                        try {
                            Lampa.Controller.toggle(controller_name);
                        } catch (e) {}
                        updateFocus();
                    }, 300);
                });
            }
        }

        this.create = function () {
            ensureStyles();

            root = $('<div class="iptv-root"></div>');
            mainScreen = $('<div class="iptv-main"></div>');
            overlayScreen = $('<div class="iptv-overlay iptv-hidden"></div>');

            leftCol = $('<div class="iptv-col iptv-left"></div>');
            centerCol = $('<div class="iptv-col iptv-center"></div>');
            rightCol = $('<div class="iptv-col iptv-right"></div>');

            mainScreen.append(leftCol, centerCol, rightCol);
            root.append(mainScreen, overlayScreen);

            bindPlayerReturn();
            loadPlaylist();

            return root;
        };

        this.start = function () {
            Lampa.Controller.add(controller_name, {
                up: function () {
                    if (view === 'browser') {
                        if (state.activeColumn === 'left' && state.leftIndex > 0) {
                            state.leftIndex--;
                            var item = selectedLeftItem();
                            if (item && item.type === 'group') {
                                state.lastGroup = item.group;
                                applyCurrentGroup();
                                renderBrowser();
                            } else {
                                updateFocus();
                            }
                        } else if (state.activeColumn === 'center' && state.centerIndex > 0) {
                            state.centerIndex--;
                            renderRight();
                            updateFocus();
                        } else if (state.activeColumn === 'right' && state.rightIndex > 0) {
                            state.rightIndex--;
                            updateFocus();
                        }
                        return;
                    }

                    if (view === 'playlists') {
                        if (state.overlayListIndex > 0) state.overlayListIndex--;
                        updateFocus();
                        return;
                    }

                    if (view === 'keyboard' || view === 'search') {
                        var cols = KEYBOARD_ROWS[0].length;
                        if (state.overlayKeyIndex >= cols) state.overlayKeyIndex -= cols;
                        updateFocus();
                    }
                },
                down: function () {
                    if (view === 'browser') {
                        if (state.activeColumn === 'left' && state.leftIndex < state.leftItems.length - 1) {
                            state.leftIndex++;
                            var item = selectedLeftItem();
                            if (item && item.type === 'group') {
                                state.lastGroup = item.group;
                                applyCurrentGroup();
                                renderBrowser();
                            } else {
                                updateFocus();
                            }
                        } else if (state.activeColumn === 'center' && state.centerIndex < state.currentChannels.length - 1) {
                            state.centerIndex++;
                            renderRight();
                            updateFocus();
                        } else if (state.activeColumn === 'right' && state.rightIndex < state.rightItems.length - 1) {
                            state.rightIndex++;
                            updateFocus();
                        }
                        return;
                    }

                    if (view === 'playlists') {
                        if (state.overlayListIndex < state.playlistItems.length - 1) state.overlayListIndex++;
                        updateFocus();
                        return;
                    }

                    if (view === 'keyboard' || view === 'search') {
                        var cols = KEYBOARD_ROWS[0].length;
                        var next = state.overlayKeyIndex + cols;
                        if (next < getKeyCount()) state.overlayKeyIndex = next;
                        updateFocus();
                    }
                },
                left: function () {
                    if (view === 'browser') {
                        if (state.activeColumn === 'right') state.activeColumn = 'center';
                        else if (state.activeColumn === 'center') state.activeColumn = 'left';
                        else Lampa.Activity.back();
                        updateFocus();
                        return;
                    }

                    if (view === 'keyboard' || view === 'search') {
                        if (state.overlayKeyIndex > 0) state.overlayKeyIndex--;
                        updateFocus();
                    }
                },
                right: function () {
                    if (view === 'browser') {
                        if (state.activeColumn === 'left') {
                            var item = selectedLeftItem();
                            if (item && item.type === 'group') {
                                state.activeColumn = 'center';
                            } else {
                                activateLeftItem();
                            }
                        } else if (state.activeColumn === 'center') {
                            if (state.currentChannels.length) state.activeColumn = 'right';
                        }
                        updateFocus();
                        return;
                    }

                    if (view === 'keyboard' || view === 'search') {
                        if (state.overlayKeyIndex < getKeyCount() - 1) state.overlayKeyIndex++;
                        updateFocus();
                    }
                },
                enter: function () {
                    if (view === 'browser') {
                        if (state.activeColumn === 'left') {
                            activateLeftItem();
                        } else if (state.activeColumn === 'center') {
                            if (state.currentChannels.length) state.activeColumn = 'right';
                        } else if (state.activeColumn === 'right') {
                            activateRightItem();
                        }
                        updateFocus();
                        return;
                    }

                    if (view === 'playlists') {
                        var playlistItem = selectedPlaylistItem();
                        if (playlistItem) selectPlaylist(playlistItem.index);
                        return;
                    }

                    if (view === 'keyboard' || view === 'search') {
                        appendKeyboardChar(getKeyboardCellLabel(state.overlayKeyIndex));
                    }
                },
                back: function () {
                    if (view !== 'browser') {
                        closeOverlay();
                        return;
                    }

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
                    if (view === 'playlists') {
                        var pl = selectedPlaylistItem();
                        if (!pl) return;
                        var target = config.playlists[pl.index];
                        if (!target || target.locked || config.playlists.length <= 1) {
                            Lampa.Noty.show('Этот плейлист нельзя удалить');
                            return;
                        }

                        config.playlists.splice(pl.index, 1);
                        if (config.currentPlaylist >= config.playlists.length) {
                            config.currentPlaylist = config.playlists.length - 1;
                        }
                        if (config.currentPlaylist < 0) config.currentPlaylist = 0;
                        saveConfig();
                        buildPlaylistItems();
                        renderOverlay();
                        loadPlaylist();
                        return;
                    }

                    if (view === 'keyboard' || view === 'search') {
                        if (state.keyboardValue.length) {
                            state.keyboardValue = state.keyboardValue.slice(0, -1);
                            renderOverlay();
                        }
                        return;
                    }

                    var channel = selectedChannel();
                    if (channel) toggleFavorite(channel);
                }
            });

            try {
                Lampa.Controller.toggle(controller_name);
            } catch (e) {}

            updateFocus();
        };

        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return root; };

        this.destroy = function () {
            try {
                Lampa.Controller.remove(controller_name);
            } catch (e) {}
            if (root) root.remove();
        };
    }

    function init() {
        Lampa.Component.add('iptv_tv_rebuild', IPTVTvComponent);

        if ($('.menu .menu__list').find('.iptv-tv-rebuild-item').length) return;

        var item = $('<li class="menu__item selector iptv-tv-rebuild-item"></li>');
        item.append($('<div class="menu__text"></div>').text('IPTV PRO'));

        item.on('hover:enter', function () {
            Lampa.Activity.push({
                title: 'IPTV',
                component: 'iptv_tv_rebuild'
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
