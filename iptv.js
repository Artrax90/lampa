// ==Lampa==
// name: IPTV PRO TV Rebuild
// version: 2.5.2
// ==/Lampa==

(function () {
    'use strict';

    function IPTVTvComponent() {
        var storage_key = 'iptv_tv_rebuild_v252';
        var controller_name = 'iptv_tv_rebuild';
        var root, mainScreen, overlayScreen, leftCol, centerCol, rightCol;

        var view = 'browser'; // browser | playlists | keyboard
        var keyboardMode = 'add'; // add | search | rename | epg
        var keyboardLang = 'en';
        var controllerReady = false;

        var config = loadConfig();
        var epgProgramMap = {};
        var epgChannelMap = {};

        var state = {
            groups: {},
            allChannels: [],
            currentChannels: [],
            leftItems: [],
            playlistItems: [],
            rightItems: [],

            activeColumn: 'left',
            leftIndex: 0,
            centerIndex: 0,
            rightIndex: 0,

            overlayListIndex: 0,
            overlayKeyIndex: 0,

            keyboardValue: '',
            keyboardTitle: '',
            currentGroup: config.lastGroup || '⭐ Избранное'
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
                    }
                ],
                favorites: [],
                history: [],
                currentPlaylist: 0,
                lastGroup: '⭐ Избранное',
                lastChannelByGroup: {},
                settings: {
                    compact: false,
                    epgEnabled: true,
                    epgUrl: ''
                },
                cache: {
                    playlists: {},
                    epg: {}
                }
            };
        }

        function loadConfig() {
            var raw = Lampa.Storage.get(storage_key, defaults()) || {};
            var def = defaults();

            if (!Array.isArray(raw.playlists) || !raw.playlists.length) raw.playlists = def.playlists.slice();
            raw.playlists = raw.playlists.filter(function (pl) {
                return pl && typeof pl.url === 'string' && pl.url.indexOf('http') === 0;
            }).map(function (pl, i) {
                return {
                    name: typeof pl.name === 'string' && pl.name.trim() ? pl.name.trim() : ('Плейлист ' + (i + 1)),
                    url: pl.url,
                    locked: !!pl.locked
                };
            });
            if (!raw.playlists.length) raw.playlists = def.playlists.slice();

            if (!Array.isArray(raw.favorites)) raw.favorites = [];
            if (!Array.isArray(raw.history)) raw.history = [];

            if (typeof raw.currentPlaylist !== 'number' || raw.currentPlaylist < 0 || raw.currentPlaylist >= raw.playlists.length) {
                raw.currentPlaylist = 0;
            }

            if (!raw.lastChannelByGroup || typeof raw.lastChannelByGroup !== 'object') raw.lastChannelByGroup = {};
            if (!raw.settings || typeof raw.settings !== 'object') raw.settings = {};
            raw.settings.compact = !!raw.settings.compact;
            raw.settings.epgEnabled = raw.settings.epgEnabled !== false;
            raw.settings.epgUrl = typeof raw.settings.epgUrl === 'string' ? raw.settings.epgUrl : '';

            if (!raw.cache || typeof raw.cache !== 'object') raw.cache = {};
            if (!raw.cache.playlists || typeof raw.cache.playlists !== 'object') raw.cache.playlists = {};
            if (!raw.cache.epg || typeof raw.cache.epg !== 'object') raw.cache.epg = {};

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

        function normalizeText(value) {
            return safeText(value).toLowerCase().replace(/\s+/g, ' ').trim();
        }

        function isFavorite(channel) {
            if (!channel || !channel.url) return false;

            for (var i = 0; i < config.favorites.length; i++) {
                if (config.favorites[i].url === channel.url) return true;
            }

            return false;
        }

        function addHistory(channel) {
            if (!channel || !channel.url) return;

            config.history = config.history.filter(function (item) {
                return item.url !== channel.url;
            });

            config.history.unshift({
                name: channel.name,
                url: channel.url,
                group: channel.group || 'ОБЩИЕ',
                logo: channel.logo || '',
                tvgId: channel.tvgId || '',
                tvgName: channel.tvgName || '',
                time: Date.now()
            });

            config.history = config.history.slice(0, 20);
            saveConfig();
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
                    group: channel.group || 'ОБЩИЕ',
                    logo: channel.logo || '',
                    tvgId: channel.tvgId || '',
                    tvgName: channel.tvgName || ''
                });
                Lampa.Noty.show('Добавлено в избранное');
            }

            saveConfig();
            rebuildGroups();
            buildLeftItems();
            selectGroup(state.currentGroup, false);
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

        function keyboardKeys() {
            return KEYBOARDS[keyboardLang];
        }

        function keyCount() {
            return keyboardKeys().length + KEYBOARD_ACTIONS.length;
        }

        function ensureStyles() {
            if ($('#iptv-tv-rebuild-style').length) return;

            $('head').append(
                '<style id="iptv-tv-rebuild-style">' +
                '.iptv-root{position:fixed;top:0;left:0;right:0;bottom:0;z-index:1000;background:#0b0d10;color:#fff;padding-top:5rem;font-size:1.05em;overflow:hidden;}' +
                '.iptv-root.iptv-compact{font-size:0.92em;}' +
                '.iptv-root.iptv-compact .iptv-item{padding:0.75rem;margin:0.25rem;}' +
                '.iptv-root.iptv-compact .iptv-head{padding:0.75rem;font-size:1.1rem;}' +
                '.iptv-hidden{display:none!important;}' +
                '.iptv-main{display:flex;width:100%;height:100%;}' +
                '.iptv-col{height:100%;overflow-y:auto;overflow-x:hidden;box-sizing:border-box;border-right:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.02);scroll-behavior:auto;-webkit-overflow-scrolling:touch;}' +
                '.iptv-left{width:24rem;}' +
                '.iptv-center{flex:1;}' +
                '.iptv-right{width:27rem;padding:2rem;border-right:none;background:#080a0d;}' +
                '.iptv-head{padding:1rem;font-size:1.3rem;font-weight:700;}' +
                '.iptv-subhead{padding:0.5rem 1rem;color:rgba(255,255,255,0.6);font-size:0.95rem;}' +
                '.iptv-item{margin:0.4rem;padding:1rem;border-radius:0.5rem;background:rgba(255,255,255,0.04);word-break:break-word;}' +
                '.iptv-item.active{background:#2962ff!important;}' +
                '.iptv-empty{padding:1rem;color:rgba(255,255,255,0.6);}' +
                '.iptv-title{font-size:1.5rem;font-weight:700;margin-bottom:1rem;word-break:break-word;}' +
                '.iptv-meta{opacity:0.8;margin-bottom:0.75rem;}' +
                '.iptv-url{opacity:0.6;margin-bottom:1rem;word-break:break-all;font-size:0.88rem;}' +
                '.iptv-logo{max-width:100%;max-height:7rem;display:block;margin:0 0 1rem 0;border-radius:0.4rem;background:#111;object-fit:contain;}' +
                '.iptv-epg{margin-bottom:1rem;padding:0.75rem;border-radius:0.5rem;background:rgba(255,255,255,0.04);}' +
                '.iptv-epg-title{font-weight:700;margin-bottom:0.35rem;}' +
                '.iptv-epg-time{opacity:0.7;font-size:0.9rem;}' +
                '.iptv-overlay{position:absolute;top:5rem;left:0;right:0;bottom:0;background:#0b0d10;display:flex;overflow:hidden;}' +
                '.iptv-overlay-panel{width:30rem;border-right:1px solid rgba(255,255,255,0.08);overflow-y:auto;background:rgba(255,255,255,0.03);}' +
                '.iptv-overlay-main{flex:1;padding:2rem;overflow-y:auto;}' +
                '.iptv-display{padding:1rem;border-radius:0.5rem;background:rgba(255,255,255,0.06);word-break:break-all;margin-bottom:1.5rem;min-height:3.2rem;}' +
                '.iptv-kb-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;}' +
                '.iptv-kb-lang{padding:0.6rem 1rem;border-radius:0.5rem;background:rgba(255,255,255,0.05);}' +
                '.iptv-keyboard{display:grid;grid-template-columns:repeat(10,1fr);gap:0.5rem;}' +
                '.iptv-key{padding:0.8rem 0.4rem;text-align:center;border-radius:0.5rem;background:rgba(255,255,255,0.05);}' +
                '.iptv-key.active{background:#2962ff!important;}' +
                '.iptv-actions{display:grid;grid-template-columns:repeat(4,1fr);gap:0.5rem;margin-top:1rem;}' +
                '.iptv-action-btn{padding:1rem;text-align:center;border-radius:0.5rem;background:rgba(255,255,255,0.05);}' +
                '.iptv-action-btn.active{background:#2962ff!important;}' +
                '</style>'
            );
        }

        function applyCompactMode() {
            if (!root) return;
            if (config.settings.compact) root.addClass('iptv-compact');
            else root.removeClass('iptv-compact');
        }

        function extractHeaderEpgUrl(text) {
            var first = (text || '').split(/\r?\n/)[0] || '';
            var match = first.match(/x-tvg-url="([^"]+)"/i) || first.match(/url-tvg="([^"]+)"/i);
            return match ? match[1] : '';
        }

        function extractAttribute(line, name) {
            var m = line.match(new RegExp(name + '="([^"]*)"', 'i'));
            return m ? m[1] : '';
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

        function parsePlaylistCount(text) {
            var lines = (text || '').split(/\r?\n/);
            var count = 0;
            for (var i = 0; i < lines.length; i++) {
                if ((lines[i] || '').trim().indexOf('#EXTINF') === 0) count++;
            }
            return count;
        }

        function rebuildGroups() {
            var groups = {
                '⭐ Избранное': config.favorites.slice(),
                'История': config.history.slice()
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
                { type: 'action', title: 'Поиск', action: 'search' },
                { type: 'action', title: 'Переименовать плейлист', action: 'rename' },
                { type: 'action', title: 'EPG URL', action: 'epg' },
                { type: 'action', title: 'Компактный режим: ' + (config.settings.compact ? 'Да' : 'Нет'), action: 'compact' }
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

        function restoreLastChannel(group) {
            var url = config.lastChannelByGroup[group];
            if (!url) return 0;

            for (var i = 0; i < state.currentChannels.length; i++) {
                if (state.currentChannels[i].url === url) return i;
            }

            return 0;
        }

        function selectGroup(group, moveToCenter) {
            state.currentGroup = group;
            config.lastGroup = group;
            saveConfig();

            state.currentChannels = (state.groups[group] || []).slice();
            state.centerIndex = group === 'История' ? 0 : restoreLastChannel(group);
            state.rightIndex = 0;
            buildRightItems();

            if (moveToCenter) state.activeColumn = 'center';
            renderBrowser();
        }

        function parsePlaylist(text) {
            var lines = (text || '').split(/\r?\n/);
            var list = [];
            var headerEpg = extractHeaderEpgUrl(text);

            state.allChannels = [];
            epgProgramMap = {};
            epgChannelMap = {};

            for (var i = 0; i < lines.length; i++) {
                var line = (lines[i] || '').trim();

                if (line.indexOf('#EXTINF') === 0) {
                    var name = (line.match(/,(.*)$/) || ['', ''])[1].trim();
                    var group = extractAttribute(line, 'group-title') || 'ОБЩИЕ';
                    var url = findNextUrl(lines, i + 1);
                    var logo = extractAttribute(line, 'tvg-logo');
                    var tvgId = extractAttribute(line, 'tvg-id');
                    var tvgName = extractAttribute(line, 'tvg-name');

                    if (!name) name = 'Без названия';
                    if (!group) group = 'ОБЩИЕ';

                    if (url && url.indexOf('http') === 0) {
                        list.push({
                            name: name,
                            url: url,
                            group: group,
                            logo: logo,
                            tvgId: tvgId,
                            tvgName: tvgName,
                            hd: /(\bhd\b|1080|720)/i.test(name)
                        });
                    }
                }
            }

            state.allChannels = list;
            rebuildGroups();
            buildLeftItems();

            if (headerEpg) {
                config.settings.epgUrl = headerEpg;
                config.settings.epgEnabled = true;
                saveConfig();
            }

            if (!state.groups[state.currentGroup]) state.currentGroup = '⭐ Избранное';
            selectGroup(state.currentGroup, false);
            loadEpg(false);
        }

        function cachePlaylist(url, text) {
            config.cache.playlists[url] = {
                ts: Date.now(),
                text: text
            };
            saveConfig();
        }

        function getCachedPlaylist(url) {
            var item = config.cache.playlists[url];
            if (!item || typeof item.text !== 'string') return null;
            return item.text;
        }

        function loadPlaylist(force) {
            var playlist = currentPlaylist();
            var cached;

            if (!playlist || !playlist.url) {
                Lampa.Noty.show('Плейлист не найден');
                parsePlaylist('');
                renderAll();
                return;
            }

            if (!force) {
                cached = getCachedPlaylist(playlist.url);
                if (cached) {
                    parsePlaylist(cached);
                    renderAll();
                    return;
                }
            }

            $.ajax({
                url: playlist.url,
                method: 'GET',
                dataType: 'text',
                timeout: 20000,
                success: function (text) {
                    cachePlaylist(playlist.url, text || '');
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

        function validateAndAddPlaylist(url) {
            $.ajax({
                url: url,
                method: 'GET',
                dataType: 'text',
                timeout: 20000,
                success: function (text) {
                    var count = parsePlaylistCount(text || '');
                    if (!count) {
                        Lampa.Noty.show('Плейлист пустой или неверный');
                        return;
                    }

                    config.playlists.push({
                        name: 'Плейлист ' + (config.playlists.length + 1),
                        url: url,
                        locked: false
                    });
                    config.currentPlaylist = config.playlists.length - 1;
                    saveConfig();
                    cachePlaylist(url, text || '');
                    Lampa.Noty.show('Добавлено каналов: ' + count);
                    closeOverlay();
                    loadPlaylist(false);
                },
                error: function () {
                    Lampa.Noty.show('Не удалось загрузить плейлист');
                }
            });
        }

        function renameCurrentPlaylist(name) {
            var playlist = currentPlaylist();
            if (!playlist) return;

            name = safeText(name).trim();
            if (!name) {
                Lampa.Noty.show('Введите название');
                return;
            }

            playlist.name = name;
            saveConfig();
            buildLeftItems();
            renderBrowser();
        }

        function deleteCurrentPlaylist() {
            var pl = currentPlaylist();
            if (!pl) return;

            if (pl.locked || config.playlists.length <= 1) {
                Lampa.Noty.show('Этот плейлист нельзя удалить');
                return;
            }

            config.playlists.splice(config.currentPlaylist, 1);

            if (config.currentPlaylist >= config.playlists.length) config.currentPlaylist = config.playlists.length - 1;
            if (config.currentPlaylist < 0) config.currentPlaylist = 0;

            config.lastGroup = '⭐ Избранное';
            saveConfig();
            loadPlaylist(false);
        }

        function parseXmltvDate(value) {
            if (!value) return 0;
            var s = value.replace(/\s.*$/, '');
            var year = parseInt(s.substr(0, 4), 10);
            var month = parseInt(s.substr(4, 2), 10) - 1;
            var day = parseInt(s.substr(6, 2), 10);
            var hour = parseInt(s.substr(8, 2), 10);
            var minute = parseInt(s.substr(10, 2), 10);
            var sec = parseInt(s.substr(12, 2), 10) || 0;
            return new Date(year, month, day, hour, minute, sec).getTime();
        }

        function parseXmltv(text) {
            var now = Date.now();
            epgProgramMap = {};
            epgChannelMap = {};

            try {
                var doc = new DOMParser().parseFromString(text, 'text/xml');
                var channels = doc.getElementsByTagName('channel');
                var programmes = doc.getElementsByTagName('programme');
                var i, j;

                for (i = 0; i < channels.length; i++) {
                    var ch = channels[i];
                    var id = ch.getAttribute('id') || '';
                    var iconNode = ch.getElementsByTagName('icon');
                    var displayNames = ch.getElementsByTagName('display-name');
                    var icon = iconNode.length ? (iconNode[0].getAttribute('src') || '') : '';

                    if (!id) continue;

                    var meta = {
                        id: id,
                        icon: icon,
                        names: []
                    };

                    epgChannelMap[id] = meta;
                    epgChannelMap[normalizeText(id)] = meta;

                    for (j = 0; j < displayNames.length; j++) {
                        var dn = safeText(displayNames[j].textContent).trim();
                        if (!dn) continue;
                        meta.names.push(dn);
                        epgChannelMap[normalizeText(dn)] = meta;
                    }
                }

                for (i = 0; i < programmes.length; i++) {
                    var pr = programmes[i];
                    var channelId = pr.getAttribute('channel') || '';
                    var start = parseXmltvDate(pr.getAttribute('start'));
                    var stop = parseXmltvDate(pr.getAttribute('stop'));
                    var titles = pr.getElementsByTagName('title');
                    var title = titles.length ? safeText(titles[0].textContent).trim() : '';

                    if (!channelId || !title || !start || !stop) continue;
                    if (!epgProgramMap[channelId]) epgProgramMap[channelId] = {};

                    if (start <= now && stop >= now) {
                        epgProgramMap[channelId].current = {
                            title: title,
                            start: start,
                            stop: stop
                        };
                    } else if (start > now) {
                        if (!epgProgramMap[channelId].next || start < epgProgramMap[channelId].next.start) {
                            epgProgramMap[channelId].next = {
                                title: title,
                                start: start,
                                stop: stop
                            };
                        }
                    }
                }
            } catch (e) {}
        }

        function loadEpg(force) {
            var url = config.settings.epgUrl;
            var cacheItem;

            epgProgramMap = {};
            epgChannelMap = {};

            if (!config.settings.epgEnabled || !url) {
                renderRight();
                return;
            }

            cacheItem = config.cache.epg[url];
            if (!force && cacheItem && cacheItem.text) {
                parseXmltv(cacheItem.text);
                renderRight();
                return;
            }

            $.ajax({
                url: url,
                method: 'GET',
                dataType: 'text',
                timeout: 25000,
                success: function (text) {
                    config.cache.epg[url] = {
                        ts: Date.now(),
                        text: text || ''
                    };
                    saveConfig();
                    parseXmltv(text || '');
                    renderRight();
                },
                error: function () {}
            });
        }

        function getEpgChannelMeta(channel) {
            if (!channel) return null;

            if (channel.tvgId && epgChannelMap[channel.tvgId]) return epgChannelMap[channel.tvgId];
            if (channel.tvgId && epgChannelMap[normalizeText(channel.tvgId)]) return epgChannelMap[normalizeText(channel.tvgId)];
            if (channel.tvgName && epgChannelMap[normalizeText(channel.tvgName)]) return epgChannelMap[normalizeText(channel.tvgName)];
            if (channel.name && epgChannelMap[normalizeText(channel.name)]) return epgChannelMap[normalizeText(channel.name)];

            return null;
        }

        function getCurrentEpg(channel) {
            var meta = getEpgChannelMeta(channel);
            if (!meta) return null;
            return epgProgramMap[meta.id] || null;
        }

        function getChannelLogo(channel) {
            var meta = getEpgChannelMeta(channel);
            if (channel && channel.logo) return channel.logo;
            if (meta && meta.icon) return meta.icon;
            return '';
        }

        function formatTime(ts) {
            if (!ts) return '';
            var d = new Date(ts);
            var h = d.getHours();
            var m = d.getMinutes();
            return (h < 10 ? '0' : '') + h + ':' + (m < 10 ? '0' : '') + m;
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
            centerCol.append($('<div class="iptv-head"></div>').text(state.currentGroup || 'Каналы'));

            if (!state.currentChannels.length) {
                centerCol.append($('<div class="iptv-empty"></div>').text('Список пуст'));
                return;
            }

            state.currentChannels.forEach(function (channel) {
                var title = safeText(channel.name);
                if (isFavorite(channel)) title += ' ★';
                centerCol.append($('<div class="iptv-item"></div>').text(title));
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

            var logo = getChannelLogo(channel);
            if (logo) {
                var img = $('<img class="iptv-logo" alt="">');
                img.attr('src', logo);
                img.on('error', function () {
                    $(this).remove();
                });
                rightCol.append(img);
            }

            rightCol.append($('<div class="iptv-title"></div>').text(safeText(channel.name)));
            rightCol.append($('<div class="iptv-meta"></div>').text('Группа: ' + safeText(channel.group)));
            rightCol.append($('<div class="iptv-url"></div>').text(safeText(channel.url)));

            var epg = getCurrentEpg(channel);
            if (epg) {
                if (epg.current) {
                    var cur = $('<div class="iptv-epg"></div>');
                    cur.append($('<div class="iptv-epg-title"></div>').text('Сейчас: ' + epg.current.title));
                    cur.append($('<div class="iptv-epg-time"></div>').text(formatTime(epg.current.start) + ' - ' + formatTime(epg.current.stop)));
                    rightCol.append(cur);
                }

                if (epg.next) {
                    var next = $('<div class="iptv-epg"></div>');
                    next.append($('<div class="iptv-epg-title"></div>').text('Далее: ' + epg.next.title));
                    next.append($('<div class="iptv-epg-time"></div>').text(formatTime(epg.next.start) + ' - ' + formatTime(epg.next.stop)));
                    rightCol.append(next);
                }
            }

            buildRightItems();

            state.rightItems.forEach(function (item) {
                rightCol.append($('<div class="iptv-item"></div>').text(item.title));
            });
        }

        function renderBrowser() {
            if (state.currentGroup && state.currentGroup !== 'История') {
                config.lastChannelByGroup[state.currentGroup] = selectedChannel() ? selectedChannel().url : '';
                saveConfig();
            }

            renderLeft();
            renderCenter();
            renderRight();
            applyCompactMode();
            updateFocus();
        }

        function renderPlaylistsOverlay() {
            overlayScreen.empty().removeClass('iptv-hidden');

            state.playlistItems = config.playlists.map(function (pl, index) {
                return {
                    title: (index === config.currentPlaylist ? '• ' : '') + pl.name,
                    subtitle: pl.url,
                    index: index,
                    locked: !!pl.locked
                };
            });

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

            panel.append($('<div class="iptv-head"></div>').text(state.keyboardTitle));
            panel.append($('<div class="iptv-item"></div>').text('Menu: удалить символ'));
            panel.append($('<div class="iptv-item"></div>').text('Back: отмена'));

            var kbHead = $('<div class="iptv-kb-head"></div>');
            kbHead.append($('<div class="iptv-head"></div>').text('Клавиатура'));
            kbHead.append($('<div class="iptv-kb-lang"></div>').text(keyboardLang.toUpperCase()));
            main.append(kbHead);

            main.append($('<div class="iptv-display"></div>').text(state.keyboardValue || ' '));

            var grid = $('<div class="iptv-keyboard"></div>');
            keyboardKeys().forEach(function (key) {
                grid.append($('<div class="iptv-key"></div>').text(key));
            });
            main.append(grid);

            var actions = $('<div class="iptv-actions"></div>');
            KEYBOARD_ACTIONS.forEach(function (action) {
                actions.append($('<div class="iptv-action-btn"></div>').text(action.title));
            });
            main.append(actions);

            overlayScreen.append(panel, main);
            updateFocus();
        }

        function renderOverlay() {
            if (view === 'playlists') renderPlaylistsOverlay();
            else if (view === 'keyboard') renderKeyboardOverlay();
            else overlayScreen.addClass('iptv-hidden').empty();
        }

        function renderAll() {
            renderBrowser();
            renderOverlay();
        }

        function openKeyboard(mode, title, value, lang) {
            view = 'keyboard';
            keyboardMode = mode;
            keyboardLang = lang || 'en';
            state.keyboardTitle = title;
            state.keyboardValue = value || '';
            state.overlayKeyIndex = 0;
            renderOverlay();
        }

        function closeOverlay() {
            view = 'browser';
            overlayScreen.addClass('iptv-hidden').empty();
            updateFocus();
        }

        function submitKeyboard() {
            var value = safeText(state.keyboardValue).trim();

            if (keyboardMode === 'add') {
                if (!value || value.indexOf('http') !== 0) {
                    Lampa.Noty.show('Неверный URL');
                    return;
                }
                validateAndAddPlaylist(value);
                return;
            }

            if (keyboardMode === 'rename') {
                renameCurrentPlaylist(value);
                closeOverlay();
                return;
            }

            if (keyboardMode === 'epg') {
                config.settings.epgUrl = value;
                config.settings.epgEnabled = true;
                saveConfig();
                closeOverlay();
                loadEpg(true);
                return;
            }

            var filtered = state.allChannels.filter(function (channel) {
                return normalizeText(channel.name).indexOf(normalizeText(value)) !== -1;
            });

            state.currentGroup = 'Поиск';
            state.currentChannels = filtered;
            state.centerIndex = 0;
            state.rightIndex = 0;
            buildRightItems();
            state.activeColumn = 'center';
            closeOverlay();
            renderBrowser();

            if (!filtered.length) Lampa.Noty.show('Ничего не найдено');
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

        function activateController() {
            try {
                Lampa.Controller.toggle(controller_name);
            } catch (e) {}
        }

        function exitPlugin() {
            try {
                Lampa.Controller.toggle('menu');
            } catch (e) {}

            try {
                Lampa.Activity.back();
            } catch (e) {}
        }

        function playSelectedChannel() {
            var channel = selectedChannel();
            var enabled = controller_name;
            var video;

            if (!channel || !channel.url) {
                Lampa.Noty.show('Канал не выбран');
                return;
            }

            try {
                if (Lampa.Controller.enabled && Lampa.Controller.enabled() && Lampa.Controller.enabled().name) {
                    enabled = Lampa.Controller.enabled().name;
                }
            } catch (e) {}

            video = {
                title: channel.name,
                url: channel.url
            };

            addHistory(channel);

            try {
                Lampa.Player.play(video);
            } catch (e) {
                Lampa.Noty.show('Ошибка запуска плеера');
                return;
            }

            if (typeof Lampa.Player.callback === 'function') {
                Lampa.Player.callback(function () {
                    try {
                        Lampa.Controller.toggle(enabled);
                    } catch (e) {
                        activateController();
                    }

                    setTimeout(function () {
                        activateController();
                        updateFocus();
                    }, 50);
                });
            }
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

        function activateLeftItem() {
            var item = selectedLeftItem();
            if (!item) return;

            if (item.type === 'action') {
                if (item.action === 'open_add') openKeyboard('add', 'Введите URL плейлиста', 'http://', 'en');
                else if (item.action === 'open_playlists') {
                    view = 'playlists';
                    state.overlayListIndex = config.currentPlaylist;
                    renderOverlay();
                }
                else if (item.action === 'search') openKeyboard('search', 'Поиск канала', '', 'ru');
                else if (item.action === 'rename') openKeyboard('rename', 'Новое имя плейлиста', currentPlaylist() ? currentPlaylist().name : '', 'ru');
                else if (item.action === 'epg') openKeyboard('epg', 'XMLTV URL', config.settings.epgUrl || 'http://', 'en');
                else if (item.action === 'compact') {
                    config.settings.compact = !config.settings.compact;
                    saveConfig();
                    renderBrowser();
                }
                return;
            }

            selectGroup(item.group, true);
        }

        function activateRightItem() {
            var item = selectedRightItem();
            var channel = selectedChannel();

            if (!item || !channel) return;

            if (item.action === 'play') playSelectedChannel();
            else if (item.action === 'favorite') toggleFavorite(channel);
            else if (item.action === 'remove_playlist') deleteCurrentPlaylist();
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
            overlayScreen.find('.iptv-item').removeClass('active');
            overlayScreen.find('.iptv-key').removeClass('active');
            overlayScreen.find('.iptv-action-btn').removeClass('active');

            if (view === 'browser') {
                if (state.activeColumn === 'left') {
                    var leftItem = leftCol.find('.iptv-item').eq(state.leftIndex).addClass('active');
                    ensureVisible(leftCol, leftItem, state.leftIndex);
                } else if (state.activeColumn === 'center') {
                    var centerItem = centerCol.find('.iptv-item').eq(state.centerIndex + 1).addClass('active');
                    ensureVisible(centerCol, centerItem, state.centerIndex);
                } else if (state.activeColumn === 'right') {
                    var rightItem = rightCol.find('.iptv-item').eq(state.rightIndex).addClass('active');
                    ensureVisible(rightCol, rightItem, state.rightIndex);
                }
                return;
            }

            if (view === 'playlists') {
                var playlistItem = overlayScreen.find('.iptv-overlay-panel .iptv-item').eq(state.overlayListIndex).addClass('active');
                ensureVisible(overlayScreen.find('.iptv-overlay-panel'), playlistItem, state.overlayListIndex);
                return;
            }

            if (view === 'keyboard') {
                if (state.overlayKeyIndex < keyboardKeys().length) {
                    overlayScreen.find('.iptv-key').eq(state.overlayKeyIndex).addClass('active');
                } else {
                    overlayScreen.find('.iptv-action-btn').eq(state.overlayKeyIndex - keyboardKeys().length).addClass('active');
                }
            }
        }

        function addController() {
            if (controllerReady) return;

            Lampa.Controller.add(controller_name, {
                up: function () {
                    if (view === 'browser') {
                        if (state.activeColumn === 'left' && state.leftIndex > 0) {
                            state.leftIndex--;
                            updateFocus();
                        } else if (state.activeColumn === 'center' && state.centerIndex > 0) {
                            state.centerIndex--;
                            if (state.currentGroup && state.currentGroup !== 'История' && state.currentGroup !== 'Поиск') {
                                config.lastChannelByGroup[state.currentGroup] = selectedChannel() ? selectedChannel().url : '';
                                saveConfig();
                            }
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

                    if (view === 'keyboard') {
                        if (state.overlayKeyIndex >= 10) state.overlayKeyIndex -= 10;
                        updateFocus();
                    }
                },
                down: function () {
                    if (view === 'browser') {
                        if (state.activeColumn === 'left' && state.leftIndex < state.leftItems.length - 1) {
                            state.leftIndex++;
                            updateFocus();
                        } else if (state.activeColumn === 'center' && state.centerIndex < state.currentChannels.length - 1) {
                            state.centerIndex++;
                            if (state.currentGroup && state.currentGroup !== 'История' && state.currentGroup !== 'Поиск') {
                                config.lastChannelByGroup[state.currentGroup] = selectedChannel() ? selectedChannel().url : '';
                                saveConfig();
                            }
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

                    if (view === 'keyboard') {
                        var next = state.overlayKeyIndex + 10;
                        if (next < keyCount()) state.overlayKeyIndex = next;
                        updateFocus();
                    }
                },
                left: function () {
                    if (view === 'browser') {
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

                        exitPlugin();
                        return;
                    }

                    if (view === 'keyboard') {
                        if (state.overlayKeyIndex > 0) state.overlayKeyIndex--;
                        updateFocus();
                    }
                },
                right: function () {
                    if (view === 'browser') {
                        if (state.activeColumn === 'left') {
                            var item = selectedLeftItem();
                            if (item && item.type === 'group') selectGroup(item.group, true);
                            else activateLeftItem();
                        } else if (state.activeColumn === 'center') {
                            if (state.currentChannels.length) state.activeColumn = 'right';
                        }
                        updateFocus();
                        return;
                    }

                    if (view === 'keyboard') {
                        if (state.overlayKeyIndex < keyCount() - 1) state.overlayKeyIndex++;
                        updateFocus();
                    }
                },
                enter: function () {
                    if (view === 'browser') {
                        if (state.activeColumn === 'left') activateLeftItem();
                        else if (state.activeColumn === 'center') {
                            if (state.currentChannels.length) state.activeColumn = 'right';
                        } else if (state.activeColumn === 'right') activateRightItem();
                        updateFocus();
                        return;
                    }

                    if (view === 'playlists') {
                        var playlistItem = selectedPlaylistItem();
                        if (playlistItem) {
                            config.currentPlaylist = playlistItem.index;
                            config.lastGroup = '⭐ Избранное';
                            saveConfig();
                            closeOverlay();
                            loadPlaylist(false);
                        }
                        return;
                    }

                    if (view === 'keyboard') {
                        var token = state.overlayKeyIndex < keyboardKeys().length
                            ? { type: 'char', value: keyboardKeys()[state.overlayKeyIndex] }
                            : { type: 'action', value: KEYBOARD_ACTIONS[state.overlayKeyIndex - keyboardKeys().length].code };

                        applyKey(token);
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

                    exitPlugin();
                },
                menu: function () {
                    if (view === 'playlists') {
                        var selected = selectedPlaylistItem();
                        if (!selected) return;

                        var target = config.playlists[selected.index];
                        if (!target || target.locked || config.playlists.length <= 1) {
                            Lampa.Noty.show('Этот плейлист нельзя удалить');
                            return;
                        }

                        config.playlists.splice(selected.index, 1);
                        if (config.currentPlaylist >= config.playlists.length) {
                            config.currentPlaylist = config.playlists.length - 1;
                        }
                        if (config.currentPlaylist < 0) config.currentPlaylist = 0;
                        saveConfig();
                        closeOverlay();
                        loadPlaylist(false);
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
                }
            });

            controllerReady = true;
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

            applyCompactMode();
            loadPlaylist(false);

            return root;
        };

        this.start = function () {
            addController();
            activateController();
            updateFocus();
        };

        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return root; };

        this.destroy = function () {
            try {
                Lampa.Controller.remove(controller_name);
            } catch (e) {}

            controllerReady = false;

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
