// ==Lampa==
// name: IPTV TiviMate Pro
// version: 1.6.0
// description: Разделенный экран: Каналы слева, Программа справа.
// author: Gemini
// ==/Lampa==

(function () {
    'use strict';

    function IPTVComponent(object) {
        var _this = this;
        var items = $('<div class="tivi-split-container"></div>');
        var leftPanel = $('<div class="tivi-side-left"></div>');
        var rightPanel = $('<div class="tivi-side-right"></div>');
        var groups = {};
        var currentChannel = null;

        if (!$('#tivi-split-style').length) {
            $('head').append('<style id="tivi-split-style">' +
                '.tivi-split-container { display: flex; width: 100%; height: 100vh; background: #0f1216; overflow: hidden; }' +
                '.tivi-side-left { width: 40%; height: 100%; border-right: 1px solid rgba(255,255,255,0.05); overflow-y: auto; padding: 20px; box-sizing: border-box; }' +
                '.tivi-side-right { width: 60%; height: 100%; padding: 40px; box-sizing: border-box; background: radial-gradient(circle at top right, rgba(52, 152, 219, 0.05), transparent); }' +
                '.tivi-row { display: flex; align-items: center; padding: 10px 15px; background: rgba(255,255,255,0.02); margin-bottom: 5px; border-radius: 6px; cursor: pointer; border-left: 3px solid transparent; }' +
                '.tivi-row.focus { background: rgba(52, 152, 219, 0.2) !important; border-left-color: #3498db; }' +
                '.tivi-chan-logo { width: 40px; height: 25px; margin-right: 12px; flex-shrink: 0; background: #000; border-radius: 3px; display: flex; align-items: center; justify-content: center; overflow: hidden; }' +
                '.tivi-chan-logo img { max-width: 100%; max-height: 100%; object-fit: contain; }' +
                '.tivi-chan-name { font-size: 1.1em; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }' +
                '.epg-title { font-size: 2.2em; color: #fff; font-weight: bold; margin-bottom: 10px; line-height: 1.2; }' +
                '.epg-chan-info { font-size: 1.1em; color: #3498db; margin-bottom: 30px; display: flex; align-items: center; }' +
                '.epg-desc { font-size: 1.3em; color: rgba(255,255,255,0.6); line-height: 1.6; }' +
                '.epg-next-item { margin-top: 20px; padding-top: 20px; border-top: 1px solid rgba(255,255,255,0.1); }' +
                '.epg-next-label { color: rgba(255,255,255,0.3); text-transform: uppercase; font-size: 0.8em; margin-bottom: 5px; }' +
                '.tivi-group-title { font-size: 0.8em; color: rgba(255,255,255,0.3); text-transform: uppercase; margin: 20px 0 10px; }' +
                '</style>');
        }

        function getImg(url, id) {
            if (url) return 'https://corsproxy.io/?' + encodeURIComponent(url);
            if (id) return 'https://iptvx.one/logo/' + id + '.png';
            return '';
        }

        this.create = function () {
            // Принудительная регистрация EPG при создании компонента
            if (window.Lampa && Lampa.TV) {
                Lampa.TV.addSource('iptvx_final', 'https://iptvx.one/epg/epg.xml.gz');
            }
            
            items.append(leftPanel).append(rightPanel);
            var url = Lampa.Storage.get('iptv_m3u_link', '');
            if (!url) this.renderSettings();
            else this.load(url);
        };

        this.load = function(url) {
            leftPanel.html('<div style="color:#fff; opacity:0.5;">Загрузка...</div>');
            $.ajax({
                url: 'https://corsproxy.io/?' + encodeURIComponent(url),
                method: 'GET',
                success: function(str) { _this.parse(str); _this.renderMain(); },
                error: function() { Lampa.Noty.show('Ошибка плейлиста'); _this.renderSettings(); }
            });
        };

        this.parse = function(str) {
            groups = {'Все каналы': []};
            var lines = str.split('\n');
            var cur = null;
            lines.forEach(function(l) {
                l = l.trim();
                if (l.indexOf('#EXTINF') === 0) {
                    cur = {
                        name: l.match(/,(.*)$/)?.[1].trim() || 'Без названия',
                        id: l.match(/tvg-id="([^"]+)"/i)?.[1] || '',
                        logo: l.match(/tvg-logo="([^"]+)"/i)?.[1] || '',
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

        this.updateEPG = function(chan) {
            rightPanel.empty();
            var title = "Программа не загружена";
            var next = "";
            var desc = "Пожалуйста, подождите 20-30 секунд после первого запуска, чтобы Lampa загрузила базу EPG.";

            if (window.Lampa && Lampa.TV) {
                var data = Lampa.TV.getEPG(chan.id || chan.name);
                if (data && data.current) {
                    title = data.current.title;
                    desc = data.current.description || "Описание программы отсутствует.";
                    if (data.next) next = data.next.title;
                }
            }

            var html = $(`<div>
                <div class="epg-chan-info">
                    <div class="tivi-chan-logo" style="width:80px; height:50px; margin-right:20px;">
                        <img src="${getImg(chan.logo, chan.id)}">
                    </div>
                    <div><b>${chan.name}</b><br><span style="opacity:0.5">${chan.group}</span></div>
                </div>
                <div class="epg-title">${title}</div>
                <div class="epg-desc">${desc}</div>
                ${next ? `
                <div class="epg-next-item">
                    <div class="epg-next-label">Затем</div>
                    <div style="font-size:1.4em; color:#fff;">${next}</div>
                </div>` : ''}
            </div>`);
            rightPanel.append(html);
        };

        this.renderMain = function() {
            leftPanel.empty().append('<div class="tivi-group-title">Меню</div>');
            this.drawNavRow('⚙️ НАСТРОИТЬ ПЛЕЙЛИСТ', function() { _this.renderSettings(); });
            
            leftPanel.append('<div class="tivi-group-title">Категории</div>');
            Object.keys(groups).sort().forEach(function(g) {
                if (g === 'Все каналы' && Object.keys(groups).length > 2) return;
                _this.drawNavRow(g.toUpperCase(), function() { _this.renderList(groups[g], g); });
            });
            this.focus();
        };

        this.renderList = function(list, title) {
            leftPanel.empty();
            this.drawNavRow('🔙 НАЗАД К ГРУППАМ', function() { _this.renderMain(); });
            leftPanel.append('<div class="tivi-group-title">' + title + '</div>');

            list.forEach(function(chan) {
                var row = $('<div class="selector tivi-row">' +
                    '<div class="tivi-chan-logo"><img src="'+getImg(chan.logo, chan.id)+'"></div>' +
                    '<div class="tivi-chan-name">'+chan.name+'</div>' +
                '</div>');

                row.on('hover:focus', function() { _this.updateEPG(chan); });
                row.on('hover:enter', function() { Lampa.Player.play({ url: chan.url, title: chan.name }); });
                leftPanel.append(row);
            });
            this.focus();
        };

        this.drawNavRow = function(text, action) {
            var row = $('<div class="selector tivi-row"><div class="tivi-chan-name">'+text+'</div></div>');
            row.on('hover:enter', action);
            leftPanel.append(row);
        };

        this.renderSettings = function() {
            leftPanel.empty().append('<div class="tivi-group-title">Настройки</div>');
            this.drawNavRow('➕ ВВЕСТИ URL ПЛЕЙЛИСТА', function() {
                Lampa.Input.edit({ value: Lampa.Storage.get('iptv_m3u_link', ''), free: true }, function(v) {
                    if(v) { Lampa.Storage.set('iptv_m3u_link', v); _this.load(v); }
                });
            });
            this.focus();
        };

        this.focus = function() {
            Lampa.Controller.enable('content');
            setTimeout(function() {
                var f = leftPanel.find('.selector').first();
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
