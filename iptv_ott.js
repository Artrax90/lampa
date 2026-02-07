// ==Lampa==
// name: IPTV TiviMate Dashboard
// version: 1.8.0
// description: Три панели: Каналы, Инфо, Программа.
// author: Gemini
// ==/Lampa==

(function () {
    'use strict';

    function IPTVComponent(object) {
        var _this = this;
        var items = $('<div class="tivi-dashboard"></div>');
        var left = $('<div class="tivi-col tivi-col-left"></div>');
        var center = $('<div class="tivi-col tivi-col-center"></div>');
        var right = $('<div class="tivi-col tivi-col-right"></div>');
        var groups = {};

        if (!$('#tivi-dash-style').length) {
            $('head').append('<style id="tivi-dash-style">' +
                '.tivi-dashboard { display: flex; width: 100%; height: 100%; background: #0a0c0f; overflow: hidden; position: absolute; }' +
                '.tivi-col { height: 100%; overflow-y: auto; padding: 20px; box-sizing: border-box; display: flex; flex-direction: column; }' +
                '.tivi-col-left { width: 25%; border-right: 1px solid rgba(255,255,255,0.05); }' +
                '.tivi-col-center { width: 45%; border-right: 1px solid rgba(255,255,255,0.05); align-items: center; justify-content: center; text-align: center; background: radial-gradient(circle at center, rgba(52, 152, 219, 0.05) 0%, transparent 100%); }' +
                '.tivi-col-right { width: 30%; background: rgba(0,0,0,0.2); }' +
                '.tivi-row { display: flex; align-items: center; padding: 10px 15px; background: rgba(255,255,255,0.02); margin-bottom: 5px; border-radius: 6px; cursor: pointer; border-left: 3px solid transparent; flex-shrink: 0; }' +
                '.tivi-row.focus { background: #3498db !important; border-left-color: #fff; transform: scale(1.02); }' +
                '.tivi-row-name { font-size: 1.1em; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' +
                '.tivi-center-logo { width: 200px; height: 120px; background: #000; border-radius: 10px; margin-bottom: 30px; display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }' +
                '.tivi-center-logo img { max-width: 80%; max-height: 80%; object-fit: contain; }' +
                '.tivi-center-title { font-size: 2.2em; font-weight: bold; color: #fff; margin-bottom: 15px; line-height: 1.2; }' +
                '.tivi-center-desc { font-size: 1.2em; color: rgba(255,255,255,0.5); line-height: 1.5; margin-bottom: 30px; }' +
                '.tivi-epg-item { padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); }' +
                '.tivi-epg-time { color: #3498db; font-weight: bold; font-size: 0.9em; margin-bottom: 4px; }' +
                '.tivi-epg-name { color: #fff; font-size: 1em; opacity: 0.9; }' +
                '.tivi-label { font-size: 0.7em; color: rgba(255,255,255,0.3); text-transform: uppercase; margin: 15px 0 10px; letter-spacing: 1px; }' +
                '</style>');
        }

        function fix(url) {
            return (url && Lampa.Utils && Lampa.Utils.proxyUrl) ? Lampa.Utils.proxyUrl(url) : url;
        }

        this.create = function () {
            if (Lampa.TV) Lampa.TV.addSource('iptvx', 'https://iptvx.one/epg/epg.xml.gz');
            items.append(left).append(center).append(right);
            var url = Lampa.Storage.get('iptv_m3u_link', '');
            if (!url) this.renderSettings(); else this.load(url);
        };

        this.load = function (url) {
            left.html('<div style="color:#fff; opacity:0.5;">Загрузка...</div>');
            $.ajax({
                url: fix(url),
                method: 'GET',
                success: function (str) { _this.parse(str); _this.renderGroups(); },
                error: function () { Lampa.Noty.show('Ошибка загрузки'); _this.renderSettings(); }
            });
        };

        this.parse = function (str) {
            groups = { 'Все каналы': [] };
            var lines = str.split('\n'), cur = null;
            lines.forEach(function (l) {
                l = l.trim();
                if (l.indexOf('#EXTINF') === 0) {
                    var id = l.match(/tvg-id="([^"]+)"/i)?.[1] || '';
                    cur = {
                        name: l.match(/,(.*)$/)?.[1].trim() || 'Без названия',
                        id: id,
                        logo: l.match(/tvg-logo="([^"]+)"/i)?.[1] || (id ? 'https://iptvx.one/logo/' + id + '.png' : ''),
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

        this.updateDetails = function (chan) {
            center.empty();
            right.empty();
            
            var now = { title: "Программа не загружена", desc: "Подождите минуту для индексации EPG" };
            var list = [];

            if (Lampa.TV) {
                var epg = Lampa.TV.getEPG(chan.id || chan.name);
                if (epg) {
                    if (epg.current) {
                        now.title = epg.current.title;
                        now.desc = epg.current.description || "";
                    }
                    if (epg.list) list = epg.list.slice(0, 10); // Берем первые 10 передач
                }
            }

            // Центральная панель
            center.append(`
                <div class="tivi-center-logo"><img src="${chan.logo}" onerror="this.src=''"></div>
                <div class="tivi-center-title">${now.title}</div>
                <div class="tivi-center-desc">${now.desc}</div>
                <div style="color:#3498db; font-size:1.2em;">Нажмите OK для просмотра <b>${chan.name}</b></div>
            `);

            // Правая панель
            right.append('<div class="tivi-label">Программа передач</div>');
            if (list.length) {
                list.forEach(function (e) {
                    right.append(`
                        <div class="tivi-epg-item">
                            <div class="tivi-epg-time">${e.time}</div>
                            <div class="tivi-epg-name">${e.title}</div>
                        </div>
                    `);
                });
            } else {
                right.append('<div style="color:rgba(255,255,255,0.3); padding:20px;">Нет данных о расписании</div>');
            }
        };

        this.renderGroups = function () {
            left.empty().append('<div class="tivi-label">Меню</div>');
            this.addBtn('⚙️ НАСТРОЙКИ', function () { _this.renderSettings(); });
            left.append('<div class="tivi-label">Категории</div>');
            Object.keys(groups).sort().forEach(function (g) {
                if (g === 'Все каналы' && Object.keys(groups).length > 2) return;
                _this.addBtn(g.toUpperCase(), function () { _this.renderList(groups[g], g); });
            });
            this.focus();
        };

        this.renderList = function (list, title) {
            left.empty();
            this.addBtn('🔙 НАЗАД', function () { _this.renderGroups(); });
            left.append('<div class="tivi-label">' + title + '</div>');
            list.forEach(function (chan) {
                var row = $('<div class="selector tivi-row"><div class="tivi-row-name">' + chan.name + '</div></div>');
                row.on('hover:focus', function () { _this.updateDetails(chan); });
                row.on('hover:enter', function () { Lampa.Player.play({ url: fix(chan.url), title: chan.name }); });
                left.append(row);
            });
            this.focus();
        };

        this.addBtn = function (txt, action) {
            var row = $('<div class="selector tivi-row"><div class="tivi-row-name">' + txt + '</div></div>');
            row.on('hover:enter', action);
            left.append(row);
        };

        this.renderSettings = function () {
            left.empty().append('<div class="tivi-label">Настройка</div>');
            this.addBtn('➕ ОБНОВИТЬ ПЛЕЙЛИСТ', function () {
                Lampa.Input.edit({ value: Lampa.Storage.get('iptv_m3u_link', ''), free: true }, function (v) {
                    if (v) { Lampa.Storage.set('iptv_m3u_link', v); _this.load(v); }
                });
            });
            this.focus();
        };

        this.focus = function () {
            Lampa.Controller.enable('content');
            setTimeout(function () {
                var f = left.find('.selector').first();
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
