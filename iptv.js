// ==Lampa==
// name: IPTV PRO Universal Debug
// version: 3.0.6
// ==/Lampa==

(function () {
    'use strict';

    function IPTVUniversalDebug() {
        var storage_key = 'iptv_universal_debug_v306';
        var controller_name = 'iptv_universal_debug';

        var root;
        var layout;
        var leftCol;
        var centerCol;
        var rightCol;
        var overlay;
        var debugBox;
        var mobileTabs;

        var view = 'browser'; // browser | playlists | keyboard
        var keyboardMode = 'add'; // add | search
        var keyboardLang = 'en';
        var controllerReady = false;

        var config = loadConfig();

        var state = {
            groups: {},
            channels: [],
            currentChannels: [],
            leftItems: [],
            playlistItems: [],
            rightItems: [],

            activeColumn: 'left',
            leftIndex: 0,
            centerIndex: 0,
            rightIndex: 0,

            overlayIndex: 0,
            keyIndex: 0,

            keyboardValue: '',
            keyboardTitle: '',
            lastGroup: config.lastGroup || 'STAR_FAVORITES',
            mobileTab: 'left'
        };

        var KEYBOARDS = {
            en: [
                'q','w','e','r','t','y','u','i','o','p',
                'a','s','d','f','g','h','j','k','l','@',
                'z','x','c','v','b','n','m','.','/','-',
                '0','1','2','3','4','5','6','7','8','9'
            ],
            ru: [
                'й','ц','у','к','е','н','г','ш','щ','з',
                'ф','ы','в','а','п','р','о','л','д','ж',
                'я','ч','с','м','и','т','ь','б','ю','э',
                '0','1','2','3','4','5','6','7','8','9'
            ]
        };

        var KEYBOARD_ACTIONS = [
            { code: 'space', title: 'Пробел' },
            { code: 'backspace', title: 'Стереть' },
            { code: 'lang', title: 'EN/RU' },
            { code: 'submit', title: 'Готово' }
        ];

        function defaults() {
            return {
                playlists: [
                    {
                        name: 'MEGA',
                        url: 'https://raw.githubusercontent.com/loganettv/playlists/refs/heads/main/mega.m3u',
                        locked: true
                    },
                    {
                        name: 'RU IPTV Org',
                        url: 'https://iptv-org.github.io/iptv/countries/ru.m3u',
                        locked: true
                    },
                    {
                        name: 'PRISMA',
                        url: 'https://gist.axenov.dev/PRISMA/f332731d327f41149cbfcecefeda4591/download/HEAD/PRISMA.m3u',
                        locked: true
                    }
                ],
                favorites: [],
                currentPlaylist: 0,
                lastGroup: 'STAR_FAVORITES'
            };
        }

        function loadConfig() {
            var raw;
            var def = defaults();

            try {
                raw = Lampa.Storage.get(storage_key, def) || {};
            } catch (e) {
                raw = def;
            }

            if (!Array.isArray(raw.playlists) || !raw.playlists.length) {
                raw.playlists = def.playlists.slice();
            }

            raw.playlists = raw.playlists.filter(function (pl) {
                return pl && typeof pl.url === 'string' && pl.url.indexOf('http') === 0;
            }).map(function (pl, i) {
                return {
                    name: typeof pl.name === 'string' && pl.name.trim() ? pl.name.trim() : ('Playlist ' + (i + 1)),
                    url: pl.url,
                    locked: !!pl.locked
                };
            });

            ensureBuiltinPlaylist(raw.playlists, def.playlists[0]);
            ensureBuiltinPlaylist(raw.playlists, def.playlists[1]);
            ensureBuiltinPlaylist(raw.playlists, def.playlists[2]);

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

            if (typeof raw.lastGroup !== 'string') raw.lastGroup = 'STAR_FAVORITES';

            return raw;
        }

        function ensureBuiltinPlaylist(playlists, builtin) {
            var exists = false;
            var i;

            for (i = 0; i < playlists.length; i++) {
                if (playlists[i].url === builtin.url) {
                    playlists[i].locked = true;
                    if (!playlists[i].name) playlists[i].name = builtin.name;
                    exists = true;
                    break;
                }
            }

            if (!exists) {
                playlists.push({
                    name: builtin.name,
                    url: builtin.url,
                    locked: true
                });
            }
        }

        function saveConfig() {
            try {
                Lampa.Storage.set(storage_key, config);
            } catch (e) {
                showDebug('saveConfig', e);
            }
        }

        function currentPlaylist() {
            return config.playlists[config.currentPlaylist] || null;
        }

        function safeText(value) {
            return value == null ? '' : String(value);
        }

        function isMobileLayout() {
            try {
                return window.innerWidth <= 980;
            } catch (e) {
                return false;
            }
        }

        function showDebug(tag, err) {
            var message = tag + ': ';
            if (err && err.message) message += err.message;
            else message += safeText(err);

            if (debugBox) {
                debugBox.text(message);
                debugBox.removeClass('hidden');
            }

            try {
                console.error('[IPTV DEBUG]', tag, err);
            } catch (e) {}
        }

        function clearDebug() {
            if (debugBox) {
                debugBox.text('');
                debugBox.addClass('hidden');
            }
        }

        function runSafe(tag, fn) {
            try {
                clearDebug();
                return fn();
            } catch (err) {
                showDebug(tag, err);
            }
        }

        function notify(text) {
            try {
                if (Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(text);
                else showDebug('notify', text);
            } catch (e) {
                showDebug('notify', e);
            }
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
                notify('Удалено из избранного');
            } else {
                config.favorites.push({
                    name: channel.name,
                    url: channel.url,
                    group: channel.group || 'ОБЩИЕ'
                });
                notify('Добавлено в избранное');
            }

            saveConfig();
            rebuildGroups();
            buildLeftItems();
            selectGroup(state.lastGroup, false);
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
            return state.playlistItems[state.overlayIndex] || null;
        }

        function keyboardKeys() {
            return KEYBOARDS[keyboardLang];
        }

        function keyCount() {
            return keyboardKeys().length + KEYBOARD_ACTIONS.length;
        }

        function ensureStyles() {
            if ($('#iptv-universal-debug-style').length) return;

            $('head').append(
                '<style id="iptv-universal-debug-style">' +
                '.iptv-root{position:fixed;top:0;left:0;right:0;bottom:0;z-index:1000;background:#0b0d10;color:#fff;padding-top:5rem;overflow:hidden;}' +
                '.iptv-layout{display:flex;width:100%;height:100%;}' +
                '.iptv-col{height:100%;overflow-y:auto;box-sizing:border-box;background:rgba(255,255,255,0.02);border-right:1px solid rgba(255,255,255,0.08);-webkit-overflow-scrolling:touch;}' +
                '.iptv-left{width:23rem;}' +
                '.iptv-center{flex:1;}' +
                '.iptv-right{width:26rem;padding:1.5rem;border-right:none;background:#080a0d;}' +
                '.iptv-head{padding:1rem;font-size:1.25rem;font-weight:700;}' +
                '.iptv-sub{padding:0 1rem 0.75rem 1rem;color:rgba(255,255,255,0.6);font-size:0.92rem;}' +
                '.iptv-item,.iptv-key,.iptv-kbtn,.iptv-tab{margin:0.35rem;padding:0.95rem;border-radius:0.55rem;background:rgba(255,255,255,0.05);cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent;touch-action:manipulation;}' +
                '.iptv-item.active,.iptv-key.active,.iptv-kbtn.active,.iptv-tab.active{background:#2962ff!important;}' +
                '.iptv-empty{padding:1rem;color:rgba(255,255,255,0.6);}' +
                '.iptv-title{font-size:1.4rem;font-weight:700;margin-bottom:0.8rem;word-break:break-word;}' +
                '.iptv-meta{opacity:0.82;margin-bottom:0.75rem;word-break:break-word;}' +
                '.iptv-url{opacity:0.6;font-size:0.9rem;word-break:break-all;margin-bottom:1.25rem;}' +
                '.iptv-overlay{position:absolute;top:5rem;left:0;right:0;bottom:0;background:#0b0d10;display:flex;z-index:10;}' +
                '.iptv-overlay.hidden{display:none;}' +
                '.iptv-overlay-left{width:28rem;overflow-y:auto;border-right:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);}' +
                '.iptv-overlay-right{flex:1;overflow-y:auto;padding:1.5rem;}' +
                '.iptv-display{padding:1rem;border-radius:0.55rem;background:rgba(255,255,255,0.06);min-height:3rem;margin-bottom:1rem;word-break:break-all;}' +
                '.iptv-keyboard{display:grid;grid-template-columns:repeat(10,1fr);gap:0.45rem;}' +
                '.iptv-key{margin:0;padding:0.8rem 0.3rem;text-align:center;}' +
                '.iptv-krow{display:grid;grid-template-columns:repeat(4,1fr);gap:0.45rem;margin-top:0.75rem;}' +
                '.iptv-kbtn{margin:0;text-align:center;}' +
                '.iptv-debug{position:absolute;left:1rem;right:1rem;bottom:1rem;z-index:30;background:#7b1111;color:#fff;padding:0.9rem 1rem;border-radius:0.55rem;font-size:0.95rem;word-break:break-word;}' +
                '.iptv-debug.hidden{display:none;}' +
                '.iptv-tabs{display:none;gap:0.5rem;padding:0.75rem;background:#0b0d10;border-bottom:1px solid rgba(255,255,255,0.08);}' +
                '.iptv-tab{margin:0;text-align:center;flex:1;}' +
                '@media (max-width: 980px){' +
                '.iptv-root{padding-top:4rem;overflow-y:auto;}' +
                '.iptv-tabs{display:flex;position:sticky;top:0;z-index:15;}' +
                '.iptv-layout{display:block;height:auto;min-height:100%;}' +
                '.iptv-col{width:100%!important;height:auto;max-height:none;border-right:none;border-bottom:1px solid rgba(255,255,255,0.08);}' +
                '.iptv-right{padding:1rem 1rem 6rem 1rem;}' +
                '.iptv-col.mobile-hidden{display:none!important;}' +
                '.iptv-overlay{display:block;overflow-y:auto;}' +
                '.iptv-overlay-left{width:100%;border-right:none;border-bottom:1px solid rgba(255,255,255,0.08);}' +
                '.iptv-overlay-right{padding:1rem 1rem 6rem 1rem;}' +
                '.iptv-debug{position:sticky;bottom:0;margin-top:1rem;}' +
                '}' +
                '</style>'
            );
        }

        function bindAction(el, tag, handler) {
            el.addClass('selector');
            el.on('hover:enter hover:click hover:touch', function (e) {
                e.preventDefault();
                e.stopPropagation();
                runSafe(tag, handler);
            });
        }

        function rebuildGroups() {
            var groups = {
                'STAR_FAVORITES': config.favorites.slice()
            };

            state.channels.forEach(function (channel) {
                if (!groups[channel.group]) groups[channel.group] = [];
                groups[channel.group].push(channel);
            });

            state.groups = groups;
        }

        function displayGroupName(name) {
            return name === 'STAR_FAVORITES' ? '⭐ Избранное' : name;
        }

        function buildLeftItems() {
            var items = [
                { type: 'action', title: 'Добавить плейлист', action: 'add' },
                { type: 'action', title: 'Список плейлистов', action: 'playlists' },
                { type: 'action', title: 'Поиск', action: 'search' }
            ];

            Object.keys(state.groups).forEach(function (group) {
                items.push({
                    type: 'group',
                    title: displayGroupName(group),
                    group: group,
                    count: (state.groups[group] || []).length
                });
            });

            state.leftItems = items;
            if (state.leftIndex >= state.leftItems.length) state.leftIndex = 0;
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

        function findNextUrl(lines, startIndex) {
            for (var i = startIndex; i < lines.length; i++) {
                var line = (lines[i] || '').trim();
                if (!line) continue;
                if (line.indexOf('#') === 0) continue;
                return line;
            }
            return '';
        }

        function parsePlaylist(text) {
            var lines = (text || '').split(/\r?\n/);
            state.channels = [];

            for (var i = 0; i < lines.length; i++) {
                var line = (lines[i] || '').trim();

                if (line.indexOf('#EXTINF') === 0) {
                    var name = (line.match(/,(.*)$/) || ['', ''])[1].trim();
                    var group = (line.match(/group-title="([^"]+)"/i) || ['', 'ОБЩИЕ'])[1].trim();
                    var url = findNextUrl(lines, i + 1);

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

            rebuildGroups();
            buildLeftItems();
            syncGroupSelection();
        }

        function loadPlaylist() {
            var playlist = currentPlaylist();

            if (!playlist || !playlist.url) {
                notify('Плейлист не найден');
                parsePlaylist('');
                renderAll();
                return;
            }

            $.ajax({
                url: playlist.url,
                method: 'GET',
                dataType: 'text',
                timeout: 20000,
                success: function (text) {
                    runSafe('parsePlaylist', function () {
                        parsePlaylist(text || '');
                        renderAll();
                    });
                },
                error: function (xhr, status) {
                    notify('Ошибка загрузки плейлиста');
                    showDebug('loadPlaylist', status || 'ajax error');
                    runSafe('parsePlaylistEmpty', function () {
                        parsePlaylist('');
                        renderAll();
                    });
                }
            });
        }

        function syncGroupSelection() {
            var index = -1;
            var i;

            for (i = 0; i < state.leftItems.length; i++) {
                if (state.leftItems[i].type === 'group' && state.leftItems[i].group === state.lastGroup) {
                    index = i;
                    break;
                }
            }

            if (index >= 0) state.leftIndex = index;
            else {
                for (i = 0; i < state.leftItems.length; i++) {
                    if (state.leftItems[i].type === 'group') {
                        state.leftIndex = i;
                        state.lastGroup = state.leftItems[i].group;
                        break;
                    }
                }
            }

            selectGroup(state.lastGroup, false);
        }

        function selectGroup(group, moveCenter) {
            state.lastGroup = group;
            config.lastGroup = group;
            saveConfig();

            state.currentChannels = (state.groups[group] || []).slice();
            state.centerIndex = 0;
            state.rightIndex = 0;
            buildRightItems();

            if (moveCenter) state.activeColumn = 'center';
            if (isMobileLayout() && moveCenter) state.mobileTab = 'center';
            renderBrowser();
        }

        function applyMobileTabVisibility() {
            if (!isMobileLayout()) {
                leftCol.removeClass('mobile-hidden');
                centerCol.removeClass('mobile-hidden');
                rightCol.removeClass('mobile-hidden');
                return;
            }

            leftCol.addClass('mobile-hidden');
            centerCol.addClass('mobile-hidden');
            rightCol.addClass('mobile-hidden');

            if (state.mobileTab === 'left') leftCol.removeClass('mobile-hidden');
            else if (state.mobileTab === 'center') centerCol.removeClass('mobile-hidden');
            else rightCol.removeClass('mobile-hidden');
        }

        function renderTabs() {
            if (!mobileTabs) return;

            mobileTabs.empty();

            var tabs = [
                { key: 'left', title: 'Группы' },
                { key: 'center', title: 'Каналы' },
                { key: 'right', title: 'Инфо' }
            ];

            tabs.forEach(function (tab) {
                var btn = $('<div class="iptv-tab"></div>').attr('data-tab', tab.key).text(tab.title);
                if (state.mobileTab === tab.key) btn.addClass('active');

                bindAction(btn, 'tab:' + tab.key, function () {
                    state.mobileTab = tab.key;
                    if (tab.key === 'left') state.activeColumn = 'left';
                    else if (tab.key === 'center') state.activeColumn = 'center';
                    else state.activeColumn = 'right';
                    applyMobileTabVisibility();
                    updateFocus();
                });

                mobileTabs.append(btn);
            });
        }

        function renderLeft() {
            leftCol.empty();
            leftCol.append($('<div class="iptv-head"></div>').text(currentPlaylist() ? currentPlaylist().name : 'IPTV'));
            leftCol.append($('<div class="iptv-sub"></div>').text('Действия и группы'));

            state.leftItems.forEach(function (item, index) {
                var row = $('<div class="iptv-item"></div>');
                row.text(item.type === 'group' ? (item.title + ' (' + item.count + ')') : item.title);

                bindAction(row, 'left:' + item.type + ':' + index, function () {
                    state.leftIndex = index;
                    state.activeColumn = 'left';

                    if (item.type === 'action') {
                        if (item.action === 'add') openKeyboard('add', 'Введите URL плейлиста', 'http://', 'en');
                        else if (item.action === 'playlists') openPlaylists();
                        else if (item.action === 'search') openKeyboard('search', 'Поиск канала', '', 'ru');
                    } else {
                        selectGroup(item.group, true);
                    }
                });

                leftCol.append(row);
            });
        }

        function renderCenter() {
            centerCol.empty();
            centerCol.append($('<div class="iptv-head"></div>').text(displayGroupName(state.lastGroup) || 'Каналы'));

            if (!state.currentChannels.length) {
                centerCol.append($('<div class="iptv-empty"></div>').text('Список пуст'));
                return;
            }

            state.currentChannels.forEach(function (channel, index) {
                var title = safeText(channel.name);
                if (isFavorite(channel)) title += ' ★';

                var row = $('<div class="iptv-item"></div>').text(title);

                bindAction(row, 'channel:' + index, function () {
                    state.centerIndex = index;
                    state.activeColumn = 'center';
                    renderRight();
                    if (isMobileLayout()) state.mobileTab = 'right';
                    renderTabs();
                    applyMobileTabVisibility();
                    updateFocus();
                });

                centerCol.append(row);
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

            rightCol.append($('<div class="iptv-title"></div>').text(channel.name));
            rightCol.append($('<div class="iptv-meta"></div>').text('Группа: ' + channel.group));
            rightCol.append($('<div class="iptv-url"></div>').text(channel.url));

            buildRightItems();

            state.rightItems.forEach(function (item, index) {
                var row = $('<div class="iptv-item"></div>').text(item.title);

                bindAction(row, 'right:' + item.action + ':' + index, function () {
                    state.rightIndex = index;
                    state.activeColumn = 'right';

                    if (item.action === 'play') playSelectedChannel();
                    else if (item.action === 'favorite') toggleFavorite(selectedChannel());
                    else if (item.action === 'remove_playlist') removeCurrentPlaylist();

                    updateFocus();
                });

                rightCol.append(row);
            });
        }

        function renderBrowser() {
            renderTabs();
            renderLeft();
            renderCenter();
            renderRight();
            applyMobileTabVisibility();
            updateFocus();
        }

        function openPlaylists() {
            view = 'playlists';
            state.overlayIndex = config.currentPlaylist;
            renderOverlay();
        }

        function renderPlaylists() {
            overlay.empty().removeClass('hidden');

            state.playlistItems = config.playlists.map(function (pl, index) {
                return {
                    title: (index === config.currentPlaylist ? '• ' : '') + pl.name,
                    subtitle: pl.url,
                    index: index,
                    locked: !!pl.locked
                };
            });

            var left = $('<div class="iptv-overlay-left"></div>');
            var right = $('<div class="iptv-overlay-right"></div>');

            left.append($('<div class="iptv-head"></div>').text('Плейлисты'));

            state.playlistItems.forEach(function (item, index) {
                var row = $('<div class="iptv-item"></div>').text(item.title);

                bindAction(row, 'playlist:' + index, function () {
                    state.overlayIndex = index;
                    config.currentPlaylist = item.index;
                    config.lastGroup = 'STAR_FAVORITES';
                    saveConfig();
                    closeOverlay();
                    loadPlaylist();
                });

                left.append(row);
            });

            var selected = selectedPlaylistItem();
            right.append($('<div class="iptv-head"></div>').text('Управление'));

            if (selected) {
                right.append($('<div class="iptv-title"></div>').text(selected.title));
                right.append($('<div class="iptv-url"></div>').text(selected.subtitle || ''));

                var closeBtn = $('<div class="iptv-item"></div>').text('Закрыть');
                bindAction(closeBtn, 'playlist:close', function () {
                    closeOverlay();
                });
                right.append(closeBtn);
            }

            overlay.append(left, right);
            updateFocus();
        }

        function openKeyboard(mode, title, value, lang) {
            view = 'keyboard';
            keyboardMode = mode;
            keyboardLang = lang || 'en';
            state.keyboardTitle = title;
            state.keyboardValue = value || '';
            state.keyIndex = 0;
            renderOverlay();
        }

        function renderKeyboard() {
            overlay.empty().removeClass('hidden');

            var left = $('<div class="iptv-overlay-left"></div>');
            var right = $('<div class="iptv-overlay-right"></div>');

            left.append($('<div class="iptv-head"></div>').text(state.keyboardTitle));
            left.append($('<div class="iptv-sub"></div>').text('Если будет ошибка, текст появится снизу'));

            right.append($('<div class="iptv-kb-head"></div>')
                .append($('<div class="iptv-head"></div>').text(keyboardMode === 'add' ? 'Добавить плейлист' : 'Поиск'))
                .append($('<div class="iptv-kb-lang"></div>').text(keyboardLang.toUpperCase()))
            );

            right.append($('<div class="iptv-display"></div>').text(state.keyboardValue || ' '));

            var grid = $('<div class="iptv-keyboard"></div>');
            keyboardKeys().forEach(function (key, index) {
                var btn = $('<div class="iptv-key"></div>').text(key);

                bindAction(btn, 'key:' + index, function () {
                    state.keyIndex = index;
                    applyKey({ type: 'char', value: key });
                });

                grid.append(btn);
            });
            right.append(grid);

            var actions = $('<div class="iptv-krow"></div>');
            KEYBOARD_ACTIONS.forEach(function (action, index) {
                var btn = $('<div class="iptv-kbtn"></div>').text(action.title);

                bindAction(btn, 'keyAction:' + action.code, function () {
                    state.keyIndex = keyboardKeys().length + index;
                    applyKey({ type: 'action', value: action.code });
                });

                actions.append(btn);
            });
            right.append(actions);

            var closeBtn = $('<div class="iptv-item"></div>').text('Закрыть');
            bindAction(closeBtn, 'keyboard:close', function () {
                closeOverlay();
            });
            right.append(closeBtn);

            overlay.append(left, right);
            updateFocus();
        }

        function renderOverlay() {
            if (view === 'playlists') renderPlaylists();
            else if (view === 'keyboard') renderKeyboard();
            else overlay.addClass('hidden').empty();
        }

        function renderAll() {
            renderBrowser();
            renderOverlay();
        }

        function closeOverlay() {
            view = 'browser';
            overlay.addClass('hidden').empty();
            updateFocus();
        }

        function submitKeyboard() {
            var value = state.keyboardValue.trim();

            if (keyboardMode === 'add') {
                if (!value || value.indexOf('http') !== 0) {
                    notify('Неверный URL');
                    return;
                }

                config.playlists.push({
                    name: 'Плейлист ' + (config.playlists.length + 1),
                    url: value,
                    locked: false
                });
                config.currentPlaylist = config.playlists.length - 1;
                config.lastGroup = 'STAR_FAVORITES';
                saveConfig();

                closeOverlay();
                loadPlaylist();
                return;
            }

            state.currentChannels = state.channels.filter(function (channel) {
                return channel.name.toLowerCase().indexOf(value.toLowerCase()) !== -1;
            });
            state.centerIndex = 0;
            state.rightIndex = 0;
            state.activeColumn = 'center';
            state.mobileTab = 'center';
            closeOverlay();
            renderBrowser();

            if (!state.currentChannels.length) notify('Ничего не найдено');
        }

        function applyKey(token) {
            if (token.type === 'char') {
                state.keyboardValue += token.value;
            } else if (token.value === 'space') {
                state.keyboardValue += ' ';
            } else if (token.value === 'backspace') {
                if (state.keyboardValue.length) state.keyboardValue = state.keyboardValue.slice(0, -1);
            } else if (token.value === 'lang') {
                keyboardLang = keyboardLang === 'en' ? 'ru' : 'en';
            } else if (token.value === 'submit') {
                submitKeyboard();
                return;
            }

            renderOverlay();
        }

        function removeCurrentPlaylist() {
            var pl = currentPlaylist();

            if (!pl) return;

            if (pl.locked || config.playlists.length <= 1) {
                notify('Этот плейлист нельзя удалить');
                return;
            }

            config.playlists.splice(config.currentPlaylist, 1);

            if (config.currentPlaylist >= config.playlists.length) config.currentPlaylist = config.playlists.length - 1;
            if (config.currentPlaylist < 0) config.currentPlaylist = 0;

            config.lastGroup = 'STAR_FAVORITES';
            saveConfig();
            loadPlaylist();
        }

        function playSelectedChannel() {
            var channel = selectedChannel();
            var enabled = controller_name;

            if (!channel || !channel.url) {
                notify('Канал не выбран');
                return;
            }

            try {
                if (Lampa.Controller && Lampa.Controller.enabled && Lampa.Controller.enabled() && Lampa.Controller.enabled().name) {
                    enabled = Lampa.Controller.enabled().name;
                }
            } catch (e) {
                showDebug('Controller.enabled', e);
            }

            try {
                if (!Lampa.Player || !Lampa.Player.play) throw new Error('Lampa.Player.play недоступен');

                Lampa.Player.play({
                    title: channel.name,
                    url: channel.url
                });
            } catch (e2) {
                showDebug('Player.play', e2);
                return;
            }

            try {
                if (typeof Lampa.Player.callback === 'function') {
                    Lampa.Player.callback(function () {
                        try {
                            if (Lampa.Controller && Lampa.Controller.toggle) {
                                Lampa.Controller.toggle(enabled);
                            }
                        } catch (e3) {
                            showDebug('Player.callback.toggle', e3);
                            activateController();
                        }

                        setTimeout(function () {
                            activateController();
                            updateFocus();
                        }, 50);
                    });
                }
            } catch (e4) {
                showDebug('Player.callback', e4);
            }
        }

        function ensureVisible(container, element, index) {
            if (!container || !container.length || !element || !element.length) return;

            var c = container[0];
            var e = element[0];

            if (typeof index === 'number' && index <= 1) {
                c.scrollTop = 0;
                return;
            }

            var cTop = c.scrollTop;
            var cHeight = c.clientHeight;
            var eTop = e.offsetTop;
            var eHeight = e.offsetHeight;
            var margin = 12;

            if (eTop < cTop + margin) {
                c.scrollTop = Math.max(0, eTop - margin);
            } else if (eTop + eHeight > cTop + cHeight - margin) {
                c.scrollTop = eTop + eHeight - cHeight + margin;
            }
        }

        function updateFocus() {
            if (!root) return;

            leftCol.find('.iptv-item').removeClass('active');
            centerCol.find('.iptv-item').removeClass('active');
            rightCol.find('.iptv-item').removeClass('active');
            overlay.find('.iptv-item').removeClass('active');
            overlay.find('.iptv-key').removeClass('active');
            overlay.find('.iptv-kbtn').removeClass('active');

            if (mobileTabs) {
                mobileTabs.find('.iptv-tab').removeClass('active');
                if (isMobileLayout()) {
                    mobileTabs.find('.iptv-tab[data-tab="' + state.mobileTab + '"]').addClass('active');
                }
            }

            if (view === 'browser') {
                if (state.activeColumn === 'left') {
                    var leftItem = leftCol.find('.iptv-item').eq(state.leftIndex).addClass('active');
                    ensureVisible(leftCol, leftItem, state.leftIndex);
                } else if (state.activeColumn === 'center') {
                    var centerItem = centerCol.find('.iptv-item').eq(state.centerIndex).addClass('active');
                    ensureVisible(centerCol, centerItem, state.centerIndex);
                } else if (state.activeColumn === 'right') {
                    var rightItem = rightCol.find('.iptv-item').eq(state.rightIndex).addClass('active');
                    ensureVisible(rightCol, rightItem, state.rightIndex);
                }
                return;
            }

            if (view === 'playlists') {
                var playlistItem = overlay.find('.iptv-overlay-left .iptv-item').eq(state.overlayIndex).addClass('active');
                ensureVisible(overlay.find('.iptv-overlay-left'), playlistItem, state.overlayIndex);
                return;
            }

            if (view === 'keyboard') {
                if (state.keyIndex < keyboardKeys().length) {
                    overlay.find('.iptv-key').eq(state.keyIndex).addClass('active');
                } else {
                    overlay.find('.iptv-kbtn').eq(state.keyIndex - keyboardKeys().length).addClass('active');
                }
            }
        }

        function activateController() {
            try {
                if (Lampa.Controller && Lampa.Controller.toggle) {
                    Lampa.Controller.toggle(controller_name);
                } else {
                    showDebug('Controller.toggle', 'Lampa.Controller.toggle is unavailable');
                }
            } catch (e) {
                showDebug('Controller.toggle', e);
            }
        }

        function exitPlugin() {
            try {
                if (Lampa.Controller && Lampa.Controller.toggle) {
                    Lampa.Controller.toggle('menu');
                }
            } catch (e) {
                showDebug('exit.toggleMenu', e);
            }

            try {
                if (Lampa.Activity && Lampa.Activity.back) {
                    Lampa.Activity.back();
                } else {
                    showDebug('exit.back', 'Lampa.Activity.back is unavailable');
                }
            } catch (e2) {
                showDebug('exit.back', e2);
            }
        }

        function addController() {
            if (controllerReady) return;

            try {
                Lampa.Controller.add(controller_name, {
                    up: function () {
                        runSafe('controller.up', function () {
                            if (view === 'browser') {
                                if (state.activeColumn === 'left' && state.leftIndex > 0) state.leftIndex--;
                                else if (state.activeColumn === 'center' && state.centerIndex > 0) {
                                    state.centerIndex--;
                                    renderRight();
                                } else if (state.activeColumn === 'right' && state.rightIndex > 0) state.rightIndex--;
                                updateFocus();
                                return;
                            }

                            if (view === 'playlists') {
                                if (state.overlayIndex > 0) state.overlayIndex--;
                                updateFocus();
                                return;
                            }

                            if (view === 'keyboard') {
                                if (state.keyIndex >= 10) state.keyIndex -= 10;
                                updateFocus();
                            }
                        });
                    },
                    down: function () {
                        runSafe('controller.down', function () {
                            if (view === 'browser') {
                                if (state.activeColumn === 'left' && state.leftIndex < state.leftItems.length - 1) state.leftIndex++;
                                else if (state.activeColumn === 'center' && state.centerIndex < state.currentChannels.length - 1) {
                                    state.centerIndex++;
                                    renderRight();
                                } else if (state.activeColumn === 'right' && state.rightIndex < state.rightItems.length - 1) state.rightIndex++;
                                updateFocus();
                                return;
                            }

                            if (view === 'playlists') {
                                if (state.overlayIndex < state.playlistItems.length - 1) state.overlayIndex++;
                                updateFocus();
                                return;
                            }

                            if (view === 'keyboard') {
                                var next = state.keyIndex + 10;
                                if (next < keyCount()) state.keyIndex = next;
                                updateFocus();
                            }
                        });
                    },
                    left: function () {
                        runSafe('controller.left', function () {
                            if (view === 'browser') {
                                if (state.activeColumn === 'right') {
                                    state.activeColumn = 'center';
                                    if (isMobileLayout()) state.mobileTab = 'center';
                                    applyMobileTabVisibility();
                                    updateFocus();
                                    return;
                                }
                                if (state.activeColumn === 'center') {
                                    state.activeColumn = 'left';
                                    if (isMobileLayout()) state.mobileTab = 'left';
                                    applyMobileTabVisibility();
                                    updateFocus();
                                    return;
                                }
                                exitPlugin();
                                return;
                            }

                            if (view === 'keyboard') {
                                if (state.keyIndex > 0) state.keyIndex--;
                                updateFocus();
                            }
                        });
                    },
                    right: function () {
                        runSafe('controller.right', function () {
                            if (view === 'browser') {
                                if (state.activeColumn === 'left') {
                                    var item = selectedLeftItem();
                                    if (item && item.type === 'group') {
                                        state.activeColumn = 'center';
                                        if (isMobileLayout()) state.mobileTab = 'center';
                                    } else {
                                        var actionItem = selectedLeftItem();
                                        if (actionItem && actionItem.type === 'action') {
                                            if (actionItem.action === 'add') openKeyboard('add', 'Введите URL плейлиста', 'http://', 'en');
                                            else if (actionItem.action === 'playlists') openPlaylists();
                                            else if (actionItem.action === 'search') openKeyboard('search', 'Поиск канала', '', 'ru');
                                        }
                                    }
                                } else if (state.activeColumn === 'center') {
                                    if (state.currentChannels.length) {
                                        state.activeColumn = 'right';
                                        if (isMobileLayout()) state.mobileTab = 'right';
                                    }
                                }
                                applyMobileTabVisibility();
                                updateFocus();
                                return;
                            }

                            if (view === 'keyboard') {
                                if (state.keyIndex < keyCount() - 1) state.keyIndex++;
                                updateFocus();
                            }
                        });
                    },
                    enter: function () {
                        runSafe('controller.enter', function () {
                            if (view === 'browser') {
                                if (state.activeColumn === 'left') {
                                    var item = selectedLeftItem();
                                    if (item.type === 'action') {
                                        if (item.action === 'add') openKeyboard('add', 'Введите URL плейлиста', 'http://', 'en');
                                        else if (item.action === 'playlists') openPlaylists();
                                        else if (item.action === 'search') openKeyboard('search', 'Поиск канала', '', 'ru');
                                    } else {
                                        selectGroup(item.group, true);
                                    }
                                } else if (state.activeColumn === 'center') {
                                    if (state.currentChannels.length) {
                                        state.activeColumn = 'right';
                                        if (isMobileLayout()) state.mobileTab = 'right';
                                    }
                                } else if (state.activeColumn === 'right') {
                                    var rightItem = selectedRightItem();
                                    if (rightItem.action === 'play') playSelectedChannel();
                                    else if (rightItem.action === 'favorite') toggleFavorite(selectedChannel());
                                    else if (rightItem.action === 'remove_playlist') removeCurrentPlaylist();
                                }
                                applyMobileTabVisibility();
                                updateFocus();
                                return;
                            }

                            if (view === 'playlists') {
                                var pl = selectedPlaylistItem();
                                if (pl) {
                                    config.currentPlaylist = pl.index;
                                    config.lastGroup = 'STAR_FAVORITES';
                                    saveConfig();
                                    closeOverlay();
                                    loadPlaylist();
                                }
                                return;
                            }

                            if (view === 'keyboard') {
                                if (state.keyIndex < keyboardKeys().length) {
                                    applyKey({ type: 'char', value: keyboardKeys()[state.keyIndex] });
                                } else {
                                    applyKey({ type: 'action', value: KEYBOARD_ACTIONS[state.keyIndex - keyboardKeys().length].code });
                                }
                            }
                        });
                    },
                    back: function () {
                        runSafe('controller.back', function () {
                            if (view !== 'browser') {
                                closeOverlay();
                                return;
                            }

                            if (state.activeColumn === 'right') {
                                state.activeColumn = 'center';
                                if (isMobileLayout()) state.mobileTab = 'center';
                                applyMobileTabVisibility();
                                updateFocus();
                                return;
                            }

                            if (state.activeColumn === 'center') {
                                state.activeColumn = 'left';
                                if (isMobileLayout()) state.mobileTab = 'left';
                                applyMobileTabVisibility();
                                updateFocus();
                                return;
                            }

                            exitPlugin();
                        });
                    },
                    menu: function () {
                        runSafe('controller.menu', function () {
                            if (view === 'playlists') {
                                var pl = selectedPlaylistItem();
                                if (!pl) return;

                                var target = config.playlists[pl.index];
                                if (!target || target.locked || config.playlists.length <= 1) {
                                    notify('Этот плейлист нельзя удалить');
                                    return;
                                }

                                config.playlists.splice(pl.index, 1);
                                if (config.currentPlaylist >= config.playlists.length) config.currentPlaylist = config.playlists.length - 1;
                                if (config.currentPlaylist < 0) config.currentPlaylist = 0;
                                saveConfig();
                                renderOverlay();
                                loadPlaylist();
                                return;
                            }

                            if (view === 'keyboard') {
                                if (state.keyboardValue.length) {
                                    state.keyboardValue = state.keyboardValue.slice(0, -1);
                                    renderOverlay();
                                }
                                return;
                            }

                            var channel = selectedChannel();
                            if (channel) toggleFavorite(channel);
                        });
                    }
                });

                controllerReady = true;
            } catch (e) {
                showDebug('Controller.add', e);
            }
        }

        this.create = function () {
            ensureStyles();

            root = $('<div class="iptv-root"></div>');
            mobileTabs = $('<div class="iptv-tabs"></div>');
            layout = $('<div class="iptv-layout"></div>');
            overlay = $('<div class="iptv-overlay hidden"></div>');
            debugBox = $('<div class="iptv-debug hidden"></div>');

            leftCol = $('<div class="iptv-col iptv-left"></div>');
            centerCol = $('<div class="iptv-col iptv-center"></div>');
            rightCol = $('<div class="iptv-col iptv-right"></div>');

            layout.append(leftCol, centerCol, rightCol);
            root.append(mobileTabs, layout, overlay, debugBox);

            runSafe('create.loadPlaylist', function () {
                loadPlaylist();
            });

            $(window).on('resize.iptv_universal_debug', function () {
                runSafe('resize', function () {
                    applyMobileTabVisibility();
                    updateFocus();
                });
            });

            return root;
        };

        this.start = function () {
            runSafe('start', function () {
                addController();
                activateController();
                applyMobileTabVisibility();
                updateFocus();
            });
        };

        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return root; };

        this.destroy = function () {
            try {
                if (Lampa.Controller && Lampa.Controller.remove) {
                    Lampa.Controller.remove(controller_name);
                }
            } catch (e) {
                showDebug('destroy.removeController', e);
            }

            try {
                $(window).off('resize.iptv_universal_debug');
            } catch (e2) {}

            controllerReady = false;

            if (root) root.remove();
        };
    }

    function init() {
        try {
            Lampa.Component.add('iptv_universal_debug', IPTVUniversalDebug);

            if ($('.menu .menu__list').find('.iptv-universal-debug-item').length) return;

            var item = $('<li class="menu__item selector iptv-universal-debug-item"></li>');
            item.append($('<div class="menu__text"></div>').text('IPTV PRO DEBUG'));

            item.on('hover:enter hover:click hover:touch', function (e) {
                e.preventDefault();
                e.stopPropagation();

                try {
                    Lampa.Activity.push({
                        title: 'IPTV DEBUG',
                        component: 'iptv_universal_debug'
                    });
                } catch (err) {
                    try { console.error('IPTV DEBUG open error', err); } catch (e2) {}
                }
            });

            $('.menu .menu__list').append(item);
        } catch (e) {
            try { console.error('IPTV DEBUG init error', e); } catch (e2) {}
        }
    }

    if (window.app_ready) init();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }
})();
