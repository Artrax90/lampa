// ==Lampa==
// name: IPTV TiviMate Split
// version: 1.7.0
// description: Разделенный интерфейс, фикс CORS/Mixed Content через системный прокси
// author: Gemini
// ==/Lampa==

(function () {
    'use strict';

    function IPTVComponent(object) {
        var _this = this;
        var items = $('<div class="tivi-split-view"></div>');
        var list_part = $('<div class="tivi-list-part"></div>');
        var info_part = $('<div class="tivi-info-part"></div>');
        var groups = {};
        
        if (!$('#tivi-style-v17').length) {
            $('head').append('<style id="tivi-style-v17">' +
                '.tivi-split-view { display: flex; width: 100%; height: 100%; background: #0f1216; overflow: hidden; position: absolute; top:0; left:0; }' +
                '.tivi-list-part { width: 35%; height: 100%; overflow-y: auto; padding: 20px; box-sizing: border-box; border-right: 1px solid rgba(255,255,255,0.05); }' +
                '.tivi-info-part { width: 65%; height: 100%; padding: 50px; box-sizing: border-box; display: flex; flex-direction: column; background: radial-gradient(circle at top right, rgba(52, 152, 219, 0.1), transparent); }' +
                '.tivi-item { display: flex; align-items: center; padding: 12px; background: rgba(255,255,255,0.02); margin-bottom: 5px; border-radius: 6px; cursor: pointer; border-left: 4px solid transparent; }' +
                '.tivi-item.focus { background: rgba(52, 152, 219, 0.3) !important; border-left-color: #3498db; transform: translateX(10px); }' +
                '.tivi-ico { width: 50px; height: 32px; margin-right: 15px; flex-shrink: 0; background: #000; border-radius: 4px; display: flex; align-items: center; justify-content: center; }' +
                '.tivi-ico img { max-width: 90%; max-height: 90%; object-fit: contain; }' +
                '.tivi-name { font-size: 1.2em; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' +
                '.tivi-epg-full { color: #fff; }' +
                '.tivi-epg-now { font-size: 2.8em; font-weight: bold; margin-bottom: 20px; line-height: 1.1; color: #3498db; }' +
                '.tivi-epg-desc { font-size: 1.4em; color: rgba(255,255,255,0.6); line-height: 1.6; }' +
                '.tivi-epg-next { margin-top: auto; padding-top: 30px; border-top: 1px solid rgba(255,255,255,0.1); }' +
                '.tivi-group-label { font-size: 0.8em; color: rgba(255,255,255,0.3); text-transform: uppercase; margin: 25px 0 10px 5px; letter-spacing: 2px; }' +
                '</style>');
        }

        // Функция проксирования (как в tv.js)
        function fixUrl(url) {
            if (!url) return '';
            if (url.indexOf('http') !== 0) return url;
            // Используем системный прокси Лампы для обхода CORS и Mixed Content
            return (Lampa.Utils && Lampa.Utils.proxyUrl) ? Lampa.Utils.proxyUrl(url) : url;
        }

        this.create = function () {
            if (window.Lampa && Lampa.TV) {
                Lampa.TV.addSource('iptvx', 'https://iptvx.one/epg/epg.xml.gz');
            }
            items.append(list_part).append(info_part);
            var url = Lampa.Storage.get('iptv_m3u_link', '');
            if (!url) this.renderSettings();
            else this.load(url);
        };

        this.load = function(url) {
            list_part.html('<div style="padding:20px; color:#fff; opacity:0.5;">Загрузка каналов...</div>');
            $.ajax({
                url: fixUrl(url),
                method: 'GET',
                success: function(str) { _this.parse(str); _this.renderMain(); },
                error: function() { Lampa.Noty.show('Ошибка плейлиста'); _this.renderSettings(); }
            });
        };

        this.parse = function(str) {
            groups = {'Все каналы': []};
            var lines = str.split('\n'), cur = null;
            lines.forEach(function(l) {
                l = l.trim();
                if (l.indexOf('#EXTINF') === 0) {
                    var id = l.match(/tvg-id="([^"]+)"/i)?.[1] || '';
                    cur = {
                        name: l.match(/,(.*)$/)?.[1].trim() || 'Без названия',
                        id: id,
                        logo: l.match(/tvg-logo="([^"]+)"/i)?.[1] || (id ? 'https://iptvx.one/logo/'+id+'.png' : ''),
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

        this.drawEPG = function(chan) {
            info_part.empty();
            var now = { title: "Программа не загружена", desc: "Пожалуйста, подождите завершения загрузки XMLTV (около 30-60 сек)." };
            var next_title = "";

            if (window.Lampa && Lampa.TV) {
                var data = Lampa.TV.getEPG(chan.id || chan.name);
                if (data && data.current) {
                    now.title = data.current.title;
                    now.desc = data.current.description || "Описание отсутствует.";
                    if (data.next) next_title = data.next.title;
                }
            }

            var res = $(`<div>
                <div style="display:flex; align-items:center; margin-bottom:30px;">
                    <div class="tivi-ico" style="width:100px; height:60px; margin-right:20px;">
                        <img src="${chan.logo}" onerror="this.src=''">
                    </div>
                    <div>
                        <div style="font-size:2em; font-weight:bold; color:#fff;">${chan.name}</div>
                        <div style="color:#3498db; font-size:1.1em;">${chan.group}</div>
                    </div>
                </div>
                <div class="tivi-epg-now">${now.title}</div>
                <div class="tivi-epg-desc">${now.desc}</div>
                ${next_title ? `<div class="tivi-epg-next">
                    <div style="color:#3498db; text-transform:uppercase; font-size:0.8em; margin-bottom:10px; font-weight:bold;">Далее</div>
                    <div style="font-size:1.6em; color:#fff;">${next_title}</div>
                </div>` : ''}
            </div>`);
            info_part.append(res);
        };

        this.renderMain = function() {
            list_part.empty().append('<div class="tivi-group-label">Меню</div>');
            this.addBtn('⚙️ НАСТРОЙКИ', function() { _this.renderSettings(); });
            list_part.append('<div class="tivi-group-label">Категории</div>');
            Object.keys(groups).sort().forEach(function(g) {
                if (g === 'Все каналы' && Object.keys(groups).length > 2) return;
                _this.addBtn(g.toUpperCase(), function() { _this.renderList(groups[g], g); });
            });
            this.focus();
        };

        this.renderList = function(list, title) {
            list_part.empty();
            this.addBtn('🔙 НАЗАД', function() { _this.renderMain(); });
            list_part.append('<div class="tivi-group-label">'+title+'</div>');
            list.forEach(function(chan) {
                var row = $('<div class="selector tivi-item">' +
                    '<div class="tivi-ico"><img src="'+chan.logo+'" onerror="this.parentElement.innerHTML=\'TV\'"></div>' +
                    '<div class="tivi-name">'+chan.name+'</div>' +
                '</div>');
                row.on('hover:focus', function() { _this.drawEPG(chan); });
                row.on('hover:enter', function() { 
                    Lampa.Player.play({ url: fixUrl(chan.url), title: chan.name }); 
                });
                list_part.append(row);
            });
            this.focus();
        };

        this.addBtn = function(txt, action) {
            var row = $('<div class="selector tivi-item"><div class="tivi-name">'+txt+'</div></div>');
            row.on('hover:enter', action);
            list_part.append(row);
        };

        this.renderSettings = function() {
            list_part.empty().append('<div class="tivi-group-label">Настройка</div>');
            this.addBtn('➕ ВВЕСТИ URL ПЛЕЙЛИСТА', function() {
                Lampa.Input.edit({ value: Lampa.Storage.get('iptv_m3u_link', ''), free: true }, function(v) {
                    if(v) { Lampa.Storage.set('iptv_m3u_link', v); _this.load(v); }
                });
            });
            this.focus();
        };

        this.focus = function() {
            Lampa.Controller.enable('content');
            setTimeout(function() {
                var f = list_part.find('.selector').first();
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
