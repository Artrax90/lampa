// ==Lampa==
// name: IPTV Clean Layout
// version: 7.2
// author: Gemini & Artrax90
// ==/Lampa==

(function () {
    'use strict';

    function IPTVComponent(object) {
        var _this = this;
        var root, colG, colC, colE;
        var groups_data = {};
        var current_list = [];
        var active_col = 'groups'; 
        var index_g = 0, index_c = 0;

        this.create = function () {
            // Главная обертка с отступом сверху, чтобы не залезать под шапку Lampa
            root = $('<div class="iptv-root"></div>');
            var container = $('<div class="iptv-wrapper"></div>');
            
            colG = $('<div class="iptv-col col-groups"></div>');
            colC = $('<div class="iptv-col col-channels"></div>');
            colE = $('<div class="iptv-col col-details"></div>');
            
            container.append(colG, colC, colE);
            root.append(container);

            if (!$('#iptv-v72-style').length) {
                $('head').append(`
                <style id="iptv-v72-style">
                    /* Основной фон и отступы от краев системы */
                    .iptv-root { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #0b0d10; z-index: 1000; padding-top: 5rem; box-sizing: border-box; }
                    .iptv-wrapper { display: flex; width: 100%; height: 100%; align-items: stretch; overflow: hidden; }
                    
                    /* Колонки с четкими границами */
                    .iptv-col { height: 100%; overflow-y: auto; box-sizing: border-box; background: rgba(0,0,0,0.2); border-right: 1px solid rgba(255,255,255,0.1); }
                    
                    .col-groups { width: 20rem; flex-shrink: 0; }
                    .col-channels { flex: 1; }
                    .col-details { width: 25rem; flex-shrink: 0; background: #080a0d; border-right: none; padding: 2rem; }
                    
                    /* Элементы списка */
                    .iptv-item { 
                        padding: 1rem 1.5rem; margin: 0.4rem 1rem; border-radius: 0.5rem; 
                        background: rgba(255,255,255,0.03); color: #fff; 
                        border: 2px solid transparent; cursor: pointer;
                        font-size: 1.2rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
                    }
                    .iptv-item.active { background: #2962ff !important; border-color: #fff; transform: scale(1.02); }
                    
                    /* Правая панель информации (исправляем наложение текста) */
                    .info-content { display: flex; flex-direction: column; gap: 1.5rem; }
                    .info-title { font-size: 2.2rem; font-weight: bold; color: #fff; line-height: 1.2; word-wrap: break-word; white-space: normal; }
                    .info-desc { font-size: 1.1rem; color: rgba(255,255,255,0.6); line-height: 1.5; }
                </style>`);
            }

            this.load();
            return root;
        };

        this.load = function () {
            $.ajax({
                url: 'https://raw.githubusercontent.com/loganettv/playlists/refs/heads/main/mega.m3u',
                success: function(str) { _this.parse(str); },
                error: function() { colG.html('<div class="iptv-item">Ошибка загрузки</div>'); }
            });
        };

        this.parse = function (str) {
            var lines = str.split('\n');
            var channels = [];
            groups_data = {}; 
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
                        if (!groups_data[last.group]) groups_data[last.group] = [];
                        groups_data[last.group].push(last);
                    }
                }
            }
            this.renderG();
        };

        this.renderG = function () {
            colG.empty();
            Object.keys(groups_data).forEach(function(g, i) {
                var item = $('<div class="iptv-item">' + g + '</div>');
                item.on('click', function() {
                    index_g = i; active_col = 'groups';
                    _this.renderC();
                });
                colG.append(item);
            });
            this.updateFocus();
        };

        this.renderC = function () {
            colC.empty();
            var g_name = Object.keys(groups_data)[index_g];
            current_list = groups_data[g_name] || [];
            current_list.forEach(function(c, i) {
                var row = $('<div class="iptv-item">' + c.name + '</div>');
                row.on('click', function() {
                    index_c = i; active_col = 'channels';
                    _this.updateFocus();
                    Lampa.Player.play({url: c.url, title: c.name});
                });
                colC.append(row);
            });
            this.updateFocus();
        };

        this.updateFocus = function () {
            $('.iptv-item').removeClass('active');
            var g_item = colG.find('.iptv-item').eq(index_g);
            var c_item = colC.find('.iptv-item').eq(index_c);

            if (active_col === 'groups') {
                g_item.addClass('active');
                if(g_item[0]) g_item[0].scrollIntoView({block: "center", behavior: "smooth"});
                this.setDetails(g_item.text(), "Категория выбрана. Используйте кнопки Вправо или ОК, чтобы просмотреть список каналов.");
            } else {
                c_item.addClass('active');
                if(c_item[0]) c_item[0].scrollIntoView({block: "center", behavior: "smooth"});
                var chan = current_list[index_c];
                this.setDetails(chan ? chan.name : '', "Канал готов к запуску. Нажмите ОК для начала воспроизведения.");
            }
        };

        this.setDetails = function(title, desc) {
            colE.html(`
                <div class="info-content">
                    <div class="info-title">${title}</div>
                    <div class="info-desc">${desc}</div>
                </div>
            `);
        };

        this.start = function () {
            Lampa.Controller.add('iptv_clean', {
                toggle: function () {},
                up: function () {
                    if (active_col === 'groups') index_g = Math.max(0, index_g - 1);
                    else index_c = Math.max(0, index_c - 1);
                    _this.updateFocus();
                },
                down: function () {
                    if (active_col === 'groups') index_g = Math.min(Object.keys(groups_data).length - 1, index_g + 1);
                    else index_c = Math.min(current_list.length - 1, index_c + 1);
                    _this.updateFocus();
                },
                right: function () {
                    if (active_col === 'groups') { active_col = 'channels'; index_c = 0; _this.renderC(); }
                },
                left: function () {
                    if (active_col === 'channels') { active_col = 'groups'; _this.updateFocus(); }
                    else { Lampa.Activity.back(); }
                },
                enter: function () {
                    if (active_col === 'groups') { active_col = 'channels'; index_c = 0; _this.renderC(); }
                    else { 
                        var chan = current_list[index_c];
                        if (chan) Lampa.Player.play({url: chan.url, title: chan.name}); 
                    }
                },
                back: function () { Lampa.Activity.back(); }
            });
            Lampa.Controller.toggle('iptv_clean');
        };

        this.pause = this.stop = function () {};
        this.render = function () { return root; };
        this.destroy = function () { Lampa.Controller.remove('iptv_clean'); root.remove(); };
    }

    function init() {
        Lampa.Component.add('iptv_clean', IPTVComponent);
        var item = $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>');
        item.on('hover:enter', function () {
            Lampa.Activity.push({title: 'IPTV', component: 'iptv_clean'});
        });
        $('.menu .menu__list').append(item);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') init(); });
})();
