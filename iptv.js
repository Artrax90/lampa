// ==Lampa==
// name: IPTV PRO Final Fix
// version: 11.11
// ==/Lampa==

(function () {
    'use strict';

    function IPTVComponent() {
        var _this = this;
        var root, colG, colC;
        var groups_data = {};
        var all_channels = [];
        var current_list = [];
        var active_col = 'groups';
        var index_g = 0, index_c = 0;

        var storage_key = 'iptv_pro_v11';
        var config = Lampa.Storage.get(storage_key, {
            playlists: [
                { name: 'MEGA', url: 'https://raw.githubusercontent.com/loganettv/playlists/refs/heads/main/mega.m3u' }
            ],
            favorites: [],
            current_pl_index: 0
        });

        /* ================= CREATE ================= */

        this.create = function () {
            root = $('<div class="iptv-root"></div>');
            var wrap = $('<div class="iptv-wrapper"></div>');
            colG = $('<div class="iptv-col col-groups"></div>');
            colC = $('<div class="iptv-col col-channels"></div>');
            wrap.append(colG);
            wrap.append(colC);
            root.append(wrap);

            if (!document.getElementById('iptv-style')) {
                $('head').append(
                    '<style id="iptv-style">' +
                    '.iptv-root{position:fixed;top:0;left:0;right:0;bottom:0;background:#0b0d10;z-index:1000;padding-top:5rem}' +
                    '.iptv-wrapper{display:flex;width:100%;height:100%}' +
                    '.iptv-col{height:100%;overflow-y:auto;background:rgba(0,0,0,0.2)}' +
                    '.col-groups{width:20rem;border-right:1px solid rgba(255,255,255,0.1)}' +
                    '.col-channels{flex:1}' +
                    '.iptv-item{padding:1rem;margin:0.4rem;border-radius:0.5rem;background:rgba(255,255,255,0.03);color:#fff;cursor:pointer}' +
                    '.iptv-item.active{background:#2962ff!important}' +
                    '.iptv-item.fav{background:#ffb300!important;color:#000}' +
                    '.btn{padding:1rem;margin:0.5rem 1rem;text-align:center;border-radius:0.5rem;background:#444;color:#fff;font-weight:bold}' +
                    '</style>'
                );
            }

            loadPlaylist();
            return root;
        };

        /* ================= LOAD ================= */

        function loadPlaylist() {
            var pl = config.playlists[config.current_pl_index];
            if (!pl) return;

            $.ajax({
                url: pl.url,
                success: function (txt) {
                    parse(txt);
                },
                error: function () {
                    parse('');
                }
            });
        }

        /* ================= PARSE ================= */

        function parse(txt) {
            groups_data = { '⭐ Избранное': config.favorites };
            all_channels = [];

            var lines = txt.split('\n');
            for (var i = 0; i < lines.length; i++) {
                var l = lines[i].trim();
                if (l.indexOf('#EXTINF') === 0) {
                    var name = l.split(',').pop();
                    var g = 'ОБЩИЕ';
                    var m = l.match(/group-title="([^"]+)"/);
                    if (m) g = m[1];

                    var url = (lines[i + 1] || '').trim();
                    if (url.indexOf('http') === 0) {
                        var ch = { name: name, url: url };
                        all_channels.push(ch);
                        if (!groups_data[g]) groups_data[g] = [];
                        groups_data[g].push(ch);
                    }
                }
            }
            renderGroups();
        }

        /* ================= GROUPS ================= */

        function renderGroups() {
            colG.empty();

            addBtn(colG, '📂 Плейлисты', playlistMenu);
            addBtn(colG, '🔍 Поиск', search);

            for (var g in groups_data) {
                addItem(colG, g, (function (group) {
                    return function () {
                        active_col = 'groups';
                        renderChannels(groups_data[group]);
                    };
                })(g));
            }

            focus();
        }

        /* ================= CHANNELS ================= */

        function renderChannels(list) {
            colC.empty();
            current_list = list || [];

            for (var i = 0; i < current_list.length; i++) {
                (function (c) {
                    var row = $('<div class="iptv-item">' + c.name + '</div>');
                    if (isFav(c)) row.addClass('fav');

                    row.on('click', function () {
                        Lampa.Player.play({ url: c.url, title: c.name });
                    });

                    colC.append(row);
                })(current_list[i]);
            }

            active_col = 'channels';
            index_c = 0;
            focus();
        }

        /* ================= FAVORITES ================= */

        function isFav(c) {
            for (var i = 0; i < config.favorites.length; i++) {
                if (config.favorites[i].url === c.url) return true;
            }
            return false;
        }

        function toggleFav(c) {
            for (var i = 0; i < config.favorites.length; i++) {
                if (config.favorites[i].url === c.url) {
                    config.favorites.splice(i, 1);
                    Lampa.Storage.set(storage_key, config);
                    renderGroups();
                    return;
                }
            }
            config.favorites.push(c);
            Lampa.Storage.set(storage_key, config);
            renderGroups();
        }

        /* ================= SEARCH ================= */

        function search() {
            Lampa.Input.edit({
                title: 'Поиск',
                value: '',
                free: true
            }, function (q) {
                if (!q) return;
                var res = [];
                q = q.toLowerCase();
                for (var i = 0; i < all_channels.length; i++) {
                    if (all_channels[i].name.toLowerCase().indexOf(q) !== -1) {
                        res.push(all_channels[i]);
                    }
                }
                renderChannels(res);
            });
        }

        /* ================= PLAYLISTS ================= */

        function playlistMenu() {
            colC.empty();
            active_col = 'channels';
            index_c = 0;

            for (var i = 0; i < config.playlists.length; i++) {
                (function (idx) {
                    addItem(colC, config.playlists[idx].name, function () {
                        config.current_pl_index = idx;
                        Lampa.Storage.set(storage_key, config);
                        loadPlaylist();
                    });
                })(i);
            }

            addItem(colC, '➕ Добавить плейлист', function () {
                Lampa.Input.edit({
                    title: 'URL плейлиста',
                    value: '',
                    free: true
                }, function (url) {
                    if (!url) return;
                    config.playlists.push({
                        name: 'Плейлист ' + config.playlists.length,
                        url: url
                    });
                    config.current_pl_index = config.playlists.length - 1;
                    Lampa.Storage.set(storage_key, config);
                    loadPlaylist();
                });
            });

            focus();
        }

        /* ================= HELPERS ================= */

        function addItem(col, text, cb) {
            var el = $('<div class="iptv-item selector">' + text + '</div>');
            el.on('hover:enter', cb);
            col.append(el);
        }

        function addBtn(col, text, cb) {
            var el = $('<div class="btn selector">' + text + '</div>');
            el.on('hover:enter', cb);
            col.append(el);
        }

        function focus() {
            $('.iptv-item').removeClass('active');
            var list = active_col === 'groups' ? colG : colC;
            list.find('.selector').eq(active_col === 'groups' ? index_g : index_c).addClass('active');
        }

        /* ================= CONTROLLER ================= */

        this.start = function () {
            Lampa.Controller.add('iptv_pro', {
                up: function () {
                    if (active_col === 'groups') index_g--;
                    else index_c--;
                    clamp();
                },
                down: function () {
                    if (active_col === 'groups') index_g++;
                    else index_c++;
                    clamp();
                },
                right: function () {
                    active_col = 'channels';
                    focus();
                },
                left: function () {
                    active_col = 'groups';
                    focus();
                },
                enter: function () {
                    $('.iptv-item.active').trigger('hover:enter');
                },
                hold: function () {
                    if (active_col === 'channels' && current_list[index_c]) {
                        toggleFav(current_list[index_c]);
                    }
                },
                back: function () {
                    Lampa.Activity.back();
                }
            });
            Lampa.Controller.toggle('iptv_pro');
        };

        function clamp() {
            if (index_g < 0) index_g = 0;
            if (index_c < 0) index_c = 0;
            focus();
        }

        this.render = function () { return root; };
        this.destroy = function () {
            Lampa.Controller.remove('iptv_pro');
            root.remove();
        };
    }

    function init() {
        Lampa.Component.add('iptv_pro', IPTVComponent);
        var item = $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>');
        item.on('hover:enter', function () {
            Lampa.Activity.push({ title: 'IPTV', component: 'iptv_pro' });
        });
        $('.menu__list').append(item);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') init();
    });
})();
