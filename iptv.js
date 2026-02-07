// ==Lampa==
// name: IPTV TiviMate
// version: 2.0.0
// description: IPTV player with EPG grid, favorites and catch-up (TiviMate style)
// author: Artrax90
// ==/Lampa==

(function () {
    'use strict';
    if (!window.Lampa) return;

    Lampa.Extensions.add({
        name: 'iptv_tivimate',
        version: '2.0.0',

        init: function () {
            console.log('[IPTV TiviMate] init');

            const KEY = 'iptv_tivimate_cfg';
            const FAV = 'iptv_tivimate_fav';

            let cfg = Lampa.Storage.get(KEY, {
                playlist: '',
                epg: ''
            });

            let favorites = Lampa.Storage.get(FAV, []);

            const saveCfg = () => Lampa.Storage.set(KEY, cfg);
            const saveFav = () => Lampa.Storage.set(FAV, favorites);

            let channels = [];
            let groups = {};
            let currentGroup = null;

            /* ================== STYLES ================== */

            if (!document.getElementById('tivimate-style')) {
                let style = document.createElement('style');
                style.id = 'tivimate-style';
                style.innerHTML = `
                .tv-root{display:flex;height:100vh;background:#050607;color:#fff;font-family:Roboto,Arial}
                .tv-groups{width:260px;background:#0b0d10;padding:15px;overflow:auto}
                .tv-group{padding:14px;border-radius:10px;margin-bottom:8px;background:#15181d}
                .tv-group.focus{background:#2962ff}
                .tv-channels{flex:1;padding:20px;overflow:auto}
                .tv-channel{display:flex;align-items:center;padding:14px;border-radius:12px;margin-bottom:10px;background:#12151a}
                .tv-channel.focus{background:#1e232b}
                .tv-channel img{width:64px;height:36px;background:#000;border-radius:6px;margin-right:15px}
                .tv-name{font-size:1.1em;flex:1}
                .tv-epg{opacity:.6;font-size:.9em;max-width:40%;white-space:nowrap;overflow:hidden}
                .tv-epg-grid{width:360px;background:#0b0d10;padding:15px;overflow:auto}
                .epg-item{margin-bottom:10px;padding:10px;border-radius:8px;background:#15181d}
                .epg-now{background:#2962ff}
                .fav{color:#ffcc00;margin-right:10px}
                `;
                document.head.appendChild(style);
            }

            /* ================== SETTINGS ================== */

            Lampa.Settings.add({
                title: 'IPTV TiviMate',
                component: 'iptv_tm_settings'
            });

            Lampa.Component.add('iptv_tm_settings', {
                template: `
                    <div class="settings">
                        <div class="settings__item selector" data-t="playlist">
                            M3U плейлист
                            <div class="settings__value">${cfg.playlist || 'не задан'}</div>
                        </div>
                        <div class="settings__item selector" data-t="epg">
                            EPG (xmltv)
                            <div class="settings__value">${cfg.epg || 'не задан'}</div>
                        </div>
                    </div>
                `,
                start() {
                    this.render().find('.settings__item').on('click', e => {
                        let t = e.currentTarget.dataset.t;
                        Lampa.Input.edit({
                            title: t.toUpperCase(),
                            value: cfg[t],
                            onBack: v => { cfg[t] = v; saveCfg(); }
                        });
                    });
                    Lampa.Controller.enable('content');
                }
            });

            /* ================== ENTRY ================== */

            Lampa.Settings.add({
                title: 'IPTV (TiviMate)',
                onClick() {
                    if (!cfg.playlist) return Lampa.Noty.show('Укажи плейлист');
                    Lampa.Request.get(cfg.playlist, parseM3U);
                }
            });

            /* ================== M3U ================== */

            function parseM3U(txt) {
                channels = [];
                groups = { '⭐ Избранное': [] };

                let cur = null;
                txt.split('\n').forEach(l => {
                    l = l.trim();
                    if (l.startsWith('#EXTINF')) {
                        cur = {
                            name: l.split(',').pop(),
                            group: (l.match(/group-title="([^"]+)"/)||[])[1] || 'Общие',
                            logo: (l.match(/tvg-logo="([^"]+)"/)||[])[1] || '',
                            id: (l.match(/tvg-id="([^"]+)"/)||[])[1] || '',
                            catchup: /catchup/i.test(l)
                        };
                    } else if (l.startsWith('http') && cur) {
                        cur.url = l;
                        channels.push(cur);
                        (groups[cur.group] = groups[cur.group] || []).push(cur);
                        if (favorites.includes(cur.name)) groups['⭐ Избранное'].push(cur);
                        cur = null;
                    }
                });

                openUI();
            }

            /* ================== UI ================== */

            function openUI() {
                Lampa.Activity.push({
                    title: 'IPTV',
                    component: 'iptv_tm',
                    data: {}
                });
            }

            Lampa.Component.add('iptv_tm', {
                template: `
                <div class="tv-root">
                    <div class="tv-groups"></div>
                    <div class="tv-channels"></div>
                    <div class="tv-epg-grid"></div>
                </div>
                `,
                start() {
                    let root = this.render();
                    let gbox = root.find('.tv-groups')[0];
                    let cbox = root.find('.tv-channels')[0];
                    let ebox = root.find('.tv-epg-grid')[0];

                    function drawGroups() {
                        gbox.innerHTML = '';
                        Object.keys(groups).forEach(g => {
                            let el = document.createElement('div');
                            el.className = 'selector tv-group';
                            el.textContent = g;
                            el.onclick = () => drawChannels(groups[g]);
                            gbox.appendChild(el);
                        });
                    }

                    function drawChannels(list) {
                        cbox.innerHTML = '';
                        ebox.innerHTML = '';
                        list.forEach(ch => {
                            let el = document.createElement('div');
                            el.className = 'selector tv-channel';
                            el.innerHTML = `
                                <img src="${ch.logo}">
                                <span class="fav">${favorites.includes(ch.name) ? '★' : ''}</span>
                                <div class="tv-name">${ch.name}</div>
                                <div class="tv-epg">Загрузка EPG…</div>
                            `;
                            el.onclick = () => play(ch);
                            el.onmouseenter = () => loadEPG(ch, ebox);
                            el.oncontextmenu = () => toggleFav(ch);
                            cbox.appendChild(el);
                        });
                    }

                    function toggleFav(ch) {
                        if (favorites.includes(ch.name))
                            favorites = favorites.filter(f => f !== ch.name);
                        else favorites.push(ch.name);
                        saveFav();
                        drawGroups();
                    }

                    function play(ch, time) {
                        Lampa.Player.play({
                            title: ch.name,
                            url: ch.url,
                            type: 'tv',
                            epg: cfg.epg,
                            epg_id: ch.id,
                            timeshift: time || 0
                        });
                    }

                    function loadEPG(ch, box) {
                        box.innerHTML = '';
                        if (!cfg.epg || !ch.id) return;
                        let data = Lampa.TV.getEPG(ch.id);
                        if (!data || !data.list) return;

                        data.list.slice(0, 10).forEach(p => {
                            let el = document.createElement('div');
                            el.className = 'epg-item' + (p.current ? ' epg-now' : '');
                            el.textContent = p.start + ' ' + p.title;
                            if (ch.catchup) el.onclick = () => play(ch, p.start_ts);
                            box.appendChild(el);
                        });
                    }

                    drawGroups();
                    drawChannels(groups[Object.keys(groups)[0]]);
                    Lampa.Controller.enable('content');
                }
            });
        }
    });

})();
