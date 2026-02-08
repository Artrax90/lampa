// ==Lampa==
// name: IPTV TV-Engine-Final
// version: 5.9
// author: Artrax90 & Gemini
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
            colG = $('<div class="iptv-col g"></div>');
            colC = $('<div class="iptv-col c"></div>');
            colE = $('<div class="iptv-col e"></div>');
            root.append(colG, colC, colE);

            if (!$('#iptv-v59-style').length) {
                $('head').append('<style id="iptv-v59-style">.iptv-root{display:flex;position:fixed;top:0;left:0;width:100%;height:100%;background:#0b0d10;z-index:100}.iptv-col{height:100%;overflow-y:auto;display:flex;flex-direction:column}.g{width:250px;background:#14171b;border-right:1px solid #2a2e33}.c{flex:1;background:#0b0d10}.e{width:350px;background:#080a0d;border-left:1px solid #2a2e33;padding:20px}.item{padding:15px;margin:10px;border-radius:8px;background:rgba(255,255,255,0.05);color:#fff;border:2px solid transparent;flex-shrink:0}.item.focus{background:#2962ff!important;border-color:#fff}.info-title{font-size:1.6em;font-weight:700;margin-bottom:15px;color:#fff}</style>');
            }

            // Безопасная загрузка
            var startUrl = (playlists && playlists[0] && playlists[0].url) ? playlists[0].url : 'https://raw.githubusercontent.com/loganettv/playlists/refs/heads/main/mega.m3u';
            this.load(startUrl);
            
            return root;
        };

        this.load = function (url) {
            colG.html('<div class="item">Загрузка плейлиста...</div>');
            $.ajax({
                url: url,
                timeout: 10000,
                success: function(str) { _this.parse(str); },
                error: function() { colG.html('<div class="item">Ошибка сети</div>'); }
            });
        };

        this.parse = function (str) {
            if (!str) return;
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
            groups['⭐ Избранное'] = channels.filter(function(c) { return fav.indexOf(c.name) > -1; });
            this.renderG(groups);
        };

        this.renderG = function (groups) {
            colG.empty();
            Object.keys(groups).forEach(function(g) {
                if (groups[g].length === 0 && g !== '⭐ Избранное') return;
                var item = $('<div class="selector item" data-selectable="true">' + g + '</div>');
                item.on('hover:enter', function() { _this.renderC(groups[g]); });
                item.on('hover:focus', function() { colE.html('<div class="info-title">' + g + '</div>'); });
                colG.append(item);
            });
            Lampa.Controller.collectionSet(root);
        };

        this.renderC = function (list) {
            colC.empty();
            list.forEach(function(c) {
                var row = $('<div class="selector item" data-selectable="true">' + c.name + '</div>');
                row.on('hover:enter', function() { 
                    Lampa.Player.play({url: c.url, title: c.name}); 
                });
                row.on('hover:focus', function() { colE.html('<div class="info-title">' + c.name + '</div><p>Нажмите ОК</p>'); });
                colC.append(row);
            });
            Lampa.Controller.collectionSet(root);
            
            // Фокусируем первый канал с задержкой
            setTimeout(function() {
                var first = colC.find('.selector').first();
                if(first.length) Lampa.Controller.focus(first[0]);
            }, 50);
        };

        this.start = function () {
            Lampa.Controller.add('iptv_final', {
                toggle: function () { Lampa.Controller.collectionSet(root); },
                back: function () { Lampa.Activity.back(); }
            });
            Lampa.Controller.toggle('iptv_final');
            
            // Плавный фокус при входе
            setTimeout(function() {
                var f = colG.find('.selector').first();
                if(f.length) Lampa.Controller.focus(f[0]);
            }, 400);
        };

        this.pause = this.stop = function () {};
        this.render = function () { return root; };
        this.destroy = function () { 
            Lampa.Controller.remove('iptv_final');
            root.remove(); 
        };
    }

    function init() {
        Lampa.Component.add('iptv_tv', IPTVComponent);
        var btn = $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>');
        btn.on('hover:enter', function () {
            Lampa.Activity.push({title: 'IPTV', component: 'iptv_tv'});
        });
        $('.menu .menu__list').append(btn);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') init(); });
})();
