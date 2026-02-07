// ==Lampa==
// name: IPTV TiviMate
// version: 1.5.3
// description: Фикс CORS для Chrome, авто-логотипы и EPG по tvg-id
// author: Gemini
// ==/Lampa==

(function () {
    'use strict';

    function IPTVComponent(object) {
        var _this = this;
        var items = $('<div class="tivi-base"></div>');
        var groups = {};
        
        if (!$('#tivi-style-v13').length) {
            $('head').append('<style id="tivi-style-v13">' +
                '.tivi-base { width:100%; height: 100%; background: #0f1216; padding: 20px; box-sizing: border-box; overflow-y: auto; }' +
                '.tivi-row { display: flex; align-items: center; padding: 12px; background: rgba(255,255,255,0.03); margin-bottom: 5px; border-radius: 6px; border-left: 4px solid transparent; cursor: pointer; }' +
                '.tivi-row.focus { background: rgba(52, 152, 219, 0.2) !important; border-left-color: #3498db; transform: scale(1.01); transition: 0.1s; }' +
                '.tivi-logo { width: 60px; height: 36px; margin-right: 15px; background: #000; border-radius: 4px; display:flex; align-items:center; justify-content:center; flex-shrink:0; overflow:hidden; }' +
                '.tivi-logo img { max-width: 100%; max-height: 100%; object-fit: contain; }' +
                '.tivi-info { flex: 1; overflow: hidden; }' +
                '.tivi-name { font-size: 1.2em; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; font-weight: 500; }' +
                '.tivi-epg { font-size: 0.9em; color: #3498db; margin-top: 3px; opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' +
                '.tivi-head { font-size: 0.85em; color: rgba(255,255,255,0.3); text-transform: uppercase; margin: 25px 0 10px; letter-spacing: 1px; }' +
                '.activity__footer { display: none !important; }' +
                '</style>');
        }

        // Прокси для обхода CORS в Chrome
        function getProxied(url) {
            if (!url) return '';
            if (url.indexOf('https') === 0) return url;
            // Используем corsproxy.io для HTTP ссылок, чтобы Chrome не ругался
            return 'https://corsproxy.io/?' + encodeURIComponent(url);
        }

        this.create = function () {
            if (window.Lampa && Lampa.TV) {
                // Прямая ссылка на XMLTV файл для iptvx
                Lampa.TV.addSource('iptvx_main', 'https://iptvx.one/epg/epg.xml.gz');
            }
            
            var url = Lampa.Storage.get('iptv_m3u_link', '');
            if (!url) this.renderSettings();
            else this.load(url);
        };

        this.load = function(url) {
            items.html('<div style="text-align:center; padding:40px; color:#fff; opacity:0.5;">Загрузка каналов и программы...</div>');
            $.ajax({
                url: getProxied(url),
                method: 'GET',
                success: function(str) { _this.parse(str); _this.renderMain(); },
                error: function() { Lampa.Noty.show('Ошибка: Плейлист недоступен'); _this.renderSettings(); }
            });
        };

        this.parse = function(str) {
            groups = {'Все каналы': []};
            var lines = str.split('\n');
            var cur = null;

            lines.forEach(function(l) {
                l = l.trim();
                if (l.indexOf('#EXTINF') === 0) {
                    var name = l.match(/,(.*)$/)?.[1].trim() || 'Без названия';
                    var id = l.match(/tvg-id="([^"]+)"/i)?.[1] || '';
                    var logo = l.match(/tvg-logo="([^"]+)"/i)?.[1] || '';
                    
                    // Если лого нет, генерируем ссылку на иконку iptvx по ID или названию
                    if (!logo && id) logo = 'https://iptvx.one/logo/' + id + '.png';

                    cur = {
                        name: name,
                        logo: logo,
                        id: id,
                        group: l.match(/group-title="([^"]+)"/i)?.[1] || 'Общие'
                    };
                } else if (l.indexOf('http') === 0 && cur) {
                    cur.url = l;
                    if (!groups[cur.group]) groups[cur.group] = [];
                    groups[cur.group].push(cur);
                    groups['Все каналы'].push(cur);
                    cur = null;
                }
            });
        };

        this.renderMain = function() {
            items.empty().append('<div class="tivi-head">Меню</div>');
            this.drawRow('⚙️ Настройки плейлиста', function() { _this.renderSettings(); });
            
            items.append('<div class="tivi-head">Категории</div>');
            Object.keys(groups).sort().forEach(function(g) {
                if (g === 'Все каналы' && Object.keys(groups).length > 2) return;
                _this.drawRow(g.toUpperCase() + ' (' + groups[g].length + ')', function() { 
                    _this.renderList(groups[g], g); 
                });
            });
            this.focus();
        };

        this.renderList = function(list, title) {
            items.empty();
            this.drawRow('🔙 Назад к категориям', function() { _this.renderMain(); });
            items.append('<div class="tivi-head">' + title + '</div>');

            list.forEach(function(chan) {
                var epg = "Программа не загружена";
                if (window.Lampa && Lampa.TV) {
                    // Пробуем найти программу по ID, а затем по имени
                    var data = Lampa.TV.getEPG(chan.id || chan.name);
                    if (data && data.current) epg = data.current.title;
                    else if (chan.name.indexOf('Архив') > -1) epg = "Нажмите для просмотра программы (Архив)";
                }

                var row = $('<div class="selector tivi-row">' +
                    '<div class="tivi-logo">' + (chan.logo ? '<img src="'+getProxied(chan.logo)+'">' : '<span>TV</span>') + '</div>' +
                    '<div class="tivi-info">' +
                        '<div class="tivi-name">'+chan.name+'</div>' +
                        '<div class="tivi-epg">'+epg+'</div>' +
                    '</div>' +
                '</div>');

                row.on('hover:enter', function() { 
                    // Для Chrome на HTTPS: если поток HTTP, играем через прокси
                    var playUrl = chan.url;
                    if (playUrl.indexOf('https') !== 0) {
                        Lampa.Noty.show('Запуск через CORS-прокси...');
                        playUrl = getProxied(playUrl);
                    }
                    Lampa.Player.play({ url: playUrl, title: chan.name }); 
                });
                items.append(row);
            });
            this.focus();
        };

        this.drawRow = function(text, action) {
            var row = $('<div class="selector tivi-row"><div class="tivi-info"><div class="tivi-name">'+text+'</div></div></div>');
            row.on('hover:enter', action);
            items.append(row);
        };

        this.renderSettings = function() {
            items.empty().append('<div class="tivi-head">Плейлист</div>');
            this.drawRow('➕ ОБНОВИТЬ URL ПЛЕЙЛИСТА', function() {
                Lampa.Input.edit({ value: Lampa.Storage.get('iptv_m3u_link', ''), free: true }, function(v) {
                    if(v) { Lampa.Storage.set('iptv_m3u_link', v); _this.load(v); }
                });
            });
            this.focus();
        };

        this.focus = function() {
            Lampa.Controller.enable('content');
            setTimeout(function() {
                var f = items.find('.selector').first();
                if (f.length) Lampa.Controller.focus(f[0]);
            }, 200);
        };

        this.render = function () { return items; };
        this.start = function () { this.focus(); };
        this.pause = function () {};
        this.stop = function () {};
        this.destroy = function () { items.remove(); };
    }

    function init() {
        Lampa.Component.add('iptv_lite', IPTVComponent);
        var btn = $('<li class="menu__item selector" data-action="iptv_lite"><div class="menu__ico"><svg height="22" viewBox="0 0 24 24" width="22" xmlns="http://www.w3.org/2000/svg"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM8 15c0-1.66 1.34-3 3-3 .35 0 .69.07 1 .18V6h5v2h-3v7.03A3.003 3.003 0 0 1 8 15z" fill="currentColor"/></svg></div><div class="menu__text">TiviMate</div></li>');
        btn.on('hover:enter', function () { Lampa.Activity.push({ title: 'TiviMate', component: 'iptv_lite', page: 1 }); });
        $('.menu .menu__list').append(btn);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') init(); });
})();
