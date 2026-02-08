// ==Lampa==
// name: IPTV PRO FIXED
// version: 13.0
// ==/Lampa==

(function () {
    'use strict';

    function IPTVComponent() {
        var root, colG, colC;
        var groups = {};
        var current = [];
        var active = 'groups';
        var gi = 0, ci = 0;

        var KEY = 'iptv_pro_fixed';
        var cfg = Lampa.Storage.get(KEY, {
            playlists: [{
                name: 'MEGA',
                url: 'https://raw.githubusercontent.com/loganettv/playlists/refs/heads/main/mega.m3u'
            }],
            fav: [],
            pl: 0
        });

        function save() {
            Lampa.Storage.set(KEY, cfg);
        }

        function isFav(url) {
            for (var i = 0; i < cfg.fav.length; i++) {
                if (cfg.fav[i].url === url) return true;
            }
            return false;
        }

        function toggleFav(ch) {
            var i;
            for (i = 0; i < cfg.fav.length; i++) {
                if (cfg.fav[i].url === ch.url) {
                    cfg.fav.splice(i, 1);
                    save();
                    Lampa.Noty.show('Удалено из избранного');
                    return;
                }
            }
            cfg.fav.push(ch);
            save();
            Lampa.Noty.show('Добавлено в избранное ⭐');
        }

        this.create = function () {
            root = $('<div class="iptv-root"></div>');
            colG = $('<div class="iptv-col"></div>');
            colC = $('<div class="iptv-col"></div>');
            root.append(colG).append(colC);

            if (!$('#iptv_fixed_style').length) {
                $('head').append(
                    '<style id="iptv_fixed_style">' +
                    '.iptv-root{display:flex;height:100%;background:#0b0d10}' +
                    '.iptv-col{flex:1;overflow:auto;padding:0.5em}' +
                    '.iptv-item{padding:0.8em;margin:0.3em;background:#1c1f26;color:#fff;border-radius:0.4em}' +
                    '.iptv-item.active{background:#2962ff}' +
                    '</style>'
                );
            }

            loadPlaylist();
            return root;
        };

        function loadPlaylist() {
            var p = cfg.playlists[cfg.pl];
            $.get(p.url, function (txt) {
                parse(txt);
            });
        }

        function parse(txt) {
            groups = { '⭐ Избранное': cfg.fav };

            var lines = txt.split('\n');
            for (var i = 0; i < lines.length; i++) {
                if (lines[i].indexOf('#EXTINF') === 0) {
                    var name = lines[i].split(',').pop();
                    var g = 'ОБЩИЕ';
                    var m = lines[i].match(/group-title="([^"]+)"/);
                    if (m) g = m[1];
                    var url = lines[i + 1];
                    if (url && url.indexOf('http') === 0) {
                        var ch = { name: name, url: url, group: g };
                        if (!groups[g]) groups[g] = [];
                        groups[g].push(ch);
                    }
                }
            }
            renderGroups();
        }

        function renderGroups() {
            colG.empty();
            for (var g in groups) {
                (function (groupName) {
                    var el = $('<div class="iptv-item selector">' + groupName + '</div>');
                    el.on('hover:enter', function () {
                        active = 'groups';
                        gi = colG.find('.selector').index(el);
                        renderChannels(groups[groupName]);
                    });
                    colG.append(el);
                })(g);
            }
            update();
        }

        function renderChannels(list) {
            current = list;
            colC.empty();
            for (var i = 0; i < list.length; i++) {
                var title = (isFav(list[i].url) ? '⭐ ' : '') + list[i].name;
                colC.append('<div class="iptv-item selector">' + title + '</div>');
            }
            active = 'channels';
            ci = 0;
            update();
        }

        function update() {
            $('.iptv-item').removeClass('active');
            if (active === 'groups') {
                colG.find('.selector').eq(gi).addClass('active');
            } else {
                colC.find('.selector').eq(ci).addClass('active');
            }
        }

        this.start = function () {
            Lampa.Controller.add('iptv_fixed', {
                up: function () {
                    if (active === 'groups') gi = Math.max(0, gi - 1);
                    else ci = Math.max(0, ci - 1);
                    update();
                },
                down: function () {
                    if (active === 'groups') gi = Math.min(colG.find('.selector').length - 1, gi + 1);
                    else ci = Math.min(current.length - 1, ci + 1);
                    update();
                },
                right: function () {
                    if (active === 'groups') {
                        var g = Object.keys(groups)[gi];
                        renderChannels(groups[g]);
                    }
                },
                left: function () {
                    if (active === 'channels') {
                        active = 'groups';
                        update();
                    } else {
                        Lampa.Activity.back();
                    }
                },
                enter: function () {
                    if (active === 'channels' && current[ci]) {
                        Lampa.Player.play({
                            url: current[ci].url,
                            title: current[ci].name
                        });
                    }
                },
                hold: function () {
                    if (active === 'channels' && current[ci]) {
                        toggleFav(current[ci]);
                        renderChannels(current);
                    }
                },
                back: function () {
                    Lampa.Activity.back();
                }
            });
            Lampa.Controller.toggle('iptv_fixed');
        };

        this.render = function () { return root; };
        this.destroy = function () {
            Lampa.Controller.remove('iptv_fixed');
            root.remove();
        };
    }

    function init() {
        Lampa.Component.add('iptv_fixed', IPTVComponent);
        var li = $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>');
        li.on('hover:enter', function () {
            Lampa.Activity.push({ title: 'IPTV PRO', component: 'iptv_fixed' });
        });
        $('.menu .menu__list').append(li);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') init();
    });
})();
