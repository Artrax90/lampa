// ==Lampa==
// name: IPTV TV-NoLoop
// version: 5.4
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
        var root = $('<div class="iptv-root"></div>');
        var colG = $('<div class="iptv-col g"></div>');
        var colC = $('<div class="iptv-col c"></div>');
        var colE = $('<div class="iptv-col e"></div>');
        
        var playlists = Lampa.Storage.get('iptv_pl', [DEFAULT_PLAYLIST]);
        var active_pl = Lampa.Storage.get('iptv_pl_a', 0);
        var fav = Lampa.Storage.get('iptv_fav', []);
        var groups = {};

        // Чистый CSS без лишних наслоений
        if (!$('#iptv-style-v54').length) {
            $('head').append(`
            <style id="iptv-style-v54">
                .iptv-root { display: flex; position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: #0b0d10; z-index: 100; }
                .iptv-col { height: 100%; overflow-y: auto; box-sizing: border-box; display: flex; flex-direction: column; }
                .iptv-col::-webkit-scrollbar { width: 0; }
                
                .g { width: 20%; background: #14171b; border-right: 1px solid #2a2e33; padding: 10px; }
                .c { width: 50%; background: #0b0d10; padding: 10px; }
                .e { width: 30%; background: #080a0d; border-left: 1px solid #2a2e33; padding: 20px; }

                .item { padding: 12px; margin-bottom: 5px; border-radius: 8px; cursor: pointer; color: #fff; background: rgba(255,255,255,0.05); border: 2px solid transparent; flex-shrink: 0; }
                .item.focus { background: #2962ff !important; border-color: #fff; }
                
                .chan { display: flex; align-items: center; }
                .logo { width: 40px; height: 25px; margin-right: 10px; background: #000; border-radius: 4px; overflow: hidden; flex-shrink: 0; }
                .logo img { width: 100%; height: 100%; object-fit: contain; }
                .name { font-size: 1em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                
                .info-title { font-size: 1.5em; font-weight: bold; margin-bottom: 10px; }
            </style>`);
        }

        this.create = function () {
            root.append(colG, colC, colE);
            
            // Регистрируем пустой контроллер. 
            // Мы не переопределяем up/down, чтобы не было цикла.
            Lampa.Controller.add('iptv_plugin', {
                toggle: function () {
                    _this.refreshNav();
                },
                left: function() {
                    // Единственная кастомная кнопка - выход в меню
                    if (root.find('.g .focus').length) Lampa.Controller.toggle('menu');
                    else Lampa.Controller.move('left');
                },
                back: function() {
                    Lampa.Activity.back();
                }
            });

            this.load();
        };

        this.refreshNav = function () {
            // Сообщаем системе, что все элементы .selector теперь доступны для пульта
            Lampa.Controller.collectionSet(root);
            var active = root.find('.focus');
            if (!active.length) {
                var first = root.find('.selector').first();
                if (first.length) Lampa.Controller.focus(first[0]);
            }
        };

        this.load = function () {
            colG.html('<div class="item">Загрузка...</div>');
            $.ajax({
                url: playlists[active_pl].url,
                success: function(str) { _this.parse(str); },
                error: function() { Lampa.Noty.show('Ошибка загрузки'); }
            });
        };

        this.parse = function (str) {
            groups = { '⭐ Избранное': [] };
            var channels = [];
            str.split('\n').forEach(function (l) {
                l = l.trim();
                if (l.indexOf('#EXTINF') === 0) {
                    var n = (l.match(/,(.*)$/) || [,''])[1];
                    var lg = (l.match(/tvg-logo="([^"]+)"/i) || [,''])[1];
                    var g = (l.match(/group-title="([^"]+)"/i) || [,'ОБЩИЕ'])[1];
                    channels.push({ name: n, logo: lg, group: g });
                } else if (l.indexOf('http') === 0 && channels.length > 0) {
                    channels[channels.length-1].url = l;
                    var itm = channels[channels.length-1];
                    if (!groups[itm.group]) groups[itm.group] = [];
                    groups[itm.group].push(itm);
                }
            });
            groups['⭐ Избранное'] = channels.filter(c => fav.includes(c.name));
            this.renderGroups();
        };

        this.renderGroups = function () {
            colG.empty();
            // Кнопка настройки
            var add = $('<div class="selector item">+ Добавить плейлист</div>').on('hover:enter', function() {
                Lampa.Input.edit({value: '', free: true, title: 'URL'}, function(v) {
                    if(v) { playlists.push({name: 'New', url: v}); Lampa.Storage.set('iptv_pl', playlists); _this.load(); }
                });
            });
            colG.append(add);

            Object.keys(groups).forEach(function(g) {
                if (groups[g].length === 0 && g !== '⭐ Избранное') return;
                var item = $('<div class="selector item">' + g + '</div>');
                item.on('hover:enter', function() { _this.renderChannels(groups[g]); });
                item.on('hover:focus', function() { colE.html('<div class="info-title">'+g+'</div>'); });
                colG.append(item);
            });
            this.refreshNav();
        };

        this.renderChannels = function (list) {
            colC.empty();
            list.forEach(function(c) {
                var row = $(`<div class="selector item chan"><div class="logo"><img src="${c.logo || ''}"></div><div class="name">${c.name}</div></div>`);
                row.on('hover:enter', function() {
                    Lampa.Player.play({ url: c.url, title: c.name });
                    if(!fav.includes(c.name)) { fav.push(c.name); Lampa.Storage.set('iptv_fav', fav); }
                });
                row.on('hover:focus', function() {
                    colE.html(`<div class="info-title">${c.name}</div><div>Нажмите ОК для просмотра</div>`);
                });
                colC.append(row);
            });
            this.refreshNav();
            // Сразу фокусируем первый канал
            var first = colC.find('.selector').first();
            if(first.length) Lampa.Controller.focus(first[0]);
        };

        this.render = function () { return root; };
        this.start = function () {
            Lampa.Controller.toggle('iptv_plugin');
        };
        this.pause = this.stop = function () {};
        this.destroy = function () { root.remove(); };
    }

    function init() {
        Lampa.Component.add('iptv_final', IPTVComponent);
        var item = $('<li class="menu__item selector"><div class="menu__text">IPTV</div></li>');
        item.on('hover:enter', function () { Lampa.Activity.push({ title: 'IPTV', component: 'iptv_final' }); });
        $('.menu .menu__list').append(item);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') init(); });
})();
