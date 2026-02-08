// ==Lampa==
// name: IPTV Fixed & Safe
// version: 5.1
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
        var active_pl_index = Lampa.Storage.get('iptv_pl_a', 0);
        var fav = Lampa.Storage.get('iptv_fav', []);
        var groups = {};
        var all_channels = [];
        var last_focus = null; // Запоминаем, где был фокус

        // Стили
        if (!$('#iptv-style-5').length) {
            $('head').append(`
            <style id="iptv-style-5">
                .iptv-root { display: flex; width: 100%; height: 100%; background: #0b0d10; color: #fff; position: absolute; top: 0; left: 0; }
                .iptv-col { display: flex; flex-direction: column; overflow-y: auto; height: 100%; }
                .iptv-col::-webkit-scrollbar { width: 0px; }
                
                .g { width: 25%; background: #111418; border-right: 1px solid #1a1d22; padding: 10px; }
                .c { width: 45%; background: #0b0d10; padding: 10px; }
                .e { width: 30%; background: #080a0d; padding: 20px; border-left: 1px solid #1a1d22; }

                .item { padding: 12px 15px; margin-bottom: 5px; border-radius: 6px; cursor: pointer; background: transparent; border: 2px solid transparent; transition: transform 0.1s; }
                .item.focus { background: #2962ff !important; border-color: #fff; transform: scale(1.02); z-index: 2; box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
                
                .chan { display: flex; align-items: center; }
                .logo { width: 50px; height: 30px; background: #000; margin-right: 10px; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
                .logo img { max-width: 100%; max-height: 100%; }
                .name { font-weight: 500; font-size: 1.1em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                
                .info-title { font-size: 1.8em; font-weight: bold; margin-bottom: 10px; color: #fff; }
                .info-epg { font-size: 1.1em; color: #aaa; line-height: 1.4; }
                .info-time { color: #2962ff; font-weight: bold; margin-bottom: 5px; }
            </style>`);
        }

        this.create = function () {
            root.append(colG, colC, colE);
            colG.append('<div class="item" style="opacity:0.5">Загрузка...</div>');
            
            // Регистрируем контроллер, но пока НЕ активируем его
            Lampa.Controller.add('iptv_plugin', {
                toggle: function () {
                    var items = root.find('.selector');
                    if(items.length){
                        Lampa.Controller.collectionSet(items);
                        // Если есть запомненный фокус - вернем его, иначе первый элемент
                        var to_focus = (last_focus && $(last_focus).is(':visible')) ? last_focus : items[0];
                        Lampa.Controller.focus(to_focus);
                    }
                },
                left: function () {
                    if (Lampa.Controller.own(this)) {
                        var focused = $(document.activeElement);
                        if (focused.closest('.g').length) {
                            Lampa.Controller.toggle('menu'); // Из левой колонки в меню
                        } else {
                            // Иначе ищем ближайший элемент слева
                            var leftItem = getClosest(focused, 'left');
                            if(leftItem) Lampa.Controller.focus(leftItem);
                        }
                    }
                },
                right: function() { handleMove('right'); },
                up: function() { handleMove('up'); },
                down: function() { handleMove('down'); },
                back: function() { Lampa.Activity.back(); }
            });

            // Начинаем загрузку, но НЕ ставим фокус сразу
            loadPlaylist();
        };

        // Вспомогательная функция для движения (чтобы не зависеть от Lampa.move)
        function handleMove(direction) {
            var current = $(document.activeElement);
            // Если Lampa сама справится - ок, если нет - пробуем свою логику
            Lampa.Controller.move(direction); 
        }
        
        // Ручной поиск ближайшего элемента (для надежности на ТВ)
        function getClosest(el, dir) {
            // Упрощенная логика: если в каналах и жмем влево -> в группы
            if(dir === 'left' && el.closest('.c').length) {
                // Пытаемся найти активную группу или первую
                var group = colG.find('.selector.focus').first(); 
                if(!group.length) group = colG.find('.selector').first();
                return group[0];
            }
            return null;
        }

        function safeUpdateController() {
            // Обновляем коллекцию пульта только если мы активны
            if (Lampa.Activity.active().component === 'iptv_full') {
                var items = root.find('.selector');
                if (items.length) {
                    Lampa.Controller.collectionSet(items);
                }
            }
        }

        function loadPlaylist() {
            $.ajax({
                url: playlists[active_pl_index].url,
                success: function(str) { 
                    parseM3U(str); 
                },
                error: function() { 
                    Lampa.Noty.show('Ошибка загрузки M3U'); 
                    colG.html('<div class="selector item">Ошибка. Назад</div>').on('click', function(){Lampa.Activity.back()});
                    safeUpdateController();
                }
            });
        }

        function parseM3U(str) {
            groups = { '⭐ Избранное': [] };
            all_channels = [];
            var lines = str.split('\n');
            var cur = null;

            lines.forEach(function (l) {
                l = l.trim();
                if (l.indexOf('#EXTINF') === 0) {
                    var m_name = (l.match(/,(.*)$/) || [,''])[1];
                    var m_logo = (l.match(/tvg-logo="([^"]+)"/i) || [,''])[1];
                    var m_group = (l.match(/group-title="([^"]+)"/i) || [,'ОБЩИЕ'])[1];
                    var m_id = (l.match(/tvg-id="([^"]+)"/i) || [,''])[1];
                    cur = { name: m_name, logo: m_logo, group: m_group, id: m_id };
                } else if (l.indexOf('http') === 0 && cur) {
                    cur.url = l;
                    all_channels.push(cur);
                    if (!groups[cur.group]) groups[cur.group] = [];
                    groups[cur.group].push(cur);
                    cur = null;
                }
            });
            
            groups['⭐ Избранное'] = all_channels.filter(c => fav.includes(c.name));
            renderGroups();
        }

        function renderGroups() {
            colG.empty();
            
            // Кнопка добавления
            var addBtn = $('<div class="selector item" style="color:#2962ff"><b>+ Плейлист</b></div>');
            addBtn.on('hover:enter', function() {
                 Lampa.Input.edit({ value: '', free: true, title: 'URL' }, function(val){
                     if(val){
                         playlists.push({name: 'New', url: val});
                         Lampa.Storage.set('iptv_pl', playlists);
                         active_pl_index = playlists.length -1;
                         Lampa.Storage.set('iptv_pl_a', active_pl_index);
                         loadPlaylist();
                     }
                 });
            });
            colG.append(addBtn);

            Object.keys(groups).forEach(function (g) {
                var item = $('<div class="selector item">' + g + '</div>');
                item.on('hover:enter', function () { 
                    renderChannels(groups[g]); 
                    last_focus = this; // Запоминаем эту группу
                });
                item.on('hover:focus', function() { 
                    last_focus = this;
                    colE.empty().append('<div class="info-title">'+g+'</div>'); 
                });
                colG.append(item);
            });

            // ВАЖНО: Активируем контроллер только сейчас, когда элементы есть в DOM
            safeUpdateController();
            
            // Если это первый запуск и фокуса нет - ставим на первую группу
            if(!root.find('.focus').length) {
                var first = colG.find('.selector').first();
                if(first.length) Lampa.Controller.focus(first[0]);
            }
        }

        function renderChannels(list) {
            colC.empty();
            colE.empty();

            list.forEach(function (c) {
                var img = c.logo || 'https://bylampa.github.io/img/iptv.png';
                var row = $(`
                    <div class="selector item chan">
                        <div class="logo"><img src="${img}" onerror="this.src='https://bylampa.github.io/img/iptv.png'"></div>
                        <div class="name">${c.name}</div>
                    </div>
                `);

                row.on('hover:focus', function () { 
                    showEPG(c); 
                    last_focus = this; // Запоминаем канал
                });
                row.on('hover:enter', function () {
                    Lampa.Player.play({ url: c.url, title: c.name, type: 'tv', epg: true, epg_id: c.id || c.name });
                    addToFav(c);
                });
                colC.append(row);
            });

            // Обновляем коллекцию кнопок
            safeUpdateController();
            
            // Перекидываем фокус на первый канал
            var firstChan = colC.find('.selector').first();
            if(firstChan.length) Lampa.Controller.focus(firstChan[0]);
        }

        function showEPG(c) {
            colE.empty();
            var html = $(`<div class="info-title">${c.name}</div><div class="info-epg">Загрузка...</div>`);
            colE.append(html);

            if(Lampa.TV && Lampa.TV.getEPG){
                var epg = Lampa.TV.getEPG(c.id || c.name);
                if(epg && epg.current){
                    html.find('.info-epg').html(`
                        <div class="info-time">${epg.current.time}</div>
                        <div>${epg.current.title}</div>
                    `);
                } else {
                    html.find('.info-epg').text('Нет данных');
                }
            }
        }

        function addToFav(c){
            if(!fav.includes(c.name)) {
                fav.push(c.name);
                Lampa.Storage.set('iptv_fav', fav);
            }
        }

        this.start = function () {
            // Включаем контроллер
            Lampa.Controller.toggle('iptv_plugin');
            // Если данные уже были загружены ранее - обновим состояние
            safeUpdateController();
        };

        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return root; };
        this.destroy = function () { root.remove(); };
    }

    function init() {
        Lampa.Component.add('iptv_full', IPTVComponent);
        var btn = $('<li class="menu__item selector" data-action="iptv"><div class="menu__ico"><svg height="22" width="22" viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM8 15c0-1.66 1.34-3 3-3 .35 0 .69.07 1 .18V6h5v2h-3v7.03A3.003 3.003 0 0 1 8 15z"/></svg></div><div class="menu__text">IPTV</div></li>');
        btn.on('hover:enter', function () { Lampa.Activity.push({ title: 'IPTV', component: 'iptv_full', page: 1 }); });
        $('.menu .menu__list').append(btn);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') init(); });
})();
