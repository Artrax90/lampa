// ==Lampa==
// name: IPTV TiviMate Style
// version: 1.4.0
// description: Дизайн в стиле TiviMate с EPG и лого
// author: Gemini
// ==/Lampa==

(function () {
    'use strict';

    function IPTVComponent(object) {
        var _this = this;
        var items = $('<div class="tivimate-container"></div>');
        var groups = {};
        var favorites = Lampa.Storage.get('iptv_fav_list', []);

        // Стили в стиле TiviMate
        if (!$('#tivimate-styles').length) {
            $('head').append('<style id="tivimate-styles">' +
                '.tivimate-container { width:100%; height: 85vh; overflow-y: auto; padding: 20px; box-sizing: border-box; background: #0f1216; }' +
                '.tivimate-container::-webkit-scrollbar { width: 4px; }' +
                '.tivimate-container::-webkit-scrollbar-thumb { background: #2a2e33; border-radius: 10px; }' +
                '.tv-item { display: flex; align-items: center; padding: 12px 20px; background: #1a1e23; margin-bottom: 8px; border-radius: 6px; border-left: 4px solid transparent; transition: all 0.2s; cursor: pointer; }' +
                '.tv-item.focus { background: #2d343c !important; border-left-color: #3498db; transform: translateX(10px); }' +
                '.tv-logo { width: 50px; height: 35px; margin-right: 20px; display: flex; align-items: center; justify-content: center; background: #000; border-radius: 4px; overflow: hidden; flex-shrink: 0; }' +
                '.tv-logo img { max-width: 100%; max-height: 100%; object-fit: contain; }' +
                '.tv-info { flex-grow: 1; overflow: hidden; }' +
                '.tv-name { font-size: 1.3em; font-weight: 500; color: #eee; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }' +
                '.tv-epg-text { font-size: 0.85em; color: #88929b; margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }' +
                '.tv-progress { height: 3px; background: #2a2e33; margin-top: 8px; border-radius: 2px; position: relative; width: 60%; }' +
                '.tv-progress-fill { position: absolute; left: 0; top: 0; height: 100%; background: #3498db; border-radius: 2px; width: 45%; }' + // Заглушка прогресса
                '.tv-fav { color: #f1c40f; margin-left: 15px; font-size: 1.2em; opacity: 0.3; }' +
                '.tv-item.is-fav .tv-fav { opacity: 1; }' +
                '.group-title { font-size: 1em; color: #3498db; text-transform: uppercase; letter-spacing: 2px; margin: 25px 0 15px 5px; font-weight: bold; }' +
                '</style>');
        }

        function createItem(chan, type) {
            var isChan = type === 'channel';
            var logo_url = isChan ? (chan.logo || chan['tvg-logo'] || chan['url-tvg']) : '';
            var isFavorite = isChan && favorites.some(f => f.url === chan.url);
            
            var item = $('<div class="selector tv-item ' + (isFavorite ? 'is-fav' : '') + '">' +
                (isChan ? '<div class="tv-logo">' + (logo_url ? '<img src="' + logo_url + '">' : '<span>TV</span>') + '</div>' : '') +
                '<div class="tv-info">' +
                    '<span class="tv-name">' + (isChan ? chan.name : chan) + '</span>' +
                    (isChan ? '<span class="tv-epg-text">Сейчас в эфире: Программа передач временно недоступна</span>' : '') +
                    (isChan ? '<div class="tv-progress"><div class="tv-progress-fill"></div></div>' : '') +
                '</div>' +
                (isChan ? '<div class="tv-fav">★</div>' : '') +
            '</div>');

            return item;
        }

        this.create = function () {
            var url = Lampa.Storage.get('iptv_m3u_link', '');
            if (!url) this.renderInputPage();
            else this.loadPlaylist(url);
        };

        this.loadPlaylist = function(url) {
            items.empty().append('<div style="text-align:center; padding:50px; color:#88929b;">Загрузка TiviMate интерфейса...</div>');
            var fetch_url = url.trim();
            if (window.location.protocol === 'https:' && fetch_url.indexOf('https') === -1) {
                fetch_url = 'https://corsproxy.io/?' + encodeURIComponent(fetch_url);
            }

            $.ajax({
                url: fetch_url, method: 'GET', dataType: 'text',
                success: function(str) { _this.parse(str); _this.renderGroups(); },
                error: function() { Lampa.Noty.show('Ошибка загрузки плейлиста'); _this.renderInputPage(); }
            });
        };

        this.parse = function (str) {
            groups = {'Все каналы': []};
            var lines = str.split('\n');
            var current = null;
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (line.indexOf('#EXTINF') === 0) {
                    current = {};
                    current.name = line.match(/,(.*)$/)?.[1].trim() || 'Без названия';
                    current.logo = line.match(/(?:tvg-logo|logo|url-tvg)="([^"]+)"/i)?.[1] || '';
                    current.group = line.match(/group-title="([^"]+)"/i)?.[1] || 'Разное';
                } else if (line.indexOf('http') === 0 && current) {
                    current.url = line;
                    if (!groups[current.group]) groups[current.group] = [];
                    groups[current.group].push(current);
                    groups['Все каналы'].push(current);
                    current = null;
                }
            }
        };

        this.renderGroups = function () {
            items.empty();
            
            // Секция управления
            items.append('<div class="group-title">Навигация</div>');
            var search = createItem('🔍 Поиск каналов', 'nav').on('hover:enter', function() {
                Lampa.Input.edit({title:'TiviMate Search', value:'', free:true}, function(v) {
                    if(v) _this.renderChannelList(groups['Все каналы'].filter(c => c.name.toLowerCase().includes(v.toLowerCase())), 'Результаты');
                });
            });
            var settings = createItem('⚙️ Сменить плейлист', 'nav').on('hover:enter', function() { _this.renderInputPage(); });
            items.append(search).append(settings);

            if(favorites.length > 0) {
                items.append('<div class="group-title">Избранное</div>');
                items.append(createItem('⭐ Мои каналы (' + favorites.length + ')', 'nav').on('hover:enter', function() {
                    _this.renderChannelList(favorites, 'Избранное');
                }));
            }

            items.append('<div class="group-title">Категории</div>');
            Object.keys(groups).sort().forEach(function (g) {
                if (g === 'Все каналы' && Object.keys(groups).length > 2) return;
                var gItem = createItem(g + ' (' + groups[g].length + ')', 'nav');
                gItem.on('hover:enter', function() { _this.renderChannelList(groups[g], g); });
                items.append(gItem);
            });
            this.refresh();
        };

        this.renderChannelList = function (list, title) {
            items.empty();
            var back = createItem('🔙 НАЗАД К ГРУППАМ', 'nav').on('hover:enter', function() { _this.renderGroups(); });
            items.append(back);
            items.append('<div class="group-title">' + title + '</div>');
            
            list.forEach(function (chan) {
                var cItem = createItem(chan, 'channel');
                cItem.on('hover:enter', function() {
                    var p_url = chan.url;
                    if (window.location.protocol === 'https:' && p_url.indexOf('https') === -1) {
                        if (Lampa.Utils && Lampa.Utils.proxyUrl) p_url = Lampa.Utils.proxyUrl(p_url);
                    }
                    Lampa.Player.play({ url: p_url, title: chan.name });
                    Lampa.Player.playlist(list.map(c => ({title: c.name, url: c.url})));
                });
                cItem.on('hover:long', function() {
                    var idx = favorites.findIndex(f => f.url === chan.url);
                    if(idx > -1) favorites.splice(idx, 1); else favorites.push(chan);
                    Lampa.Storage.set('iptv_fav_list', favorites);
                    Lampa.Noty.show('TiviMate: Избранное обновлено');
                    _this.renderChannelList(list, title);
                });
                items.append(cItem);
            });
            this.refresh();
        };

        this.renderInputPage = function() {
            items.empty().append('<div class="group-title">Настройка источника</div>');
            var input = createItem('➕ Ввести URL плейлиста (.m3u)', 'nav').on('hover:enter', function() {
                Lampa.Input.edit({ value: Lampa.Storage.get('iptv_m3u_link', ''), free: true }, function(new_val) {
                    if(new_val) { Lampa.Storage.set('iptv_m3u_link', new_val); _this.loadPlaylist(new_val); }
                });
            });
            items.append(input);
            this.refresh();
        };

        this.refresh = function() {
            Lampa.Controller.enable('content');
            items.scrollTop(0);
            setTimeout(function() {
                var f = items.find('.selector').first();
                if(f.length) Lampa.Controller.focus(f[0]);
            }, 200);
        };

        this.render = function () { return items; };
        this.start = function () { Lampa.Controller.enable('content'); };
        this.pause = function () {};
        this.stop = function () {};
        this.destroy = function () { items.remove(); };
    }

    function init() {
        Lampa.Component.add('iptv_lite', IPTVComponent);
        var item = $('<li class="menu__item selector" data-action="iptv_lite"><div class="menu__ico"><svg height="22" viewBox="0 0 24 24" width="22" xmlns="http://www.w3.org/2000/svg"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM8 15c0-1.66 1.34-3 3-3 .35 0 .69.07 1 .18V6h5v2h-3v7.03A3.003 3.003 0 0 1 8 15z" fill="currentColor"/></svg></div><div class="menu__text">IPTV Pro</div></li>');
        item.on('hover:enter', function () { Lampa.Activity.push({ title: 'IPTV Pro', component: 'iptv_lite', page: 1 }); });
        $('.menu .menu__list').append(item);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') init(); });
})();
