// ==Lampa==
// name: IPTV PRO Final Fix
// version: 11.4
// ==/Lampa==

(function () {
    'use strict';

    function IPTVComponent() {
        var root, colG, colC;
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
            return config.favorites.some(f => f.url === ch.url);
        }

        function toggleFav(ch) {
            if (!ch || !ch.url) return;

            if (isFav(ch)) {
                config.favorites = config.favorites.filter(f => f.url !== ch.url);
                Lampa.Noty.show('Удалено из избранного');
            } else {
                config.favorites.push(ch);
                Lampa.Noty.show('Добавлено в избранное ⭐');
            }
            save();
        }

        this.create = function () {
            root = $('<div class="iptv-root"></div>');
            colG = $('<div class="iptv-col"></div>');
            colC = $('<div class="iptv-col"></div>');
            root.append(colG, colC);

            $('head').append(`
                <style>
                .iptv-root{display:flex;height:100%;background:#0b0d10}
                .iptv-col{flex:1;overflow:auto}
                .iptv-item{padding:1rem;margin:.4rem;background:#222;color:#fff;border-radius:.4rem}
                .iptv-item.active{background:#2962ff}
                </style>
            `);

            this.loadPlaylist();
            return root;
        };

        this.loadPlaylist = function () {
            var pl = config.playlists[config.current_pl_index];
            $.get(pl.url).done(this.parse.bind(this));
        };

        this.parse = function (str) {
            groups_data = { '⭐ Избранное': config.favorites };
            all_channels = [];

            str.split('\n').forEach((l, i, a) => {
                if (l.startsWith('#EXTINF')) {
                    var name = (l.match(/,(.*)$/) || [,''])[1];
                    var group = (l.match(/group-title="([^"]+)"/) || [,'ОБЩИЕ'])[1];
                    var url = a[i + 1] || '';
                    if (url.startsWith('http')) {
                        var ch = { name, url, group };
                        all_channels.push(ch);
                        groups_data[group] = groups_data[group] || [];
                        groups_data[group].push(ch);
                    }
                }
            });

            this.renderGroups();
        };

        this.renderGroups = function () {
            colG.empty();
            Object.keys(groups_data).forEach((g, i) => {
                var el = $('<div class="iptv-item">' + g + '</div>');
                el.on('click', () => {
                    index_g = i;
                    active_col = 'groups';
                    this.renderChannels(groups_data[g]);
                });
                colG.append(el);
            });
            this.updateFocus();
        };

        this.renderChannels = function (list) {
            current_list = Array.isArray(list) ? list : [];
            colC.empty();
            current_list.forEach(c => {
                colC.append('<div class="iptv-item">' + (isFav(c) ? '⭐ ' : '') + c.name + '</div>');
            });
            active_col = 'channels';
            index_c = 0;
            this.updateFocus();
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
                up: () => {
                    if (active_col === 'groups') index_g = Math.max(0, index_g - 1);
                    else index_c = Math.max(0, index_c - 1);
                    this.updateFocus();
                },
                down: () => {
                    if (active_col === 'groups') index_g++;
                    else index_c++;
                    this.updateFocus();
                },
                enter: () => {
                    if (active_col !== 'channels') return;
                    var ch = current_list[index_c];
                    if (ch && ch.url) {
                        Lampa.Player.play({ url: ch.url, title: ch.name });
                    }
                },
                hold: () => {
                    if (active_col !== 'channels') return;
                    var ch = current_list[index_c];
                    if (ch) toggleFav(ch);
                },
                back: () => Lampa.Activity.back()
            });
            Lampa.Controller.toggle('iptv_pro');
        };

        this.render = () => root;
        this.destroy = () => Lampa.Controller.remove('iptv_pro');
    }

    Lampa.Component.add('iptv_pro', IPTVComponent);
})();
