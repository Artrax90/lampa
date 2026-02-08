// ==Lampa==
// name: IPTV PRO Final Fix
// version: 11.3
// ==/Lampa==

(function () {
    'use strict';

    function IPTVComponent(object) {
        var _this = this;
        var root, colG, colC, colE;
        var groups_data = {};
        var all_channels = [];
        var current_list = [];
        var active_col = 'groups';
        var index_g = 0, index_c = 0;

        var storage_key = 'iptv_pro_v11';
        var config = Lampa.Storage.get(storage_key, {
            playlists: [{
                name: 'MEGA',
                url: 'https://raw.githubusercontent.com/loganettv/playlists/refs/heads/main/mega.m3u'
            }],
            favorites: [],
            current_pl_index: 0
        });

        function save() {
            Lampa.Storage.set(storage_key, config);
        }

        function isFav(ch) {
            return config.favorites.some(function (f) {
                return f.url === ch.url;
            });
        }

        function toggleFav(ch) {
            if (isFav(ch)) {
                config.favorites = config.favorites.filter(function (f) {
                    return f.url !== ch.url;
                });
                Lampa.Noty.show('Удалено из избранного');
            } else {
                config.favorites.push(ch);
                Lampa.Noty.show('Добавлено в избранное ⭐');
            }
            save();
            _this.renderG();
        }

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
                    .iptv-root { position: fixed; inset:0; background:#0b0d10; z-index:1000; padding-top:5rem }
                    .iptv-wrapper { display:flex; height:100% }
                    .iptv-col { overflow-y:auto; background:rgba(0,0,0,.2); border-right:1px solid rgba(255,255,255,.1) }
                    .col-groups { width:20rem }
                    .col-channels { flex:1 }
                    .col-details { width:25rem; background:#080a0d; padding:2rem }
                    .iptv-item { padding:1rem; margin:.4rem; border-radius:.5rem; background:rgba(255,255,255,.03); color:#fff }
                    .iptv-item.active { background:#2962ff }
                    .btn-pl,.btn-search { padding:1rem; margin:.5rem 1rem; text-align:center; border-radius:.5rem; font-weight:bold }
                    .btn-pl { background:#2962ff }
                    .btn-search { background:#444 }
                </style>`);
            }

            this.loadPlaylist();
            return root;
        };

        this.loadPlaylist = function () {
            var current = config.playlists[config.current_pl_index];
            $.ajax({
                url: current.url,
                success: function (str) { _this.parse(str); },
                error: function () { _this.parse(''); }
            });
        };

        this.parse = function (str) {
            groups_data = { '⭐ Избранное': config.favorites };
            all_channels = [];

            str.split('\n').forEach(function (l, i, arr) {
                if (l.indexOf('#EXTINF') === 0) {
                    var name = (l.match(/,(.*)$/) || [,''])[1];
                    var group = (l.match(/group-title="([^"]+)"/i) || [,'ОБЩИЕ'])[1];
                    var url = arr[i + 1] ? arr[i + 1].trim() : '';
                    if (url.indexOf('http') === 0) {
                        var ch = { name: name, url: url, group: group };
                        all_channels.push(ch);
                        if (!groups_data[group]) groups_data[group] = [];
                        groups_data[group].push(ch);
                    }
                }
            });

            this.renderG();
        };

        this.renderG = function () {
            colG.empty();

            colG.append($('<div class="btn-pl">🔗 Добавить плейлист</div>').on('click', this.managePlaylists));
            colG.append($('<div class="btn-search">🔍 Поиск</div>').on('click', this.searchChannels));

            Object.keys(groups_data).forEach(function (g, i) {
                var el = $('<div class="iptv-item">' + g + '</div>');
                el.on('click', function () {
                    index_g = i;
                    active_col = 'groups';
                    _this.renderC(groups_data[g]);
                });
                colG.append(el);
            });

            this.updateFocus();
        };

        this.renderC = function (list) {
            colC.empty();
            current_list = list || [];
            current_list.forEach(function (c) {
                colC.append('<div class="iptv-item">' + (isFav(c) ? '⭐ ' : '') + c.name + '</div>');
            });
            this.updateFocus();
        };

        this.searchChannels = function () {
            Lampa.Input.show({
                title: 'Поиск канала',
                free: true,
                onEnter: function (q) {
                    if (!q) return;
                    _this.renderC(all_channels.filter(function (c) {
                        return c.name.toLowerCase().includes(q.toLowerCase());
                    }));
                    active_col = 'channels';
                    index_c = 0;
                }
            });
        };

        this.managePlaylists = function () {
            Lampa.Input.show({
                title: 'URL плейлиста',
                free: true,
                onEnter: function (url) {
                    if (!url) return;
                    config.playlists.push({ name: 'Playlist ' + (config.playlists.length + 1), url: url });
                    config.current_pl_index = config.playlists.length - 1;
                    save();
                    _this.loadPlaylist();
                }
            });
        };

        this.updateFocus = function () {
            $('.iptv-item').removeClass('active');
            if (active_col === 'groups')
                colG.find('.iptv-item').eq(index_g).addClass('active');
            else
                colC.find('.iptv-item').eq(index_c).addClass('active');
        };

        this.start = function () {
            Lampa.Controller.add('iptv_pro', {
                up: function () {
                    if (active_col === 'groups') index_g = Math.max(0, index_g - 1);
                    else index_c = Math.max(0, index_c - 1);
                    _this.updateFocus();
                },
                down: function () {
                    if (active_col === 'groups') index_g++;
                    else index_c++;
                    _this.updateFocus();
                },
                right: function () {
                    if (active_col === 'groups') {
                        active_col = 'channels';
                        index_c = 0;
                        _this.renderC(groups_data[Object.keys(groups_data)[index_g]]);
                    }
                },
                left: function () {
                    if (active_col === 'channels') active_col = 'groups';
                },
                enter: function () {
                    if (active_col === 'channels') {
                        var ch = current_list[index_c];
                        if (ch) Lampa.Player.play({ url: ch.url, title: ch.name });
                    }
                },
                hold: function () {
                    if (active_col === 'channels') {
                        var ch = current_list[index_c];
                        if (ch) toggleFav(ch);
                    }
                },
                back: function () {
                    Lampa.Activity.back();
                }
            });
            Lampa.Controller.toggle('iptv_pro');
        };

        this.render = function () { return root; };
        this.destroy = function () {
            Lampa.Controller.remove('iptv_pro');
            root.remove();
        };
    }

    function init() {
        Lampa.Component.add('iptv_pro', IPTVComponent);
        $('.menu .menu__list').append(
            $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>')
                .on('hover:enter', function () {
                    Lampa.Activity.push({ title: 'IPTV', component: 'iptv_pro' });
                })
        );
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') init();
    });
})();
