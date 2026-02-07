// ==Lampa==
// name: IPTV Samsung Lampac SAFE
// version: 8.0.0
// author: Artrax90
// ==/Lampa==

(function () {
    'use strict';

    var playlist = 'https://raw.githubusercontent.com/loganettv/playlists/refs/heads/main/mega.m3u';
    var groups = {};
    var groupKeys = [];
    var channels = [];
    var gi = 0;
    var ci = 0;
    var mode = 'groups';

    var root = $('<div class="iptv-root"></div>');
    var colG = $('<div class="iptv-col g"></div>');
    var colC = $('<div class="iptv-col c"></div>');
    var colE = $('<div class="iptv-col e"></div>');
    root.append(colG).append(colC).append(colE);

    $('head').append(
        '<style>' +
        '.iptv-root{display:flex;height:100vh;background:#0b0d10;color:#fff}' +
        '.iptv-col{overflow:hidden}' +
        '.g{width:260px;padding:14px;background:#0e1116}' +
        '.c{flex:1;padding:18px}' +
        '.e{width:420px;padding:18px;background:#0e1116}' +
        '.item{padding:14px;border-radius:10px;margin-bottom:8px;background:#15181d}' +
        '.item.active{background:#2962ff}' +
        '</style>'
    );

    function parse(text) {
        groups = {};
        var cur = null;
        var lines = text.split('\n');

        for (var i = 0; i < lines.length; i++) {
            var l = lines[i].trim();
            if (l.indexOf('#EXTINF') === 0) {
                cur = {
                    name: (l.split(',')[1] || ''),
                    group: (l.match(/group-title="([^"]+)"/) || [,'ОБЩИЕ'])[1]
                };
            } else if (l.indexOf('http') === 0 && cur) {
                cur.url = l;
                if (!groups[cur.group]) groups[cur.group] = [];
                groups[cur.group].push(cur);
                cur = null;
            }
        }

        groupKeys = Object.keys(groups);
        renderGroups();
    }

    function renderGroups() {
        colG.empty();
        colC.empty();
        colE.empty();
        for (var i = 0; i < groupKeys.length; i++) {
            colG.append('<div class="item">' + groupKeys[i] + '</div>');
        }
        highlight();
    }

    function renderChannels() {
        colC.empty();
        channels = groups[groupKeys[gi]];
        for (var i = 0; i < channels.length; i++) {
            colC.append('<div class="item">' + channels[i].name + '</div>');
        }
        highlight();
    }

    function highlight() {
        colG.find('.item').removeClass('active').eq(gi).addClass('active');
        colC.find('.item').removeClass('active').eq(ci).addClass('active');
    }

    function play() {
        var c = channels[ci];
        if (!c) return;
        Lampa.Player.play({
            url: c.url,
            title: c.name,
            type: 'tv'
        });
    }

    Lampa.Controller.add('iptv', {
        toggle: function () {},
        up: function () {
            if (mode === 'groups' && gi > 0) gi--;
            if (mode === 'channels' && ci > 0) ci--;
            highlight();
        },
        down: function () {
            if (mode === 'groups' && gi < groupKeys.length - 1) gi++;
            if (mode === 'channels' && ci < channels.length - 1) ci++;
            highlight();
        },
        right: function () {
            if (mode === 'groups') {
                mode = 'channels';
                ci = 0;
                renderChannels();
            }
        },
        left: function () {
            if (mode === 'channels') {
                mode = 'groups';
                highlight();
            }
        },
        enter: function () {
            if (mode === 'groups') {
                renderChannels();
                mode = 'channels';
            } else {
                play();
            }
        },
        back: function () {
            if (mode === 'channels') {
                mode = 'groups';
                highlight();
            } else {
                Lampa.Activity.backward();
            }
        }
    });

    function init() {
        Lampa.Activity.push({
            title: 'IPTV',
            component: {
                render: function () { return root; },
                start: function () {
                    Lampa.Controller.enable('iptv');
                    $.get(playlist, parse);
                },
                destroy: function () {
                    Lampa.Controller.remove('iptv');
                }
            }
        });
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) {
        if (e.type === 'ready') init();
    });
})();
