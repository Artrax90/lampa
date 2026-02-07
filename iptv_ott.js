// ==Lampa==
// name: IPTV Lite
// version: 1.0.3
// description: Простой IPTV плеер
// author: Gemini
// ==/Lampa==

(function () {
    'use strict';

    function IPTV(object) {
        var network = new Lampa.Reguest();
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items_container = $('<div class="category-full"></div>');
        var groups = {};
        var m3u_url = Lampa.Storage.get('iptv_m3u_link', '');

        this.create = function () {
            var _this = this;
            
            if (!m3u_url) {
                items_container.append('<div class="empty" style="text-align:center;padding:40px">Укажите ссылку на M3U в настройках (Раздел IPTV)</div>');
            } else {
                this.load();
            }

            scroll.append(items_container);
            return [scroll.render()];
        };

        this.load = function () {
            var _this = this;
            Lampa.Loading.show();

            network.silent(m3u_url, function (str) {
                _this.parse(str);
                _this.showGroups();
                Lampa.Loading.hide();
            }, function () {
                Lampa.Loading.hide();
                Lampa.Noty.show('Ошибка загрузки M3U');
            }, false, {dataType: 'text'});
        };

        this.parse = function (str) {
            groups = {'Все каналы': []};
            var lines = str.split('\n');
            var current = null;

            for (var i = 0; i < lines.length; i++) {
                var line = lines[i].trim();
                if (line.indexOf('#EXTINF') === 0) {
                    current = {};
                    var nameMatch = line.match(/,(.*)$/);
                    var groupMatch = line.match(/group-title="([^"]+)"/);
                    current.name = nameMatch ? nameMatch[1].trim() : 'Без названия';
                    current.group = groupMatch ? groupMatch[1] : 'Разное';
                } else if (line.indexOf('http') === 0 && current) {
                    current.url = line;
                    if (!groups[current.group]) groups[current.group] = [];
                    groups[current.group].push(current);
                    groups['Все каналы'].push(current);
                    current = null;
                }
            }
        };

        this.showGroups = function () {
            var _this = this;
            items_container.empty();
            
            Object.keys(groups).forEach(function (gName) {
                var item = Lampa.Template.get('button_category', {title: gName + ' (' + groups[gName].length + ')'});
                item.on('hover:enter', function () {
                    _this.showChannels(gName);
                });
                items_container.append(item);
            });
            Lampa.Controller.enable('content');
        };

        this.showChannels = function (gName) {
            var _this = this;
            items_container.empty();
            
            var back = Lampa.Template.get('button_category', {title: '[ Назад ]'});
            back.on('hover:enter', function () { _this.showGroups(); });
            items_container.append(back);

            groups[gName].forEach(function (chan) {
                var item = Lampa.Template.get('button_category', {title: chan.name});
                item.on('hover:enter', function () {
                    var video = { url: chan.url, title: chan.name };
                    Lampa.Player.play(video);
                    Lampa.Player.playlist([video]);
                });
                items_container.append(item);
            });
            Lampa.Controller.enable('content');
        };

        this.pause = function () {};
        this.stop = function () {};
        this.destroy = function () {
            network.clear();
            items_container.remove();
            scroll.destroy();
        };
    }

    // Функция запуска плагина
    function startIPTV() {
        // Регистрация компонента
        window.Lampa.Component.add('iptv_lite', IPTV);

        // Добавляем настройки
        Lampa.Settings.main && Lampa.Settings.main({
            id: 'iptv_lite_settings',
            title: 'IPTV Lite',
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M21 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2z" fill="white"/></svg>'
        });

        Lampa.Settings.add({
            name: 'iptv_m3u_link',
            section: 'iptv_lite_settings',
            title: 'M3U Плейлист URL',
            type: 'input',
            placeholder: 'http://server.com/playlist.m3u',
            default: ''
        });

        // Добавляем кнопку в основное меню через Settings.add (кнопка запуска)
        Lampa.Settings.add({
            title: 'IPTV Lite',
            type: 'button',
            icon: '<svg height="36" viewBox="0 0 24 24" width="36" xmlns="http://www.w3.org/2000/svg"><path d="M10 16.5l6-4.5-6-4.5v9zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="white"/></svg>',
            onContext: function () {
                Lampa.Activity.push({
                    title: 'IPTV Lite',
                    component: 'iptv_lite',
                    page: 1
                    // url будет пустым, так как мы берем его из Storage
                });
            }
        });
        
        console.log('IPTV Lite: Plugin Loaded');
    }

    // Ждем готовности Lampa и регистрируем через Extensions (но с безопасной проверкой)
    if (window.Lampa) {
        Lampa.Extensions.add({
            id: 'iptv_lite',
            type: 'plugin',
            onInit: function () {
                // Если приложение уже готово — запускаем, если нет — вешаем слушатель
                if (window.app_ready) startIPTV();
                else {
                    Lampa.Listener.follow('app', function (e) {
                        if (e.type === 'ready') startIPTV();
                    });
                }
            }
        });
    }
})();
