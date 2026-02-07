// ==Lampa==
// name: IPTV Lite
// version: 1.2.7
// description: IPTV плеер (Diesel & TV.js Playback Engine)
// author: Gemini
// ==/Lampa==

(function () {
    'use strict';

    function IPTVComponent(object) {
        var _this = this;
        var items = $('<div class="iptv-lite-content" style="width:100%; height: 85vh; overflow-y: auto; padding-right: 10px;"></div>');
        var groups = {};

        if (!$('#iptv-lite-styles').length) {
            $('head').append('<style id="iptv-lite-styles">' +
                '.iptv-lite-content::-webkit-scrollbar { width: 6px; }' +
                '.iptv-lite-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }' +
                '.iptv-item.focus { background: #fff !important; color: #000 !important; transform: scale(1.01); }' +
                '.iptv-item { transition: all 0.1s; }' +
                '</style>');
        }

        function createItem(title, callback) {
            var item = $('<div class="selector iptv-item" style="width:100%; padding:16px 20px; background:rgba(255,255,255,0.05); margin-bottom:6px; border-radius:10px; display:flex; align-items:center; cursor: pointer;">' +
                            '<span style="font-size:1.2em;">' + title + '</span>' +
                        '</div>');
            item.on('hover:enter', callback);
            return item;
        }

        this.create = function () {
            var url = Lampa.Storage.get('iptv_m3u_link', '');
            if (!url) this.renderInputPage();
            else this.loadPlaylist(url);
        };

        this.loadPlaylist = function(url) {
            items.empty().append('<div style="text-align:center; padding:50px;">Загрузка...</div>');
            var fetch_url = url.trim();
            
            // Используем нативный метод проксирования Lampa для загрузки плейлиста
            if (window.Lampa && Lampa.Utils && Lampa.Utils.proxyUrl) {
                fetch_url = Lampa.Utils.proxyUrl(fetch_url);
            }

            $.ajax({
                url: fetch_url,
                method: 'GET',
                dataType: 'text',
                success: function(str) {
                    _this.parse(str);
                    _this.renderGroups();
                },
                error: function() {
                    Lampa.Noty.show('Ошибка загрузки плейлиста');
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
                    current.name = name ? name[1].trim() : 'Канал без названия';
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
            items.empty();
            items.append(createItem('⚙️ Настройки', function() { _this.renderInputPage(); }));
            items.append('<div style="height:10px; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom:15px;"></div>');

            var keys = Object.keys(groups).sort();
            keys.forEach(function (gName) {
                if (gName === 'Все каналы' && keys.length > 2) return;
                items.append(createItem(gName + ' (' + groups[gName].length + ')', function() {
                    _this.renderChannels(gName);
                }));
            });
            this.refresh();
        };

        this.renderChannels = function (gName) {
            items.empty();
            items.append(createItem('🔙 Назад', function() { _this.renderGroups(); }));
            items.append('<div style="height:10px; border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom:15px;"></div>');

            groups[gName].forEach(function (chan) {
                items.append(createItem(chan.name, function() {
                    // Логика запуска из tv.js / diesel.js
                    var play_url = chan.url;
                    
                    // Если HTTPS сайт, а поток HTTP - используем проксирование Lampac
                    if (window.location.protocol === 'https:' && play_url.indexOf('https') === -1) {
                        if (window.Lampa && Lampa.Utils && Lampa.Utils.proxyUrl) {
                            play_url = Lampa.Utils.proxyUrl(play_url);
                        }
                    }

                    var video = {
                        url: play_url,
                        title: chan.name,
                        method: 'video',
                        playlist: groups[gName].map(function(c) { 
                            return { title: c.name, url: c.url }; 
                        })
                    };

                    Lampa.Player.play(video);
                }));
            });
            this.refresh();
        };

        this.renderInputPage = function() {
            items.empty();
            items.append(createItem('➕ Ввести ссылку на M3U', function() {
                Lampa.Input.edit({ value: Lampa.Storage.get('iptv_m3u_link', ''), free: true }, function(new_val) {
                    if(new_val) {
                        Lampa.Storage.set('iptv_m3u_link', new_val);
                        _this.loadPlaylist(new_val);
                    }
                });
            }));
            this.refresh();
        };

        this.refresh = function() {
            Lampa.Controller.enable('content');
            items.scrollTop(0); 
            setTimeout(function() {
                var first = items.find('.selector').first();
                if(first.length) Lampa.Controller.focus(first[0]);
            }, 100);
        };

        this.render = function () { return items; };
        this.destroy = function () { items.remove(); };
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
