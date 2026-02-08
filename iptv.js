// ==Lampa==
// name: IPTV Native Stable
// version: 6.0
// author: Gemini & Artrax90
// ==/Lampa==

(function () {
    'use strict';

    function IPTVComponent(object) {
        var _this = this;
        var root, colG, colC, colE;
        var playlists = Lampa.Storage.get('iptv_pl', [{name: 'MEGA', url: 'https://raw.githubusercontent.com/loganettv/playlists/refs/heads/main/mega.m3u'}]);
        var fav = Lampa.Storage.get('iptv_fav', []);

        this.create = function () {
            root = $('<div class="iptv-root"></div>');
            colG = $('<div class="iptv-col g" data-group="1"></div>');
            colC = $('<div class="iptv-col c" data-group="2"></div>');
            colE = $('<div class="iptv-col e"></div>');
            root.append(colG, colC, colE);

            if (!$('#iptv-style-v6').length) {
                $('head').append(`
                <style id="iptv-style-v6">
                    .iptv-root { display: flex; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #0b0d10; z-index: 100; }
                    .iptv-col { height: 100%; overflow-y: auto; display: block; }
                    .g { width: 250px; background: #14171b; border-right: 1px solid #2a2e33; }
                    .c { flex: 1; background: #0b0d10; }
                    .e { width: 350px; background: #080a0d; border-left: 1px solid #2a2e33; padding: 20px; }
                    .item { padding: 15px; margin: 10px; border-radius: 8px; background: rgba(255,255,255,0.05); color: #fff; border: 2px solid transparent; }
                    .item.focus { background: #2962ff !important; border-color: #fff; }
                    .info-title { font-size: 1.6em; font-weight: bold; color: #fff; }
                </style>`);
            }

            this.load();
            return root;
        };

        this.load = function () {
            var url = playlists[0].url;
            $.ajax({
                url: url,
                success: function(str) { _this.parse(str); },
                error: function() { colG.html('<div class="item">Ошибка сети</div>'); }
            });
        };

        this.parse = function (str) {
            var groups = {'⭐ Избранное': []};
            var channels = [];
            var lines = str.split('\n');

            for (var i = 0; i < lines.length; i++) {
                var l = lines[i].trim();
                if (l.indexOf('#EXTINF') === 0) {
                    var n = (l.match(/,(.*)$/) || [,''])[1];
                    var g = (l.match(/group-title="([^"]+)"/i) || [,'ОБЩИЕ'])[1];
                    channels.push({name: n, group: g, url: ''});
                } else if (l.indexOf('http') === 0 && channels.length > 0) {
                    var last = channels[channels.length - 1];
                    if (!last.url) {
                        last.url = l;
                        if (!groups[last.group]) groups[last.group] = [];
                        groups[last.group].push(last);
                    }
                }
            }
            groups['⭐ Избранное'] = channels.filter(c => fav.includes(c.name));
            this.renderG(groups);
        };

        this.renderG = function (groups) {
            colG.empty();
            Object.keys(groups).forEach(function(g) {
                if (groups[g].length === 0 && g !== '⭐ Избранное') return;
                var item = $('<div class="selector item">' + g + '</div>');
                
                // Используем hover:enter и hover:focus — это "родные" события Lampa
                item.on('hover:enter', function() { _this.renderC(groups[g]); });
                item.on('hover:focus', function() { colE.html('<div class="info-title">' + g + '</div>'); });
                
                colG.append(item);
            });
            
            // После отрисовки ВСЕГДА обновляем навигацию
            Lampa.Controller.collectionSet(root);
        };

        this.renderC = function (list) {
            colC.empty();
            list.forEach(function(c) {
                var row = $('<div class="selector item">' + c.name + '</div>');
                row.on('hover:enter', function() { 
                    Lampa.Player.play({url: c.url, title: c.name}); 
                });
                row.on('hover:focus', function() { colE.html('<div class="info-title">' + c.name + '</div>'); });
                colC.append(row);
            });
            
            Lampa.Controller.collectionSet(root);
            
            // Плавный переход фокуса в колонку каналов
            var first = colC.find('.selector').first();
            if(first.length) Lampa.Controller.focus(first[0]);
        };

        this.start = function () {
            // Самый важный момент: регистрируем контроллер БЕЗ перехвата кнопок
            Lampa.Controller.add('iptv_native', {
                toggle: function () { 
                    Lampa.Controller.collectionSet(root); 
                },
                back: function () { 
                    Lampa.Activity.back(); 
                }
            });
            
            Lampa.Controller.toggle('iptv_native');
            
            // Даем задержку для ТВ, чтобы фокус прилип к первой категории
            setTimeout(function() {
                var firstCategory = colG.find('.selector').first();
                if(firstCategory.length) Lampa.Controller.focus(firstCategory[0]);
            }, 500);
        };

        this.pause = this.stop = function () {};
        this.render = function () { return root; };
        this.destroy = function () { 
            Lampa.Controller.remove('iptv_native');
            root.remove(); 
        };
    }

    function init() {
        Lampa.Component.add('iptv_native', IPTVComponent);
        var btn = $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>');
        btn.on('hover:enter', function () {
            Lampa.Activity.push({title: 'IPTV', component: 'iptv_native'});
        });
        $('.menu .menu__list').append(btn);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') init(); });
})();
