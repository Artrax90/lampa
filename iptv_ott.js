// ==Lampa==
// name: IPTV Lite
// version: 1.1.1
// description: IPTV плеер (Manual Menu Injection)
// author: Gemini
// ==/Lampa==

(function () {
    'use strict';

    // 1. КОМПОНЕНТ (Остался прежним, так как он рабочий)
    function IPTVComponent(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = $('<div class="category-full"></div>');
        var groups = {};

        return {
            create: function () {
                var _this = this;
                var url = Lampa.Storage.get('iptv_m3u_link', '');

                if (!url) {
                    items.append('<div class="empty" style="text-align:center;padding:40px;font-size:1.2em;">Укажите ссылку на M3U<br><span style="font-size:0.8em;opacity:0.7">Настройки -> IPTV Lite</span></div>');
                } else {
                    items.append('<div class="empty" style="text-align:center;padding:20px;">Загрузка списка...</div>');
                    
                    network.silent(url, function (str) {
                        items.empty();
                        _this.parse(str);
                        _this.renderGroups();
                    }, function () {
                        items.empty();
                        items.append('<div class="empty" style="text-align:center;padding:40px;color:#ef5350">Ошибка загрузки. Проверьте ссылку и CORS.</div>');
                    }, false, {dataType: 'text'});
                }
                scroll.append(items);
            },

            render: function () {
                return scroll.render();
            },

            destroy: function () {
                network.clear();
                scroll.destroy();
                items.remove();
                groups = null;
            },

            parse: function (str) {
                groups = {'Все каналы': []};
                var lines = str.split('\n');
                var current = null;
                for (var i = 0; i < lines.length; i++) {
                    var line = lines[i].trim();
                    if (line.indexOf('#EXTINF') === 0) {
                        current = {};
                        var name = line.match(/,(.*)$/);
                        var group = line.match(/group-title="([^"]+)"/);
                        current.name = name ? name[1].trim() : 'Канал';
                        current.group = group ? group[1] : 'Разное';
                    } else if (line.indexOf('http') === 0 && current) {
                        current.url = line;
                        if (!groups[current.group]) groups[current.group] = [];
                        groups[current.group].push(current);
                        groups['Все каналы'].push(current);
                        current = null;
                    }
                }
            },

            renderGroups: function () {
                var _this = this;
                items.empty();
                if (Object.keys(groups).length === 1 && groups['Все каналы'].length === 0) {
                     items.append('<div class="empty" style="text-align:center;padding:40px">Плейлист пуст</div>');
                     return;
                }
                Object.keys(groups).forEach(function (gName) {
                    if (gName === 'Все каналы' && Object.keys(groups).length > 2) return;
                    var card = Lampa.Template.get('button_category', {title: gName + ' (' + groups[gName].length + ')'});
                    card.on('hover:enter', function () { _this.renderChannels(gName); });
                    items.append(card);
                });
                Lampa.Controller.enable('content');
            },

            renderChannels: function (gName) {
                var _this = this;
                items.empty();
                var back = Lampa.Template.get('button_category', {title: '[ Назад ]'});
                back.on('hover:enter', function () { _this.renderGroups(); });
                items.append(back);

                groups[gName].forEach(function (chan) {
                    var card = Lampa.Template.get('button_category', {title: chan.name});
                    card.on('hover:enter', function () {
                        Lampa.Player.play({ url: chan.url, title: chan.name });
                        Lampa.Player.playlist([{ url: chan.url, title: chan.name }]);
                    });
                    items.append(card);
                });
                Lampa.Controller.enable('content');
            }
        };
    }

    // 2. ИНИЦИАЛИЗАЦИЯ ИНТЕРФЕЙСА (Manual Injection)
    function startPlugin() {
        // Регистрируем компонент
        Lampa.Component.add('iptv_lite', IPTVComponent);

        // --- ВСТАВКА В МЕНЮ (Ручной метод) ---
        var menu_item = $('<li class="menu__item selector" data-action="iptv_lite"><div class="menu__ico"><svg height="22" viewBox="0 0 24 24" width="22" xmlns="http://www.w3.org/2000/svg"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM8 15c0-1.66 1.34-3 3-3 .35 0 .69.07 1 .18V6h5v2h-3v7.03A3.003 3.003 0 0 1 8 15z" fill="currentColor"/></svg></div><div class="menu__text">IPTV Lite</div></li>');

        menu_item.on('hover:enter', function () {
            Lampa.Activity.push({
                url: '', 
                title: 'IPTV Lite',
                component: 'iptv_lite',
                page: 1
            });
        });

        // Находим список меню и вставляем туда кнопку
        $('.menu .menu__list').append(menu_item);


        // --- ВСТАВКА В НАСТРОЙКИ (Ручной метод) ---
        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name === 'main') {
                var item = Lampa.Template.get('button_category', {title: 'Настройки IPTV Lite'});
                item.on('hover:enter', function () {
                    Lampa.Settings.create('iptv_lite_set', 'IPTV Lite');
                    
                    // Поле ввода
                    var param = Lampa.Template.get('settings_param_input', {
                        name: 'iptv_m3u_link',
                        title: 'Ссылка на плейлист',
                        placeholder: 'http://...',
                        value: Lampa.Storage.get('iptv_m3u_link', '')
                    });
                    
                    param.on('change', function(v){ 
                        Lampa.Storage.set('iptv_m3u_link', v); 
                    });
                    
                    // Инструкция
                    var info = $('<div class="settings-param__descr">Введите прямую ссылку на .m3u или .m3u8 файл</div>');
                    
                    // Добавляем вручную, без Settings.add
                    $('.settings-iptv_lite_set').empty().append(param).append(info);
                });
                e.body.find('.settings-main').append(item);
            }
        });
    }

    // 3. ЗАПУСК
    if (window.app_ready) {
        startPlugin();
    } else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') startPlugin();
        });
    }

})();
