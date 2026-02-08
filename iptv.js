// ==Lampa==
// name: IPTV Visual Fix
// version: 5.2
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

        // --- ИСПРАВЛЕННЫЕ СТИЛИ (CSS) ---
        if (!$('#iptv-style-5-2').length) {
            $('head').append(`
            <style id="iptv-style-5-2">
                /* Убрали absolute, теперь блок занимает всё доступное место */
                .iptv-root { 
                    display: flex; 
                    flex-direction: row;
                    width: 100%; 
                    height: 100%; 
                    min-height: 500px; /* Минимальная высота на случай сбоя */
                    background: #0b0d10; 
                    color: #fff; 
                    overflow: hidden;
                }
                
                .iptv-col { 
                    display: flex; 
                    flex-direction: column; 
                    overflow-y: auto; 
                    height: 100%; 
                    padding-bottom: 50px; /* Отступ снизу для прокрутки */
                }
                
                /* Скрываем скроллбары, но оставляем прокрутку */
                .iptv-col::-webkit-scrollbar { width: 0px; background: transparent; }
                
                .g { width: 25%; background: #14171b; border-right: 2px solid #1f2328; }
                .c { width: 45%; background: #0b0d10; }
                .e { width: 30%; background: #080a0d; border-left: 2px solid #1f2328; padding: 20px; }

                .item { 
                    padding: 14px 18px; 
                    margin: 4px 10px; 
                    border-radius: 8px; 
                    cursor: pointer; 
                    background: transparent; 
                    border: 2px solid transparent; 
                    transition: all 0.1s;
                    font-size: 1.1em;
                }
                
                .item.focus { 
                    background: #2962ff !important; 
                    border-color: #fff; 
                    box-shadow: 0 0 15px rgba(41, 98, 255, 0.5);
                    transform: scale(1.02); 
                    z-index: 5; 
                    color: #fff;
                }
                
                .chan { display: flex; align-items: center; }
                .logo { 
                    width: 60px; 
                    height: 35px; 
                    background: #000; 
                    margin-right: 15px; 
                    border-radius: 4px; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    flex-shrink: 0;
                }
                .logo img { max-width: 100%; max-height: 100%; object-fit: contain; }
                .name { font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                
                .info-title { font-size: 1.6em; font-weight: bold; margin-bottom: 15px; color: #fff; }
                .info-epg { font-size: 1.1em; color: #aaa; line-height: 1.5; }
                .info-time { color: #2962ff; font-weight: bold; margin-bottom: 5px; font-size: 1.2em;}
            </style>`);
        }

        this.create = function () {
            // Сразу строим структуру DOM
            root.append(colG, colC, colE);
            colG.append('<div class="item selector">Загрузка...</div>');

            // Настраиваем контроллер (логика пульта)
            Lampa.Controller.add('iptv_plugin', {
                toggle: function () {
                    var items = root.find('.selector:visible');
                    Lampa.Controller.collectionSet(items);
                    
                    // Умный фокус: если ничего не выбрано, берем первый элемент
                    if(!root.find('.focus').length && items.length){
                        Lampa.Controller.focus(items[0]);
                    }
                },
                left: function () {
                    if (Lampa.Controller.own(this)) {
                        var focused = $(document.activeElement);
                        if (focused.closest('.g').length) {
                            Lampa.Activity.back(); // Выход назад
                        } else {
                            // Простая навигация влево
                            Lampa.Controller.move('left');
                        }
                    }
                },
                right: function() { Lampa.Controller.move('right'); },
                up: function() { Lampa.Controller.move('up'); },
                down: function() { Lampa.Controller.move('down'); },
                back: function() { Lampa.Activity.back(); }
            });

            // Запускаем загрузку
            loadPlaylist();
        };

        function updateController() {
            if (Lampa.Activity.active().component === 'iptv_visual_fix') {
                var items = root.find('.selector:visible');
                Lampa.Controller.collectionSet(items);
            }
        }

        function loadPlaylist() {
            $.ajax({
                url: playlists[active_pl_index].url,
                timeout: 10000, // Таймаут 10 сек
                success: function(str) { parseM3U(str); },
                error: function() { 
                    Lampa.Noty.show('Ошибка сети. Проверьте URL.'); 
                    colG.html('<div class="selector item">Повторить загрузку</div>').on('click', loadPlaylist);
                    updateController();
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
            
            // Кнопка добавления (всегда первая)
            var addBtn = $('<div class="selector item" style="border-bottom: 1px solid rgba(255,255,255,0.1)">⚙️ Добавить плейлист</div>');
            addBtn.on('hover:enter', function() {
                 Lampa.Input.edit({ value: '', free: true, title: 'Ссылка на M3U' }, function(val){
                     if(val){
                         playlists.push({name: 'New List', url: val});
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
                item.on('hover:enter', function () { renderChannels(groups[g]); });
                item.on('hover:focus', function () { 
                    colE.empty().append('<div class="info-title">'+g+'</div><div class="info-epg">Нажмите ОК для выбора каналов</div>'); 
                });
                colG.append(item);
            });

            updateController();
            
            // Ставим фокус на первую категорию, если фокуса нет
            if(!root.find('.focus').length) {
                Lampa.Controller.focus(colG.find('.selector')[1] || colG.find('.selector')[0]);
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

                row.on('hover:focus', function () { showEPG(c); });
                row.on('hover:enter', function () {
                    Lampa.Player.play({ url: c.url, title: c.name, type: 'tv', epg: true, epg_id: c.id || c.name });
                    addToFav(c);
                });
                colC.append(row);
            });

            updateController();
            
            // Перекидываем фокус на список каналов
            var first = colC.find('.selector').first();
            if(first.length) Lampa.Controller.focus(first[0]);
        }

        function showEPG(c) {
            colE.empty();
            var html = $(`<div class="info-title">${c.name}</div><div class="info-epg">Загрузка программы...</div>`);
            colE.append(html);

            if(Lampa.TV && Lampa.TV.getEPG){
                var epg = Lampa.TV.getEPG(c.id || c.name);
                if(epg && epg.current){
                    html.find('.info-epg').html(`
                        <div class="info-time">${epg.current.time}</div>
                        <div>${epg.current.title}</div>
                    `);
                } else {
                    html.find('.info-epg').text('Нет данных телегида');
                }
            }
        }

        function addToFav(c){
            if(!fav.includes(c.name)) {
                fav.push(c.name);
                Lampa.Storage.set('iptv_fav', fav);
                Lampa.Noty.show('Добавлено в Избранное');
            }
        }

        this.start = function () {
            Lampa.Controller.toggle('iptv_plugin');
        };

        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return root; };
        this.destroy = function () { root.remove(); };
    }

    function init() {
        Lampa.Component.add('iptv_visual_fix', IPTVComponent);
        var btn = $('<li class="menu__item selector" data-action="iptv"><div class="menu__ico"><svg height="22" width="22" viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM8 15c0-1.66 1.34-3 3-3 .35 0 .69.07 1 .18V6h5v2h-3v7.03A3.003 3.003 0 0 1 8 15z"/></svg></div><div class="menu__text">IPTV</div></li>');
        btn.on('hover:enter', function () { Lampa.Activity.push({ title: 'IPTV', component: 'iptv_visual_fix', page: 1 }); });
        $('.menu .menu__list').append(btn);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') init(); });
})();
