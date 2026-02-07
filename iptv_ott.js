// ==Lampa==
// name: IPTV Lite Premium
// version: 1.0.7
// description: IPTV плеер для Lampa (Стабильная версия)
// author: Gemini
// ==/Lampa==

(function () {
    'use strict';

    function IPTVPlugin(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = $('<div class="category-full"></div>');
        var groups = {};

        this.create = function () {
            var _this = this;
            var url = Lampa.Storage.get('iptv_m3u_link', '');

            if (!url) {
                items.append('<div class="empty" style="text-align:center;padding:40px">Укажите ссылку на M3U в настройках (IPTV Lite)</div>');
            } else {
                Lampa.Loading.show();
                network.silent(url, function (str) {
                    _this.parse(str);
                    _this.renderGroups();
                    Lampa.Loading.hide();
                }, function () {
                    Lampa.Loading.hide();
                    Lampa.Noty.show('Ошибка загрузки плейлиста');
                }, false, {dataType: 'text'});
            }

            scroll.append(items);
            return [scroll.render()];
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

    function startPlugin() {
        console.log('IPTV Lite: Initializing...');

        // Регистрируем компонент
        Lampa.Component.add('iptv_lite', IPTVPlugin);

        // Добавляем пункт в настройки БЕЗОПАСНЫМ способом
        Lampa.Settings.listener.follow('open', function (e) {
            if (e.name === 'main') {
                var folder = $('<div class="settings-folder selector" data-component="iptv_lite_settings"><div class="settings-folder__icon"><svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M21 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z" fill="white"/></svg></div><div class="settings-folder__name">IPTV Lite</div></div>');
                folder.on('hover:enter', function () {
                    Lampa.Settings.create('iptv_lite_settings', 'Настройки IPTV');
                    
                    // Добавляем поле ввода через встроенный метод создания параметров
                    var param = Lampa.Template.get('settings_param_input', {
                        name: 'iptv_m3u_link',
                        title: 'M3U Плейлист URL',
                        placeholder: 'http://...',
                        value: Lampa.Storage.get('iptv_m3u_link', '')
                    });

                    param.on('change', function (v) {
                        Lampa.Storage.set('iptv_m3u_link', v);
                    });

                    Lampa.Settings.add(param);
                    Lampa.Controller.enable('settings_iptv_lite_settings');
                });
                e.body.find('.settings-main').append(folder);
            }
        });

        // Добавляем в меню через нативный API
        Lampa.Menu.add({
            id: 'iptv_lite',
            title: 'IPTV Lite',
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" fill="white"/></svg>',
            section: 'main',
            onSelect: function () {
                Lampa.Activity.push({
                    title: 'IPTV Lite',
                    component: 'iptv_lite',
                    page: 1
                });
            }
        });
    }

    // Глобальная проверка и запуск
    if (window.Lampa) {
        Lampa.Extensions.add({
            id: 'iptv_lite_ext',
            type: 'plugin',
            onInit: function () {
                if (window.app_ready) startPlugin();
                else Lampa.Listener.follow('app', function (e) { if (e.type === 'ready') startPlugin(); });
            }
        });
    }
})();
