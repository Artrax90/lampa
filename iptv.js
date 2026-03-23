// ==Lampa==
// name: IPTV PRO Universal
// version: 4.1.3
// ==/Lampa==

(function () {
    'use strict';

    function IPTVUniversal() {
        var storage_key = 'iptv_universal_v413';
        var controller_name = 'iptv_universal';

        var root;
        var layout;
        var leftCol;
        var centerCol;
        var rightCol;
        var overlay;
        var mobileTabs;
        var requester = createRequester();

        var lastTouchAction = {
            tag: '',
            time: 0
        };

        var view = 'browser';
        var keyboardMode = 'add';
        var keyboardLang = 'en';
        var controllerReady = false;

        var config = loadConfig();

        var MANUAL_CHANNEL_MAP = {
            'bridge tv': { epg: 'bridge-tv' },
            'bridge tv hits': { epg: 'bridge-tv-dance' },
            'bridge tv dance': { epg: 'bridge-tv-dance' },
            'bridge tv русский хит': { epg: 'bridge-tv-ruxit' },
            'bridge tv russkiy hit': { epg: 'bridge-tv-ruxit' },
            'bridge tv фрэш': { epg: 'bridge-tv-fresh' },
            'bridge tv fresh': { epg: 'bridge-tv-fresh' },
            'bridge tv шлягер': { epg: 'bridge-tv-shlager' },
            'bridge tv shlager': { epg: 'bridge-tv-shlager' },
            'bridge classic': { epg: 'bridge-classic' },
            'bridge tv classic': { epg: 'bridge-classic' },

            'первый канал': { epg: 'pervy' },
            'первый канал hd': { epg: 'pervy' },
            'первый hd': { epg: 'pervy' },
            'первый канал европа': { epg: 'pervy' },
            'первый канал +1': { epg: 'pervy-pl1' },
            'первый канал +2': { epg: 'pervy-pl2' },
            'первый канал +3': { epg: 'pervy-pl3' },
            'первый канал +4': { epg: 'pervy-pl4' },
            'первый канал +5': { epg: 'pervy-pl5' },
            'первый канал +6': { epg: 'pervy-pl6' },
            'первый канал (+1)': { epg: 'pervy-pl1' },
            'первый канал (+2)': { epg: 'pervy-pl2' },
            'первый канал (+3)': { epg: 'pervy-pl3' },
            'первый канал (+4)': { epg: 'pervy-pl4' },
            'первый канал (+5)': { epg: 'pervy-pl5' },
            'первый канал (+6)': { epg: 'pervy-pl6' },
            'первый': { epg: 'pervy' },

            'россия 1': { epg: 'rossia1' },
            'россия 1 hd': { epg: 'rossia1' },
            'россия1': { epg: 'rossia1' },
            'россия 1 +1': { epg: 'rossia1-pl1' },
            'россия 1 +2': { epg: 'rossia1-pl2' },
            'россия 1 +4': { epg: 'rossia1-pl4' },
            'россия 1 (+1)': { epg: 'rossia1-pl1' },
            'россия 1 (+2)': { epg: 'rossia1-pl2' },
            'россия 1 (+4)': { epg: 'rossia1-pl4' },

            'rtr planeta': { epg: 'rtr-planeta' },
            'ртр планета': { epg: 'rtr-planeta' },
            'ртр планета азия': { epg: 'rtr-planeta-azia' },
            'rtr planeta azia': { epg: 'rtr-planeta-azia' },

            'россия культура': { epg: 'rossiya-k' },
            'россия культура hd': { epg: 'rossiya-k' },
            'россия к': { epg: 'rossiya-k' },
            'культура': { epg: 'rossiya-k' },

            'первый российский национальный канал': { epg: 'prnk-tv' },
            'первый российский национальный канал hd': { epg: 'prnk-tv' },

            'матч': { epg: 'match-tv' },
            'матч!': { epg: 'match-tv' },
            'матч тв': { epg: 'match-tv' },
            'match tv': { epg: 'match-tv' },

            'нтв': { epg: 'ntv' },
            'нтв hd': { epg: 'ntv' },
            'нтв мир': { epg: 'ntv-mir' },
            'нтв стиль': { epg: 'ntv-style' },
            'нтв право': { epg: 'ntv-pravo' },
            'нтв хит': { epg: 'ntv-xit' },
            'нтв сериал': { epg: 'ntv-serial' },

            'пятый канал': { epg: '5kanal' },
            'пятый канал int': { epg: '5kanal-ru-pl2' },
            'пятый канал international': { epg: '5kanal-ru-pl2' },

            '8 канал россия': { epg: '8kanal-ru' },
            '8 канал европа': { epg: '8kanal-eu' },

            'отр': { epg: 'otr' },

            'твц': { epg: 'tvcentr' },
            'тв центр': { epg: 'tvcentr' },
            'тв центр hd': { epg: 'tvcentr' },

            'рен тв': { epg: 'rentv' },
            'рен тв hd': { epg: 'rentv' },
            'рентв': { epg: 'rentv' },
            'rentv': { epg: 'rentv' },
            'ren tv': { epg: 'rentv' },
            'рен тв international': { epg: 'rentv' },

            'стс': { epg: 'sts' },
            'стс hd': { epg: 'sts' },
            'стс international': { epg: 'sts' },
            'стс +2': { epg: 'sts-pl2' },
            'стс +4': { epg: 'sts-pl4' },
            'стс +7': { epg: 'sts-pl7' },
            'стс (+2)': { epg: 'sts-pl2' },
            'стс (+4)': { epg: 'sts-pl4' },
            'стс (+7)': { epg: 'sts-pl7' },

            'домашний': { epg: 'domashny' },
            'домашний hd': { epg: 'domashny' },

            'тв3': { epg: 'tv3-ru' },
            'тв 3': { epg: 'tv3-ru' },
            'тв-3': { epg: 'tv3-ru' },
            'tv 3': { epg: 'tv3-ru' },
            'tv-3': { epg: 'tv3-ru' },
            'тв3 hd': { epg: 'tv3-ru' },

            'пятница': { epg: 'piatnica' },
            'пятница!': { epg: 'piatnica' },
            'пятница hd': { epg: 'piatnica' },
            'пятница! hd': { epg: 'piatnica' },
            'пятница international': { epg: 'piatnica' },

            'звезда': { epg: 'zvezda' },
            'звезда hd': { epg: 'zvezda' },
            'звезда плюс': { epg: 'zvezda-plus' },
            'звезда плюс hd': { epg: 'zvezda-plus' },

            'мир': { epg: 'mir' },
            'мир hd': { epg: 'mir' },
            'мир international': { epg: 'mir-kz' },

            'тнт': { epg: 'tnt' },
            'тнт hd': { epg: 'tnt' },
            'тнт international': { epg: 'tnt' },
            'тнт international снг': { epg: 'tnt-int-cis' },
            'тнт-international снг': { epg: 'tnt-int-cis' },

            'муз тв': { epg: 'muztv' },
            'муз-тв': { epg: 'muztv' },
            'муз тв hd': { epg: 'muztv' },
            'муз-тв hd': { epg: 'muztv' },
            'muz tv': { epg: 'muztv' },

            '360 новости': { epg: '360-novosti' },
            '360 новости hd': { epg: '360-novosti' },

            'rtvi': { epg: 'rtvi' },
            'рбк': { epg: 'rbk' },
            'рбк hd': { epg: 'rbk' },
            'россия 24': { epg: 'rossia-24' },
            'обком': { epg: 'obkom' },

            'record russian hits': { epg: 'record-russian-hits' },
            'record супердискотека 90х': { epg: 'record-superdiskoteka-90x' },
            'record trance': { epg: 'record-trance' },
            'record megamix': { epg: 'record-megamix' },
            'ru tv': { epg: 'ru-tv' },
            'рутв': { epg: 'ru-tv' },
            'euromusic': { epg: 'euromusic' }
        };

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
            mobileTab: 'left',
            playlistEpgUrl: '',
            epgLoaded: false,
            epgStatus: {
                state: 'idle',
                url: '',
                message: 'EPG не загружен'
            }
        };

        var epg = {
            url: '',
            programsById: {},
            namesMap: {},
            iconById: {},
            iconByName: {},
            pageProgramsById: {},
            pagePendingById: {},
            pageFailedById: {}
        };

        var DEFAULT_EPG_URL = 'https://iptvx.one/epg/epg.xml.gz';
        var FALLBACK_EPG_URLS = [
            'https://iptv-epg.org/files/epg-ru.xml',
            'https://iptvx.one/EPG_NOARCH',
            'https://iptvx.one/EPG_LITE',
            'https://iptvx.one/EPG'
        ];

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

        function createRequester() {
            try {
                if (window.Lampa && Lampa.Reguest) return new Lampa.Reguest();
            } catch (e) {
                logError('createRequester', e);
            }

            return null;
        }

        function requestText(url, timeout, success, error) {
            var done = false;
            var timer = setTimeout(function () {
                if (done) return;
                done = true;
                error({ timeout: true, url: url });
            }, timeout || 25000);

            function finishSuccess(data) {
                if (done) return;
                done = true;
                clearTimeout(timer);
                success(typeof data === 'string' ? data : safeText(data));
            }

            function finishError(err) {
                if (done) return;
                done = true;
                clearTimeout(timer);
                error(err);
            }

            try {
                if (requester && requester.timeout) requester.timeout(timeout || 25000);

                if (requester && requester.silent) {
                    requester.silent(url, function (data) {
                        finishSuccess(data);
                    }, function (err) {
                        finishError(err);
                    }, false, {
                        dataType: 'text'
                    });
                    return;
                }
            } catch (e) {
                logError('requestText.silent', e);
            }

            $.ajax({
                url: url,
                method: 'GET',
                dataType: 'text',
                timeout: timeout || 25000,
                success: function (text) {
                    finishSuccess(text || '');
                },
                error: function (err) {
                    finishError(err);
                }
            });
        }

        function logError(tag, err) {
            try {
                console.error('[IPTV PRO]', tag, err);
            } catch (e) {}
        }

        function runSafe(tag, fn) {
            try {
                return fn();
            } catch (err) {
                logError(tag, err);
            }
        }

        function loadConfig() {
            var raw;
            var def = defaults();

            try {
                raw = Lampa.Storage.get(storage_key, def) || {};
            } catch (e) {
                raw = def;
            }

            if (!Array.isArray(raw.playlists) || !raw.playlists.length) raw.playlists = def.playlists.slice();

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
                    group: item.group || 'ОБЩИЕ',
                    logo: item.logo || '',
                    id: item.id || '',
                    epgName: item.epgName || ''
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
                logError('saveConfig', e);
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

        function isTouchDevice() {
            try {
                return !!(
                    ('ontouchstart' in window) ||
                    (navigator && navigator.maxTouchPoints > 0) ||
                    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
                );
            } catch (e) {
                return false;
            }
        }

        function shouldSkipTouchAction(tag) {
            if (!isTouchDevice()) return false;

            var now = Date.now();

            if (lastTouchAction.tag === tag && (now - lastTouchAction.time) < 650) {
                return true;
            }

            lastTouchAction.tag = tag;
            lastTouchAction.time = now;
            return false;
        }

        function notify(text) {
            try {
                if (Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(text);
            } catch (e) {
                logError('notify', e);
            }
        }

        function formatTime(value) {
            if (!value) return '';
            var date = value instanceof Date ? value : parseXmltvDate(value);
            if (!date || isNaN(date.getTime())) return '';
            var hh = date.getHours();
            var mm = date.getMinutes();
            return (hh < 10 ? '0' : '') + hh + ':' + (mm < 10 ? '0' : '') + mm;
        }

        function cleanupChannelName(value) {
            return safeText(value)
                .replace(/\([^)]*\)/g, ' ')
                .replace(/\[[^\]]*\]/g, ' ')
                .replace(/\b(uhd|fhd|hd|sd|4k)\b/gi, ' ')
                .replace(/\+\s*\d+\b/g, ' ')
                .replace(/\b\d+\+\b/g, ' ')
                .replace(/[._-]+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function normalizeName(value) {
            return cleanupChannelName(value).toLowerCase();
        }

        function decodeHtml(value) {
            return safeText(value)
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>');
        }

        function extractAttr(line, name) {
            var match = line.match(new RegExp(name + '="([^"]*)"', 'i'));
            return match ? decodeHtml(match[1].trim()) : '';
        }

        function parseXmltvDate(value) {
            var clean = safeText(value).trim();
            var match = clean.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+\-]\d{4})?/);

            if (!match) return null;

            var year = parseInt(match[1], 10);
            var month = parseInt(match[2], 10) - 1;
            var day = parseInt(match[3], 10);
            var hour = parseInt(match[4], 10);
            var minute = parseInt(match[5], 10);
            var second = parseInt(match[6], 10);
            var offset = match[7];

            if (offset) {
                var sign = offset.charAt(0) === '-' ? -1 : 1;
                var offHour = parseInt(offset.slice(1, 3), 10);
                var offMin = parseInt(offset.slice(3, 5), 10);
                var utc = Date.UTC(year, month, day, hour, minute, second);
                var shift = sign * (offHour * 60 + offMin) * 60000;
                return new Date(utc - shift);
            }

            return new Date(year, month, day, hour, minute, second);
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

        function isFavorite(channel) {
            if (!channel || !channel.url) return false;

            for (var i = 0; i < config.favorites.length; i++) {
                if (config.favorites[i].url === channel.url) return true;
            }

            return false;
        }

        function getManualChannelMeta(channel) {
            var variants = [
                normalizeName(channel && channel.name),
                normalizeName(channel && channel.epgName),
                normalizeName(cleanupChannelName(channel && channel.name)),
                normalizeName(cleanupChannelName(channel && channel.epgName))
            ];
            var i;

            for (i = 0; i < variants.length; i++) {
                if (variants[i] && MANUAL_CHANNEL_MAP[variants[i]]) return MANUAL_CHANNEL_MAP[variants[i]];
            }

            return null;
        }

        function mergeManualMeta(channel) {
            var meta = getManualChannelMeta(channel);
            if (!meta) return channel;

            if ((!channel.id || channel.id === 'no_tvg') && meta.epg) channel.id = meta.epg;
            if (!channel.logo && meta.logo) channel.logo = meta.logo;

            return channel;
        }

        function resolveChannelLogo(channel) {
            var names;
            var i;
            var nameKey;
            var meta;

            if (!channel) return '';
            if (channel.logo) return channel.logo;

            meta = getManualChannelMeta(channel);

            if (channel.id && epg.iconById[channel.id]) return epg.iconById[channel.id];
            if (meta && meta.epg && epg.iconById[meta.epg]) return epg.iconById[meta.epg];
            if (meta && meta.logo) return meta.logo;

            names = [
                channel.epgName,
                channel.name,
                cleanupChannelName(channel.name),
                cleanupChannelName(channel.epgName)
            ];

            for (i = 0; i < names.length; i++) {
                nameKey = normalizeName(names[i]);
                if (nameKey && epg.iconByName[nameKey]) return epg.iconByName[nameKey];
            }

            return '';
        }

        function epgStatusText(channel, epgMatch) {
            var meta = getManualChannelMeta(channel);
            var pageId = meta && meta.epg ? meta.epg : (channel && channel.id ? channel.id : '');

            if (epgMatch && epgMatch.length) {
                if (pageId && epg.pageProgramsById[pageId]) return 'EPG: страница канала';
                return 'EPG: загружен';
            }

            if (pageId && epg.pagePendingById[pageId]) return 'EPG: загрузка канала...';
            if (pageId && epg.pageFailedById[pageId]) return 'EPG: источник недоступен';
            if (state.epgStatus.state === 'loaded') return 'EPG: загружен';
            if (state.epgStatus.state === 'loaded_empty') return 'EPG: файл пустой';
            if (state.epgStatus.state === 'error') return 'EPG: ошибка загрузки';
            if (state.epgStatus.state === 'loading') return 'EPG: загрузка...';
            return 'EPG: не загружен';
        }

        function epgSourceText(channel, epgMatch) {
            var meta = getManualChannelMeta(channel);
            var pageId = meta && meta.epg ? meta.epg : (channel && channel.id ? channel.id : '');

            if (epgMatch && epgMatch.length && pageId && epg.pageProgramsById[pageId]) {
                return 'https://epg.iptvx.one/id/' + pageId;
            }

            return state.epgStatus.url || '';
        }

        function epgCandidates() {
            var list = [];
            var seen = {};

            function push(url) {
                if (!url || seen[url]) return;
                seen[url] = true;
                list.push(url);
            }

            push(state.playlistEpgUrl);
            push(DEFAULT_EPG_URL);

            FALLBACK_EPG_URLS.forEach(function (url) {
                push(url);
            });

            return list;
        }

        function parseRuMonth(value) {
            var months = {
                'января': 0,
                'февраля': 1,
                'марта': 2,
                'апреля': 3,
                'мая': 4,
                'июня': 5,
                'июля': 6,
                'августа': 7,
                'сентября': 8,
                'октября': 9,
                'ноября': 10,
                'декабря': 11
            };

            return months[value] != null ? months[value] : -1;
        }

        function parseChannelPagePrograms(html) {
            var doc = new DOMParser().parseFromString(html, 'text/html');
            var text = safeText(doc.body ? doc.body.textContent : '');
            var lines = text.split(/\r?\n/).map(function (line) {
                return line.replace(/\s+/g, ' ').trim();
            }).filter(Boolean);
            var started = false;
            var currentDate = null;
            var programs = [];
            var i;

            for (i = 0; i < lines.length; i++) {
                var line = lines[i];

                if (!started) {
                    if (line.indexOf('Программа показана') >= 0) started = true;
                    continue;
                }

                var dayMatch = line.match(/^(Понедельник|Вторник|Среда|Четверг|Пятница|Суббота|Воскресенье),\s+(\d{1,2})\s+([а-яё]+)\s+(\d{4})\s*г\.?$/i);
                if (dayMatch) {
                    var day = parseInt(dayMatch[2], 10);
                    var month = parseRuMonth(dayMatch[3].toLowerCase());
                    var year = parseInt(dayMatch[4], 10);

                    if (month >= 0) currentDate = { year: year, month: month, day: day };
                    continue;
                }

                var timeMatch = line.match(/^(\d{2}:\d{2})\s+(.+)$/);
                if (timeMatch && currentDate) {
                    var hm = timeMatch[1].split(':');
                    var title = timeMatch[2].trim();
                    var start = new Date(currentDate.year, currentDate.month, currentDate.day, parseInt(hm[0], 10), parseInt(hm[1], 10), 0);

                    programs.push({
                        title: title,
                        start: start,
                        stop: null
                    });
                }
            }

            programs.sort(function (a, b) {
                return a.start.getTime() - b.start.getTime();
            });

            for (i = 0; i < programs.length; i++) {
                programs[i].stop = programs[i + 1] ? programs[i + 1].start : new Date(programs[i].start.getTime() + 3600000);
            }

            return programs;
        }

        function selectCurrentPrograms(programs) {
            var now = Date.now();
            var i;

            if (!programs || !programs.length) return null;

            for (i = 0; i < programs.length; i++) {
                var current = programs[i];
                var next = programs[i + 1] || null;

                if (now >= current.start.getTime() && now < current.stop.getTime()) {
                    return [current, next].filter(Boolean);
                }

                if (now < current.start.getTime()) {
                    return [current, next].filter(Boolean);
                }
            }

            return [programs[programs.length - 1]];
        }

        function ensureChannelPageEpg(channel) {
            var meta = getManualChannelMeta(channel);
            var epgId = meta && meta.epg ? meta.epg : (channel && channel.id ? channel.id : '');

            if (!epgId) return;
            if (epg.pageProgramsById[epgId]) return;
            if (epg.pagePendingById[epgId]) return;
            if (epg.pageFailedById[epgId]) return;

            epg.pagePendingById[epgId] = true;

            requestText('https://epg.iptvx.one/id/' + epgId, 8000, function (html) {
                delete epg.pagePendingById[epgId];

                runSafe('parseChannelPagePrograms', function () {
                    var programs = parseChannelPagePrograms(html || '');

                    if (programs && programs.length) {
                        epg.pageProgramsById[epgId] = programs;
                    } else {
                        epg.pageFailedById[epgId] = 'empty';
                    }

                    renderCenter();
                    renderRight();
                    updateFocus();
                });
            }, function (err) {
                delete epg.pagePendingById[epgId];
                epg.pageFailedById[epgId] = err && err.timeout ? 'timeout' : 'error';
                logError('ensureChannelPageEpg', { id: epgId, error: err });
                renderRight();
                updateFocus();
            });
        }

        function ensureStyles() {
            if ($('#iptv-universal-style').length) return;

            $('head').append(
                '<style id="iptv-universal-style">' +
                '.iptv-root{position:fixed;top:0;left:0;right:0;bottom:0;z-index:1000;background:#0b0d10;color:#fff;padding-top:5rem;overflow:hidden;}' +
                '.iptv-layout{display:flex;width:100%;height:100%;}' +
                '.iptv-col{height:100%;overflow-y:auto;box-sizing:border-box;background:rgba(255,255,255,0.02);border-right:1px solid rgba(255,255,255,0.08);-webkit-overflow-scrolling:touch;touch-action:pan-y;overscroll-behavior:contain;}' +
                '.iptv-left{width:23rem;}' +
                '.iptv-center{flex:1;}' +
                '.iptv-right{width:26rem;padding:1.5rem;border-right:none;background:#080a0d;}' +
                '.iptv-head{padding:1rem;font-size:1.25rem;font-weight:700;display:flex;align-items:center;gap:0.75rem;}' +
                '.iptv-sub{padding:0 1rem 0.75rem 1rem;color:rgba(255,255,255,0.6);font-size:0.92rem;}' +
                '.iptv-item,.iptv-key,.iptv-kbtn,.iptv-tab{margin:0.35rem;padding:0.95rem;border-radius:0.55rem;background:rgba(255,255,255,0.05);cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent;touch-action:pan-y manipulation;}' +
                '.iptv-item.active,.iptv-key.active,.iptv-kbtn.active,.iptv-tab.active{background:#2962ff!important;}' +
                '.iptv-row{display:flex;align-items:center;gap:0.75rem;min-width:0;}' +
                '.iptv-logo{width:2.2rem;height:2.2rem;object-fit:contain;flex:0 0 2.2rem;border-radius:0.4rem;background:rgba(255,255,255,0.04);}' +
                '.iptv-logo--big{width:5rem;height:5rem;margin-bottom:1rem;display:block;}' +
                '.iptv-row-text{min-width:0;flex:1;}' +
                '.iptv-row-title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
                '.iptv-row-sub{margin-top:0.2rem;font-size:0.82rem;color:rgba(255,255,255,0.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
                '.iptv-empty{padding:1rem;color:rgba(255,255,255,0.6);}' +
                '.iptv-title{font-size:1.4rem;font-weight:700;margin-bottom:0.8rem;word-break:break-word;}' +
                '.iptv-meta{opacity:0.82;margin-bottom:0.75rem;word-break:break-word;}' +
                '.iptv-url{opacity:0.6;font-size:0.9rem;word-break:break-all;margin-bottom:1.25rem;}' +
                '.iptv-epg{margin-bottom:1rem;padding:0.9rem;border-radius:0.55rem;background:rgba(255,255,255,0.04);}' +
                '.iptv-epg-line{margin-bottom:0.45rem;word-break:break-word;}' +
                '.iptv-epg-line:last-child{margin-bottom:0;}' +
                '.iptv-epg-label{display:inline-block;min-width:4rem;color:rgba(255,255,255,0.6);}' +
                '.iptv-overlay{position:absolute;top:5rem;left:0;right:0;bottom:0;background:#0b0d10;display:flex;z-index:10;}' +
                '.iptv-overlay.hidden{display:none;}' +
                '.iptv-overlay-left{width:28rem;overflow-y:auto;border-right:1px solid rgba(255,255,255,0.08);background:rgba(255,255,255,0.03);touch-action:pan-y;overscroll-behavior:contain;}' +
                '.iptv-overlay-right{flex:1;overflow-y:auto;padding:1.5rem;}' +
                '.iptv-display{padding:1rem;border-radius:0.55rem;background:rgba(255,255,255,0.06);min-height:3rem;margin-bottom:1rem;word-break:break-all;}' +
                '.iptv-keyboard{display:grid;grid-template-columns:repeat(10,1fr);gap:0.45rem;}' +
                '.iptv-key{margin:0;padding:0.8rem 0.3rem;text-align:center;}' +
                '.iptv-krow{display:grid;grid-template-columns:repeat(4,1fr);gap:0.45rem;margin-top:0.75rem;}' +
                '.iptv-kbtn{margin:0;text-align:center;}' +
                '.iptv-tabs{display:none;gap:0.5rem;padding:0.75rem;background:#0b0d10;border-bottom:1px solid rgba(255,255,255,0.08);}' +
                '.iptv-tab{margin:0;text-align:center;flex:1;}' +
                '.iptv-plugin-ico{width:2rem;height:2rem;display:inline-flex;align-items:center;justify-content:center;flex:0 0 2rem;}' +
                '.iptv-plugin-ico svg{width:1.45rem;height:1.45rem;display:block;fill:none;stroke:#fff;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;}' +
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
                '}' +
                '</style>'
            );
        }

        function attachTouchTap(el, tag, handler) {
            var startX = 0;
            var startY = 0;
            var moved = false;
            var started = false;
            var touchId = null;

            el.on('touchstart', function (e) {
                var t = e.originalEvent && e.originalEvent.changedTouches ? e.originalEvent.changedTouches[0] : null;
                if (!t) return;

                touchId = t.identifier;
                startX = t.clientX;
                startY = t.clientY;
                moved = false;
                started = true;
            });

            el.on('touchmove', function (e) {
                var touches = e.originalEvent && e.originalEvent.changedTouches ? e.originalEvent.changedTouches : null;
                var i;
                var t = null;

                if (!started || !touches) return;

                for (i = 0; i < touches.length; i++) {
                    if (touches[i].identifier === touchId) {
                        t = touches[i];
                        break;
                    }
                }

                if (!t) return;

                if (Math.abs(t.clientX - startX) > 12 || Math.abs(t.clientY - startY) > 12) {
                    moved = true;
                }
            });

            el.on('touchcancel', function () {
                started = false;
                moved = false;
                touchId = null;
            });

            el.on('touchend', function (e) {
                var touches = e.originalEvent && e.originalEvent.changedTouches ? e.originalEvent.changedTouches : null;
                var i;
                var t = null;

                if (!started || !touches) return;

                for (i = 0; i < touches.length; i++) {
                    if (touches[i].identifier === touchId) {
                        t = touches[i];
                        break;
                    }
                }

                if (!t) return;

                if (Math.abs(t.clientX - startX) > 12 || Math.abs(t.clientY - startY) > 12) {
                    moved = true;
                }

                if (!moved && !shouldSkipTouchAction(tag)) {
                    e.preventDefault();
                    e.stopPropagation();
                    runSafe(tag, handler);
                }

                started = false;
                moved = false;
                touchId = null;
            });

            el.on('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
            });
        }

        function bindAction(el, tag, handler) {
            if (isTouchDevice()) {
                attachTouchTap(el, tag, handler);
                return;
            }

            el.on('click', function (e) {
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

        function getMatchedEpg(channel) {
            var id;
            var byNameId;
            var names;
            var i;
            var key;
            var meta;

            if (!channel) return null;

            meta = getManualChannelMeta(channel);

            id = channel.id || '';
            if (id && epg.programsById[id]) return epg.programsById[id];
            if (meta && meta.epg && epg.programsById[meta.epg]) return epg.programsById[meta.epg];

            names = [
                channel.epgName,
                channel.name,
                cleanupChannelName(channel.name),
                cleanupChannelName(channel.epgName)
            ];

            for (i = 0; i < names.length; i++) {
                key = normalizeName(names[i]);
                byNameId = epg.namesMap[key];
                if (byNameId && epg.programsById[byNameId]) return epg.programsById[byNameId];
            }

            if (meta && meta.epg && epg.pageProgramsById[meta.epg]) {
                return selectCurrentPrograms(epg.pageProgramsById[meta.epg]);
            }

            if (id && epg.pageProgramsById[id]) {
                return selectCurrentPrograms(epg.pageProgramsById[id]);
            }

            return null;
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

        function parsePlaylist(text) {
            var lines = (text || '').split(/\r?\n/);
            var headerChecked = false;
            var i;

            state.channels = [];
            state.playlistEpgUrl = '';

            for (i = 0; i < lines.length; i++) {
                var line = (lines[i] || '').trim();

                if (!headerChecked && line.indexOf('#EXTM3U') === 0) {
                    state.playlistEpgUrl = extractAttr(line, 'url-tvg');
                    headerChecked = true;
                }

                if (line.indexOf('#EXTINF') === 0) {
                    var name = (line.match(/,(.*)$/) || ['', ''])[1].trim();
                    var group = extractAttr(line, 'group-title') || 'ОБЩИЕ';
                    var logo = extractAttr(line, 'tvg-logo');
                    var id = extractAttr(line, 'tvg-id');
                    var epgName = extractAttr(line, 'tvg-name');
                    var url = '';
                    var j;

                    for (j = i + 1; j < lines.length; j++) {
                        url = (lines[j] || '').trim();
                        if (!url) continue;
                        if (url.indexOf('#') === 0) continue;
                        break;
                    }

                    if (!name) name = 'Без названия';
                    if (!group) group = 'ОБЩИЕ';

                    if (url && url.indexOf('http') === 0) {
                        var channel = {
                            name: name,
                            url: url,
                            group: group,
                            logo: logo,
                            id: id,
                            epgName: epgName
                        };

                        state.channels.push(mergeManualMeta(channel));
                    }
                }
            }

            rebuildGroups();
            buildLeftItems();
            syncGroupSelection();
        }

        function resetEpg() {
            epg.url = '';
            epg.programsById = {};
            epg.namesMap = {};
            epg.iconById = {};
            epg.iconByName = {};
            epg.pageProgramsById = {};
            epg.pagePendingById = {};
            epg.pageFailedById = {};

            state.epgLoaded = false;
            state.epgStatus = {
                state: 'idle',
                url: '',
                message: 'EPG не загружен'
            };
        }

        function loadEpg() {
            var urls = epgCandidates();

            if (!urls.length) return;

            state.epgStatus = {
                state: 'loading',
                url: '',
                message: 'Загрузка EPG...'
            };
            renderRight();
            renderCenter();
            updateFocus();

            tryLoadEpg(urls, 0);
        }

        function tryLoadEpg(urls, index) {
            if (index >= urls.length) {
                state.epgStatus = {
                    state: 'error',
                    url: '',
                    message: 'Не удалось загрузить ни один EPG источник'
                };
                renderRight();
                renderCenter();
                updateFocus();

                ensureChannelPageEpg(selectedChannel());
                return;
            }

            var url = urls[index];

            if (epg.url === url && state.epgLoaded) {
                state.epgStatus = {
                    state: 'loaded',
                    url: url,
                    message: 'EPG загружен'
                };
                renderRight();
                renderCenter();
                updateFocus();
                return;
            }

            requestText(url, 25000, function (xmlText) {
                runSafe('parseEpg', function () {
                    var parsed = parseEpg(xmlText || '', url);

                    if (parsed) {
                        renderRight();
                        renderCenter();
                        updateFocus();
                    } else {
                        tryLoadEpg(urls, index + 1);
                    }
                });
            }, function (err) {
                logError('loadEpg', { url: url, error: err });
                tryLoadEpg(urls, index + 1);
            });
        }

        function parseEpg(xmlText, url) {
            var parser;
            var xml;
            var channels;
            var programmes;
            var now;
            var i;
            var totalPrograms = 0;
            var idsCount = 0;

            if (!xmlText) return false;

            parser = new DOMParser();
            xml = parser.parseFromString(xmlText, 'text/xml');

            if (!xml || xml.getElementsByTagName('parsererror').length) {
                state.epgStatus = {
                    state: 'error',
                    url: url,
                    message: 'Ошибка парсинга XMLTV'
                };
                return false;
            }

            channels = xml.getElementsByTagName('channel');
            programmes = xml.getElementsByTagName('programme');
            now = new Date().getTime();

            if (!channels.length && !programmes.length) {
                state.epgStatus = {
                    state: 'loaded_empty',
                    url: url,
                    message: 'EPG источник пустой'
                };
                return false;
            }

            epg.url = url;
            epg.programsById = {};
            epg.namesMap = {};
            epg.iconById = {};
            epg.iconByName = {};

            for (i = 0; i < channels.length; i++) {
                var channelNode = channels[i];
                var id = channelNode.getAttribute('id') || '';
                var names = channelNode.getElementsByTagName('display-name');
                var iconNode = channelNode.getElementsByTagName('icon')[0];
                var icon = iconNode ? safeText(iconNode.getAttribute('src') || '').trim() : '';
                var n;

                if (id) idsCount++;
                if (id && icon) epg.iconById[id] = icon;

                for (n = 0; n < names.length; n++) {
                    var rawName = safeText(names[n].textContent || '').trim();
                    var normName = normalizeName(rawName);

                    if (normName && !epg.namesMap[normName]) epg.namesMap[normName] = id;
                    if (normName && icon && !epg.iconByName[normName]) epg.iconByName[normName] = icon;
                }
            }

            for (i = 0; i < programmes.length; i++) {
                var programme = programmes[i];
                var channelId = programme.getAttribute('channel') || '';
                var start = parseXmltvDate(programme.getAttribute('start') || '');
                var stop = parseXmltvDate(programme.getAttribute('stop') || '');
                var titleNode = programme.getElementsByTagName('title')[0];
                var title = titleNode ? safeText(titleNode.textContent).trim() : '';

                if (!channelId || !start || !stop || !title) continue;
                if (stop.getTime() < now) continue;

                if (!epg.programsById[channelId]) epg.programsById[channelId] = [];

                epg.programsById[channelId].push({
                    title: title,
                    start: start,
                    stop: stop
                });
                totalPrograms++;
            }

            Object.keys(epg.programsById).forEach(function (id) {
                epg.programsById[id].sort(function (a, b) {
                    return a.start.getTime() - b.start.getTime();
                });
                if (epg.programsById[id].length > 6) epg.programsById[id] = epg.programsById[id].slice(0, 6);
            });

            state.epgLoaded = true;
            state.epgStatus = {
                state: totalPrograms ? 'loaded' : 'loaded_empty',
                url: url,
                message: totalPrograms ? ('EPG загружен: ' + idsCount + ' каналов, ' + totalPrograms + ' передач') : 'EPG без передач'
            };

            return !!totalPrograms;
        }

        function loadPlaylist() {
            var playlist = currentPlaylist();

            if (!playlist || !playlist.url) {
                notify('Плейлист не найден');
                parsePlaylist('');
                renderAll();
                return;
            }

            resetEpg();

            requestText(playlist.url, 20000, function (text) {
                runSafe('parsePlaylist', function () {
                    parsePlaylist(text || '');
                    renderAll();
                    loadEpg();
                });
            }, function (err) {
                logError('loadPlaylist', err);
                notify('Ошибка загрузки плейлиста');
                runSafe('parsePlaylistEmpty', function () {
                    parsePlaylist('');
                    renderAll();
                });
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

            [
                { key: 'left', title: 'Группы' },
                { key: 'center', title: 'Каналы' },
                { key: 'right', title: 'Инфо' }
            ].forEach(function (tab) {
                var btn = $('<div class="iptv-tab"></div>').attr('data-tab', tab.key).text(tab.title);
                if (state.mobileTab === tab.key) btn.addClass('active');

                bindAction(btn, 'tab:' + tab.key, function () {
                    state.mobileTab = tab.key;
                    state.activeColumn = tab.key;
                    applyMobileTabVisibility();
                    updateFocus();
                });

                mobileTabs.append(btn);
            });
        }

        function appendChannelRow(container, channel, subtitle) {
            var row = $('<div class="iptv-row"></div>');
            var logo = resolveChannelLogo(channel);

            if (logo) row.append($('<img class="iptv-logo" alt="">').attr('src', logo));
            else row.append($('<div class="iptv-logo"></div>'));

            var text = $('<div class="iptv-row-text"></div>');
            text.append($('<div class="iptv-row-title"></div>').text(channel.name));
            if (subtitle) text.append($('<div class="iptv-row-sub"></div>').text(subtitle));
            row.append(text);

            container.append(row);
        }

        function renderLeft() {
            leftCol.empty();

            var head = $('<div class="iptv-head"></div>');
            head.append(menuIcon());
            head.append($('<span></span>').text(currentPlaylist() ? currentPlaylist().name : 'IPTV'));
            leftCol.append(head);

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
                var epgMatch = getMatchedEpg(channel);
                var subtitle = '';
                var row = $('<div class="iptv-item"></div>');

                if (epgMatch && epgMatch.length) {
                    subtitle = formatTime(epgMatch[0].start) + ' ' + epgMatch[0].title;
                }

                appendChannelRow(row, channel, subtitle);

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
            var epgMatch;
            var epgBox;
            var logo;
            var sourceText;

            if (!channel) {
                rightCol.append($('<div class="iptv-empty"></div>').text('Выберите канал'));
                return;
            }

            epgMatch = getMatchedEpg(channel);
            if (!epgMatch || !epgMatch.length) ensureChannelPageEpg(channel);
            epgMatch = getMatchedEpg(channel);

            logo = resolveChannelLogo(channel);
            if (logo) rightCol.append($('<img class="iptv-logo iptv-logo--big" alt="">').attr('src', logo));

            rightCol.append($('<div class="iptv-title"></div>').text(channel.name));
            rightCol.append($('<div class="iptv-meta"></div>').text('Группа: ' + channel.group));
            rightCol.append($('<div class="iptv-meta"></div>').text(epgStatusText(channel, epgMatch)));

            sourceText = epgSourceText(channel, epgMatch);
            if (sourceText) rightCol.append($('<div class="iptv-meta"></div>').text('Источник: ' + sourceText));

            epgBox = $('<div class="iptv-epg"></div>');
            if (epgMatch && epgMatch.length) {
                epgBox.append(
                    $('<div class="iptv-epg-line"></div>').append(
                        $('<span class="iptv-epg-label"></span>').text('Сейчас'),
                        document.createTextNode(formatTime(epgMatch[0].start) + ' ' + epgMatch[0].title)
                    )
                );

                if (epgMatch[1]) {
                    epgBox.append(
                        $('<div class="iptv-epg-line"></div>').append(
                            $('<span class="iptv-epg-label"></span>').text('Далее'),
                            document.createTextNode(formatTime(epgMatch[1].start) + ' ' + epgMatch[1].title)
                        )
                    );
                }
            } else {
                epgBox.append($('<div class="iptv-epg-line"></div>').text('Телепрограмма не найдена'));
            }
            rightCol.append(epgBox);

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
            left.append($('<div class="iptv-sub"></div>').text('Экранная клавиатура'));

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
                    group: channel.group || 'ОБЩИЕ',
                    logo: resolveChannelLogo(channel) || '',
                    id: channel.id || '',
                    epgName: channel.epgName || ''
                });
                notify('Добавлено в избранное');
            }

            saveConfig();
            rebuildGroups();
            buildLeftItems();
            syncGroupSelection();
            renderBrowser();
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
                logError('Controller.enabled', e);
            }

            try {
                if (!Lampa.Player || !Lampa.Player.play) throw new Error('Lampa.Player.play недоступен');

                Lampa.Player.play({
                    title: channel.name,
                    url: channel.url
                });
            } catch (e2) {
                logError('Player.play', e2);
                notify('Ошибка запуска плеера');
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
                            activateController();
                        }

                        setTimeout(function () {
                            activateController();
                            updateFocus();
                        }, 50);
                    });
                }
            } catch (e4) {
                logError('Player.callback', e4);
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
                }
            } catch (e) {
                logError('Controller.toggle', e);
            }
        }

        function exitPlugin() {
            try {
                if (Lampa.Controller && Lampa.Controller.toggle) {
                    Lampa.Controller.toggle('menu');
                }
            } catch (e) {}

            try {
                if (Lampa.Activity && Lampa.Activity.back) {
                    Lampa.Activity.back();
                }
            } catch (e2) {}
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
                logError('Controller.add', e);
            }
        }

        function menuIcon() {
            return $(
                '<div class="iptv-plugin-ico" aria-hidden="true">' +
                    '<svg viewBox="0 0 24 24">' +
                        '<rect x="4" y="6" width="16" height="11" rx="2"></rect>' +
                        '<path d="M9 20h6"></path>' +
                        '<path d="M12 17v3"></path>' +
                        '<path d="M8 8.5h8"></path>' +
                    '</svg>' +
                '</div>'
            );
        }

        this.create = function () {
            ensureStyles();

            root = $('<div class="iptv-root"></div>');
            mobileTabs = $('<div class="iptv-tabs"></div>');
            layout = $('<div class="iptv-layout"></div>');
            overlay = $('<div class="iptv-overlay hidden"></div>');

            leftCol = $('<div class="iptv-col iptv-left"></div>');
            centerCol = $('<div class="iptv-col iptv-center"></div>');
            rightCol = $('<div class="iptv-col iptv-right"></div>');

            layout.append(leftCol, centerCol, rightCol);
            root.append(mobileTabs, layout, overlay);

            renderAll();

            runSafe('create.loadPlaylist', function () {
                loadPlaylist();
            });

            $(window).on('resize.iptv_universal', function () {
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
                if (requester && requester.clear) requester.clear();
            } catch (e0) {}

            try {
                if (Lampa.Controller && Lampa.Controller.remove) {
                    Lampa.Controller.remove(controller_name);
                }
            } catch (e) {}

            try {
                $(window).off('resize.iptv_universal');
            } catch (e2) {}

            controllerReady = false;

            if (root) root.remove();
        };
    }

    function isTouchDeviceGlobal() {
        try {
            return !!(
                ('ontouchstart' in window) ||
                (navigator && navigator.maxTouchPoints > 0) ||
                (window.matchMedia && window.matchMedia('(pointer: coarse)').matches)
            );
        } catch (e) {
            return false;
        }
    }

    function bindMenuAction(el, handler) {
        var lastTap = 0;
        var startX = 0;
        var startY = 0;
        var moved = false;
        var touchId = null;

        if (!isTouchDeviceGlobal()) {
            el.on('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                handler();
            });
            return;
        }

        el.on('touchstart', function (e) {
            var t = e.originalEvent && e.originalEvent.changedTouches ? e.originalEvent.changedTouches[0] : null;
            if (!t) return;
            touchId = t.identifier;
            startX = t.clientX;
            startY = t.clientY;
            moved = false;
        });

        el.on('touchmove', function (e) {
            var touches = e.originalEvent && e.originalEvent.changedTouches ? e.originalEvent.changedTouches : null;
            var i;
            var t = null;

            if (!touches) return;

            for (i = 0; i < touches.length; i++) {
                if (touches[i].identifier === touchId) {
                    t = touches[i];
                    break;
                }
            }

            if (!t) return;

            if (Math.abs(t.clientX - startX) > 12 || Math.abs(t.clientY - startY) > 12) {
                moved = true;
            }
        });

        el.on('touchcancel', function () {
            moved = false;
            touchId = null;
        });

        el.on('touchend', function (e) {
            var touches = e.originalEvent && e.originalEvent.changedTouches ? e.originalEvent.changedTouches : null;
            var i;
            var t = null;
            var now = Date.now();

            if (!touches) return;

            for (i = 0; i < touches.length; i++) {
                if (touches[i].identifier === touchId) {
                    t = touches[i];
                    break;
                }
            }

            if (!t) return;

            if (Math.abs(t.clientX - startX) > 12 || Math.abs(t.clientY - startY) > 12) {
                moved = true;
            }

            if (!moved) {
                if (now - lastTap >= 650) {
                    lastTap = now;
                    e.preventDefault();
                    e.stopPropagation();
                    handler();
                }
            }

            moved = false;
            touchId = null;
        });

        el.on('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
        });
    }

    function pluginMenuIcon() {
        return $(
            '<div class="menu__ico">' +
                '<svg viewBox="0 0 24 24" style="width:1.45rem;height:1.45rem;display:block;fill:none;stroke:#fff;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;margin:auto;">' +
                    '<rect x="4" y="6" width="16" height="11" rx="2"></rect>' +
                    '<path d="M9 20h6"></path>' +
                    '<path d="M12 17v3"></path>' +
                    '<path d="M8 8.5h8"></path>' +
                '</svg>' +
            '</div>'
        );
    }

    function init() {
        try {
            Lampa.Component.add('iptv_universal', IPTVUniversal);

            if ($('.menu .menu__list').find('.iptv-universal-item').length) return;

            var item = $('<li class="menu__item selector iptv-universal-item"></li>');
            item.append(pluginMenuIcon());
            item.append($('<div class="menu__text"></div>').text('IPTV PRO'));

            bindMenuAction(item, function () {
                try {
                    Lampa.Activity.push({
                        title: 'IPTV',
                        component: 'iptv_universal'
                    });
                } catch (err) {
                    try { console.error('IPTV open error', err); } catch (e2) {}
                }
            });

            $('.menu .menu__list').append(item);
        } catch (e) {
            try { console.error('IPTV init error', e); } catch (e2) {}
        }
    }

    if (window.app_ready) init();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }
})();
