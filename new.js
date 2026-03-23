// ==Lampa==
// name: IPTV PRO Universal (Artrax)
// version: 5.0.0
// ==/Lampa==

(function () {
  "use strict";

  var STORAGE_KEY = "iptv_universal_v500";
  var COMPONENT_NAME = "iptv_universal_artrax";
  var CONTROLLER_NAME = "iptv_universal_artrax";

  function log(tag, err) {
    try {
      console.error("[IPTV PRO]", tag, err || "");
    } catch (e) {}
  }

  function notify(text) {
    try {
      if (window.Lampa && Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(text);
    } catch (e) {}
  }

  function decodeHtml(value) {
    return String(value || "")
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  }

  function normalizeName(value) {
    return String(value || "")
      .replace(/\([^)]*\)/g, " ")
      .replace(/\[[^\]]*\]/g, " ")
      .replace(/[._-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  function parseXmltvDate(value) {
    var clean = String(value || "").trim();
    var m = clean.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+\-]\d{4})?/);
    if (!m) return null;
    var y = Number(m[1]);
    var mo = Number(m[2]) - 1;
    var d = Number(m[3]);
    var h = Number(m[4]);
    var mi = Number(m[5]);
    var s = Number(m[6]);
    var off = m[7];
    if (off) {
      var sign = off.charAt(0) === "-" ? -1 : 1;
      var oh = Number(off.slice(1, 3));
      var om = Number(off.slice(3, 5));
      var utc = Date.UTC(y, mo, d, h, mi, s);
      return new Date(utc - sign * (oh * 60 + om) * 60000);
    }
    return new Date(y, mo, d, h, mi, s);
  }

  function formatTime(date) {
    if (!date || isNaN(date.getTime())) return "";
    var hh = date.getHours();
    var mm = date.getMinutes();
    return (hh < 10 ? "0" : "") + hh + ":" + (mm < 10 ? "0" : "") + mm;
  }

  function defaults() {
    return {
      playlists: [
        {
          name: "Artrax Creator",
          url: "https://raw.githubusercontent.com/Artrax90/m3ucreator/main/pl.m3u",
          locked: true,
          hidden: false
        },
        {
          name: "LoganetTV Mega",
          url: "https://raw.githubusercontent.com/loganettv/playlists/refs/heads/main/mega.m3u",
          locked: true,
          hidden: false
        },
        {
          name: "RU IPTV Org",
          url: "https://iptv-org.github.io/iptv/countries/ru.m3u",
          locked: true,
          hidden: false
        },
        {
          name: "PRISMA",
          url: "https://gist.axenov.dev/PRISMA/f332731d327f41149cbfcecefeda4591/download/HEAD/PRISMA.m3u",
          locked: true,
          hidden: false
        }
      ],
      favorites: [],
      currentPlaylist: 0,
      lastGroup: "STAR_FAVORITES",
      epgOverrides: {}
    };
  }

  function ensureStyles() {
    if ($("#iptv-universal-style").length) return;
    $("head").append(
      '<style id="iptv-universal-style">' +
        ".iptv-root{position:fixed;top:0;left:0;right:0;bottom:0;z-index:1000;background:#0b0d10;color:#fff;padding-top:5rem;overflow:hidden;-webkit-overflow-scrolling:touch;}" +
        ".iptv-layout{display:flex;width:100%;height:100%;}" +
        ".iptv-col{height:100%;overflow-y:auto;box-sizing:border-box;background:rgba(255,255,255,.02);border-right:1px solid rgba(255,255,255,.08);}" +
        ".iptv-left{width:23rem;}" +
        ".iptv-center{flex:1;}" +
        ".iptv-right{width:26rem;padding:1.2rem;border-right:none;background:#080a0d;}" +
        ".iptv-head{padding:1rem;font-size:1.25rem;font-weight:700;display:flex;align-items:center;gap:.75rem;}" +
        ".iptv-sub{padding:0 1rem .75rem 1rem;color:rgba(255,255,255,.6);font-size:.92rem;}" +
        ".iptv-item{margin:.35rem;padding:.95rem;border-radius:.55rem;background:rgba(255,255,255,.05);cursor:pointer;user-select:none;}" +
        ".iptv-item.active{background:#2962ff!important;}" +
        ".iptv-row{display:flex;align-items:center;gap:.75rem;min-width:0;}" +
        ".iptv-logo{width:2.2rem;height:2.2rem;object-fit:contain;flex:0 0 2.2rem;border-radius:.4rem;background:rgba(255,255,255,.04);}" +
        ".iptv-logo--big{width:5rem;height:5rem;margin-bottom:1rem;display:block;}" +
        ".iptv-row-text{min-width:0;flex:1;}" +
        ".iptv-row-title{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
        ".iptv-row-sub{margin-top:.2rem;font-size:.82rem;color:rgba(255,255,255,.6);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}" +
        ".iptv-empty{padding:1rem;color:rgba(255,255,255,.6);}" +
        ".iptv-title{font-size:1.35rem;font-weight:700;margin-bottom:.8rem;word-break:break-word;}" +
        ".iptv-meta{opacity:.82;margin-bottom:.6rem;word-break:break-word;}" +
        ".iptv-url{opacity:.6;font-size:.9rem;word-break:break-all;margin-bottom:1rem;}" +
        ".iptv-epg{margin-bottom:1rem;padding:.9rem;border-radius:.55rem;background:rgba(255,255,255,.04);}" +
        ".iptv-epg-line{margin-bottom:.45rem;word-break:break-word;}" +
        ".iptv-epg-line:last-child{margin-bottom:0;}" +
        ".iptv-epg-label{display:inline-block;min-width:4rem;color:rgba(255,255,255,.6);}" +
        ".iptv-overlay{position:absolute;top:5rem;left:0;right:0;bottom:0;background:#0b0d10;display:flex;z-index:10;}" +
        ".iptv-overlay.hidden{display:none;}" +
        ".iptv-overlay-left{width:28rem;overflow-y:auto;border-right:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.03);}" +
        ".iptv-overlay-right{flex:1;overflow-y:auto;padding:1.2rem;}" +
        ".iptv-display{padding:1rem;border-radius:.55rem;background:rgba(255,255,255,.06);min-height:3rem;margin-bottom:1rem;word-break:break-all;}" +
        ".iptv-input{margin:.35rem;padding:.95rem;border-radius:.55rem;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.2);color:#fff;width:calc(100% - .7rem);}" +
        ".iptv-tabs{display:none;gap:.5rem;padding:.75rem;background:#0b0d10;border-bottom:1px solid rgba(255,255,255,.08);}" +
        ".iptv-tab{margin:0;padding:.7rem;border-radius:.55rem;background:rgba(255,255,255,.05);text-align:center;flex:1;}" +
        ".iptv-tab.active{background:#2962ff!important;}" +
        "@media (max-width:980px){.iptv-root{padding-top:4rem;overflow-y:auto}.iptv-tabs{display:flex;position:sticky;top:0;z-index:15}.iptv-layout{display:block;height:auto}.iptv-col{width:100%!important;height:auto!important;max-height:none!important;overflow:visible!important;border-right:none;border-bottom:1px solid rgba(255,255,255,.08)}.iptv-right{padding:1rem 1rem 6rem 1rem}.iptv-col.mobile-hidden{display:none!important}.iptv-overlay{top:4rem;display:block;overflow-y:auto}.iptv-overlay-left{width:100%;overflow:visible;border-right:none;border-bottom:1px solid rgba(255,255,255,.08)}.iptv-overlay-right{overflow:visible;padding:1rem 1rem 6rem 1rem}}" +
      "</style>"
    );
  }

  function IPTVUniversal() {
    var root, layout, leftCol, centerCol, rightCol, overlay, mobileTabs;
    var requester = null;
    var controllerReady = false;
    var view = "browser";
    var mobileTab = "left";
    var playlistItems = [];
    var overlayIndex = 0;
    var pendingInputAction = null;

    var state = {
      groups: {},
      channels: [],
      currentChannels: [],
      leftItems: [],
      rightItems: [],
      leftIndex: 0,
      centerIndex: 0,
      rightIndex: 0,
      lastGroup: "STAR_FAVORITES",
      epgFromPlaylist: "",
      epgStatus: "EPG не загружен"
    };

    var epg = {
      programsById: {},
      namesMap: {},
      iconById: {},
      iconByName: {},
      url: ""
    };

    var config = (function loadConfig() {
      var def = defaults();
      var raw = {};
      try {
        raw = Lampa.Storage.get(STORAGE_KEY, def) || def;
      } catch (e) {
        raw = def;
      }
      if (!Array.isArray(raw.playlists)) raw.playlists = def.playlists.slice();
      if (!Array.isArray(raw.favorites)) raw.favorites = [];
      if (typeof raw.currentPlaylist !== "number") raw.currentPlaylist = 0;
      if (!raw.epgOverrides || typeof raw.epgOverrides !== "object") raw.epgOverrides = {};
      def.playlists.forEach(function (p) {
        var found = raw.playlists.some(function (x) {
          return x && x.url === p.url;
        });
        if (!found) raw.playlists.push(p);
      });
      if (raw.currentPlaylist >= raw.playlists.length) raw.currentPlaylist = 0;
      return raw;
    })();

    function saveConfig() {
      try {
        Lampa.Storage.set(STORAGE_KEY, config);
      } catch (e) {
        log("saveConfig", e);
      }
    }

    function createRequester() {
      try {
        if (window.Lampa && Lampa.Reguest) return new Lampa.Reguest();
      } catch (e) {}
      return null;
    }

    function requestText(url, timeout, success, error) {
      var done = false;
      var t = setTimeout(function () {
        if (done) return;
        done = true;
        error({ timeout: true });
      }, timeout || 25000);
      function ok(data) {
        if (done) return;
        done = true;
        clearTimeout(t);
        success(typeof data === "string" ? data : String(data || ""));
      }
      function fail(err) {
        if (done) return;
        done = true;
        clearTimeout(t);
        error(err || {});
      }

      try {
        if (requester && requester.timeout) requester.timeout(timeout || 25000);
        if (requester && requester.silent) {
          requester.silent(url, ok, fail, false, { dataType: "text" });
          return;
        }
      } catch (e) {}

      $.ajax({
        url: url,
        method: "GET",
        dataType: "text",
        timeout: timeout || 25000,
        success: ok,
        error: fail
      });
    }

    function currentPlaylist() {
      return config.playlists[config.currentPlaylist] || null;
    }

    function isFavorite(ch) {
      return config.favorites.some(function (x) {
        return x && x.url === ch.url;
      });
    }

    function toggleFavorite(ch) {
      if (!ch || !ch.url) return;
      var i = -1;
      for (var n = 0; n < config.favorites.length; n++) {
        if (config.favorites[n].url === ch.url) {
          i = n;
          break;
        }
      }
      if (i >= 0) {
        config.favorites.splice(i, 1);
        notify("Удалено из избранного");
      } else {
        config.favorites.push({
          name: ch.name,
          url: ch.url,
          group: ch.group,
          logo: ch.logo,
          id: ch.id,
          epgName: ch.epgName
        });
        notify("Добавлено в избранное");
      }
      saveConfig();
      rebuildGroups();
      buildLeftItems();
      syncGroupSelection();
      renderBrowser();
    }

    function parseAttr(line, name) {
      var m = String(line || "").match(new RegExp(name + '="([^"]*)"', "i"));
      return m ? decodeHtml(m[1].trim()) : "";
    }

    function parsePlaylist(text) {
      var lines = String(text || "").split(/\r?\n/);
      state.channels = [];
      state.epgFromPlaylist = "";
      for (var i = 0; i < lines.length; i++) {
        var line = (lines[i] || "").trim();
        if (line.indexOf("#EXTM3U") === 0 && !state.epgFromPlaylist) {
          state.epgFromPlaylist = parseAttr(line, "url-tvg") || parseAttr(line, "x-tvg-url");
        }
        if (line.indexOf("#EXTINF") === 0) {
          var name = ((line.match(/,(.*)$/) || ["", ""])[1] || "Без названия").trim();
          var group = parseAttr(line, "group-title") || "ОБЩИЕ";
          var logo = parseAttr(line, "tvg-logo");
          var id = parseAttr(line, "tvg-id");
          var epgName = parseAttr(line, "tvg-name");
          var url = "";
          for (var j = i + 1; j < lines.length; j++) {
            url = (lines[j] || "").trim();
            if (!url || url.indexOf("#") === 0) continue;
            break;
          }
          if (url && /^https?:\/\//i.test(url)) {
            state.channels.push({
              name: name,
              url: url,
              group: group,
              logo: logo,
              id: id || "",
              epgName: epgName || ""
            });
          }
        }
      }
      rebuildGroups();
      buildLeftItems();
      syncGroupSelection();
    }

    function resetEpg() {
      epg.programsById = {};
      epg.namesMap = {};
      epg.iconById = {};
      epg.iconByName = {};
      epg.url = "";
      state.epgStatus = "EPG не загружен";
    }

    function parseEpg(xmlText, url) {
      try {
        var parser = new DOMParser();
        var xml = parser.parseFromString(xmlText, "text/xml");
        if (xml.getElementsByTagName("parsererror").length) return false;
        var chs = xml.getElementsByTagName("channel");
        var prs = xml.getElementsByTagName("programme");
        epg.url = url;
        for (var i = 0; i < chs.length; i++) {
          var c = chs[i];
          var id = c.getAttribute("id") || "";
          var names = c.getElementsByTagName("display-name");
          var iconNode = c.getElementsByTagName("icon")[0];
          var icon = iconNode ? String(iconNode.getAttribute("src") || "").trim() : "";
          if (id && icon) epg.iconById[id] = icon;
          for (var n = 0; n < names.length; n++) {
            var raw = String(names[n].textContent || "").trim();
            var key = normalizeName(raw);
            if (key && !epg.namesMap[key]) epg.namesMap[key] = id;
            if (key && icon && !epg.iconByName[key]) epg.iconByName[key] = icon;
          }
        }
        var now = Date.now();
        var total = 0;
        for (var p = 0; p < prs.length; p++) {
          var pr = prs[p];
          var pid = pr.getAttribute("channel") || "";
          var start = parseXmltvDate(pr.getAttribute("start") || "");
          var stop = parseXmltvDate(pr.getAttribute("stop") || "");
          var tNode = pr.getElementsByTagName("title")[0];
          var title = tNode ? String(tNode.textContent || "").trim() : "";
          if (!pid || !start || !stop || !title) continue;
          if (stop.getTime() < now) continue;
          if (!epg.programsById[pid]) epg.programsById[pid] = [];
          epg.programsById[pid].push({ title: title, start: start, stop: stop });
          total++;
        }
        Object.keys(epg.programsById).forEach(function (id) {
          epg.programsById[id].sort(function (a, b) {
            return a.start.getTime() - b.start.getTime();
          });
          if (epg.programsById[id].length > 8) epg.programsById[id] = epg.programsById[id].slice(0, 8);
        });
        state.epgStatus = total ? "EPG загружен" : "EPG пустой";
        return total > 0;
      } catch (e) {
        log("parseEpg", e);
        return false;
      }
    }

    function findEpg(channel) {
      if (!channel) return null;
      var ids = [channel.id, epg.namesMap[normalizeName(channel.epgName)], epg.namesMap[normalizeName(channel.name)]];
      var arr = null;
      for (var i = 0; i < ids.length; i++) {
        var id = ids[i];
        if (id && epg.programsById[id]) {
          arr = epg.programsById[id];
          break;
        }
      }
      if (!arr || !arr.length) return null;
      var now = Date.now();
      for (var n = 0; n < arr.length; n++) {
        var cur = arr[n];
        var nxt = arr[n + 1] || null;
        if (now >= cur.start.getTime() && now < cur.stop.getTime()) return [cur, nxt].filter(Boolean);
        if (now < cur.start.getTime()) return [cur, nxt].filter(Boolean);
      }
      return [arr[arr.length - 1]];
    }

    function resolveLogo(channel) {
      if (!channel) return "";
      if (channel.logo) return channel.logo;
      if (channel.id && epg.iconById[channel.id]) return epg.iconById[channel.id];
      var byName = epg.iconByName[normalizeName(channel.epgName || channel.name)];
      return byName || "";
    }

    function rebuildGroups() {
      var groups = { STAR_FAVORITES: config.favorites.slice() };
      state.channels.forEach(function (ch) {
        var g = ch.group || "ОБЩИЕ";
        if (!groups[g]) groups[g] = [];
        groups[g].push(ch);
      });
      state.groups = groups;
    }

    function buildLeftItems() {
      var items = [
        { type: "action", title: "Добавить плейлист", action: "add" },
        { type: "action", title: "Список плейлистов", action: "playlists" },
        { type: "action", title: "Поиск", action: "search" }
      ];
      Object.keys(state.groups).forEach(function (g) {
        items.push({
          type: "group",
          title: g === "STAR_FAVORITES" ? "⭐ Избранное" : g,
          group: g,
          count: (state.groups[g] || []).length
        });
      });
      state.leftItems = items;
      if (state.leftIndex >= items.length) state.leftIndex = 0;
    }

    function buildRightItems() {
      var ch = selectedChannel();
      if (!ch) {
        state.rightItems = [];
        state.rightIndex = 0;
        return;
      }
      state.rightItems = [
        { title: "Смотреть", action: "play" },
        { title: isFavorite(ch) ? "Убрать из избранного" : "Добавить в избранное", action: "favorite" },
        { title: "Удалить текущий плейлист", action: "remove_playlist" }
      ];
      if (state.rightIndex >= state.rightItems.length) state.rightIndex = 0;
    }

    function syncGroupSelection() {
      var i;
      var idx = -1;
      for (i = 0; i < state.leftItems.length; i++) {
        if (state.leftItems[i].type === "group" && state.leftItems[i].group === (config.lastGroup || "STAR_FAVORITES")) {
          idx = i;
          break;
        }
      }
      if (idx < 0) {
        for (i = 0; i < state.leftItems.length; i++) {
          if (state.leftItems[i].type === "group") {
            idx = i;
            break;
          }
        }
      }
      state.leftIndex = Math.max(0, idx);
      var item = state.leftItems[state.leftIndex];
      selectGroup(item && item.group ? item.group : "STAR_FAVORITES", false);
    }

    function selectedChannel() {
      if (!state.currentChannels.length) return null;
      if (state.centerIndex < 0) state.centerIndex = 0;
      if (state.centerIndex >= state.currentChannels.length) state.centerIndex = state.currentChannels.length - 1;
      return state.currentChannels[state.centerIndex] || null;
    }

    function selectGroup(group, moveCenter) {
      state.currentChannels = (state.groups[group] || []).slice();
      state.centerIndex = 0;
      state.rightIndex = 0;
      config.lastGroup = group;
      saveConfig();
      buildRightItems();
      if (moveCenter) {
        state.activeColumn = "center";
        if (window.innerWidth <= 980) mobileTab = "center";
      }
      renderBrowser();
    }

    function bindAction(el, handler) {
      el.on("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        handler();
      });
    }

    function appendChannelRow(container, channel, subtitle) {
      var row = $('<div class="iptv-row"></div>');
      var logo = resolveLogo(channel);
      row.append(logo ? $('<img class="iptv-logo" alt="">').attr("src", logo) : $('<div class="iptv-logo"></div>'));
      var text = $('<div class="iptv-row-text"></div>');
      text.append($('<div class="iptv-row-title"></div>').text(channel.name || "Без названия"));
      if (subtitle) text.append($('<div class="iptv-row-sub"></div>').text(subtitle));
      row.append(text);
      if (isFavorite(channel)) row.append($('<div style="color:#ffd966">★</div>'));
      container.append(row);
    }

    function renderLeft() {
      var pl = currentPlaylist();
      leftCol.empty();
      leftCol.append($('<div class="iptv-head"></div>').text(pl ? pl.name : "IPTV"));
      leftCol.append($('<div class="iptv-sub"></div>').text("Действия и группы"));
      state.leftItems.forEach(function (item, idx) {
        var row = $('<div class="iptv-item"></div>').text(item.type === "group" ? item.title + " (" + item.count + ")" : item.title);
        bindAction(row, function () {
          state.leftIndex = idx;
          state.activeColumn = "left";
          if (item.type === "action") {
            if (item.action === "add") openInput("add", "Введите URL плейлиста", "http://");
            if (item.action === "search") openInput("search", "Поиск канала", "");
            if (item.action === "playlists") openPlaylists();
          } else selectGroup(item.group, true);
        });
        leftCol.append(row);
      });
    }

    function renderCenter() {
      centerCol.empty();
      var activeGroup = config.lastGroup === "STAR_FAVORITES" ? "⭐ Избранное" : config.lastGroup;
      centerCol.append($('<div class="iptv-head"></div>').text(activeGroup || "Каналы"));
      if (!state.currentChannels.length) {
        centerCol.append($('<div class="iptv-empty"></div>').text("Список пуст"));
        return;
      }
      state.currentChannels.forEach(function (ch, idx) {
        var epgPair = findEpg(ch);
        var subtitle = epgPair && epgPair[0] ? formatTime(epgPair[0].start) + " " + epgPair[0].title : "EPG: нет данных";
        var row = $('<div class="iptv-item"></div>');
        appendChannelRow(row, ch, subtitle);
        bindAction(row, function () {
          state.centerIndex = idx;
          state.activeColumn = "center";
          renderRight();
          if (window.innerWidth <= 980) mobileTab = "right";
          renderTabs();
          applyMobileVisibility();
          updateFocus();
        });
        centerCol.append(row);
      });
    }

    function playSelectedChannel() {
      var ch = selectedChannel();
      if (!ch || !ch.url) return notify("Канал не выбран");
      try {
        Lampa.Player.play({ title: ch.name, url: ch.url });
      } catch (e1) {
        try {
          Lampa.Player.play(ch.url);
        } catch (e2) {
          log("play", e2);
          notify("Ошибка запуска плеера");
        }
      }
    }

    function removeCurrentPlaylist() {
      var pl = currentPlaylist();
      if (!pl) return;
      if (pl.locked) return notify("Этот плейлист нельзя удалить");
      config.playlists.splice(config.currentPlaylist, 1);
      if (config.currentPlaylist >= config.playlists.length) config.currentPlaylist = config.playlists.length - 1;
      if (config.currentPlaylist < 0) config.currentPlaylist = 0;
      saveConfig();
      loadPlaylist();
    }

    function renderRight() {
      rightCol.empty();
      rightCol.append($('<div class="iptv-head"></div>').text("Инфо"));
      var ch = selectedChannel();
      if (!ch) {
        rightCol.append($('<div class="iptv-empty"></div>').text("Выберите канал"));
        return;
      }
      var ep = findEpg(ch);
      var logo = resolveLogo(ch);
      if (logo) rightCol.append($('<img class="iptv-logo iptv-logo--big" alt="">').attr("src", logo));
      rightCol.append($('<div class="iptv-title"></div>').text(ch.name || "Без названия"));
      rightCol.append($('<div class="iptv-meta"></div>').text("Группа: " + (ch.group || "ОБЩИЕ")));
      rightCol.append($('<div class="iptv-meta"></div>').text(state.epgStatus));
      if (epg.url) rightCol.append($('<div class="iptv-meta"></div>').text("Источник: " + epg.url));
      var epgBox = $('<div class="iptv-epg"></div>');
      if (ep && ep.length) {
        epgBox.append(
          $('<div class="iptv-epg-line"></div>').append(
            $('<span class="iptv-epg-label"></span>').text("Сейчас"),
            document.createTextNode(formatTime(ep[0].start) + " " + ep[0].title)
          )
        );
        if (ep[1]) {
          epgBox.append(
            $('<div class="iptv-epg-line"></div>').append(
              $('<span class="iptv-epg-label"></span>').text("Далее"),
              document.createTextNode(formatTime(ep[1].start) + " " + ep[1].title)
            )
          );
        }
      } else epgBox.append($('<div class="iptv-epg-line"></div>').text("Телепрограмма не найдена"));
      rightCol.append(epgBox);
      rightCol.append($('<div class="iptv-url"></div>').text(ch.url));
      buildRightItems();
      state.rightItems.forEach(function (item, idx) {
        var row = $('<div class="iptv-item"></div>').text(item.title);
        bindAction(row, function () {
          state.rightIndex = idx;
          state.activeColumn = "right";
          if (item.action === "play") playSelectedChannel();
          if (item.action === "favorite") toggleFavorite(selectedChannel());
          if (item.action === "remove_playlist") removeCurrentPlaylist();
          updateFocus();
        });
        rightCol.append(row);
      });
    }

    function renderTabs() {
      if (!mobileTabs) return;
      mobileTabs.empty();
      [{ k: "left", t: "Группы" }, { k: "center", t: "Каналы" }, { k: "right", t: "Инфо" }].forEach(function (x) {
        var btn = $('<div class="iptv-tab"></div>').attr("data-tab", x.k).text(x.t);
        if (mobileTab === x.k) btn.addClass("active");
        bindAction(btn, function () {
          mobileTab = x.k;
          state.activeColumn = x.k;
          applyMobileVisibility();
          updateFocus();
        });
        mobileTabs.append(btn);
      });
    }

    function applyMobileVisibility() {
      var mobile = window.innerWidth <= 980;
      leftCol.removeClass("mobile-hidden");
      centerCol.removeClass("mobile-hidden");
      rightCol.removeClass("mobile-hidden");
      if (!mobile) return;
      leftCol.addClass("mobile-hidden");
      centerCol.addClass("mobile-hidden");
      rightCol.addClass("mobile-hidden");
      if (mobileTab === "left") leftCol.removeClass("mobile-hidden");
      if (mobileTab === "center") centerCol.removeClass("mobile-hidden");
      if (mobileTab === "right") rightCol.removeClass("mobile-hidden");
    }

    function ensureVisible(container, element) {
      if (!container || !container.length || !element || !element.length) return;
      var c = container[0];
      var e = element[0];
      var top = c.scrollTop;
      var h = c.clientHeight;
      var et = e.offsetTop;
      var eh = e.offsetHeight;
      if (et < top) c.scrollTop = et - 12;
      else if (et + eh > top + h) c.scrollTop = et + eh - h + 12;
    }

    function updateFocus() {
      if (!root) return;
      leftCol.find(".iptv-item").removeClass("active");
      centerCol.find(".iptv-item").removeClass("active");
      rightCol.find(".iptv-item").removeClass("active");
      overlay.find(".iptv-item").removeClass("active");
      if (view === "browser") {
        if (state.activeColumn === "left") ensureVisible(leftCol, leftCol.find(".iptv-item").eq(state.leftIndex).addClass("active"));
        if (state.activeColumn === "center") ensureVisible(centerCol, centerCol.find(".iptv-item").eq(state.centerIndex).addClass("active"));
        if (state.activeColumn === "right") ensureVisible(rightCol, rightCol.find(".iptv-item").eq(state.rightIndex).addClass("active"));
      } else if (view === "playlists") {
        ensureVisible(overlay.find(".iptv-overlay-left"), overlay.find(".iptv-overlay-left .iptv-item").eq(overlayIndex).addClass("active"));
      }
    }

    function renderBrowser() {
      renderTabs();
      renderLeft();
      renderCenter();
      renderRight();
      applyMobileVisibility();
      updateFocus();
    }

    function closeOverlay() {
      view = "browser";
      overlay.addClass("hidden").empty();
      updateFocus();
    }

    function openInput(mode, title, initialValue) {
      pendingInputAction = mode;
      overlay.empty().removeClass("hidden");
      view = "input";
      var left = $('<div class="iptv-overlay-left"></div>');
      var right = $('<div class="iptv-overlay-right"></div>');
      left.append($('<div class="iptv-head"></div>').text(title));
      right.append($('<div class="iptv-head"></div>').text(mode === "add" ? "Добавить плейлист" : "Поиск"));
      var input = $('<input class="iptv-input" />').val(initialValue || "");
      right.append(input);
      var ok = $('<div class="iptv-item"></div>').text("Готово");
      bindAction(ok, function () {
        var value = String(input.val() || "").trim();
        if (pendingInputAction === "add") {
          if (!/^https?:\/\//i.test(value)) return notify("Неверный URL");
          config.playlists.push({ name: "Плейлист " + (config.playlists.length + 1), url: value, locked: false, hidden: false });
          config.currentPlaylist = config.playlists.length - 1;
          saveConfig();
          closeOverlay();
          loadPlaylist();
        } else {
          state.currentChannels = state.channels.filter(function (ch) {
            return String(ch.name || "").toLowerCase().indexOf(value.toLowerCase()) >= 0;
          });
          state.centerIndex = 0;
          state.rightIndex = 0;
          state.activeColumn = "center";
          if (window.innerWidth <= 980) mobileTab = "center";
          closeOverlay();
          renderBrowser();
          if (!state.currentChannels.length) notify("Ничего не найдено");
        }
      });
      var cancel = $('<div class="iptv-item"></div>').text("Отмена");
      bindAction(cancel, closeOverlay);
      right.append(ok, cancel);
      overlay.append(left, right);
      setTimeout(function () {
        try {
          input.focus();
        } catch (e) {}
      }, 50);
    }

    function openPlaylists() {
      overlay.empty().removeClass("hidden");
      view = "playlists";
      playlistItems = config.playlists.map(function (pl, i) {
        return { index: i, title: (i === config.currentPlaylist ? "• " : "") + pl.name, subtitle: pl.url, locked: !!pl.locked, hidden: !!pl.hidden };
      });
      overlayIndex = config.currentPlaylist;
      var left = $('<div class="iptv-overlay-left"></div>');
      var right = $('<div class="iptv-overlay-right"></div>');
      left.append($('<div class="iptv-head"></div>').text("Плейлисты"));
      playlistItems.forEach(function (it, i) {
        var row = $('<div class="iptv-item"></div>').text((it.hidden ? "[Скрыт] " : "") + it.title);
        bindAction(row, function () {
          overlayIndex = i;
          if (!it.hidden) {
            config.currentPlaylist = it.index;
            saveConfig();
            closeOverlay();
            loadPlaylist();
          }
        });
        left.append(row);
      });
      var selected = playlistItems[overlayIndex];
      right.append($('<div class="iptv-head"></div>').text("Управление"));
      if (selected) {
        right.append($('<div class="iptv-title"></div>').text(selected.title));
        right.append($('<div class="iptv-url"></div>').text(selected.subtitle));
        var hideShow = $('<div class="iptv-item"></div>').text(selected.locked ? (selected.hidden ? "Показать" : "Скрыть") : "Удалить");
        bindAction(hideShow, function () {
          var pl = config.playlists[selected.index];
          if (!pl) return;
          if (pl.locked) pl.hidden = !pl.hidden;
          else config.playlists.splice(selected.index, 1);
          if (config.currentPlaylist >= config.playlists.length) config.currentPlaylist = Math.max(0, config.playlists.length - 1);
          saveConfig();
          openPlaylists();
          loadPlaylist();
        });
        right.append(hideShow);
      }
      var close = $('<div class="iptv-item"></div>').text("Закрыть");
      bindAction(close, closeOverlay);
      right.append(close);
      overlay.append(left, right);
      updateFocus();
    }

    function loadEpg() {
      var pl = currentPlaylist();
      if (!pl) return;
      var manual = config.epgOverrides[pl.url] || "";
      var url = manual || state.epgFromPlaylist || "";
      if (!url) return;
      requestText(
        url,
        25000,
        function (xml) {
          parseEpg(xml || "", url);
          renderCenter();
          renderRight();
          updateFocus();
        },
        function () {
          state.epgStatus = "EPG: ошибка загрузки";
          renderRight();
        }
      );
    }

    function loadPlaylist() {
      var pl = currentPlaylist();
      if (!pl) return;
      if (pl.hidden) {
        var firstVisible = config.playlists.findIndex(function (x) {
          return !x.hidden;
        });
        if (firstVisible >= 0) {
          config.currentPlaylist = firstVisible;
          saveConfig();
          pl = currentPlaylist();
        }
      }
      if (!pl || !pl.url) return notify("Плейлист не найден");
      resetEpg();
      requestText(
        pl.url,
        22000,
        function (text) {
          parsePlaylist(text || "");
          renderBrowser();
          loadEpg();
        },
        function (err) {
          log("loadPlaylist", err);
          parsePlaylist("");
          renderBrowser();
          notify("Ошибка загрузки плейлиста");
        }
      );
    }

    function exitPlugin() {
      try {
        Lampa.Controller.toggle("menu");
      } catch (e) {}
      try {
        Lampa.Activity.back();
      } catch (e2) {}
    }

    function addController() {
      if (controllerReady) return;
      try {
        Lampa.Controller.add(CONTROLLER_NAME, {
          up: function () {
            if (view === "browser") {
              if (state.activeColumn === "left" && state.leftIndex > 0) state.leftIndex--;
              if (state.activeColumn === "center" && state.centerIndex > 0) {
                state.centerIndex--;
                renderRight();
              }
              if (state.activeColumn === "right" && state.rightIndex > 0) state.rightIndex--;
              updateFocus();
            } else if (view === "playlists") {
              if (overlayIndex > 0) overlayIndex--;
              updateFocus();
            }
          },
          down: function () {
            if (view === "browser") {
              if (state.activeColumn === "left" && state.leftIndex < state.leftItems.length - 1) state.leftIndex++;
              if (state.activeColumn === "center" && state.centerIndex < state.currentChannels.length - 1) {
                state.centerIndex++;
                renderRight();
              }
              if (state.activeColumn === "right" && state.rightIndex < state.rightItems.length - 1) state.rightIndex++;
              updateFocus();
            } else if (view === "playlists") {
              if (overlayIndex < playlistItems.length - 1) overlayIndex++;
              updateFocus();
            }
          },
          left: function () {
            if (view !== "browser") return;
            if (state.activeColumn === "right") {
              state.activeColumn = "center";
              if (window.innerWidth <= 980) mobileTab = "center";
              applyMobileVisibility();
              return updateFocus();
            }
            if (state.activeColumn === "center") {
              state.activeColumn = "left";
              if (window.innerWidth <= 980) mobileTab = "left";
              applyMobileVisibility();
              return updateFocus();
            }
            exitPlugin();
          },
          right: function () {
            if (view !== "browser") return;
            if (state.activeColumn === "left") {
              var l = state.leftItems[state.leftIndex];
              if (l && l.type === "group") {
                state.activeColumn = "center";
                if (window.innerWidth <= 980) mobileTab = "center";
              }
              applyMobileVisibility();
              return updateFocus();
            }
            if (state.activeColumn === "center" && state.currentChannels.length) {
              state.activeColumn = "right";
              if (window.innerWidth <= 980) mobileTab = "right";
              applyMobileVisibility();
              return updateFocus();
            }
          },
          enter: function () {
            if (view === "browser") {
              if (state.activeColumn === "left") {
                var item = state.leftItems[state.leftIndex];
                if (!item) return;
                if (item.type === "action") {
                  if (item.action === "add") openInput("add", "Введите URL плейлиста", "http://");
                  if (item.action === "search") openInput("search", "Поиск канала", "");
                  if (item.action === "playlists") openPlaylists();
                } else selectGroup(item.group, true);
              } else if (state.activeColumn === "center") {
                if (state.currentChannels.length) {
                  state.activeColumn = "right";
                  if (window.innerWidth <= 980) mobileTab = "right";
                  applyMobileVisibility();
                }
              } else if (state.activeColumn === "right") {
                var r = state.rightItems[state.rightIndex];
                if (!r) return;
                if (r.action === "play") playSelectedChannel();
                if (r.action === "favorite") toggleFavorite(selectedChannel());
                if (r.action === "remove_playlist") removeCurrentPlaylist();
              }
              return updateFocus();
            }
            if (view === "playlists") {
              var pl = playlistItems[overlayIndex];
              if (!pl) return;
              if (!pl.hidden) {
                config.currentPlaylist = pl.index;
                saveConfig();
                closeOverlay();
                loadPlaylist();
              }
            }
          },
          back: function () {
            if (view !== "browser") return closeOverlay();
            if (state.activeColumn === "right") {
              state.activeColumn = "center";
              if (window.innerWidth <= 980) mobileTab = "center";
              applyMobileVisibility();
              return updateFocus();
            }
            if (state.activeColumn === "center") {
              state.activeColumn = "left";
              if (window.innerWidth <= 980) mobileTab = "left";
              applyMobileVisibility();
              return updateFocus();
            }
            exitPlugin();
          },
          menu: function () {
            if (view === "playlists") {
              var p = playlistItems[overlayIndex];
              if (!p) return;
              var actual = config.playlists[p.index];
              if (!actual) return;
              if (actual.locked) actual.hidden = !actual.hidden;
              else if (config.playlists.length > 1) config.playlists.splice(p.index, 1);
              saveConfig();
              openPlaylists();
              loadPlaylist();
            } else {
              var ch = selectedChannel();
              if (ch) toggleFavorite(ch);
            }
          }
        });
        controllerReady = true;
      } catch (e) {
        log("Controller.add", e);
      }
    }

    function activateController() {
      try {
        Lampa.Controller.toggle(CONTROLLER_NAME);
      } catch (e) {}
    }

    this.create = function () {
      requester = createRequester();
      ensureStyles();
      root = $('<div class="iptv-root"></div>');
      mobileTabs = $('<div class="iptv-tabs"></div>');
      layout = $('<div class="iptv-layout"></div>');
      overlay = $('<div class="iptv-overlay hidden"></div>');
      leftCol = $('<div class="iptv-col iptv-left"></div>');
      centerCol = $('<div class="iptv-col iptv-center"></div>');
      rightCol = $('<div class="iptv-col iptv-right"></div>');
      layout.append(leftCol, centerCol, rightCol);
      root.append(mobileTabs, layout, overlay);
      state.activeColumn = "left";
      rebuildGroups();
      buildLeftItems();
      syncGroupSelection();
      renderBrowser();
      loadPlaylist();
      $(window).on("resize.iptv_universal_artrax", function () {
        applyMobileVisibility();
        updateFocus();
      });
      return root;
    };

    this.start = function () {
      addController();
      activateController();
      applyMobileVisibility();
      updateFocus();
    };

    this.pause = function () {};
    this.stop = function () {};
    this.render = function () {
      return root;
    };

    this.destroy = function () {
      try {
        if (requester && requester.clear) requester.clear();
      } catch (e0) {}
      try {
        Lampa.Controller.remove(CONTROLLER_NAME);
      } catch (e1) {}
      try {
        $(window).off("resize.iptv_universal_artrax");
      } catch (e2) {}
      controllerReady = false;
      if (root) root.remove();
    };
  }

  function pluginMenuIcon() {
    return $(
      '<div class="menu__ico">' +
        '<svg viewBox="0 0 24 24" style="width:1.45rem;height:1.45rem;display:block;fill:none;stroke:#fff;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;margin:auto;">' +
          '<rect x="4" y="6" width="16" height="11" rx="2"></rect>' +
          '<path d="M9 20h6"></path>' +
          '<path d="M12 17v3"></path>' +
          '<path d="M8 8.5h8"></path>' +
        "</svg>" +
      "</div>"
    );
  }

  function openPlugin() {
    try {
      Lampa.Activity.push({
        title: "IPTV",
        component: COMPONENT_NAME
      });
    } catch (err) {
      log("open activity", err);
    }
  }

  function ensureMenuItem() {
    try {
      if (!window.$) return false;
      var list = $('.menu .menu__list');
      if (!list.length && Lampa.Menu && typeof Lampa.Menu.render === "function") list = Lampa.Menu.render();
      if (!list || !list.length) return false;
      if (list.find('.iptv-universal-item').length) return true;

      var item = $('<li class="menu__item selector iptv-universal-item" data-action="iptv"></li>');
      item.append(pluginMenuIcon());
      item.append($('<div class="menu__text"></div>').text("IPTV"));
      item.on("hover:enter click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        openPlugin();
      });
      list.append(item);
      return true;
    } catch (e) {
      log("ensureMenuItem", e);
      return false;
    }
  }

  function ensureSettingsFallback() {
    try {
      if (!Lampa.SettingsApi || !Lampa.SettingsApi.addParam) return;
      Lampa.SettingsApi.addComponent({
        component: "iptv_component",
        name: "IPTV"
      });
      Lampa.SettingsApi.addParam({
        component: "iptv_component",
        param: { name: "Открыть IPTV", type: "button" },
        field: { name: "Открыть IPTV", description: "Запуск плагина IPTV" },
        onChange: function () {
          openPlugin();
        }
      });
    } catch (e) {
      log("ensureSettingsFallback", e);
    }
  }

  function init() {
    try {
      Lampa.Component.add(COMPONENT_NAME, IPTVUniversal);
      ensureSettingsFallback();
      ensureMenuItem();
      setTimeout(ensureMenuItem, 600);
      setTimeout(ensureMenuItem, 1600);
      setTimeout(ensureMenuItem, 3200);
    } catch (e) {
      log("init", e);
    }
  }

  if (window.appready || window.app_ready) init();
  else {
    Lampa.Listener.follow("app", function (e) {
      if (e.type === "ready" || e.type === "start") init();
      setTimeout(ensureMenuItem, 800);
      setTimeout(ensureMenuItem, 2500);
    });
  }
})();
