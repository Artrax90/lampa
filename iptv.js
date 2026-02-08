// ==Lampa==
// name: IPTV PRO Stable
// version: 11.7
// ==/Lampa==

(function () {
    'use strict';

    function IPTVComponent() {
        var root, colG, colC;
        var groups = {}, all = [];
        var active = 'groups';
        var gi = 0, ci = 0;

        var KEY = 'iptv_pro_v11';
        var cfg = Lampa.Storage.get(KEY, {
            playlists: [{
                name: 'MEGA',
                url: 'https://raw.githubusercontent.com/loganettv/playlists/refs/heads/main/mega.m3u'
            }],
            current: 0
        });

        /* ================= UI ================= */

        this.create = function () {
            root = $('<div class="iptv-root"><div class="iptv-wrap"></div></div>');
            var wrap = root.find('.iptv-wrap');

            colG = $('<div class="iptv-col g"></div>');
            colC = $('<div class="iptv-col c"></div>');

            wrap.append(colG, colC);

            if (!$('#iptv-style').length) {
                $('head').append(`
                <style id="iptv-style">
                    .iptv-root{position:fixed;inset:0;background:#0b0d10;padding-top:5rem}
                    .iptv-wrap{display:flex;height:100%}
                    .iptv-col{overflow-y:auto}
                    .g{width:22rem;border-right:1px solid rgba(255,255,255,.1)}
                    .c{flex:1}
                    .iptv-item{padding:1rem;margin:.4rem;border-radius:.5rem;background:rgba(255,255,255,.04);color:#fff}
                    .iptv-item.active{background:#2962ff}
                    .iptv-btn{font-weight:bold;text-align:center}
                </style>`);
            }

            load();
            return root;
        };

        /* ================= LOAD ================= */

        function load() {
            var pl = cfg.playlists[cfg.current];
            $.get(pl.url).done(parse).fail(function () {
                Lampa.Noty.show('Ошибка загрузки плейлиста');
                parse('');
            });
        }

        function parse(txt) {
            groups = {};
            all = [];
            txt.split('\n').forEach(function (l, i, a) {
                if (l.startsWith('#EXTINF')) {
                    var name = l.split(',').pop();
                    var grp = (l.match(/group-title="([^"]+)"/) || [,'ОБЩИЕ'])[1];
                    var url = a[i + 1] || '';
                    if (url.startsWith('http')) {
                        var c = { name, url };
                        all.push(c);
                        (groups[grp] ||= []).push(c);
                    }
                }
            });
            renderGroups();
        }

        /* ================= GROUPS ================= */

        function renderGroups() {
            colG.empty();

            colG.append(btn('🔍 Поиск', search));
            colG.append(btn('➕ Плейлисты', playlists));

            Object.keys(groups).forEach(function (g) {
                colG.append(item(g));
            });

            renderChannels(groups[Object.keys(groups)[0]]);
            focus();
        }

        /* ================= CHANNELS ================= */

        function renderChannels(list) {
            colC.empty();
            list.forEach(function (c) {
                colC.append(item(c.name, function () {
                    Lampa.Player.play({ url: c.url, title: c.name, type: 'tv' });
                }));
            });
            ci = 0;
            active = 'channels';
            focus();
        }

        /* ================= PLAYLISTS ================= */

        function playlists() {
            colC.empty();

            cfg.playlists.forEach(function (pl, i) {
                colC.append(item(pl.name, function () {
                    cfg.current = i;
                    Lampa.Storage.set(KEY, cfg);
                    load();
                }, function () {
                    if (cfg.playlists.length === 1) return Lampa.Noty.show('Последний плейлист');
                    if (i === cfg.current) return Lampa.Noty.show('Активный');

                    cfg.playlists.splice(i, 1);
                    cfg.current = 0;
                    Lampa.Storage.set(KEY, cfg);
                    playlists();
                }));
            });

            colC.append(item('➕ Добавить плейлист', function () {
                Lampa.Input.edit({
                    title: 'URL плейлиста',
                    value: '',
                    free: true
                }, function (url) {
                    if (!url) return;
                    cfg.playlists.push({ name: 'Playlist ' + cfg.playlists.length, url });
                    cfg.current = cfg.playlists.length - 1;
                    Lampa.Storage.set(KEY, cfg);
                    load();
                });
            }));

            active = 'channels';
            ci = 0;
            focus();
        }

        /* ================= SEARCH ================= */

        function search() {
            Lampa.Input.edit({
                title: 'Поиск',
                value: '',
                free: true
            }, function (q) {
                if (!q) return;
                renderChannels(all.filter(c => c.name.toLowerCase().includes(q.toLowerCase())));
            });
        }

        /* ================= HELPERS ================= */

        function btn(t, cb) {
            return item(t, cb).addClass('iptv-btn');
        }

        function item(t, click, hold) {
            var el = $('<div class="iptv-item selector">' + t + '</div>');
            el.on('hover:enter', click);
            if (hold) el.on('hover:hold', hold);
            return el;
        }

        function focus() {
            $('.iptv-item').removeClass('active');
            var list = active === 'groups' ? colG : colC;
            list.find('.iptv-item').eq(active === 'groups' ? gi : ci).addClass('active');
        }

        /* ================= CONTROLLER ================= */

        this.start = function () {
            Lampa.Controller.add('iptv', {
                up: () => { active === 'groups' ? gi-- : ci--; clamp(); },
                down: () => { active === 'groups' ? gi++ : ci++; clamp(); },
                right: () => { active = 'channels'; focus(); },
                left: () => { active = 'groups'; focus(); },
                enter: () => $('.iptv-item.active').trigger('hover:enter'),
                hold: () => $('.iptv-item.active').trigger('hover:hold'),
                back: () => Lampa.Activity.back()
            });
            Lampa.Controller.toggle('iptv');
        };

        function clamp() {
            gi = Math.max(0, Math.min(gi, colG.find('.iptv-item').length - 1));
            ci = Math.max(0, Math.min(ci, colC.find('.iptv-item').length - 1));
            focus();
        }

        this.render = () => root;
        this.destroy = () => Lampa.Controller.remove('iptv');
    }

    function init() {
        Lampa.Component.add('iptv_pro', IPTVComponent);
        var m = $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>');
        m.on('hover:enter', () => Lampa.Activity.push({ title: 'IPTV', component: 'iptv_pro' }));
        $('.menu__list').append(m);
    }

    window.app_ready ? init() : Lampa.Listener.follow('app', e => e.type === 'ready' && init());
})();
