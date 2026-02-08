// ==Lampa==
// name: IPTV Canonical TV
// version: 10.0.0
// author: Artrax90
// ==/Lampa==

(function () {
    'use strict';

    var PLAYLIST = 'https://raw.githubusercontent.com/loganettv/playlists/refs/heads/main/mega.m3u';

    function IPTV() {
        var html = $('<div class="iptv-page"></div>');
        var list = $('<div class="iptv-list"></div>');
        html.append(list);

        var items = [];
        var index = 0;
        var enabled = false;

        if (!$('#iptv-style').length) {
            $('head').append(
                '<style id="iptv-style">' +
                '.iptv-page{padding:20px}' +
                '.iptv-item{padding:14px;margin-bottom:8px;background:#1a1d22;border-radius:10px}' +
                '.iptv-item.focus{background:#2962ff}' +
                '</style>'
            );
        }

        this.create = function () {
            load();
        };

        this.render = function () {
            return html;
        };

        this.start = function () {
            enable();
        };

        this.stop = function () {
            disable();
        };

        this.destroy = function () {
            disable();
        };

        function load() {
            $.get(PLAYLIST, parse);
        }

        function parse(text) {
            items = [];
            list.empty();
            index = 0;

            var lines = text.split('\n');
            var cur = null;

            for (var i = 0; i < lines.length; i++) {
                var l = lines[i];

                if (l.indexOf('#EXTINF') === 0) {
                    cur = { name: l.split(',')[1] || '' };
                }
                else if (l.indexOf('http') === 0 && cur) {
                    cur.url = l;
                    items.push(cur);
                    list.append('<div class="iptv-item">' + cur.name + '</div>');
                    cur = null;
                }
            }

            render();
        }

        function render() {
            var els = list.find('.iptv-item');
            els.removeClass('focus');
            if (els[index]) $(els[index]).addClass('focus');
        }

        function enable() {
            if (enabled) return;
            enabled = true;
            Lampa.Controller.add('iptv', controller);
            Lampa.Controller.toggle('iptv');
            render();
        }

        function disable() {
            if (!enabled) return;
            enabled = false;
            Lampa.Controller.remove('iptv');
        }

        var controller = {
            up: function () {
                if (index > 0) index--;
                render();
            },
            down: function () {
                if (index < items.length - 1) index++;
                render();
            },
            enter: function () {
                var c = items[index];
                if (!c) return;
                Lampa.Player.play({
                    url: c.url,
                    title: c.name,
                    type: 'tv'
                });
            },
            back: function () {
                Lampa.Activity.backward();
            }
        };
    }

    function init() {
        Lampa.Component.add('iptv', IPTV);

        $('.menu .menu__list').append(
            $('<li class="menu__item selector"><div class="menu__text">IPTV</div></li>')
                .on('hover:enter', function () {
                    Lampa.Activity.push({
                        title: 'IPTV',
                        component: 'iptv'
                    });
                })
        );
    }

    if (window.app_ready) init();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }
})();
