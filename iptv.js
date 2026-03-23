// ==Lampa==
// name: IPTV PRO Universal
// version: 4.1.7
// ==/Lampa==

(function () {
    'use strict';

    var PLUGIN_NAME = 'iptv_pro_fixed_playlist';
    var COMPONENT_NAME = 'iptv_pro_fixed_component';
    var PLAYLIST_URL = 'https://raw.githubusercontent.com/Artrax90/m3ucreator/main/pl.m3u';

    function IPTVFixed() {
        var root;
        var layout;
        var leftCol;
        var centerCol;
        var rightCol;
        var controllerReady = false;
        var requester = createRequester();

        var state = {
            groups: {},
            groupNames: [],
            channels: [],
            currentGroup: '',
            currentChannels: [],
            activeColumn: 'groups',
            groupIndex: 0,
            channelIndex: 0,
            actionIndex: 0,
            actions: [
                { title: 'Смотреть', action: 'play' },
                { title: 'Обновить плейлист', action: 'reload' }
            ]
        };

        function createRequester() {
            try {
                if (window.Lampa && Lampa.Reguest) return new Lampa.Reguest();
            } catch (e) {}
            return null;
        }

        function notify(text) {
            try {
                if (Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(text);
            } catch (e) {}
        }

        function requestText(url, success, error) {
            var timeout = 25000;

            try {
                if (requester && requester.timeout) requester.timeout(timeout);
                if (requester && requester.silent) {
                    requester.silent(url, function (data) {
                        success(typeof data === 'string' ? data : String(data || ''));
                    }, function (err) {
                        error(err || {});
                    }, false, {
                        dataType: 'text'
                    });
                    return;
                }
            } catch (e) {}

            $.ajax({
                url: url,
                method: 'GET',
                dataType: 'text',
                timeout: timeout,
                success: function (text) {
                    success(text || '');
                },
                error: function (err) {
                    error(err || {});
                }
            });
        }

        function ensureStyles() {
            if ($('#iptv-pro-fixed-style').length) return;

            $('head').append(
                '<style id="iptv-pro-fixed-style">' +
                '.iptvpf-root{position:fixed;top:0;left:0;right:0;bottom:0;z-index:1000;background:#0b0d10;color:#fff;padding-top:5rem;overflow:hidden;-webkit-overflow-scrolling:touch;}' +
                '.iptvpf-layout{display:flex;width:100%;height:100%;}' +
                '.iptvpf-col{height:100%;overflow-y:auto;box-sizing:border-box;background:rgba(255,255,255,.02);border-right:1px solid rgba(255,255,255,.08);-webkit-overflow-scrolling:touch;}' +
                '.iptvpf-left{width:24rem;}' +
                '.iptvpf-center{flex:1;}' +
                '.iptvpf-right{width:25rem;border-right:none;background:#080a0d;padding:1.25rem;}' +
                '.iptvpf-head{padding:1rem;font-size:1.25rem;font-weight:700;display:flex;align-items:center;gap:.75rem;}' +
                '.iptvpf-sub{padding:0 1rem .8rem 1rem;color:rgba(255,255,255,.62);font-size:.92rem;}' +
                '.iptvpf-item{margin:.35rem;padding:.9rem;border-radius:.55rem;background:rgba(255,255,255,.05);cursor:pointer;user-select:none;-webkit-tap-highlight-color:transparent;}' +
                '.iptvpf-item.active{background:#2962ff!important;}' +
                '.iptvpf-row{display:flex;align-items:center;gap:.75rem;min-width:0;}' +
                '.iptvpf-logo{width:2.2rem;height:2.2rem;object-fit:contain;flex:0 0 2.2rem;border-radius:.4rem;background:rgba(255,255,255,.04);}' +
                '.iptvpf-logo-big{width:5rem;height:5rem;display:block;margin-bottom:1rem;}' +
                '.iptvpf-row-text{min-width:0;flex:1;}' +
                '.iptvpf-title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
                '.iptvpf-subline{margin-top:.2rem;font-size:.82rem;color:rgba(255,255,255,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
                '.iptvpf-empty{padding:1rem;color:rgba(255,255,255,.6);}' +
                '.iptvpf-card-title{font-size:1.3rem;font-weight:700;margin-bottom:.75rem;word-break:break-word;}' +
                '.iptvpf-meta{opacity:.82;margin-bottom:.7rem;word-break:break-word;}' +
                '.iptvpf-url{opacity:.6;font-size:.88rem;word-break:break-all;margin:.8rem 0 1.1rem 0;}' +
                '@media (max-width:980px){' +
                '.iptvpf-root{padding-top:4rem;overflow-y:auto;overflow-x:hidden;}' +
                '.iptvpf-layout{display:block;height:auto;min-height:100%;}' +
                '.iptvpf-col{width:100%!important;height:auto!important;max-height:none!important;overflow:visible!important;border-right:none;border-bottom:1px solid rgba(255,255,255,.08);}' +
                '.iptvpf-right{padding:1rem 1rem 5rem 1rem;}' +
                '}' +
                '</style>'
            );
        }

        function decodeHtml(value) {
            return String(value || '')
                .replace(/&amp;/g, '&')
                .replace(/&quot;/g, '"')
                .replace(/&#39;/g, "'")
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>');
        }

        function extractAttrs(line) {
            var attrs = {};
            var re = /([a-zA-Z0-9\-_]+)="([^"]*)"/g;
            var match;
            while ((match = re.exec(line))) attrs[match[1]] = decodeHtml(match[2]);
            return attrs;
        }

        function parsePlaylist(text) {
            var groups = {};
            var current = null;

            text.split(/\r?\n/).forEach(function (raw) {
                var line = (raw || '').trim();
                if (!line) return;

                if (line.indexOf('#EXTINF:') === 0) {
                    var attrs = extractAttrs(line);
                    var name = line.indexOf(',') >= 0 ? line.split(',').slice(1).join(',').trim() : 'Без названия';
                    current = {
                        name: name || 'Без названия',
                        group: attrs['group-title'] || 'ОБЩИЕ',
                        logo: attrs['tvg-logo'] || '',
                        tvgId: attrs['tvg-id'] || '',
                        tvgName: attrs['tvg-name'] || ''
                    };
                    return;
                }

                if (line.charAt(0) === '#') return;
                if (!current) return;

                current.url = line;
                if (!groups[current.group]) groups[current.group] = [];
                groups[current.group].push(current);
                current = null;
            });

            state.groups = groups;
            state.groupNames = Object.keys(groups).sort(function (a, b) {
                return a.localeCompare(b, 'ru');
            });

            if (!state.groupNames.length) {
                state.currentGroup = '';
                state.currentChannels = [];
                return;
            }

            if (!state.currentGroup || !groups[state.currentGroup]) state.currentGroup = state.groupNames[0];
            state.currentChannels = groups[state.currentGroup] || [];
            if (state.groupIndex >= state.groupNames.length) state.groupIndex = 0;
            if (state.channelIndex >= state.currentChannels.length) state.channelIndex = 0;
            if (state.actionIndex >= state.actions.length) state.actionIndex = 0;
        }

        function selectedChannel() {
            return state.currentChannels[state.channelIndex] || null;
        }

        function bindAction(el, handler) {
            el.on('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                try { handler(); } catch (err) {}
            });
        }

        function selectGroup(index, moveFocus) {
            if (!state.groupNames.length) return;
            if (index < 0) index = 0;
            if (index >= state.groupNames.length) index = state.groupNames.length - 1;
            state.groupIndex = index;
            state.currentGroup = state.groupNames[index];
            state.currentChannels = state.groups[state.currentGroup] || [];
            state.channelIndex = 0;
            state.actionIndex = 0;
            if (moveFocus) state.activeColumn = 'channels';
            renderAll();
        }

        function playChannel(channel) {
            if (!channel || !channel.url) {
                notify('Канал не выбран');
                return;
            }

            try {
                if (!Lampa.Player || !Lampa.Player.play) throw new Error('Player unavailable');
                Lampa.Player.play({
                    title: channel.name,
                    url: channel.url
                });
            } catch (e) {
                notify('Ошибка запуска плеера');
            }
        }

        function renderGroups() {
            leftCol.empty();
            leftCol.append($('<div class="iptvpf-head"></div>').text('Группы'));
            leftCol.append($('<div class="iptvpf-sub"></div>').text('Вшитый плейлист: pl.m3u')); 

            if (!state.groupNames.length) {
                leftCol.append($('<div class="iptvpf-empty"></div>').text('Группы не найдены'));
                return;
            }

            state.groupNames.forEach(function (group, index) {
                var row = $('<div class="iptvpf-item"></div>').text(group + ' (' + (state.groups[group] || []).length + ')');
                bindAction(row, function () {
                    selectGroup(index, true);
                });
                leftCol.append(row);
            });
        }

        function appendChannelRow(row, channel) {
            var wrap = $('<div class="iptvpf-row"></div>');
            if (channel.logo) wrap.append($('<img class="iptvpf-logo" alt="">').attr('src', channel.logo));
            else wrap.append($('<div class="iptvpf-logo"></div>'));

            var text = $('<div class="iptvpf-row-text"></div>');
            text.append($('<div class="iptvpf-title"></div>').text(channel.name));
            text.append($('<div class="iptvpf-subline"></div>').text((channel.tvgId || 'без tvg-id') + ' | ' + (channel.group || 'ОБЩИЕ')));
            wrap.append(text);
            row.append(wrap);
        }

        function renderChannels() {
            centerCol.empty();
            centerCol.append($('<div class="iptvpf-head"></div>').text(state.currentGroup || 'Каналы'));
            centerCol.append($('<div class="iptvpf-sub"></div>').text(PLAYLIST_URL));

            if (!state.currentChannels.length) {
                centerCol.append($('<div class="iptvpf-empty"></div>').text('Каналы не найдены'));
                return;
            }

            state.currentChannels.forEach(function (channel, index) {
                var row = $('<div class="iptvpf-item"></div>');
                appendChannelRow(row, channel);
                bindAction(row, function () {
                    state.channelIndex = index;
                    state.activeColumn = 'actions';
                    renderInfo();
                    updateFocus();
                });
                centerCol.append(row);
            });
        }

        function renderInfo() {
            rightCol.empty();
            rightCol.append($('<div class="iptvpf-head"></div>').text('Инфо'));

            var channel = selectedChannel();
            if (!channel) {
                rightCol.append($('<div class="iptvpf-empty"></div>').text('Выберите канал'));
                return;
            }

            if (channel.logo) rightCol.append($('<img class="iptvpf-logo-big" alt="">').attr('src', channel.logo));
            rightCol.append($('<div class="iptvpf-card-title"></div>').text(channel.name));
            rightCol.append($('<div class="iptvpf-meta"></div>').text('Группа: ' + (channel.group || 'ОБЩИЕ')));
            rightCol.append($('<div class="iptvpf-meta"></div>').text('tvg-id: ' + (channel.tvgId || 'нет')));
            rightCol.append($('<div class="iptvpf-meta"></div>').text('tvg-name: ' + (channel.tvgName || channel.name || 'нет')));
            rightCol.append($('<div class="iptvpf-url"></div>').text(channel.url || ''));

            state.actions.forEach(function (item, index) {
                var row = $('<div class="iptvpf-item"></div>').text(item.title);
                bindAction(row, function () {
                    state.actionIndex = index;
                    if (item.action === 'play') playChannel(channel);
                    if (item.action === 'reload') loadPlaylist();
                });
                rightCol.append(row);
            });
        }

        function renderAll() {
            renderGroups();
            renderChannels();
            renderInfo();
            updateFocus();
        }

        function ensureVisible(container, element) {
            if (!container || !container.length || !element || !element.length) return;
            if (window.innerWidth <= 980) return;

            var c = container[0];
            var e = element[0];
            var cTop = c.scrollTop;
            var cHeight = c.clientHeight;
            var eTop = e.offsetTop;
            var eHeight = e.offsetHeight;
            var margin = 12;

            if (eTop < cTop + margin) c.scrollTop = Math.max(0, eTop - margin);
            else if (eTop + eHeight > cTop + cHeight - margin) c.scrollTop = eTop + eHeight - cHeight + margin;
        }

        function updateFocus() {
            if (!root) return;

            leftCol.find('.iptvpf-item').removeClass('active');
            centerCol.find('.iptvpf-item').removeClass('active');
            rightCol.find('.iptvpf-item').removeClass('active');

            if (state.activeColumn === 'groups') {
                var g = leftCol.find('.iptvpf-item').eq(state.groupIndex).addClass('active');
                ensureVisible(leftCol, g);
            } else if (state.activeColumn === 'channels') {
                var c = centerCol.find('.iptvpf-item').eq(state.channelIndex).addClass('active');
                ensureVisible(centerCol, c);
            } else {
                var a = rightCol.find('.iptvpf-item').eq(state.actionIndex).addClass('active');
                ensureVisible(rightCol, a);
            }
        }

        function activateController() {
            try {
                if (Lampa.Controller && Lampa.Controller.toggle) Lampa.Controller.toggle(PLUGIN_NAME);
            } catch (e) {}
        }

        function exitPlugin() {
            try {
                if (Lampa.Controller && Lampa.Controller.toggle) Lampa.Controller.toggle('menu');
            } catch (e) {}
            try {
                if (Lampa.Activity && Lampa.Activity.back) Lampa.Activity.back();
            } catch (e2) {}
        }

        function addController() {
            if (controllerReady) return;

            try {
                Lampa.Controller.add(PLUGIN_NAME, {
                    up: function () {
                        if (state.activeColumn === 'groups' && state.groupIndex > 0) state.groupIndex--;
                        if (state.activeColumn === 'channels' && state.channelIndex > 0) {
                            state.channelIndex--;
                            renderInfo();
                        }
                        if (state.activeColumn === 'actions' && state.actionIndex > 0) state.actionIndex--;
                        updateFocus();
                    },
                    down: function () {
                        if (state.activeColumn === 'groups' && state.groupIndex < state.groupNames.length - 1) state.groupIndex++;
                        if (state.activeColumn === 'channels' && state.channelIndex < state.currentChannels.length - 1) {
                            state.channelIndex++;
                            renderInfo();
                        }
                        if (state.activeColumn === 'actions' && state.actionIndex < state.actions.length - 1) state.actionIndex++;
                        updateFocus();
                    },
                    left: function () {
                        if (state.activeColumn === 'actions') state.activeColumn = 'channels';
                        else if (state.activeColumn === 'channels') state.activeColumn = 'groups';
                        else exitPlugin();
                        updateFocus();
                    },
                    right: function () {
                        if (state.activeColumn === 'groups' && state.groupNames.length) {
                            selectGroup(state.groupIndex, true);
                            return;
                        }
                        if (state.activeColumn === 'channels' && selectedChannel()) state.activeColumn = 'actions';
                        updateFocus();
                    },
                    enter: function () {
                        if (state.activeColumn === 'groups') {
                            selectGroup(state.groupIndex, true);
                            return;
                        }

                        if (state.activeColumn === 'channels') {
                            state.activeColumn = 'actions';
                            renderInfo();
                            updateFocus();
                            return;
                        }

                        var channel = selectedChannel();
                        var action = state.actions[state.actionIndex];
                        if (!action) return;
                        if (action.action === 'play') playChannel(channel);
                        if (action.action === 'reload') loadPlaylist();
                    },
                    back: function () {
                        if (state.activeColumn === 'actions') state.activeColumn = 'channels';
                        else if (state.activeColumn === 'channels') state.activeColumn = 'groups';
                        else exitPlugin();
                        updateFocus();
                    }
                });
                controllerReady = true;
            } catch (e) {}
        }

        function loadPlaylist() {
            notify('Загрузка плейлиста...');
            requestText(PLAYLIST_URL, function (text) {
                parsePlaylist(text || '');
                renderAll();
                notify('Плейлист обновлён');
            }, function () {
                notify('Ошибка загрузки плейлиста');
            });
        }

        this.create = function () {
            ensureStyles();

            root = $('<div class="iptvpf-root"></div>');
            layout = $('<div class="iptvpf-layout"></div>');
            leftCol = $('<div class="iptvpf-col iptvpf-left"></div>');
            centerCol = $('<div class="iptvpf-col iptvpf-center"></div>');
            rightCol = $('<div class="iptvpf-col iptvpf-right"></div>');

            layout.append(leftCol, centerCol, rightCol);
            root.append(layout);
            renderAll();
            loadPlaylist();
            return root;
        };

        this.start = function () {
            addController();
            activateController();
            updateFocus();
        };

        this.pause = function () {};
        this.stop = function () {};
        this.render = function () { return root; };

        this.destroy = function () {
            try {
                if (requester && requester.clear) requester.clear();
            } catch (e) {}
            try {
                if (Lampa.Controller && Lampa.Controller.remove) Lampa.Controller.remove(PLUGIN_NAME);
            } catch (e2) {}
            controllerReady = false;
            if (root) root.remove();
        };
    }

    function bindMenuAction(el, handler) {
        el.on('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            handler();
        });
    }

    function init() {
        try {
            Lampa.Component.add(COMPONENT_NAME, IPTVFixed);

            if ($('.menu .menu__list').find('.iptvpf-menu-item').length) return;

            var item = $('<li class="menu__item selector iptvpf-menu-item"></li>');
            item.append($('<div class="menu__ico"></div>').text('TV'));
            item.append($('<div class="menu__text"></div>').text('IPTV PRO'));

            bindMenuAction(item, function () {
                try {
                    Lampa.Activity.push({
                        title: 'IPTV PRO',
                        component: COMPONENT_NAME
                    });
                } catch (err) {}
            });

            $('.menu .menu__list').append(item);
        } catch (e) {}
    }

    if (window.app_ready) init();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') init();
        });
    }
})();

