// ==Lampa==
// name: IPTV PRO Stable
// version: 11.3
// ==/Lampa==

(function () {
    'use strict';

    function IPTVComponent() {
        var _this = this;

        var root, colG, colC;
        var groups = {};
        var all = [];
        var list = [];

        var active = 'groups';
        var gi = 0, ci = 0;

        var KEY = 'iptv_pro_final';
        var cfg = Lampa.Storage.get(KEY, {
            playlists: [
                {
                    name: 'MEGA',
                    url: 'https://raw.githubusercontent.com/loganettv/playlists/refs/heads/main/mega.m3u'
                }
            ],
            current: 0,
            fav: []
        });

        /* ================= CREATE ================= */

        this.create = function () {
            root = $('<div class="iptv-root"></div>');
            colG = $('<div class="iptv-col groups"></div>');
            colC = $('<div class="iptv-col channels"></div>');

            root.append(colG, colC);

            if (!$('#iptv-style').length) {
                $('head').append(`
                <style id="iptv-style">
                    .iptv-root{
                        position:fixed; inset:0;
                        background:#0b0d10;
                        display:flex;
                        padding-top:5rem;
                        z-index:1000
                    }
                    .iptv-col{
                        overflow-y:auto;
                        padding:0.5rem
                    }
                    .groups{width:22rem;border-right:1px solid rgba(255,255,255,.1)}
                    .channels{flex:1}
                    .iptv-item{
                        padding:1rem;
                        margin:.3rem;
                        border-radius:.5rem;
                        background:rgba(255,255,255,.05);
                        color:#fff;
                        cursor:pointer
                    }
                    .iptv-item.active{background:#2962ff}
                    .iptv-btn{
                        margin:.5rem;
                        padding:1rem;
                        text-align:center;
                        border-radius:.5rem;
                        font-weight:700;
                        cursor:pointer
                    }
                    .add{background:#2962ff}
                    .search{background:#444}
                </style>`);
            }

            load();
            return root;
        };

        /* ================= LOAD ================= */

        function load() {
            var pl = cfg.playlists[cfg.current];
            if (!pl) return;

            $.ajax({
                url: pl.url,
                success: parse,
                error: function () {
                    Lampa.Noty.show('Ошибка плейлиста');
                    parse('');
                }
            });
        }

        /* ================= PARSE ================= */

        function parse(text) {
            groups = { '⭐ Избранное': cfg.fav };
            all = [];

            var lines = text.split('\n');
            for (var i = 0; i < lines.length; i++) {
                var l = lines[i].trim();
                if (l.indexOf('#EXTINF') === 0) {
                    var name = (l.match(/,(.*)$/) || [, ''])[1];
                    var grp = (l.match(/group-title="([^"]+)"/i) || [, 'ОБЩИЕ'])[1];
                    var url = lines[i + 1] ? lines[i + 1].trim() : '';

                    if (url && url.indexOf('http') === 0) {
                        var ch = { name: name, url: url, group: grp };
                        all.push(ch);
                        if (!groups[grp]) groups[grp] = [];
                        groups[grp].push(ch);
                    }
                }
            }
            renderGroups();
        }

        /* ================= GROUPS ================= */

        function renderGroups() {
            colG.empty();

            var add = $('<div class="iptv-btn add selector">➕ Добавить плейлист</div>');
            add.on('hover:enter', addPlaylist);
            colG.append(add);

            var search = $('<div class="iptv-btn search selector">🔍 Поиск</div>');
            search.on('hover:enter', searchChannels);
            colG.append(search);

            Object.keys(groups).forEach(function (g, i) {
                var el = $('<div class="iptv-item selector">' + g + '</div>');
                el.on('hover:enter', function () {
                    gi = i;
                    active = 'groups';
                    renderChannels(groups[g]);
                });
                colG.append(el);
            });

            update();
        }

        /* ================= CHANNELS ================= */

        function renderChannels(arr) {
            colC.empty();
            list = arr || [];
            ci = 0;

            list.forEach(function (ch) {
                var el = $('<div class="iptv-item selector">' + ch.name + '</div>');

                // ▶ PLAY
                el.on('hover:enter', function () {
                    Lampa.Player.play({
                        url: ch.url,
                        title: ch.name
                    });
                });

                // ⭐ FAVORITE (HOLD)
                el.on('hover:hold', function () {
                    if (!cfg.fav.find(x => x.url === ch.url)) {
                        cfg.fav.push(ch);
                        Lampa.Storage.set(KEY, cfg);
                        Lampa.Noty.show('Добавлено в избранное');
                    }
                });

                colC.append(el);
            });

            active = 'channels';
            update();
        }

        /* ================= SEARCH ================= */

        function searchChannels() {
            Lampa.Input.show({
                title: 'Поиск',
                value: '',
                free: true,
                onEnter: function (q) {
                    if (!q) return;
                    var res = all.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));
                    renderChannels(res);
                }
            });
        }

        /* ================= PLAYLIST ADD ================= */

        function addPlaylist() {
            Lampa.Input.show({
                title: 'URL плейлиста',
                value: '',
                free: true,
                onEnter: function (url) {
                    if (!url || url.indexOf('http') !== 0) return;
                    cfg.playlists.push({
                        name: 'Плейлист ' + (cfg.playlists.length + 1),
                        url: url
                    });
                    cfg.current = cfg.playlists.length - 1;
                    Lampa.Storage.set(KEY, cfg);
                    load();
                }
            });
        }

        /* ================= FOCUS ================= */

        function update() {
            $('.iptv-item,.iptv-btn').removeClass('active');
            if (active === 'groups') colG.find('.selector').eq(gi + 2).addClass('active');
            else colC.find('.selector').eq(ci).addClass('active');
        }

        /* ================= CONTROLLER ================= */

        this.start = function () {
            Lampa.Controller.add('iptv_pro', {
                up: function () {
                    if (active === 'groups') gi = Math.max(0, gi - 1);
                    else ci = Math.max(0, ci - 1);
                    update();
                },
                down: function () {
                    if (active === 'groups') gi++;
                    else ci++;
                    update();
                },
                left: function () {
                    if (active === 'channels') {
                        active = 'groups';
                        update();
                    } else Lampa.Activity.back();
                },
                right: function () {
                    if (active === 'groups') {
                        renderChannels(groups[Object.keys(groups)[gi]]);
                    }
                },
                enter: function () {
                    $('.active').trigger('hover:enter');
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
        var li = $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>');
        li.on('hover:enter', function () {
            Lampa.Activity.push({ title: 'IPTV', component: 'iptv_pro' });
        });
        $('.menu .menu__list').append(li);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') init();
    });
})();
