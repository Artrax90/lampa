// ==Lampa==
// name: IPTV PRO Script Fix
// version: 11.1
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
        
        var storage_key = 'iptv_pro_v11';
        var config = Lampa.Storage.get(storage_key, {
            playlists: [{name: 'MEGA', url: 'https://raw.githubusercontent.com/loganettv/playlists/refs/heads/main/mega.m3u'}],
            favorites: [],
            current_pl_index: 0
        });

        this.create = function () {
            root = $('<div class="iptv-root"></div>');
            var container = $('<div class="iptv-wrapper"></div>');
            colG = $('<div class="iptv-col col-groups"></div>');
            colC = $('<div class="iptv-col col-channels"></div>');
            colE = $('<div class="iptv-col col-details"></div>');
            container.append(colG, colC, colE);
            root.append(container);

            if (!$('#iptv-v11-style').length) {
                $('head').append(`
                <style id="iptv-v11-style">
                    .iptv-root { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: #0b0d10; z-index: 1000; padding-top: 5rem; }
                    .iptv-wrapper { display: flex; width: 100%; height: 100%; }
                    .iptv-col { height: 100%; overflow-y: auto; background: rgba(0,0,0,0.2); border-right: 1px solid rgba(255,255,255,0.1); }
                    .col-groups { width: 20rem; }
                    .col-channels { flex: 1; }
                    .col-details { width: 25rem; background: #080a0d; padding: 2rem; }
                    .iptv-item { padding: 1rem; margin: 0.4rem; border-radius: 0.5rem; background: rgba(255,255,255,0.03); color: #fff; cursor: pointer; }
                    .iptv-item.active { background: #2962ff !important; }
                    .btn-pl { background: #2962ff; padding: 1rem; margin: 1rem; text-align: center; border-radius: 0.5rem; cursor: pointer; color: #fff; font-weight: bold; }
                </style>`);
            }

            this.loadPlaylist();
            return root;
        };

        this.loadPlaylist = function () {
            var current = config.playlists[config.current_pl_index] || config.playlists[0];
            $.ajax({
                url: current.url,
                success: function(str) { _this.parse(str); },
                error: function() { Lampa.Noty.show('Ошибка загрузки'); _this.parse(''); }
            });
        };

        this.parse = function (str) {
            var lines = str.split('\n');
            groups_data = { '⭐ Избранное': config.favorites }; 
            for (var i = 0; i < lines.length; i++) {
                var l = lines[i].trim();
                if (l.indexOf('#EXTINF') === 0) {
                    var n = (l.match(/,(.*)$/) || [,''])[1];
                    var g = (l.match(/group-title="([^"]+)"/i) || [,'ОБЩИЕ'])[1];
                    var url = lines[i+1] ? lines[i+1].trim() : '';
                    if (url.indexOf('http') === 0) {
                        if (!groups_data[g]) groups_data[g] = [];
                        groups_data[g].push({name: n, url: url, group: g});
                    }
                }
            }
            this.renderG();
        };

        this.renderG = function () {
            colG.empty();
            // Исправлено: корректное создание кнопки без неопределенных переменных
            var btnAdd = $('<div class="btn-pl">🔗 Добавить плейлист</div>');
            btnAdd.on('click', function() { _this.managePlaylists(); });
            colG.append(btnAdd);

            Object.keys(groups_data).forEach(function(g, i) {
                var item = $('<div class="iptv-item">' + g + '</div>');
                item.on('click', function() { index_g = i; active_col = 'groups'; _this.renderC(); });
                colG.append(item);
            });
            this.updateFocus();
        };

        this.managePlaylists = function() {
            Lampa.Input.show({
                title: 'Введите URL плейлиста',
                value: '',
                free: true,
                onEnter: function(url) {
                    if (url) {
                        config.playlists.push({name: 'Плейлист ' + (config.playlists.length + 1), url: url});
                        config.current_pl_index = config.playlists.length - 1;
                        Lampa.Storage.set(storage_key, config);
                        _this.loadPlaylist();
                    }
                }
            });
        };

        this.renderC = function () {
            colC.empty();
            var g_names = Object.keys(groups_data);
            var current_group_name = g_names[index_g];
            current_list = groups_data[current_group_name] || [];
            current_list.forEach(function(c, i) {
                var row = $('<div class="iptv-item">' + c.name + '</div>');
                row.on('click', function() { Lampa.Player.play({url: c.url, title: c.name}); });
                colC.append(row);
            });
            this.updateFocus();
        };

        this.updateFocus = function () {
            $('.iptv-item').removeClass('active');
            if (active_col === 'groups') colG.find('.iptv-item').eq(index_g).addClass('active');
            else colC.find('.iptv-item').eq(index_c).addClass('active');
        };

        this.start = function () {
            Lampa.Controller.add('iptv_pro', {
                up: function () {
                    if (active_col === 'groups') index_g = Math.max(0, index_g - 1);
                    else index_c = Math.max(0, index_c - 1);
                    _this.updateFocus();
                },
                down: function () {
                    if (active_col === 'groups') index_g = Math.min(colG.find('.iptv-item').length - 1, index_g + 1);
                    else index_c = Math.min(current_list.length - 1, index_c + 1);
                    _this.updateFocus();
                },
                right: function () { if (active_col === 'groups') { active_col = 'channels'; index_c = 0; _this.renderC(); } },
                left: function () { if (active_col === 'channels') { active_col = 'groups'; _this.updateFocus(); } else Lampa.Activity.back(); },
                enter: function () {
                    if (active_col === 'groups') { active_col = 'channels'; _this.renderC(); }
                    else Lampa.Player.play({url: current_list[index_c].url, title: current_list[index_c].name});
                },
                back: function () { Lampa.Activity.back(); }
            });
            Lampa.Controller.toggle('iptv_pro');
        };

        this.pause = this.stop = function () {};
        this.render = function () { return root; };
        this.destroy = function () { Lampa.Controller.remove('iptv_pro'); root.remove(); };
    }

    function init() {
        Lampa.Component.add('iptv_pro', IPTVComponent);
        var item = $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>');
        item.on('hover:enter', function () { Lampa.Activity.push({title: 'IPTV', component: 'iptv_pro'}); });
        $('.menu .menu__list').append(item);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') init(); });
})();
