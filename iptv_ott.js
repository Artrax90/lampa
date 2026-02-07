// ==Lampa==
// name: IPTV TiviMate
// version: 1.4.7
// description: Исправлены лого, EPG (iptvx.one) и работа скролла
// author: Gemini
// ==/Lampa==

(function () {
    'use strict';

    function IPTVComponent(object) {
        var _this = this;
        var items = $('<div class="tivimate-scroll-container"><div class="tivimate-content-inner"></div></div>');
        var groups = {};
        var favorites = Lampa.Storage.get('iptv_fav_list', []);

        if (!$('#tivimate-style-v7').length) {
            $('head').append('<style id="tivimate-style-v7">' +
                '.tivimate-scroll-container { width:100%; height: 100%; overflow-y: auto; background: #0f1216; padding: 20px; box-sizing: border-box; }' +
                '.tivimate-content-inner { display: flex; flex-direction: column; padding-bottom: 100px; }' +
                '.tv-item-v7 { display: flex; align-items: center; padding: 12px 18px; background: rgba(255,255,255,0.03); margin-bottom: 8px; border-radius: 6px; border-left: 4px solid transparent; cursor: pointer; flex-shrink: 0; }' +
                '.tv-item-v7.focus { background: rgba(52, 152, 219, 0.2) !important; border-left-color: #3498db; transform: scale(1.01); }' +
                '.tv-logo-box { width: 55px; height: 35px; background: #000; border-radius: 4px; margin-right: 20px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }' +
                '.tv-logo-box img { max-width: 100%; max-height: 100%; object-fit: contain; }' +
                '.tv-info-box { flex: 1; overflow: hidden; }' +
                '.tv-name-v7 { font-size: 1.2em; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; }' +
                '.tv-epg-v7 { font-size: 0.85em; color: #3498db; margin-top: 4px; opacity: 0.9; }' +
                '.tv-group-title { font-size: 0.85em; color: rgba(255,255,255,0.3); text-transform: uppercase; margin: 25px 0 10px 5px; letter-spacing: 1px; }' +
                '/* Скрываем лишние элементы Лампы */' +
                '.activity__footer, .pwa-install, .layer--footer { display: none !important; }' +
                '</style>');
        }

        function getProxiedUrl(url) {
            if (!url) return '';
            if (url.indexOf('https') === 0) return url;
            return 'https://corsproxy.io/?' + encodeURIComponent(url);
        }

        this.create = function () {
            // Регистрация EPG источника
            if (window.Lampa && Lampa.TV) {
                Lampa.TV.addSource('iptvx', 'https://iptvx.one/EPG');
            }
            
            var url = Lampa.Storage.get('iptv_m3u_link', '');
            if (!url) this.renderSettings();
            else this.load(url);
        };

        this.load = function(url) {
            items.find('.tivimate-content-inner').html('<div style="color:#fff; text-align:center; padding:50px;">Загрузка TiviMate...</div>');
            $.ajax({
                url: getProxiedUrl(url),
                method: 'GET',
                success: function(str) { _this.parse(str); _this.renderMain(); },
                error: function() { Lampa.Noty.show('Ошибка плейлиста'); _this.renderSettings(); }
            });
        };

        this.parse = function (str) {
            groups = {'Все каналы': []};
            var lines = str.split('\n');
            var cur = null;
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (line.indexOf('#EXTINF') === 0) {
                    cur = {
                        name: line.match(/,(.*)$/)?.[1].trim() || 'Без названия',
                        logo: line.match(/(?:tvg-logo|logo|url-tvg)="([^"]+)"/i)?.[1] || '',
                        group: line.match(/group-title="([^"]+)"/i)?.[1] || 'Разное'
                    };
                } else if (line.indexOf('http') === 0 && cur) {
                    cur.url = line;
                    if (!groups[cur.group]) groups[cur.group] = [];
                    groups[cur.group].push(cur);
                    groups['Все каналы'].push(cur);
                    cur = null;
                }
            }
        };

        this.renderMain = function () {
            var inner = items.find('.tivimate-content-inner').empty();
            inner.append('<div class="tv-group-title">Меню</div>');
            this.drawRow(inner, '⚙️ Сменить плейлист', function() { _this.renderSettings(); });

            inner.append('<div class="tv-group-title">Категории</div>');
            Object.keys(groups).sort().forEach(function (g) {
                if (g === 'Все каналы' && Object.keys(groups).length > 2) return;
                _this.drawRow(inner, g + ' (' + groups[g].length + ')', function() {
                    _this.renderList(groups[g], g);
                });
            });
            this.refresh();
        };

        this.renderList = function (list, title) {
            var inner = items.find('.tivimate-content-inner').empty();
            this.drawRow(inner, '🔙 Назад', function() { _this.renderMain(); });
            inner.append('<div class="tv-group-title">' + title + '</div>');
            
            list.forEach(function (chan) {
                // Пытаемся взять EPG из системного кэша Лампы
                var epg = 'Программа передач загружается...';
                if (Lampa.TV) {
                    var data = Lampa.TV.getEPG(chan.name);
                    if (data && data.current) epg = data.current.title;
                }

                var row = $('<div class="selector tv-item-v7">' +
                    '<div class="tv-logo-box">' + (chan.logo ? '<img src="' + getProxiedUrl(chan.logo) + '">' : '<span>TV</span>') + '</div>' +
                    '<div class="tv-info-box">' +
                        '<span class="tv-name-v7">' + chan.name + '</span>' +
                        '<div class="tv-epg-v7">' + epg + '</div>' +
                    '</div>' +
                '</div>');

                row.on('hover:enter', function() {
                    Lampa.Player.play({ url: chan.url, title: chan.name });
                });
                inner.append(row);
            });
            this.refresh();
        };

        this.drawRow = function(container, text, action) {
            var row = $('<div class="selector tv-item-v7"><div class="tv-info-box"><span class="tv-name-v7">'+text+'</span></div></div>');
            row.on('hover:enter', action);
            container.append(row);
        };

        this.renderSettings = function() {
            var inner = items.find('.tivimate-content-inner').empty();
            inner.append('<div class="tv-group-title">Источник</div>');
            this.drawRow(inner, '➕ Ввести URL плейлиста', function() {
                Lampa.Input.edit({ value: Lampa.Storage.get('iptv_m3u_link', ''), free: true }, function(v) {
                    if(v) { Lampa.Storage.set('iptv_m3u_link', v); _this.load(v); }
                });
            });
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
        var btn = $('<li class="menu__item selector" data-action="iptv_lite"><div class="menu__ico"><svg height="22" viewBox="0 0 24 24" width="22" xmlns="http://www.w3.org/2000/svg"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM8 15c0-1.66 1.34-3 3-3 .35 0 .69.07 1 .18V6h5v2h-3v7.03A3.003 3.003 0 0 1 8 15z" fill="currentColor"/></svg></div><div class="menu__text">TiviMate</div></li>');
        btn.on('hover:enter', function () { Lampa.Activity.push({ title: 'TiviMate', component: 'iptv_lite', page: 1 }); });
        $('.menu .menu__list').append(btn);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') init(); });
})();
