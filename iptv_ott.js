// ==Lampa==
// name: IPTV Lite
// version: 1.2.4
// description: IPTV плеер (Proxy & Stack Fix)
// author: Gemini
// ==/Lampa==

(function () {
    'use strict';

    function IPTVComponent(object) {
        var _this = this;
        var scroll = new Lampa.Scroll({mask: true, over: true, check_bottom: true});
        var items = $('<div class="category-full"></div>');
        var groups = {};

        function createItem(title, callback) {
            var item = $('<div class="selector scroll-item" style="width:100%; padding:18px 25px; background:rgba(255,255,255,0.05); margin-bottom:5px; border-radius:10px; display:flex; justify-content:space-between; align-items:center;">' +
                            '<span style="font-size:1.3em;">' + title + '</span>' +
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
            
            // Пытаемся обойти Mixed Content через прокси, если ссылка прямая
            var fetch_url = url.trim();
            if (fetch_url.indexOf('https') === -1 && window.Lampa.Utils.proxyUrl) {
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
                    Lampa.Noty.show('Ошибка доступа к плейлисту');
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
            items.empty();
            items.append(createItem('⚙️ Сменить плейлист', function() { _this.renderInputPage(); }));
            items.append('<div style="height:20px"></div>');

            Object.keys(groups).sort().forEach(function (gName) {
                if (gName === 'Все каналы' && Object.keys(groups).length > 2) return;
                items.append(createItem(gName + ' (' + groups[gName].length + ')', function() {
                    _this.renderChannels(gName);
                }));
            });
            this.refresh();
        };

        this.renderChannels = function (gName) {
            items.empty();
            items.append(createItem('🔙 Назад', function() { _this.renderGroups(); }));

            groups[gName].forEach(function (chan) {
                items.append(createItem(chan.name, function() {
                    var final_url = chan.url;
                    // Исправление Mixed Content для видеопотока
                    if (location.protocol === 'https:' && final_url.indexOf('https') === -1) {
                        final_url = 'https://cors-anywhere.herokuapp.com/' + final_url; 
                        // Или используем внутренний прокси, если доступен
                    }
                    
                    Lampa.Player.play({
                        url: chan.url,
                        title: chan.name
                    });
                }));
            });
            this.refresh();
        };

        this.renderInputPage = function() {
            items.empty();
            var btn = createItem('➕ Ввести ссылку на M3U', function() {
                Lampa.Input.edit({ value: Lampa.Storage.get('iptv_m3u_link', ''), free: true }, function(new_val) {
                    if(new_val) {
                        Lampa.Storage.set('iptv_m3u_link', new_val);
                        _this.loadPlaylist(new_val);
                    }
                });
            });
            items.append(btn);
            this.refresh();
        };

        this.refresh = function() {
            scroll.clear();
            scroll.append(items);
            Lampa.Controller.enable('content');
            setTimeout(function() {
                scroll.update();
            }, 10);
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
