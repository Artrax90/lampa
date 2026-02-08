// ==Lampa==
// name: IPTV TV-Safe-Focus
// version: 5.6
// author: Artrax90 & Gemini
// ==/Lampa==

(function () {
    'use strict';

    var DEFAULT_PLAYLIST = {
        name: 'LoganetTV MEGA',
        url: 'https://raw.githubusercontent.com/loganettv/playlists/refs/heads/main/mega.m3u'
    };

    function IPTVComponent() {
        var _this = this;
        var root, colG, colC, colE;
        
        var playlists = Lampa.Storage.get('iptv_pl', [DEFAULT_PLAYLIST]);
        var active_pl = Lampa.Storage.get('iptv_pl_a', 0);
        var fav = Lampa.Storage.get('iptv_fav', []);
        var groups = {};

        // Оставляем рабочую верстку 5.5
        if (!$('#iptv-style-v56').length) {
            $('head').append(`
            <style id="iptv-style-v56">
                .iptv-root { display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #0b0d10; z-index: 10; }
                .iptv-col { float: left; height: 100%; overflow-y: auto; box-sizing: border-box; }
                .iptv-col::-webkit-scrollbar { width: 0; }
                .g { width: 250px; background: #14171b; border-right: 1px solid #2a2e33; }
                .c { width: calc(100% - 600px); background: #0b0d10; }
                .e { width: 350px; background: #080a0d; border-left: 1px solid #2a2e33; padding: 20px; }
                .item { 
                    display: block; width: calc(100% - 20px); 
                    padding: 15px; margin: 10px; 
                    border-radius: 8px; background: rgba(255,255,255,0.05); 
                    border: 2px solid transparent; color: #fff; font-size: 1.1em;
                }
                .item.focus { background: #2962ff !important; border-color: #fff; }
                .chan { display: flex; align-items: center; }
                .logo { width: 50px; height: 30px; margin-right: 15px; background: #000; flex-shrink: 0; }
                .logo img { width: 100%; height: 100%; object-fit: contain; }
                .name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .info-title { font-size: 1.6em; font-weight: bold; margin-bottom: 10px; color: #2962ff; }
            </style>`);
        }

        this.create = function () {
            root = $('<div class="iptv-root"></div>');
            colG = $('<div class="iptv-col g"></div>');
            colC = $('<div class="iptv-col c"></div>');
            colE = $('<div class="iptv-col e"></div>');
            root.append(colG, colC, colE);

            // УБРАЛИ обработчики left/right/up/down совсем.
            // Оставляем только регистрацию контроллера.
            Lampa.Controller.add('iptv_plugin', {
                toggle: function () {
                    Lampa.Controller.collectionSet(root);
                },
                back: function() { 
                    Lampa.Activity.back(); 
                }
            });

            this.load();
        };

        this.load = function () {
            colG.html('<div class="item">Загрузка...</div>');
            $.ajax({
                url: playlists[active_pl].url,
                success: function(str) { _this.parse(str); },
                error: function() { 
                    colG.html('<div class="selector item">Ошибка сети</div>'); 
                }
            });
        };

        this.parse = function (str) {
            groups = { '⭐ Избранное': [] };
            var channels = [];
            var lines = str.split('\n');

            for(var i=0; i<lines.length; i++) {
                var l = lines[i].trim();
                if (l.indexOf('#EXTINF') === 0) {
                    var n = (l.match(/,(.*)$/) || [,''])[1];
                    var lg = (l.match(/tvg-logo="([^"]+)"/i) || [,''])[1];
                    var g = (l.match(/group-title="([^"]+)"/i) || [,'ОБЩИЕ'])[1];
                    channels.push({ name: n, logo: lg, group: g });
                } else if (l.indexOf('http') === 0 && channels.length > 0) {
                    var last = channels[channels.length-1];
                    if (!last.url) {
                        last.url = l;
                        if (!groups[last.group]) groups[last.group] = [];
                        groups[last.group].push(last);
                    }
                }
            }
            groups['⭐ Избранное'] = channels.filter(function(c){ return fav.indexOf(c.name) > -1; });
            this.renderG();
        };

        this.renderG = function () {
            colG.empty();
            
            // Сначала рисуем категории
            Object.keys(groups).forEach(function(g) {
                if (groups[g].length === 0 && g !== '⭐ Избранное') return;
                var item = $('<div class="selector item">' + g + '</div>');
                
                // Используем универсальные события Lampa
                item.on('hover:enter', function() { 
                    _this.renderC(groups[g]); 
                });
                
                item.on('hover:focus', function() { 
                    colE.html('<div class="info-title">'+g+'</div><p>Нажмите ОК для просмотра списка</p>'); 
                });
                
                colG.append(item);
            });
            
            // ВАЖНО: Только один раз в конце обновляем коллекцию
            Lampa.Controller.collectionSet(root);
            
            // Ставим фокус БЕЗ использования trigger и dispatchEvent
            var first = colG.find('.selector').first();
            if(first.length) Lampa.Controller.focus(first[0]);
        };

        this.renderC = function (list) {
            colC.empty();
            list.forEach(function(c) {
                var row = $('<div class="selector item chan"><div class="logo"><img src="'+(c.logo || '')+'"></div><div class="name">'+c.name+'</div></div>');
                
                row.on('hover:enter', function() {
                    Lampa.Player.play({ url: c.url, title: c.name });
                    if(fav.indexOf(c.name) === -1) { 
                        fav.push(c.name); 
                        Lampa.Storage.set('iptv_fav', fav); 
                    }
                });
                
                row.on('hover:focus', function() {
                    colE.html('<div class="info-title">'+c.name+'</div><p>Нажмите ОК для запуска трансляции</p>');
                });
                
                colC.append(row);
            });
            
            Lampa.Controller.collectionSet(root);
            
            // Фокусируем первый канал в списке
            var firstChan = colC.find('.selector').first();
            if(firstChan.length) Lampa.Controller.focus(firstChan[0]);
        };

        this.render = function () { return root; };
        
        this.start = function () { 
            // Переключаем контроллер, но не вызываем лишних движений
            Lampa.Controller.toggle('iptv_plugin'); 
        };
        
        this.pause = this.stop = function () {};
        this.destroy = function () { 
            Lampa.Controller.remove('iptv_plugin');
            root.remove(); 
        };
    }

    function init() {
        Lampa.Component.add('iptv_safe', IPTVComponent);
        var item = $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>');
        item.on('hover:enter', function () { 
            Lampa.Activity.push({ title: 'IPTV', component: 'iptv_safe' }); 
        });
        $('.menu .menu__list').append(item);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') init(); });
})();
