// ==Lampa==
// name: IPTV Lite
// version: 1.1.2
// description: IPTV плеер (Direct Input + Fix Start)
// author: Gemini
// ==/Lampa==

(function () {
    'use strict';

    function IPTVComponent(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = $('<div class="category-full"></div>');
        var groups = {};
        var active_url = Lampa.Storage.get('iptv_m3u_link', '');

        return {
            // Обязательные методы для Lampa
            start: function() {},
            pause: function() {},
            stop: function() {},

            create: function () {
                var _this = this;
                
                // Если ссылки нет - рисуем поле ввода
                if (!active_url) {
                    this.renderInput();
                } else {
                    this.loadPlaylist(active_url);
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

            // --- Логика интерфейса ---

            renderInput: function() {
                var _this = this;
                items.empty();

                var content = $(
                    '<div style="padding: 2em; text-align: center;">' +
                        '<div style="font-size: 1.5em; margin-bottom: 1em;">Настройка IPTV</div>' +
                        '<div class="iptv-input-box" style="background: rgba(255,255,255,0.1); padding: 1em; border-radius: 1em; max-width: 600px; margin: 0 auto;">' +
                            '<div class="input-title" style="margin-bottom:0.5em; opacity: 0.7;">Введите ссылку на M3U плейлист:</div>' +
                        '</div>' +
                    '</div>'
                );

                // Создаем инпут через Lampa Template
                var input = Lampa.Template.get('field_input', {
                    placeholder: 'http://example.com/playlist.m3u',
                    value: ''
                });

                // Кнопка сохранения
                var button = $('<div class="selector" style="background: white; color: black; padding: 0.8em 2em; border-radius: 2em; display: inline-block; margin-top: 1em; font-weight: bold; cursor: pointer;">Загрузить плейлист</div>');

                content.find('.iptv-input-box').append(input);
                content.find('.iptv-input-box').append(button);

                // Обработка нажатия
                button.on('hover:enter', function() {
                    var val = input.find('input').val();
                    if(val && val.length > 5) {
                        Lampa.Storage.set('iptv_m3u_link', val);
                        active_url = val;
                        _this.loadPlaylist(val);
                    } else {
                        Lampa.Noty.show('Введите корректную ссылку');
                    }
                });

                items.append(content);
            },

            loadPlaylist: function(url) {
                var _this = this;
                items.empty();
                items.append('<div class="empty" style="text-align:center;padding:20px;">Загрузка каналов...</div>');
                
                network.silent(url, function (str) {
                    items.empty();
                    _this.parse(str);
                    _this.renderGroups();
                }, function () {
                    items.empty();
                    // Кнопка сброса при ошибке
                    var err = $('<div class="empty" style="text-align:center;padding:40px;"><div style="color:#ef5350; margin-bottom:1em">Ошибка загрузки</div></div>');
                    var reset = $('<div class="selector" style="border: 1px solid white; padding: 10px 20px; display:inline-block; border-radius: 5px">Сбросить ссылку</div>');
                    reset.on('hover:enter', function() {
                        Lampa.Storage.set('iptv_m3u_link', '');
                        active_url = '';
                        _this.renderInput();
                    });
                    err.append(reset);
                    items.append(err);
                }, false, {dataType: 'text'});
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
                
                // Кнопка настроек (сброса)
                var settingsBtn = Lampa.Template.get('button_category', {title: '⚙️ Сбросить плейлист'});
                settingsBtn.on('hover:enter', function() {
                    Lampa.Storage.set('iptv_m3u_link', '');
                    active_url = '';
                    _this.renderInput();
                });
                items.append(settingsBtn);
                items.append('<div style="width:100%; height: 1px; background: rgba(255,255,255,0.1); margin: 10px 0;"></div>');

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

    function startPlugin() {
        Lampa.Component.add('iptv_lite', IPTVComponent);

        var menu_item = $('<li class="menu__item selector" data-action="iptv_lite"><div class="menu__ico"><svg height="22" viewBox="0 0 24 24" width="22" xmlns="http://www.w3.org/2000/svg"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM8 15c0-1.66 1.34-3 3-3 .35 0 .69.07 1 .18V6h5v2h-3v7.03A3.003 3.003 0 0 1 8 15z" fill="currentColor"/></svg></div><div class="menu__text">IPTV Lite</div></li>');

        menu_item.on('hover:enter', function () {
            Lampa.Activity.push({
                url: '', 
                title: 'IPTV Lite',
                component: 'iptv_lite',
                page: 1
            });
        });

        $('.menu .menu__list').append(menu_item);
    }

    if (window.app_ready) startPlugin();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type == 'ready') startPlugin();
        });
    }

})();
