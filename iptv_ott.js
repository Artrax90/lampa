// ==Lampa==
// name: IPTV OTT
// version: 1.0.1
// description: IPTV plugin (OttPlayer style)
// author: Artrax90
// ==/Lampa==

(function () {
    'use strict';
    if (!window.Lampa) return;

    Lampa.Extensions.add({
        name: 'iptv_ott',
        version: '1.0.1',

        init: function () {
            console.log('[IPTV OTT] init');

            const KEY = 'iptv_ott_cfg';
            let cfg = Lampa.Storage.get(KEY, { playlist: '', epg: '' });
            const save = () => Lampa.Storage.set(KEY, cfg);

            // ждём инициализации приложения
            Lampa.Listener.follow('app', function () {

                /* ===== SETTINGS ===== */

                Lampa.Settings.add({
                    title: 'IPTV (Ott style)',
                    component: 'iptv_ott_settings'
                });

                Lampa.Component.add('iptv_ott_settings', {
                    template:
                        '<div class="settings">' +
                            '<div class="settings__item selector" data-t="playlist">' +
                                'URL плейлиста<div class="settings__value">' + (cfg.playlist || 'не задан') + '</div>' +
                            '</div>' +
                            '<div class="settings__item selector" data-t="epg">' +
                                'URL EPG<div class="settings__value">' + (cfg.epg || 'не задан') + '</div>' +
                            '</div>' +
                        '</div>',
                    start: function () {
                        let root = this.render();
                        root.find('.settings__item').on('click', function () {
                            let t = this.dataset.t;
                            Lampa.Input.edit({
                                title: t === 'playlist' ? 'URL M3U' : 'URL EPG',
                                value: cfg[t],
                                onBack: v => { cfg[t] = v; save(); }
                            });
                        });
                        Lampa.Controller.enable('content');
                    }
                });

                /* ===== ENTRY ===== */

                Lampa.Settings.add({
                    title: 'IPTV (просмотр)',
                    onClick: function () {
                        if (!cfg.playlist) {
                            Lampa.Noty.show('Укажи плейлист');
                            return;
                        }
                        Lampa.Request.get(cfg.playlist, parseM3U);
                    }
                });

                function parseM3U(text) {
                    let list = [], cur = null;
                    text.split('\n').forEach(l => {
                        l = l.trim();
                        if (l.startsWith('#EXTINF')) {
                            cur = {
                                title: l.split(',').pop(),
                                group: (l.match(/group-title="(.*?)"/)||[])[1] || 'Без группы',
                                logo: (l.match(/tvg-logo="(.*?)"/)||[])[1] || '',
                                epg:  (l.match(/tvg-id="(.*?)"/)||[])[1] || '',
                                url: ''
                            };
                        } else if (l && !l.startsWith('#') && cur) {
                            cur.url = l;
                            list.push(cur);
                            cur = null;
                        }
                    });
                    openUI(list);
                }

                function openUI(channels) {
                    Lampa.Activity.push({
                        component: 'iptv_ott',
                        title: 'IPTV',
                        data: channels
                    });
                }

                Lampa.Component.add('iptv_ott', {
                    template:
                        '<div class="iptv-ott">' +
                            '<div class="iptv-groups"></div>' +
                            '<div class="iptv-channels"></div>' +
                        '</div>',
                    start: function () {
                        let root = this.render();
                        let gbox = root.find('.iptv-groups');
                        let cbox = root.find('.iptv-channels');

                        let groups = {};
                        this.params.data.forEach(c => {
                            (groups[c.group] = groups[c.group] || []).push(c);
                        });

                        Object.keys(groups).forEach(g => {
                            let el = document.createElement('div');
                            el.className = 'selector';
                            el.textContent = g;
                            el.onclick = () => render(groups[g]);
                            gbox[0].appendChild(el);
                        });

                        function render(list) {
                            cbox.empty();
                            list.forEach(ch => {
                                let el = document.createElement('div');
                                el.className = 'selector';
                                el.textContent = ch.title;
                                el.onclick = () => {
                                    Lampa.Player.play({
                                        title: ch.title,
                                        url: ch.url,
                                        type: 'tv',
                                        epg: cfg.epg || null,
                                        epg_id: ch.epg || null
                                    });
                                };
                                cbox[0].appendChild(el);
                            });
                        }

                        let first = Object.keys(groups)[0];
                        if (first) render(groups[first]);
                        Lampa.Controller.enable('content');
                    }
                });

            }, true);
        }
    });

})();
