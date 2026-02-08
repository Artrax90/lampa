// ==Lampa==
// name: IPTV Virtual Native
// version: 7.0
// author: Gemini & Artrax90
// ==/Lampa==

(function () {
    'use strict';

    function IPTVComponent(object) {
        var _this = this;
        var root, colG, colC, colE;
        var groups_data = {};
        var current_list = [];
        var active_col = 'groups'; // 'groups' или 'channels'
        var index_g = 0;
        var index_c = 0;

        this.create = function () {
            root = $('<div class="iptv-root"></div>');
            colG = $('<div class="iptv-col g"></div>');
            colC = $('<div class="iptv-col c"></div>');
            colE = $('<div class="iptv-col e"></div>');
            root.append(colG, colC, colE);

            if (!$('#iptv-v7-style').length) {
                $('head').append(`
                <style id="iptv-v7-style">
                    .iptv-root { display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #0b0d10; z-index: 1000; }
                    .iptv-col { float: left; height: 100%; overflow: hidden; box-sizing: border-box; position: relative; }
                    .g { width: 25%; background: #14171b; border-right: 1px solid #2a2e33; }
                    .c { width: 45%; background: #0b0d10; }
                    .e { width: 30%; background: #080a0d; border-left: 1px solid #2a2e33; padding: 20px; color: #fff; }
                    .item { padding: 15px; margin: 5px 10px; border-radius: 8px; background: rgba(255,255,255,0.05); color: #fff; border: 2px solid transparent; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                    .item.active { background: #2962ff !important; border-color: #fff; font-weight: bold; }
                    .info-title { font-size: 1.8em; margin-bottom: 10px; color: #2962ff; font-weight: bold; }
                </style>`);
            }

            this.load();
            return root;
        };

        this.load = function () {
            $.ajax({
                url: 'https://raw.githubusercontent.com/loganettv/playlists/refs/heads/main/mega.m3u',
                success: function(str) { _this.parse(str); },
                error: function() { colG.html('<div class="item">Ошибка сети</div>'); }
            });
        };

        this.parse = function (str) {
            var lines = str.split('\n');
            var channels = [];
            for (var i = 0; i < lines.length; i++) {
                var l = lines[i].trim();
                if (l.indexOf('#EXTINF') === 0) {
                    var n = (l.match(/,(.*)$/) || [,''])[1];
                    var g = (l.match(/group-title="([^"]+)"/i) || [,'ОБЩИЕ'])[1];
                    channels.push({name: n, group: g, url: ''});
                } else if (l.indexOf('http') === 0 && channels.length > 0) {
                    var last = channels[channels.length - 1];
                    if (!last.url) {
                        last.url = l;
                        if (!groups_data[last.group]) groups_data[last.group] = [];
                        groups_data[last.group].push(last);
                    }
                }
            }
            this.renderG();
        };

        this.renderG = function () {
            colG.empty();
            Object.keys(groups_data).forEach(function(g, i) {
                var item = $('<div class="item">' + g + '</div>');
                colG.append(item);
            });
            this.updateFocus();
        };

        this.renderC = function () {
            colC.empty();
            var g_name = Object.keys(groups_data)[index_g];
            current_list = groups_data[g_name] || [];
            current_list.forEach(function(c) {
                var row = $('<div class="item">' + c.name + '</div>');
                colC.append(row);
            });
            this.updateFocus();
        };

        this.updateFocus = function () {
            colG.find('.item').removeClass('active');
            colC.find('.item').removeClass('active');

            var g_item = colG.find('.item').eq(index_g);
            var c_item = colC.find('.item').eq(index_c);

            if (active_col === 'groups') {
                g_item.addClass('active');
                colE.html('<div class="info-title">' + g_item.text() + '</div><p>Нажмите ОК для входа</p>');
            } else {
                c_item.addClass('active');
                var chan = current_list[index_c];
                colE.html('<div class="info-title">' + (chan ? chan.name : '') + '</div><p>Нажмите ОК для запуска</p>');
            }
        };

        this.start = function () {
            Lampa.Controller.add('iptv_virtual', {
                toggle: function () {},
                up: function () {
                    if (active_col === 'groups') index_g = Math.max(0, index_g - 1);
                    else index_c = Math.max(0, index_c - 1);
                    _this.updateFocus();
                },
                down: function () {
                    if (active_col === 'groups') index_g = Math.min(Object.keys(groups_data).length - 1, index_g + 1);
                    else index_c = Math.min(current_list.length - 1, index_c + 1);
                    _this.updateFocus();
                },
                right: function () {
                    if (active_col === 'groups') {
                        active_col = 'channels';
                        index_c = 0;
                        _this.renderC();
                    }
                },
                left: function () {
                    if (active_col === 'channels') {
                        active_col = 'groups';
                        colC.empty();
                        _this.updateFocus();
                    } else {
                        Lampa.Activity.back();
                    }
                },
                enter: function () {
                    if (active_col === 'groups') {
                        active_col = 'channels';
                        index_c = 0;
                        _this.renderC();
                    } else {
                        var chan = current_list[index_c];
                        if (chan) Lampa.Player.play({url: chan.url, title: chan.name});
                    }
                },
                back: function () { Lampa.Activity.back(); }
            });
            Lampa.Controller.toggle('iptv_virtual');
        };

        this.pause = this.stop = function () {};
        this.render = function () { return root; };
        this.destroy = function () { 
            Lampa.Controller.remove('iptv_virtual');
            root.remove(); 
        };
    }

    function init() {
        Lampa.Component.add('iptv_v7', IPTVComponent);
        var item = $('<li class="menu__item selector"><div class="menu__text">IPTV PRO</div></li>');
        item.on('hover:enter', function () {
            Lampa.Activity.push({title: 'IPTV', component: 'iptv_v7'});
        });
        $('.menu .menu__list').append(item);
    }

    if (window.app_ready) init();
    else Lampa.Listener.follow('app', function (e) { if (e.type == 'ready') init(); });
})();
