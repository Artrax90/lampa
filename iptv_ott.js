// ==Lampa==
// name: IPTV Lite
// version: 1.2.2
// description: IPTV плеер (Scroll & Focus Engine Fix)
// author: Gemini
// ==/Lampa==

(function () {
    'use strict';

    function IPTVComponent(object) {
        var scroll = new Lampa.Scroll({mask: true, over: true});
        var items = $('<div class="category-full"></div>');
        var groups = {};

        function createButton(title, callback) {
            var btn = $('<div class="selector scroll-item" style="width:100%; padding:18px 25px; background:rgba(255,255,255,0.05); margin-bottom:8px; border-radius:12px; display:flex; justify-content:space-between; align-items:center; cursor: pointer;">' +
                            '<span style="font-size:1.3em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-right:10px;">' + title + '</span>' +
                            '<span style="opacity:0.4; font-size:1.2em;">&rsaquo;</span>' +
                        '</div>');
            btn.on('hover:enter', callback);
            return btn;
        }

        this.create = function () {
            var url = Lampa.Storage.get('iptv_m3u_link', '');
            if (!url) this.renderInputPage();
            else this.loadPlaylist(url);
        };

        this.renderInputPage = function() {
            var _this = this;
            items.empty();
            var current_url = Lampa.Storage.get('iptv_m3u_link', '');
            
            var ui = $('<div style="text-align:center; padding:40px;">' +
                        '<div style="font-size:1.6em; margin-bottom:30px;">Настройка IPTV</div>' +
                        '<div class="selector" id="iptv_url_field" style="width:100%; padding:20px; background:rgba(255,255,255,0.1); border-radius:15px; margin-bottom:20px; word-break:break-all;">' + (current_url || 'Нажмите для ввода ссылки') + '</div>' +
                        '<div class="selector iptv-save-btn" style="background:#fff; color:#000; padding:15px 40px; border-radius:30px; display:inline-block; font-weight:bold;">Загрузить</div>' +
                      '</div>');

            ui.find('#iptv_url_field').on('hover:enter', function() {
                Lampa.Input.edit({ value: Lampa.Storage.get('iptv_m3u_link', ''), free: true }, function(new_val) {
                    if(new_val) {
                        Lampa.Storage.set('iptv_m3u_link', new_val);
                        _this.renderInputPage();
                    }
                });
            });

            ui.find('.iptv-save-btn').on('hover:enter', function() {
                _this.loadPlaylist(Lampa.Storage.get('iptv_m3u_link', ''));
            });

            items.append(ui);
            this.refreshContent();
        };

        this.loadPlaylist = function(url) {
            var _this = this;
            items.empty().append('<div style="text-align:center; padding:50px;">Загрузка каналов...</div>');

            $.ajax({
                url: url.trim(),
                method: 'GET',
                dataType: 'text',
                timeout: 15000,
                success: function(str) {
                    _this.parse(str);
                    _this.renderGroups();
                },
                error: function() {
                    Lampa.Noty.show('Ошибка загрузки. Проверьте ссылку.');
                    _this.renderInputPage();
                }
            });
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
                    current.name = name ? name[1].trim() : 'Без названия';
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
            items.append(createButton('⚙️ Настройки', function() { _this.renderInputPage(); }));
            
            Object.keys(groups).sort().forEach(function (gName) {
                if (gName === 'Все каналы' && Object.keys(groups).length > 2) return;
                items.append(createButton(gName + ' (' + groups[gName].length + ')', function() {
                    _this.renderChannels(gName);
                }));
            });
            this.refreshContent();
        };

        this.renderChannels = function (gName) {
            var _this = this;
            items.empty();
            items.append(createButton('← Назад', function() { _this.renderGroups(); }));

            groups[gName].forEach(function (chan) {
                items.append(createButton(chan.name, function() {
                    var video = {
                        url: chan.url,
                        title: chan.name,
                        lampa: true
                    };
                    Lampa.Player.play(video);
                    Lampa.Player.playlist([video]);
                }));
            });
            this.refreshContent();
        };

        this.refreshContent = function() {
            scroll.clear();
            scroll.append(items);
            
            // Вместо мгновенного update, даем DOM-дереву "продышаться"
            Lampa.Controller.enable('content');
            setTimeout(function() {
                try {
                    scroll.update();
                    var first = items.find('.selector').first();
                    if(first.length) Lampa.Controller.focus(first[0]);
                } catch(e) {
                    console.log('Scroll update postponed');
                }
            }, 200);
        };

        this.render = function () { return scroll.render(); };
        this.pause = function () {};
        this.stop = function () {};
        this.start = function () {};
        this.destroy = function () { scroll.destroy(); items.remove(); };
    }

    function init() {
        Lampa.Component.add('iptv_lite', IPTVComponent);
        var item = $('<li class="menu__item selector" data-action="iptv_lite"><div class="menu__ico"><svg height="22" viewBox="0 0 24 24" width="22" xmlns="http://www.w3.org/2000/svg"><path d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zM8 15c0-1.66 1.34-3 3-3 .35 0 .69.07 1 .18V6h5v2h-3v7.03A3.003 3.003 0 0 1 8 15z" fill="currentColor"/></svg></div><div class="menu__text">IPTV Lite</div></li>');
        item.on('hover:enter', function () {
            Lampa.Activity.push({ title: 'IPTV Lite', component: 'iptv_lite', page: 1 });
        });
        $('.menu .menu__list').append(item);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') init(); });
})();
