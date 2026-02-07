// ==Lampa==
// name: IPTV Lite PRO
// version: 1.3.0
// description: IPTV с поиском, избранным и логотипами
// author: Gemini
// ==/Lampa==

(function () {
    'use strict';

    function IPTVComponent(object) {
        var _this = this;
        var items = $('<div class="iptv-lite-content" style="width:100%; height: 85vh; overflow-y: auto; padding-right: 10px;"></div>');
        var groups = {};
        var favorites = Lampa.Storage.get('iptv_fav_list', []);

        if (!$('#iptv-lite-styles').length) {
            $('head').append('<style id="iptv-lite-styles">' +
                '.iptv-lite-content::-webkit-scrollbar { width: 6px; }' +
                '.iptv-lite-content::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }' +
                '.iptv-item.focus { background: #fff !important; color: #000 !important; transform: scale(1.01); }' +
                '.iptv-item { transition: all 0.1s; outline: none !important; position: relative; }' +
                '.iptv-fav-star { color: #ffeb3b; margin-left: auto; font-size: 1.2em; }' +
                '</style>');
        }

        function createItem(data, callback, onLongPress) {
            var isObj = typeof data === 'object';
            var title = isObj ? data.name : data;
            var logo = isObj && data.logo ? '<img src="' + data.logo + '" style="width:1.5em; height:1.5em; object-fit:contain; margin-right:15px; border-radius:4px;">' : '';
            var favIcon = isObj && favorites.some(f => f.url === data.url) ? '<span class="iptv-fav-star">★</span>' : '';

            var item = $('<div class="selector iptv-item" style="width:100%; padding:14px 18px; background:rgba(255,255,255,0.05); margin-bottom:6px; border-radius:10px; display:flex; align-items:center; cursor: pointer;">' +
                            logo + '<span style="font-size:1.2em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:80%;">' + title + '</span>' + favIcon +
                        '</div>');
            
            item.on('hover:enter', callback);
            
            // Удержание (длинный клик) для добавления в избранное
            if(onLongPress) {
                item.on('hover:long', onLongPress);
            }
            
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
            if (window.location.protocol === 'https:' && fetch_url.indexOf('https') === -1) {
                fetch_url = 'https://corsproxy.io/?' + encodeURIComponent(fetch_url);
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
                    current.name = line.match(/,(.*)$/)?.[1].trim() || 'Без названия';
                    current.logo = line.match(/tvg-logo="([^"]+)"/)?.[1] || '';
                    current.group = line.match(/group-title="([^"]+)"/)?.[1] || 'Разное';
                } else if (line.indexOf('http') === 0 && current) {
                    current.url = line;
                    if (!groups[current.group]) groups[current.group] = [];
                    groups[current.group].push(current);
                    groups['Все каналы'].push(current);
                    current = null;
                }
            }
        };

        this.toggleFavorite = function(chan) {
            var index = favorites.findIndex(f => f.url === chan.url);
            if(index > -1) favorites.splice(index, 1);
            else favorites.push(chan);
            Lampa.Storage.set('iptv_fav_list', favorites);
            Lampa.Noty.show(index > -1 ? 'Удалено из избранного' : 'Добавлено в избранное');
        };

        this.renderGroups = function () {
            items.empty();
            
            if(favorites.length > 0) {
                items.append(createItem('⭐ ИЗБРАННОЕ (' + favorites.length + ')', function() {
                    _this.renderChannelList(favorites, 'Избранное');
                }));
            }

            items.append(createItem('🔍 ПОИСК КАНАЛА', function() {
                Lampa.Input.edit({title: 'Поиск канала', value: '', free: true}, function(new_val) {
                    if(new_val) {
                        var filtered = groups['Все каналы'].filter(c => c.name.toLowerCase().includes(new_val.toLowerCase()));
                        _this.renderChannelList(filtered, 'Результаты поиска');
                    }
                });
            }));

            items.append(createItem('⚙️ НАСТРОЙКИ', function() { _this.renderInputPage(); }));
            items.append('<div style="height:1px; background:rgba(255,255,255,0.1); margin:10px 0;"></div>');

            Object.keys(groups).sort().forEach(function (gName) {
                if (gName === 'Все каналы' && Object.keys(groups).length > 2) return;
                items.append(createItem(gName + ' (' + groups[gName].length + ')', function() {
                    _this.renderChannelList(groups[gName], gName);
                }));
            });
            this.refresh();
        };

        this.renderChannelList = function (list, title) {
            items.empty();
            items.append(createItem('🔙 НАЗАД (' + title + ')', function() { _this.renderGroups(); }));
            items.append('<div style="height:1px; background:rgba(255,255,255,0.1); margin:10px 0;"></div>');

            list.forEach(function (chan) {
                items.append(createItem(chan, function() {
                    var play_url = chan.url;
                    if (window.location.protocol === 'https:' && play_url.indexOf('https') === -1) {
                        if (Lampa.Utils && Lampa.Utils.proxyUrl) play_url = Lampa.Utils.proxyUrl(play_url);
                    }
                    Lampa.Player.play({ url: play_url, title: chan.name });
                    Lampa.Player.playlist(list.map(c => ({title: c.name, url: c.url})));
                }, function() {
                    _this.toggleFavorite(chan);
                    _this.renderChannelList(list, title); // Перерисовать для обновления звезды
                }));
            });
            this.refresh();
        };

        this.renderInputPage = function() {
            items.empty();
            items.append(createItem('➕ Ввести адрес плейлиста', function() {
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
            }, 200);
        };

        this.render = function () { return items; };
        this.start = function () { Lampa.Controller.enable('content'); };
        this.pause = function () {};
        this.stop = function () {};
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
