// ==Lampa==
// name: IPTV Lite
// version: 1.0.9
// description: Исправлена ошибка render
// author: Gemini
// ==/Lampa==

(function () {
    'use strict';

    function IPTVComponent(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = $('<div class="category-full"></div>');
        var groups = {};

        // Метод create вызывается Lampa при открытии
        this.create = function () {
            var _this = this;
            var url = Lampa.Storage.get('iptv_m3u_link', '');

            if (!url) {
                items.append('<div class="empty" style="text-align:center;padding:40px">Введите M3U ссылку в настройках IPTV Lite</div>');
            } else {
                Lampa.Loading.show();
                network.silent(url, function (str) {
                    _this.parse(str);
                    _this.renderGroups();
                    Lampa.Loading.hide();
                }, function () {
                    Lampa.Loading.hide();
                    Lampa.Noty.show('Ошибка загрузки M3U');
                }, false, {dataType: 'text'});
            }

            scroll.append(items);
        };

        // ВАЖНО: Добавляем метод render, который запрашивает Lampa
        this.render = function () {
            return scroll.render();
        };

        this.parse = function (str) {
            groups = {'Все каналы': []};
            var lines = str.split('\n');
            var current = null;
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (line.indexOf('#EXTINF') === 0) {
                    current = {};
                    var name = line.match(/,(.*)$/);
                    var group = line.match(/group-title="([^"]+)"/);
                    current.name = name ? name[1].trim() : 'Channel';
                    current.group = group ? group[1] : 'Разное';
                } else if (line.indexOf('http') === 0 && current) {
                    current.url = line;
                    if (!groups[current.group]) groups[current.group] = [];
                    groups[current.group].push(current);
                    groups['Все каналы'].push(current);
                    current = null;
                }
            }
        };

        this.renderGroups = function () {
            var _this = this;
            items.empty();
            Object.keys(groups).forEach(function (gName) {
                var card = Lampa.Template.get('button_category', {title: gName + ' (' + groups[gName].length + ')'});
                card.on('hover:enter', function () { _this.renderChannels(gName); });
                items.append(card);
            });
            Lampa.Controller.enable('content');
        };

        this.renderChannels = function (gName) {
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
        };

        this.pause = function () {};
        this.stop = function () {};
        this.destroy = function () {
            network.clear();
            scroll.destroy();
            items.remove();
        };
    }

    function plugin_init() {
        // Регистрация компонента
        Lampa.Component.add('iptv_lite', IPTVComponent);

        // Кнопка в меню
        Lampa.Menu.add({
            id: 'iptv_lite',
            title: 'IPTV Lite',
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="white"/></svg>',
            section: 'main',
            onSelect: function () {
                Lampa.Activity.push({ title: 'IPTV Lite', component: 'iptv_lite', page: 1 });
            }
        });

        // Настройки
        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name === 'main') {
                var field = $('<div class="settings-folder selector"><div class="settings-folder__name">IPTV Lite Настройки</div></div>');
                field.on('hover:enter', function () {
                    Lampa.Settings.create('iptv_lite_set', 'IPTV Lite');
                    
                    var param = Lampa.Template.get('settings_param_input', {
                        name: 'iptv_m3u_link',
                        title: 'M3U Link',
                        placeholder: 'http://...',
                        value: Lampa.Storage.get('iptv_m3u_link', '')
                    });

                    param.on('change', function (v) {
                        Lampa.Storage.set('iptv_m3u_link', v);
                    });

                    Lampa.Settings.add(param);
                    Lampa.Controller.enable('settings_iptv_lite_set');
                });
                e.body.find('.settings-main').append(field);
            }
        });
    }

    if (window.Lampa) {
        Lampa.Extensions.add({
            id: 'iptv_lite_fixed',
            type: 'plugin',
            onInit: function () {
                if (window.app_ready) plugin_init();
                else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') plugin_init(); });
            }
        });
    }
})();
