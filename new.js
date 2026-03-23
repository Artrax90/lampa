// ==Lampa==
// name: IPTV
// version: 6.0.0
// ==/Lampa==

(function () {
  "use strict";

  var PLUGIN_NAME = "IPTV";
  var COMPONENT_ID = "iptv_component_main";
  var CONTROLLER_ID = "iptv_controller_main";
  var STORAGE_KEY = "iptv_plugin_v600";
  var CSS_ID = "iptv_plugin_v600_css";

  var DEFAULT_PLAYLISTS = [
    { id: "d1", name: "Artrax Creator", url: "https://raw.githubusercontent.com/Artrax90/m3ucreator/main/pl.m3u", locked: true, hidden: false },
    { id: "d2", name: "LoganetTV Mega", url: "https://raw.githubusercontent.com/loganettv/playlists/refs/heads/main/mega.m3u", locked: true, hidden: false },
    { id: "d3", name: "RU IPTV Org", url: "https://iptv-org.github.io/iptv/countries/ru.m3u", locked: true, hidden: false },
    { id: "d4", name: "PRISMA", url: "https://gist.axenov.dev/PRISMA/f332731d327f41149cbfcecefeda4591/download/HEAD/PRISMA.m3u", locked: true, hidden: false }
  ];
  var EPG_FALLBACK_URLS = [
    "https://iptv-org.github.io/epg/guides/ru.xml",
    "https://iptvx.one/EPG_LITE",
    "https://iptvx.one/EPG",
    "https://iptvx.one/EPG_NOARCH"
  ];

  function log(tag, err) {
    try { console.error("[IPTV]", tag, err || ""); } catch (e) {}
  }
  function notify(text) {
    try { if (window.Lampa && Lampa.Noty && Lampa.Noty.show) Lampa.Noty.show(text); } catch (e) {}
  }
  function safe(s) { return s == null ? "" : String(s); }
  function normalize(s) { return safe(s).toLowerCase().replace(/\s+/g, " ").trim(); }
  function validHttp(url) { return /^https?:\/\//i.test(safe(url)); }
  function fmtTime(d) { return d ? (("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2)) : ""; }
  function decodeHtml(v) { return safe(v).replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">"); }
  function parseXmltvDate(value) {
    var m = safe(value).trim().match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+\-]\d{4})?/);
    if (!m) return null;
    var y = +m[1], mo = +m[2] - 1, d = +m[3], h = +m[4], mi = +m[5], s = +m[6], off = m[7];
    if (!off) return new Date(y, mo, d, h, mi, s);
    var sign = off[0] === "-" ? -1 : 1;
    var oh = +off.slice(1, 3), om = +off.slice(3, 5);
    return new Date(Date.UTC(y, mo, d, h, mi, s) - sign * (oh * 60 + om) * 60000);
  }

  function getRequester() {
    try { return window.Lampa && Lampa.Reguest ? new Lampa.Reguest() : null; } catch (e) { return null; }
  }
  function requestText(req, url, timeout, onOk, onErr) {
    var done = false;
    var tm = setTimeout(function () { if (!done) { done = true; onErr({ timeout: true }); } }, timeout || 25000);
    function ok(data) { if (done) return; done = true; clearTimeout(tm); onOk(typeof data === "string" ? data : safe(data)); }
    function err(e) { if (done) return; done = true; clearTimeout(tm); onErr(e || {}); }
    try {
      if (req && req.timeout) req.timeout(timeout || 25000);
      if (req && req.silent) return req.silent(url, ok, err, false, { dataType: "text" });
    } catch (e) {}
    $.ajax({ url: url, method: "GET", dataType: "text", timeout: timeout || 25000, success: ok, error: err });
  }

  var parserM3U = {
    attr: function (line, name) {
      var m = safe(line).match(new RegExp(name + '="([^"]*)"', "i"));
      return m ? decodeHtml(m[1].trim()) : "";
    },
    parse: function (text) {
      var lines = safe(text).split(/\r?\n/);
      var channels = [];
      var epgUrl = "";
      for (var i = 0; i < lines.length; i++) {
        var line = safe(lines[i]).trim();
        if (!line) continue;
        if (line.indexOf("#EXTM3U") === 0) epgUrl = this.attr(line, "url-tvg") || this.attr(line, "x-tvg-url") || epgUrl;
        if (line.indexOf("#EXTINF") === 0) {
          var name = ((line.match(/,(.*)$/) || ["", ""])[1] || "Без названия").trim();
          var group = this.attr(line, "group-title") || "ОБЩИЕ";
          var logo = this.attr(line, "tvg-logo");
          var id = this.attr(line, "tvg-id");
          var epgName = this.attr(line, "tvg-name");
          var url = "";
          for (var j = i + 1; j < lines.length; j++) {
            url = safe(lines[j]).trim();
            if (!url || url[0] === "#") continue;
            break;
          }
          if (validHttp(url)) channels.push({ name: name, url: url, group: group, logo: logo, id: id, epgName: epgName });
        }
      }
      return { channels: channels, epgUrl: epgUrl };
    }
  };

  var playlistManager = {
    defaults: function () { return DEFAULT_PLAYLISTS.map(function (p) { return $.extend({}, p); }); },
    load: function () {
      var def = { playlists: this.defaults(), currentPlaylist: 0, favorites: [], epgOverrides: {}, lastGroup: "STAR_FAVORITES" };
      var cfg = def;
      try { cfg = Lampa.Storage.get(STORAGE_KEY, def) || def; } catch (e) {}
      if (!Array.isArray(cfg.playlists)) cfg.playlists = def.playlists;
      if (!Array.isArray(cfg.favorites)) cfg.favorites = [];
      if (!cfg.epgOverrides || typeof cfg.epgOverrides !== "object") cfg.epgOverrides = {};
      if (typeof cfg.currentPlaylist !== "number") cfg.currentPlaylist = 0;
      if (typeof cfg.lastGroup !== "string") cfg.lastGroup = "STAR_FAVORITES";
      def.playlists.forEach(function (d) {
        var found = cfg.playlists.some(function (p) { return p && p.url === d.url; });
        if (!found) cfg.playlists.push($.extend({}, d));
      });
      if (cfg.currentPlaylist >= cfg.playlists.length) cfg.currentPlaylist = 0;
      return cfg;
    },
    save: function (cfg) { try { Lampa.Storage.set(STORAGE_KEY, cfg); } catch (e) { log("save storage", e); } },
    getCurrent: function (cfg) {
      var p = cfg.playlists[cfg.currentPlaylist];
      if (p && !p.hidden) return p;
      var i = cfg.playlists.findIndex(function (x) { return !x.hidden; });
      if (i >= 0) { cfg.currentPlaylist = i; return cfg.playlists[i]; }
      return null;
    }
  };

  var favoritesManager = {
    has: function (cfg, ch) { return !!cfg.favorites.find(function (f) { return f && f.url === ch.url; }); },
    toggle: function (cfg, ch) {
      var idx = cfg.favorites.findIndex(function (f) { return f && f.url === ch.url; });
      if (idx >= 0) cfg.favorites.splice(idx, 1);
      else cfg.favorites.push({ name: ch.name, url: ch.url, group: ch.group, logo: ch.logo, id: ch.id, epgName: ch.epgName });
      return idx < 0;
    }
  };

  var epgManager = {
    reset: function (state) {
      state.epg = { url: "", programsById: {}, namesMap: {}, iconById: {}, iconByName: {} };
      state.epgStatus = "EPG не загружен";
    },
    parseXml: function (state, xmlText, url) {
      try {
        var xml = new DOMParser().parseFromString(xmlText, "text/xml");
        if (xml.getElementsByTagName("parsererror").length) return false;
        var epg = state.epg;
        epg.url = url;
        var channels = xml.getElementsByTagName("channel");
        var programmes = xml.getElementsByTagName("programme");
        for (var i = 0; i < channels.length; i++) {
          var c = channels[i], id = c.getAttribute("id") || "", names = c.getElementsByTagName("display-name");
          var iconNode = c.getElementsByTagName("icon")[0];
          var icon = iconNode ? safe(iconNode.getAttribute("src")).trim() : "";
          if (id && icon) epg.iconById[id] = icon;
          for (var n = 0; n < names.length; n++) {
            var k = normalize(names[n].textContent);
            if (k && !epg.namesMap[k]) epg.namesMap[k] = id;
            if (k && icon && !epg.iconByName[k]) epg.iconByName[k] = icon;
          }
        }
        var now = Date.now(), total = 0;
        for (var p = 0; p < programmes.length; p++) {
          var pr = programmes[p], cid = pr.getAttribute("channel") || "";
          var st = parseXmltvDate(pr.getAttribute("start") || ""), en = parseXmltvDate(pr.getAttribute("stop") || "");
          var titleNode = pr.getElementsByTagName("title")[0], title = titleNode ? safe(titleNode.textContent).trim() : "";
          if (!cid || !st || !en || !title || en.getTime() < now) continue;
          if (!epg.programsById[cid]) epg.programsById[cid] = [];
          epg.programsById[cid].push({ start: st, stop: en, title: title });
          total++;
        }
        Object.keys(epg.programsById).forEach(function (id) {
          epg.programsById[id].sort(function (a, b) { return a.start - b.start; });
          if (epg.programsById[id].length > 10) epg.programsById[id] = epg.programsById[id].slice(0, 10);
        });
        state.epgStatus = total ? "EPG загружен" : "EPG пустой";
        return total > 0;
      } catch (e) { log("parse epg", e); return false; }
    },
    findForChannel: function (state, ch) {
      if (!ch) return null;
      var epg = state.epg;
      var ids = [ch.id, epg.namesMap[normalize(ch.epgName)], epg.namesMap[normalize(ch.name)]];
      var arr = null;
      for (var i = 0; i < ids.length; i++) if (ids[i] && epg.programsById[ids[i]]) { arr = epg.programsById[ids[i]]; break; }
      if (!arr || !arr.length) return null;
      var now = Date.now();
      for (var n = 0; n < arr.length; n++) {
        if (now >= arr[n].start.getTime() && now < arr[n].stop.getTime()) return [arr[n], arr[n + 1]].filter(Boolean);
        if (now < arr[n].start.getTime()) return [arr[n], arr[n + 1]].filter(Boolean);
      }
      return [arr[arr.length - 1]];
    },
    logoFor: function (state, ch) {
      if (!ch) return "";
      if (ch.logo) return ch.logo;
      var epg = state.epg;
      if (ch.id && epg.iconById[ch.id]) return epg.iconById[ch.id];
      return epg.iconByName[normalize(ch.epgName || ch.name)] || "";
    }
  };

  var playerController = {
    play: function (ch) {
      if (!ch || !ch.url) return notify("Канал не выбран");
      try { return Lampa.Player.play({ title: ch.name, url: ch.url }); } catch (e1) {}
      try { return Lampa.Player.play(ch.url); } catch (e2) {}
      try { return Lampa.Player.open(ch.url); } catch (e3) {}
      notify("Ошибка запуска плеера");
    }
  };

  var uiRenderer = {
    ensureStyles: function () {
      if (document.getElementById(CSS_ID)) return;
      var css = ""
        + ".iptv6-root{position:fixed;inset:0;z-index:1000;background:linear-gradient(180deg,#0b1020,#090d18);color:#eef3ff;padding-top:4.6rem;overflow:hidden;box-sizing:border-box;}"
        + ".iptv6-root *{box-sizing:border-box}"
        + ".iptv6-grid{display:grid;grid-template-columns:16rem minmax(0,1fr) 19rem;height:100%;width:100%;min-width:0;}"
        + ".iptv6-col{overflow:auto;overflow-x:hidden;min-width:0;border-right:1px solid rgba(125,147,195,.18);background:rgba(12,18,34,.55);backdrop-filter:blur(2px);}"
        + ".iptv6-col:last-child{border-right:none;background:rgba(8,13,26,.85);}"
        + ".iptv6-head{padding:.9rem 1rem;font-weight:700;position:sticky;top:0;background:rgba(12,18,34,.92);border-bottom:1px solid rgba(125,147,195,.2);z-index:2;}"
        + ".iptv6-item{margin:.45rem .6rem;padding:.8rem .85rem;border-radius:.75rem;background:rgba(35,52,90,.4);cursor:pointer;}"
        + ".iptv6-item:hover{background:rgba(49,75,130,.45)}"
        + ".iptv6-item.active{background:#3b69d8!important;color:#fff;}"
        + ".iptv6-row{display:flex;align-items:center;gap:.7rem;min-width:0;}"
        + ".iptv6-logo{width:2rem;height:2rem;object-fit:contain;border-radius:.45rem;background:rgba(255,255,255,.07);flex:0 0 2rem;}"
        + ".iptv6-name{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"
        + ".iptv6-sub{font-size:.8rem;opacity:.7;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}"
        + ".iptv6-cta{background:#456de0;}"
        + ".iptv6-meta{padding:0 1rem .5rem 1rem;opacity:.82;word-break:break-word;}"
        + ".iptv6-url{padding:0 1rem 1rem 1rem;opacity:.6;font-size:.82rem;word-break:break-all;}"
        + ".iptv6-tabs{display:none;gap:.5rem;padding:.7rem;border-bottom:1px solid rgba(125,147,195,.2);}"
        + ".iptv6-tab{flex:1;text-align:center;padding:.6rem;border-radius:.65rem;background:rgba(35,52,90,.4)}"
        + ".iptv6-tab.active{background:#3b69d8}"
        + ".iptv6-hidden{display:none!important}"
        + ".iptv6-overlay{position:absolute;inset:4.6rem 0 0 0;background:rgba(4,8,18,.97);display:grid;grid-template-columns:20rem minmax(0,1fr);z-index:5;overflow:hidden;}"
        + ".iptv6-overlay.hidden{display:none}"
        + ".iptv6-input{margin:.7rem;width:calc(100% - 1.4rem);padding:.75rem;border:1px solid rgba(125,147,195,.35);border-radius:.6rem;background:#111a32;color:#fff;}"
        + ".iptv6-kgrid{display:grid;grid-template-columns:repeat(10,minmax(0,1fr));gap:.45rem;padding:.7rem;}"
        + ".iptv6-kcell{margin:0;padding:.65rem;text-align:center}"
        + ".iptv6-kactions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.45rem;padding:.7rem;padding-top:0}"
        + "@media (max-width:980px){.iptv6-root{padding-top:4rem}.iptv6-tabs{display:flex}.iptv6-grid{display:block}.iptv6-col{height:auto;border-right:none;border-bottom:1px solid rgba(125,147,195,.18)}.iptv6-col.mobile-hide{display:none}.iptv6-overlay{grid-template-columns:1fr;inset:4rem 0 0 0}}";
      var st = document.createElement("style");
      st.id = CSS_ID;
      st.textContent = css;
      document.head.appendChild(st);
    },
    channelRow: function (state, ch, subtitle) {
      var wrap = $('<div class="iptv6-row"></div>');
      var logo = epgManager.logoFor(state, ch);
      wrap.append(logo ? $('<img class="iptv6-logo" alt="">').attr("src", logo) : $('<div class="iptv6-logo"></div>'));
      var text = $('<div style="min-width:0;flex:1"></div>');
      text.append($('<div class="iptv6-name"></div>').text(ch.name || "Без названия"));
      if (subtitle) text.append($('<div class="iptv6-sub"></div>').text(subtitle));
      wrap.append(text);
      return wrap;
    }
  };

  function IPTVComponent() {
    var requester = getRequester();
    var config = playlistManager.load();
    var root, leftCol, centerCol, rightCol, tabs, overlay, ovLeft, ovRight;
    var state = {
      channels: [],
      groups: {},
      currentChannels: [],
      leftItems: [],
      rightItems: [],
      activeColumn: "left",
      leftIndex: 0,
      centerIndex: 0,
      rightIndex: 0,
      mobileTab: "left",
      epgFromPlaylist: "",
      epgStatus: "EPG не загружен",
      epgProgress: "",
      epg: {}
    };
    var view = "browser";
    var overlayItems = [];
    var overlayIndex = 0;
    var keyboardLang = "en";
    var keyboardValue = "";
    var keyboardMode = "search";
    var keyboardTitle = "";
    var keyIndex = 0;
    var controllerReady = false;
    var KEYBOARDS = {
      en: ["q","w","e","r","t","y","u","i","o","p","a","s","d","f","g","h","j","k","l","@","z","x","c","v","b","n","m",".","/","-","0","1","2","3","4","5","6","7","8","9"],
      ru: ["й","ц","у","к","е","н","г","ш","щ","з","ф","ы","в","а","п","р","о","л","д","ж","я","ч","с","м","и","т","ь","б","ю","э","0","1","2","3","4","5","6","7","8","9"]
    };
    var KEY_ACTIONS = [
      { code: "space", title: "Пробел" },
      { code: "backspace", title: "Стереть" },
      { code: "lang", title: "EN/RU" },
      { code: "submit", title: "Готово" }
    ];

    function currentPlaylist() { return playlistManager.getCurrent(config); }
    function isMobile() { return window.innerWidth <= 980; }
    function save() { playlistManager.save(config); }
    function selectedChannel() {
      if (!state.currentChannels.length) return null;
      if (state.centerIndex < 0) state.centerIndex = 0;
      if (state.centerIndex >= state.currentChannels.length) state.centerIndex = state.currentChannels.length - 1;
      return state.currentChannels[state.centerIndex] || null;
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
    function buildLeft() {
      state.leftItems = [
        { type: "action", title: "Добавить плейлист", action: "add" },
        { type: "action", title: "Список плейлистов", action: "playlists" },
        { type: "action", title: "Поиск", action: "search" },
        { type: "action", title: "EPG URL", action: "epg_url" }
      ];
      Object.keys(state.groups).forEach(function (g) {
        state.leftItems.push({ type: "group", group: g, title: g === "STAR_FAVORITES" ? "Избранное" : g, count: (state.groups[g] || []).length });
      });
      if (state.leftIndex >= state.leftItems.length) state.leftIndex = 0;
    }
    function buildRight() {
      var ch = selectedChannel();
      if (!ch) return state.rightItems = [];
      state.rightItems = [
        { action: "play", title: "Смотреть" },
        { action: "favorite", title: favoritesManager.has(config, ch) ? "Убрать из избранного" : "Добавить в избранное" },
        { action: "epg_refresh", title: "Обновить EPG" },
        { action: "remove", title: "Удалить текущий плейлист" }
      ];
      if (state.rightIndex >= state.rightItems.length) state.rightIndex = 0;
    }
    function selectGroup(group, move) {
      config.lastGroup = group;
      save();
      state.currentChannels = (state.groups[group] || []).slice();
      state.centerIndex = 0;
      state.rightIndex = 0;
      buildRight();
      if (move) {
        state.activeColumn = "center";
        if (isMobile()) state.mobileTab = "center";
      }
      renderBrowser();
    }
    function syncGroup() {
      var idx = state.leftItems.findIndex(function (x) { return x.type === "group" && x.group === config.lastGroup; });
      if (idx < 0) idx = state.leftItems.findIndex(function (x) { return x.type === "group"; });
      state.leftIndex = Math.max(0, idx);
      var it = state.leftItems[state.leftIndex];
      selectGroup(it && it.group ? it.group : "STAR_FAVORITES", false);
    }

    function applyMobile() {
      var mobile = isMobile();
      leftCol.removeClass("mobile-hide"); centerCol.removeClass("mobile-hide"); rightCol.removeClass("mobile-hide");
      if (!mobile) return;
      leftCol.addClass("mobile-hide"); centerCol.addClass("mobile-hide"); rightCol.addClass("mobile-hide");
      if (state.mobileTab === "left") leftCol.removeClass("mobile-hide");
      if (state.mobileTab === "center") centerCol.removeClass("mobile-hide");
      if (state.mobileTab === "right") rightCol.removeClass("mobile-hide");
    }
    function ensureVisible(container, el) {
      if (!container || !container.length || !el || !el.length) return;
      var c = container[0], e = el[0], t = c.scrollTop, h = c.clientHeight, et = e.offsetTop, eh = e.offsetHeight;
      if (et < t) c.scrollTop = et - 12; else if (et + eh > t + h) c.scrollTop = et + eh - h + 12;
    }

    function updateFocus() {
      leftCol.find(".iptv6-item").removeClass("active");
      centerCol.find(".iptv6-item").removeClass("active");
      rightCol.find(".iptv6-item").removeClass("active");
      ovLeft.find(".iptv6-item").removeClass("active");
      tabs.find(".iptv6-tab").removeClass("active");
      if (isMobile()) tabs.find('.iptv6-tab[data-tab="' + state.mobileTab + '"]').addClass("active");
      if (view === "browser") {
        if (state.activeColumn === "left") ensureVisible(leftCol, leftCol.find(".iptv6-item").eq(state.leftIndex).addClass("active"));
        if (state.activeColumn === "center") ensureVisible(centerCol, centerCol.find(".iptv6-item").eq(state.centerIndex).addClass("active"));
        if (state.activeColumn === "right") ensureVisible(rightCol, rightCol.find(".iptv6-item").eq(state.rightIndex).addClass("active"));
      } else if (view === "playlists") {
        ensureVisible(ovLeft, ovLeft.find(".iptv6-item").eq(overlayIndex).addClass("active"));
      } else if (view === "input") {
        ovRight.find(".iptv6-kcell").removeClass("active");
        ovRight.find(".iptv6-kactions .iptv6-item").removeClass("active");
        if (keyIndex < keysList().length) ensureVisible(ovRight, ovRight.find(".iptv6-kcell").eq(keyIndex).addClass("active"));
        else ensureVisible(ovRight, ovRight.find(".iptv6-kactions .iptv6-item").eq(keyIndex - keysList().length).addClass("active"));
      }
    }

    function bindClick(el, fn) { el.on("click", function (e) { e.preventDefault(); e.stopPropagation(); fn(); }); }

    function renderTabs() {
      tabs.empty();
      [{ k: "left", t: "Группы" }, { k: "center", t: "Каналы" }, { k: "right", t: "Инфо" }].forEach(function (x) {
        var b = $('<div class="iptv6-tab"></div>').attr("data-tab", x.k).text(x.t);
        bindClick(b, function () { state.mobileTab = x.k; state.activeColumn = x.k; applyMobile(); updateFocus(); });
        tabs.append(b);
      });
    }

    function renderLeftColumn() {
      leftCol.empty();
      leftCol.append($('<div class="iptv6-head"></div>').text((currentPlaylist() || {}).name || PLUGIN_NAME));
      state.leftItems.forEach(function (it, idx) {
        var label = it.type === "group" ? (it.title + " (" + it.count + ")") : it.title;
        var row = $('<div class="iptv6-item"></div>').text(label);
        bindClick(row, function () {
          state.leftIndex = idx; state.activeColumn = "left";
          if (it.type === "action") {
            if (it.action === "add") openInput("add", "Введите URL M3U", "http://");
            if (it.action === "search") openInput("search", "Поиск канала", "");
            if (it.action === "playlists") openPlaylists();
            if (it.action === "epg_url") {
              var pl = currentPlaylist();
              openInput("epg", "Введите EPG URL", pl ? (config.epgOverrides[pl.url] || state.epgFromPlaylist || "") : "");
            }
          } else selectGroup(it.group, true);
        });
        leftCol.append(row);
      });
    }
    function renderCenterColumn() {
      centerCol.empty();
      var title = config.lastGroup === "STAR_FAVORITES" ? "Избранное" : config.lastGroup;
      centerCol.append($('<div class="iptv6-head"></div>').text((title || "Каналы") + " · " + state.epgStatus));
      if (!state.currentChannels.length) return centerCol.append($('<div class="iptv6-meta"></div>').text("Список пуст"));
      state.currentChannels.forEach(function (ch, idx) {
        var ep = epgManager.findForChannel(state, ch);
        var sub = ep && ep[0] ? (fmtTime(ep[0].start) + " " + ep[0].title) : "EPG: нет данных";
        var row = $('<div class="iptv6-item"></div>').append(uiRenderer.channelRow(state, ch, sub));
        bindClick(row, function () {
          state.centerIndex = idx; state.activeColumn = "center";
          renderRightColumn();
          if (isMobile()) state.mobileTab = "right";
          renderTabs(); applyMobile(); updateFocus();
        });
        centerCol.append(row);
      });
    }
    function renderRightColumn() {
      rightCol.empty();
      rightCol.append($('<div class="iptv6-head"></div>').text("Инфо"));
      var ch = selectedChannel();
      if (!ch) return rightCol.append($('<div class="iptv6-meta"></div>').text("Выберите канал"));
      var logo = epgManager.logoFor(state, ch);
      if (logo) rightCol.append($('<img class="iptv6-logo" style="width:4.2rem;height:4.2rem;margin:.7rem 1rem" alt="">').attr("src", logo));
      rightCol.append($('<div class="iptv6-meta" style="font-size:1.1rem;font-weight:700"></div>').text(ch.name || "Без названия"));
      rightCol.append($('<div class="iptv6-meta"></div>').text("Группа: " + (ch.group || "ОБЩИЕ")));
      rightCol.append($('<div class="iptv6-meta"></div>').text(state.epgStatus));
      rightCol.append($('<div class="iptv6-meta"></div>').text(state.epgProgress || ""));
      var ep = epgManager.findForChannel(state, ch);
      if (ep && ep[0]) rightCol.append($('<div class="iptv6-meta"></div>').text("Сейчас: " + fmtTime(ep[0].start) + " " + ep[0].title));
      if (ep && ep[1]) rightCol.append($('<div class="iptv6-meta"></div>').text("Далее: " + fmtTime(ep[1].start) + " " + ep[1].title));
      rightCol.append($('<div class="iptv6-url"></div>').text(ch.url));
      buildRight();
      state.rightItems.forEach(function (it, idx) {
        var row = $('<div class="iptv6-item"></div>').text(it.title);
        if (it.action === "play") row.addClass("iptv6-cta");
        bindClick(row, function () {
          state.rightIndex = idx; state.activeColumn = "right";
          if (it.action === "play") playerController.play(selectedChannel());
          if (it.action === "favorite") {
            var add = favoritesManager.toggle(config, selectedChannel());
            save(); notify(add ? "Добавлено в избранное" : "Удалено из избранного");
            rebuildGroups(); buildLeft(); syncGroup();
          }
          if (it.action === "epg_refresh") loadEpg(true);
          if (it.action === "remove") {
            var pl = currentPlaylist();
            if (!pl) return;
            if (pl.locked) return notify("Default-плейлист нельзя удалить");
            config.playlists.splice(config.currentPlaylist, 1);
            if (config.currentPlaylist >= config.playlists.length) config.currentPlaylist = Math.max(0, config.playlists.length - 1);
            save(); loadPlaylist();
          }
          updateFocus();
        });
        rightCol.append(row);
      });
    }
    function renderBrowser() { renderTabs(); renderLeftColumn(); renderCenterColumn(); renderRightColumn(); applyMobile(); updateFocus(); }

    function openPlaylists() {
      view = "playlists"; overlay.removeClass("hidden"); ovLeft.empty(); ovRight.empty();
      ovLeft.append($('<div class="iptv6-head"></div>').text("Плейлисты"));
      overlayItems = config.playlists.map(function (p, i) { return { index: i, title: p.name, subtitle: p.url, locked: !!p.locked, hidden: !!p.hidden }; });
      overlayIndex = Math.max(0, config.currentPlaylist);
      overlayItems.forEach(function (it, idx) {
        var row = $('<div class="iptv6-item"></div>').text((it.hidden ? "[Скрыт] " : "") + (idx === config.currentPlaylist ? "• " : "") + it.title);
        bindClick(row, function () { overlayIndex = idx; if (!it.hidden) { config.currentPlaylist = it.index; save(); closeOverlay(); loadPlaylist(); } });
        ovLeft.append(row);
      });
      var sel = overlayItems[overlayIndex];
      ovRight.append($('<div class="iptv6-head"></div>').text("Управление"));
      if (sel) {
        ovRight.append($('<div class="iptv6-meta" style="font-size:1.1rem;font-weight:700"></div>').text(sel.title));
        ovRight.append($('<div class="iptv6-url"></div>').text(sel.subtitle));
        var action = $('<div class="iptv6-item"></div>').text(sel.locked ? (sel.hidden ? "Показать" : "Скрыть") : "Удалить");
        bindClick(action, function () {
          var p = config.playlists[sel.index];
          if (!p) return;
          if (p.locked) p.hidden = !p.hidden; else config.playlists.splice(sel.index, 1);
          if (config.currentPlaylist >= config.playlists.length) config.currentPlaylist = Math.max(0, config.playlists.length - 1);
          save(); openPlaylists(); loadPlaylist();
        });
        ovRight.append(action);
      }
      var closeBtn = $('<div class="iptv6-item"></div>').text("Закрыть");
      bindClick(closeBtn, closeOverlay);
      ovRight.append(closeBtn);
      updateFocus();
    }

    function openInput(mode, title, startValue) {
      view = "input"; overlay.removeClass("hidden"); ovLeft.empty(); ovRight.empty();
      keyboardMode = mode;
      keyboardTitle = title;
      keyboardValue = startValue || "";
      keyboardLang = mode === "search" ? "ru" : "en";
      keyIndex = 0;
      renderKeyboardOverlay();
    }
    function keysList() { return KEYBOARDS[keyboardLang]; }
    function totalKeys() { return keysList().length + KEY_ACTIONS.length; }
    function submitKeyboard() {
      var v = safe(keyboardValue).trim();
      if (keyboardMode === "add") {
        if (!validHttp(v)) return notify("Некорректный URL");
        config.playlists.push({ id: "u_" + Date.now(), name: "Плейлист " + (config.playlists.length + 1), url: v, locked: false, hidden: false });
        config.currentPlaylist = config.playlists.length - 1;
        save(); closeOverlay(); loadPlaylist();
        return;
      }
      if (keyboardMode === "epg") {
        var pl = currentPlaylist();
        if (!pl) return notify("Плейлист не выбран");
        if (v && !validHttp(v)) return notify("Некорректный EPG URL");
        if (v) config.epgOverrides[pl.url] = v; else delete config.epgOverrides[pl.url];
        save();
        closeOverlay();
        loadEpg(true);
        return;
      }
      state.currentChannels = state.channels.filter(function (ch) { return normalize(ch.name).indexOf(normalize(v)) >= 0; });
      state.centerIndex = 0; state.rightIndex = 0; state.activeColumn = "center";
      if (isMobile()) state.mobileTab = "center";
      closeOverlay(); renderBrowser();
      if (!state.currentChannels.length) notify("Ничего не найдено");
    }
    function applyKey(code, char) {
      if (code === "char") keyboardValue += char;
      else if (code === "space") keyboardValue += " ";
      else if (code === "backspace") keyboardValue = keyboardValue.slice(0, -1);
      else if (code === "lang") keyboardLang = keyboardLang === "en" ? "ru" : "en";
      else if (code === "submit") return submitKeyboard();
      renderKeyboardOverlay();
    }
    function renderKeyboardOverlay() {
      ovLeft.empty(); ovRight.empty();
      ovLeft.append($('<div class="iptv6-head"></div>').text(keyboardTitle));
      ovLeft.append($('<div class="iptv6-meta"></div>').text("Экранная клавиатура"));
      ovRight.append($('<div class="iptv6-head"></div>').text((keyboardMode === "add" ? "Новый плейлист" : keyboardMode === "epg" ? "EPG URL" : "Поиск") + " · " + keyboardLang.toUpperCase()));
      var nativeInput = $('<input class="iptv6-input" />').val(keyboardValue || "");
      nativeInput.attr("placeholder", "Введите или вставьте текст");
      nativeInput.on("input", function () {
        keyboardValue = safe(nativeInput.val());
      });
      nativeInput.on("paste", function () {
        setTimeout(function () {
          keyboardValue = safe(nativeInput.val());
        }, 0);
      });
      ovRight.append(nativeInput);
      var grid = $('<div class="iptv6-kgrid"></div>');
      keysList().forEach(function (k, i) {
        var b = $('<div class="iptv6-item iptv6-kcell"></div>').text(k);
        bindClick(b, function () { keyIndex = i; applyKey("char", k); nativeInput.val(keyboardValue); });
        grid.append(b);
      });
      ovRight.append(grid);
      var actions = $('<div class="iptv6-kactions"></div>');
      KEY_ACTIONS.forEach(function (a, i) {
        var b = $('<div class="iptv6-item"></div>').text(a.title);
        bindClick(b, function () { keyIndex = keysList().length + i; applyKey(a.code); nativeInput.val(keyboardValue); });
        actions.append(b);
      });
      ovRight.append(actions);
      var close = $('<div class="iptv6-item"></div>').text("Отмена");
      bindClick(close, closeOverlay);
      ovRight.append(close);
      setTimeout(function () {
        try { nativeInput.focus(); } catch (e) {}
      }, 30);
      updateFocus();
    }
    function closeOverlay() { view = "browser"; overlay.addClass("hidden"); updateFocus(); }

    function loadEpg(force) {
      var pl = currentPlaylist();
      if (!pl) return;
      var seen = {};
      var candidates = [];
      function addCandidate(url) {
        var u = safe(url).trim();
        if (!validHttp(u) || seen[u]) return;
        seen[u] = true;
        candidates.push(u);
      }
      addCandidate(config.epgOverrides[pl.url] || "");
      addCandidate(state.epgFromPlaylist || "");
      EPG_FALLBACK_URLS.forEach(addCandidate);

      if (!candidates.length) {
        state.epgStatus = "EPG не задан";
        state.epgProgress = "Укажите EPG URL в левом меню";
        renderCenterColumn(); renderRightColumn(); updateFocus();
        return;
      }
      state.epgStatus = "EPG загружается...";
      state.epgProgress = "Поиск рабочего источника...";
      renderCenterColumn(); renderRightColumn(); updateFocus();
      function tryEpg(index) {
        if (index >= candidates.length) {
          state.epgStatus = "EPG недоступен";
          state.epgProgress = "Источник недоступен";
          renderCenterColumn(); renderRightColumn(); updateFocus();
          return;
        }
        var url = candidates[index];
        state.epgProgress = "Источник " + (index + 1) + "/" + candidates.length + ": " + url;
        renderCenterColumn(); renderRightColumn(); updateFocus();
        requestText(requester, url, 15000, function (xml) {
          var ok = epgManager.parseXml(state, xml || "", url);
          if (ok) {
            state.epgStatus = "EPG загружен";
            state.epgProgress = "Обновлено: " + new Date().toLocaleTimeString();
            renderCenterColumn(); renderRightColumn(); updateFocus();
          } else {
            tryEpg(index + 1);
          }
        }, function () {
          tryEpg(index + 1);
        });
      }
      tryEpg(0);
    }
    function loadPlaylist() {
      var pl = currentPlaylist();
      if (!pl || !validHttp(pl.url)) return notify("Нет доступного плейлиста");
      epgManager.reset(state);
      state.epgProgress = "";
      requestText(requester, pl.url, 22000, function (text) {
        var parsed = parserM3U.parse(text || "");
        state.channels = parsed.channels;
        state.epgFromPlaylist = parsed.epgUrl;
        rebuildGroups(); buildLeft(); syncGroup(); renderBrowser(); loadEpg();
      }, function (err) {
        log("playlist load", err);
        state.channels = []; rebuildGroups(); buildLeft(); syncGroup(); renderBrowser(); notify("Ошибка загрузки плейлиста");
      });
    }

    function exitPlugin() {
      try { Lampa.Controller.toggle("menu"); } catch (e) {}
      try { Lampa.Activity.back(); } catch (e2) {}
    }
    function addController() {
      if (controllerReady) return;
      try {
        Lampa.Controller.add(CONTROLLER_ID, {
          up: function () {
            if (view === "browser") {
              if (state.activeColumn === "left" && state.leftIndex > 0) state.leftIndex--;
              else if (state.activeColumn === "center" && state.centerIndex > 0) { state.centerIndex--; renderRightColumn(); }
              else if (state.activeColumn === "right" && state.rightIndex > 0) state.rightIndex--;
            } else if (view === "playlists") { if (overlayIndex > 0) overlayIndex--; }
            else if (view === "input") { if (keyIndex >= 10) keyIndex -= 10; }
            updateFocus();
          },
          down: function () {
            if (view === "browser") {
              if (state.activeColumn === "left" && state.leftIndex < state.leftItems.length - 1) state.leftIndex++;
              else if (state.activeColumn === "center" && state.centerIndex < state.currentChannels.length - 1) { state.centerIndex++; renderRightColumn(); }
              else if (state.activeColumn === "right" && state.rightIndex < state.rightItems.length - 1) state.rightIndex++;
            } else if (view === "playlists") { if (overlayIndex < overlayItems.length - 1) overlayIndex++; }
            else if (view === "input") { var nk = keyIndex + 10; if (nk < totalKeys()) keyIndex = nk; }
            updateFocus();
          },
          left: function () {
            if (view === "input") { if (keyIndex > 0) keyIndex--; return updateFocus(); }
            if (view !== "browser") return;
            if (state.activeColumn === "right") { state.activeColumn = "center"; if (isMobile()) state.mobileTab = "center"; }
            else if (state.activeColumn === "center") { state.activeColumn = "left"; if (isMobile()) state.mobileTab = "left"; }
            else exitPlugin();
            applyMobile(); updateFocus();
          },
          right: function () {
            if (view === "input") { if (keyIndex < totalKeys() - 1) keyIndex++; return updateFocus(); }
            if (view !== "browser") return;
            if (state.activeColumn === "left") { var it = state.leftItems[state.leftIndex]; if (it && it.type === "group") { state.activeColumn = "center"; if (isMobile()) state.mobileTab = "center"; } }
            else if (state.activeColumn === "center" && state.currentChannels.length) { state.activeColumn = "right"; if (isMobile()) state.mobileTab = "right"; }
            applyMobile(); updateFocus();
          },
          enter: function () {
            if (view === "browser") {
              if (state.activeColumn === "left") {
                var li = state.leftItems[state.leftIndex];
                if (!li) return;
                if (li.type === "group") selectGroup(li.group, true);
                else if (li.action === "add") openInput("add", "Введите URL M3U", "http://");
                else if (li.action === "search") openInput("search", "Поиск канала", "");
                else if (li.action === "playlists") openPlaylists();
                else if (li.action === "epg_url") {
                  var cpl = currentPlaylist();
                  openInput("epg", "Введите EPG URL", cpl ? (config.epgOverrides[cpl.url] || state.epgFromPlaylist || "") : "");
                }
              } else if (state.activeColumn === "center") {
                if (state.currentChannels.length) { state.activeColumn = "right"; if (isMobile()) state.mobileTab = "right"; applyMobile(); }
              } else if (state.activeColumn === "right") {
                var ri = state.rightItems[state.rightIndex]; if (!ri) return;
                if (ri.action === "play") playerController.play(selectedChannel());
                if (ri.action === "favorite") { var add = favoritesManager.toggle(config, selectedChannel()); save(); notify(add ? "Добавлено в избранное" : "Удалено из избранного"); rebuildGroups(); buildLeft(); syncGroup(); }
                if (ri.action === "epg_refresh") loadEpg(true);
                if (ri.action === "remove") { var p = currentPlaylist(); if (p && !p.locked) { config.playlists.splice(config.currentPlaylist, 1); if (config.currentPlaylist >= config.playlists.length) config.currentPlaylist = Math.max(0, config.playlists.length - 1); save(); loadPlaylist(); } else notify("Default-плейлист нельзя удалить"); }
              }
            } else if (view === "playlists") {
              var pl = overlayItems[overlayIndex];
              if (pl && !pl.hidden) { config.currentPlaylist = pl.index; save(); closeOverlay(); loadPlaylist(); }
            } else if (view === "input") {
              if (keyIndex < keysList().length) applyKey("char", keysList()[keyIndex]);
              else applyKey(KEY_ACTIONS[keyIndex - keysList().length].code);
            }
            updateFocus();
          },
          back: function () {
            if (view !== "browser") return closeOverlay();
            if (state.activeColumn === "right") { state.activeColumn = "center"; if (isMobile()) state.mobileTab = "center"; applyMobile(); return updateFocus(); }
            if (state.activeColumn === "center") { state.activeColumn = "left"; if (isMobile()) state.mobileTab = "left"; applyMobile(); return updateFocus(); }
            exitPlugin();
          },
          menu: function () {
            if (view === "playlists") {
              var sp = overlayItems[overlayIndex], cp = sp ? config.playlists[sp.index] : null;
              if (!cp) return;
              if (cp.locked) cp.hidden = !cp.hidden; else if (config.playlists.length > 1) config.playlists.splice(sp.index, 1);
              if (config.currentPlaylist >= config.playlists.length) config.currentPlaylist = Math.max(0, config.playlists.length - 1);
              save(); openPlaylists(); loadPlaylist();
            } else if (view === "input") {
              keyboardValue = keyboardValue.slice(0, -1);
              renderKeyboardOverlay();
            } else {
              var ch = selectedChannel();
              if (!ch) return;
              var added = favoritesManager.toggle(config, ch); save(); notify(added ? "Добавлено в избранное" : "Удалено из избранного");
              rebuildGroups(); buildLeft(); syncGroup();
            }
          }
        });
        controllerReady = true;
      } catch (e) { log("controller add", e); }
    }

    this.create = function () {
      uiRenderer.ensureStyles();
      root = $('<div class="iptv6-root"></div>');
      tabs = $('<div class="iptv6-tabs"></div>');
      var grid = $('<div class="iptv6-grid"></div>');
      leftCol = $('<div class="iptv6-col"></div>');
      centerCol = $('<div class="iptv6-col"></div>');
      rightCol = $('<div class="iptv6-col"></div>');
      overlay = $('<div class="iptv6-overlay hidden"></div>');
      ovLeft = $('<div class="iptv6-col"></div>');
      ovRight = $('<div class="iptv6-col"></div>');
      overlay.append(ovLeft, ovRight);
      grid.append(leftCol, centerCol, rightCol);
      root.append(tabs, grid, overlay);
      rebuildGroups(); buildLeft(); syncGroup(); renderBrowser(); loadPlaylist();
      $(window).on("resize.iptv_v600", function () { applyMobile(); updateFocus(); });
      return root;
    };
    this.start = function () { addController(); try { Lampa.Controller.toggle(CONTROLLER_ID); } catch (e) {} applyMobile(); updateFocus(); };
    this.pause = function () {};
    this.stop = function () {};
    this.render = function () { return root; };
    this.destroy = function () {
      try { if (requester && requester.clear) requester.clear(); } catch (e0) {}
      try { Lampa.Controller.remove(CONTROLLER_ID); } catch (e1) {}
      try { $(window).off("resize.iptv_v600"); } catch (e2) {}
      controllerReady = false;
      if (root) root.remove();
    };
  }

  function menuIcon() {
    return $('<div class="menu__ico"><svg viewBox="0 0 24 24" style="width:1.45rem;height:1.45rem;display:block;fill:none;stroke:#fff;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;margin:auto"><rect x="4" y="6" width="16" height="11" rx="2"></rect><path d="M9 20h6"></path><path d="M12 17v3"></path><path d="M8 8.5h8"></path></svg></div>');
  }
  function openPlugin() {
    try { Lampa.Activity.push({ title: PLUGIN_NAME, component: COMPONENT_ID }); } catch (e) { log("open", e); }
  }
  function ensureMenuItem() {
    try {
      var list = $('.menu .menu__list');
      if ((!list || !list.length) && Lampa.Menu && Lampa.Menu.render) list = Lampa.Menu.render();
      if (!list || !list.length) return false;
      if (list.find(".iptv-main-item").length) return true;
      var item = $('<li class="menu__item selector iptv-main-item" data-action="iptv"></li>');
      item.append(menuIcon());
      item.append($('<div class="menu__text"></div>').text("IPTV"));
      item.on("hover:enter click", function (e) { e.preventDefault(); e.stopPropagation(); openPlugin(); });
      list.append(item);
      return true;
    } catch (e) { log("menu item", e); return false; }
  }
  function ensureSettingsFallback() {
    try {
      if (!Lampa.SettingsApi || !Lampa.SettingsApi.addParam) return;
      Lampa.SettingsApi.addComponent({ component: "iptv_component", name: "IPTV" });
      Lampa.SettingsApi.addParam({
        component: "iptv_component",
        param: { name: "Открыть IPTV", type: "button" },
        field: { name: "Открыть IPTV", description: "Запуск IPTV" },
        onChange: openPlugin
      });
    } catch (e) { log("settings fallback", e); }
  }
  function init() {
    try {
      Lampa.Component.add(COMPONENT_ID, IPTVComponent);
      ensureSettingsFallback();
      ensureMenuItem();
      setTimeout(ensureMenuItem, 700);
      setTimeout(ensureMenuItem, 1800);
      setTimeout(ensureMenuItem, 3500);
    } catch (e) { log("init", e); }
  }

  if (window.appready || window.app_ready) init();
  else {
    Lampa.Listener.follow("app", function (e) {
      if (e.type === "ready" || e.type === "start") init();
      setTimeout(ensureMenuItem, 900);
      setTimeout(ensureMenuItem, 2200);
    });
  }
})();
