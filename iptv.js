// ==Lampa==
// name: IPTV TiviMate Trinity
// version: 1.9.0
// description: Три колонки: Список | Инфо | Программа. Улучшенный поиск EPG.
// author: Gemini
// ==/Lampa==

(function () {
    'use strict';

    function IPTVComponent(object) {
        var _this = this;
        var items = $('<div class="trinity-layout"></div>');
        var col_left, col_center, col_right;
        var groups = {};
        
        // CSS - Максимально надежный и современный
        if (!$('#trinity-style').length) {
            $('head').append('<style id="trinity-style">' +
                '.trinity-layout { display: flex; width: 100%; height: 100%; background: #080a0d; position: absolute; top:0; left:0; overflow: hidden; }' +
                '.trinity-col { height: 100%; display: flex; flex-direction: column; box-sizing: border-box; border-right: 1px solid rgba(255,255,255,0.05); }' +
                '.trinity-left { width: 25%; padding: 15px; overflow-y: auto; }' +
                '.trinity-center { width: 40%; padding: 40px; align-items: center; justify-content: center; text-align: center; background: radial-gradient(circle at center, rgba(52, 152, 219, 0.05), transparent); }' +
                '.trinity-right { width: 35%; padding: 15px; overflow-y: auto; background: rgba(0,0,0,0.2); }' +
                '.trinity-item { padding: 10px 15px; background: rgba(255,255,255,0.02); margin-bottom: 5px; border-radius: 6px; cursor: pointer; border-left: 3px solid transparent; }' +
                '.trinity-item.focus { background: #3498db !important; border-left-color: #fff; }' +
                '.trinity-item-name { font-size: 1.1em; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' +
                '.trinity-big-logo { width: 240px; height: 140px; background: #000; border-radius: 12px; margin-bottom: 30px; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 40px rgba(0,0,0,0.8); }' +
                '.trinity-big-logo img { max-width: 80%; max-height: 80%; object-fit: contain; }' +
                '.trinity-title { font-size: 2.2em; font-weight: bold; color: #fff; margin-bottom: 15px; line-height: 1.2; }' +
                '.trinity-desc { font-size: 1.2em; color: rgba(255,255,255,0.5); line-height: 1.5; margin-bottom: 30px; max-height: 200px; overflow: hidden; }' +
                '.trinity-epg-row { padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); transition: 0.2s; }' +
                '.trinity-epg-row.active { background: rgba(52, 152, 219, 0.1); border-left: 2px solid #3498db; }' +
                '.trinity-epg-time { color: #3498db; font-weight: bold; margin-bottom: 3px; font-size: 0.9em; }' +
                '.trinity-label { font-size: 0.7em; color: rgba(255,255,255,0.3); text-transform: uppercase; margin: 20px 0 10px; letter-spacing: 2px; }' +
                '.trinity-btn-play { background: #fff; color: #000; padding: 12px 30px; border-radius: 40px; font-weight: bold; font-size: 1.2em; margin-top: 10px; cursor: pointer; }' +
                '</style>');
        }

        this.create = function () {
            // Строим каркас сразу
            items.html('<div class="trinity-col trinity-left"></div><div class="trinity-col trinity-center"></div><div class="trinity-col trinity-right"></div>');
            col_left = items.find('.trinity-left');
            col_center = items.find('.trinity-center');
            col_right = items.find('.trinity-right');

            if (Lampa.TV) Lampa.TV.addSource('iptvx', 'https://iptvx.one/epg/epg.xml.gz');

            var url = Lampa.Storage.get('iptv_m3u_link', '');
            if (!url) this.renderSettings(); else this.load(url);
        };

        this.load = function (url) {
            col_left.html('<div style="color:#fff; opacity:0.3;">Загрузка...</div>');
            var proxy = (Lampa.Utils && Lampa.Utils.proxyUrl) ? Lampa.Utils.proxyUrl(url) : url;
            $.ajax({
                url: proxy,
                method: 'GET',
                success: function (str) { _this.parse(str); _this.renderGroups(); },
                error: function () { Lampa.Noty.show('Ошибка плейлиста'); _this.renderSettings(); }
            });
        };

        this.parse = function (str) {
            groups = { 'Все каналы': [] };
            var lines = str.split('\n'), cur = null;
            lines.forEach(function (l) {
                l = l.trim();
                if (l.indexOf('#EXTINF') === 0) {
                    var tid = l.match(/tvg-id="([^"]+)"/i)?.[1] || '';
                    cur = {
                        name: l.match(/,(.*)$/)?.[1].trim() || 'Без названия',
                        id: tid,
                        logo: l.match(/tvg-logo="([^"]+)"/i)?.[1] || (tid ? 'https://iptvx.one/logo/' + tid + '.png' : ''),
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

        this.updateEPG = function (chan) {
            col_center.empty();
            col_right.empty();
            
            var epg_data = { current: { title: "Нет программы", description: "Подождите минуту или проверьте название канала." }, list: [] };

            if (Lampa.TV) {
                // Пытаемся найти по ID, если нет - по чистому имени
                var data = Lampa.TV.getEPG(chan.id) || Lampa.TV.getEPG(chan.name);
                if (data) epg_data = data;
            }

            // Рендер центра
            col_center.append(`
                <div class="trinity-big-logo"><img src="${chan.logo}" onerror="this.src=''"></div>
                <div class="trinity-title">${epg_data.current.title}</div>
                <div class="trinity-desc">${epg_data.current.description || ''}</div>
                <div class="trinity-btn-play">СМОТРЕТЬ ЭФИР</div>
            `);

            // Рендер правой колонки
            col_right.append('<div class="trinity-label">Программа на сегодня</div>');
            if (epg_data.list && epg_data.list.length) {
                epg_data.list.forEach(function (e) {
                    var is_now = e.title === epg_data.current.title;
                    col_right.append(`
                        <div class="trinity-epg-row ${is_now ? 'active' : ''}">
                            <div class="trinity-epg-time">${e.time}</div>
                            <div class="trinity-epg-name">${e.title}</div>
                        </div>
                    `);
                });
            } else {
                col_right.append('<div style="padding:20px; opacity:0.3;">Программа передач не найдена</div>');
            }
        };

        this.renderGroups = function () {
            col_left.empty().append('<div class="trinity-label">Меню</div>');
            this.addBtn(col_left, '⚙️ НАСТРОЙКИ', function () { _this.renderSettings(); });
            col_left.append('<div class="trinity-label">Категории</div>');
            Object.keys(groups).sort().forEach(function (g) {
                if (g === 'Все каналы' && Object.keys(groups).length > 2) return;
                _this.addBtn(col_left, g.toUpperCase(), function () { _this.renderList(groups[g], g); });
            });
            this.focus();
        };

        this.renderList = function (list, title) {
            col_left.empty();
            this.addBtn(col_left, '🔙 НАЗАД', function () { _this.renderGroups(); });
            col_left.append('<div class="trinity-label">' + title + '</div>');
            list.forEach(function (chan) {
                var row = $('<div class="selector trinity-item"><div class="trinity-item-name">' + chan.name + '</div></div>');
                row.on('hover:focus', function () { _this.updateEPG(chan); });
                row.on('hover:enter', function () { 
                    var play_url = (Lampa.Utils && Lampa.Utils.proxyUrl) ? Lampa.Utils.proxyUrl(chan.url) : chan.url;
                    Lampa.Player.play({ url: play_url, title: chan.name }); 
                });
                col_left.append(row);
            });
            this.focus();
        };

        this.addBtn = function (cont, txt, action) {
            var row = $('<div class="selector trinity-item"><div class="trinity-item-name">' + txt + '</div></div>');
            row.on('hover:enter', action);
            cont.append(row);
        };

        this.renderSettings = function () {
            col_left.empty().append('<div class="trinity-label">Плейлист</div>');
            this.addBtn(col_left, '➕ ВВЕСТИ URL', function () {
                Lampa.Input.edit({ value: Lampa.Storage.get('iptv_m3u_link', ''), free: true }, function (v) {
                    if (v) { Lampa.Storage.set('iptv_m3u_link', v); _this.load(v); }
                });
            });
            this.focus();
        };

        this.focus = function () {
            Lampa.Controller.enable('content');
            setTimeout(function () {
                var f = col_left.find('.selector').first();
                if (f.length) Lampa.Controller.focus(f[0]);
            }, 200);
        };

        this.render = function () { return items; };
        this.start = function () { this.focus(); };
        this.pause = function () { };
        this.stop = function () { };
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
