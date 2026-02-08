// ==Lampa==
// name: IPTV TV-Pro-Build
// version: 5.7
// author: Artrax90 & Gemini
// ==/Lampa==

(function () {
    'use strict';

    function IPTVComponent(object) {
        var _this = this;
        var root, colG, colC, colE;
        var playlists = Lampa.Storage.get('iptv_pl', [{name: 'MEGA', url: 'https://raw.githubusercontent.com/loganettv/playlists/refs/heads/main/mega.m3u'}]);
        var active_pl = Lampa.Storage.get('iptv_pl_a', 0);
        var fav = Lampa.Storage.get('iptv_fav', []);

        this.create = function () {
            root = $('<div class="iptv-root"></div>');
            colG = $('<div class="iptv-col g"></div>');
            colC = $('<div class="iptv-col c"></div>');
            colE = $('<div class="iptv-col e"></div>');
            
            root.append(colG, colC, colE);

            if (!$('#iptv-css').length) {
                $('head').append('<style id="iptv-css">.iptv-root{display:flex;position:fixed;top:0;left:0;width:100%;height:100%;background:#0b0d10;z-index:10}.iptv-col{height:100%;overflow-y:auto}.g{width:250px;background:#14171b;border-right:1px solid #2a2e33}.c{flex:1;background:#0b0d10}.e{width:350px;background:#080a0d;border-left:1px solid #2a2e33;padding:20px}.item{display:block;padding:15px;margin:10px;border-radius:8px;background:rgba(255,255,255,0.05);color:#fff;cursor:pointer}.item.focus{background:#2962ff!important;outline:none}.info-t{font-size:1.6em;font-weight:700;margin-bottom:10px;color:#2962ff}</style>');
            }

            this.load();
            return root;
        };

        this.load = function () {
            colG.html('<div class="item">Загрузка...</div>');
            $.ajax({
                url: playlists[active_pl].url,
                success: function(str) { _this.parse(str); },
                error: function() { colG.html('<div class="item">Ошибка URL</div>'); }
            });
        };

        this.parse = function (str) {
            var groups = {'⭐ Избранное': []};
            var channels = [];
            str.split('\n').forEach(function(l){
                if(l.indexOf('#EXTINF') === 0){
                    var n = (l.match(/,(.*)$/)||[,''])[1];
                    var g = (l.match(/group-title="([^"]+)"/i)||[,'ОБЩИЕ'])[1];
                    var lg = (l.match(/tvg-logo="([^"]+)"/i)||[,''])[1];
                    channels.push({name:n, group:g, logo:lg});
                } else if(l.indexOf('http') === 0 && channels.length > 0){
                    var c = channels[channels.length-1];
                    if(!c.url){
                        c.url = l;
                        if(!groups[c.group]) groups[c.group] = [];
                        groups[c.group].push(c);
                    }
                }
            });
            groups['⭐ Избранное'] = channels.filter(function(c){ return fav.indexOf(c.name) > -1; });
            this.renderG(groups);
        };

        this.renderG = function (groups) {
            colG.empty();
            Object.keys(groups).forEach(function(g){
                if(groups[g].length === 0 && g !== '⭐ Избранное') return;
                var item = $('<div class="selector item">'+g+'</div>');
                item.on('hover:enter', function(){ _this.renderC(groups[g]); });
                item.on('hover:focus', function(){ colE.html('<div class="info-t">'+g+'</div>'); });
                colG.append(item);
            });
            // Не вызываем фокус здесь! Ждем команды start
        };

        this.renderC = function (list) {
            colC.empty();
            list.forEach(function(c){
                var row = $('<div class="selector item">'+c.name+'</div>');
                row.on('hover:enter', function(){
                    Lampa.Player.play({url: c.url, title: c.name});
                    if(fav.indexOf(c.name)===-1){fav.push(c.name); Lampa.Storage.set('iptv_fav', fav);}
                });
                row.on('hover:focus', function(){ colE.html('<div class="info-t">'+c.name+'</div><p>Нажмите ОК</p>'); });
                colC.append(row);
            });
            Lampa.Controller.collectionSet(root);
            Lampa.Controller.focus(colC.find('.selector')[0]);
        };

        this.start = function () {
            Lampa.Controller.add('iptv_pro', {
                toggle: function () {
                    Lampa.Controller.collectionSet(root);
                },
                back: function () {
                    Lampa.Activity.back();
                }
            });
            Lampa.Controller.toggle('iptv_pro');
            
            // Критическая задержка для ТВ
            setTimeout(function(){
                var first = colG.find('.selector').first();
                if(first.length) Lampa.Controller.focus(first[0]);
            }, 200);
        };

        this.pause = this.stop = function () {};
        this.render = function () { return root; };
        this.destroy = function () { root.remove(); Lampa.Controller.remove('iptv_pro'); };
    }

    function init() {
        Lampa.Component.add('iptv_pro', IPTVComponent);
        var btn = $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>');
        btn.on('hover:enter', function () {
            Lampa.Activity.push({title: 'IPTV', component: 'iptv_pro'});
        });
        $('.menu .menu__list').append(btn);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') init(); });
})();
