/*!
 * Lampa IPTV Plugin
 * Single-file IPTV plugin for Lampa (Web, Android TV browser, mobile/tablet).
 * No external dependencies.
 */
(function () {
  "use strict";

  var PLUGIN_ID = "lampa_iptv_plugin_v1";
  var STORAGE_KEYS = {
    playlists: PLUGIN_ID + "_playlists",
    playlistVisibility: PLUGIN_ID + "_playlist_visibility",
    activePlaylistId: PLUGIN_ID + "_active_playlist_id",
    favorites: PLUGIN_ID + "_favorites",
    playlistCache: PLUGIN_ID + "_playlist_cache",
    epgCache: PLUGIN_ID + "_epg_cache",
    epgUrlOverrides: PLUGIN_ID + "_epg_urls"
  };

  var DEFAULT_PLAYLISTS = [
    {
      id: "default_artrax",
      title: "Artrax Creator",
      url: "https://raw.githubusercontent.com/Artrax90/m3ucreator/main/pl.m3u",
      readOnly: true
    },
    {
      id: "default_loganettv",
      title: "LoganetTV Mega",
      url: "https://raw.githubusercontent.com/loganettv/playlists/refs/heads/main/mega.m3u",
      readOnly: true
    },
    {
      id: "default_iptv_org_ru",
      title: "IPTV-org Russia",
      url: "https://iptv-org.github.io/iptv/countries/ru.m3u",
      readOnly: true
    },
    {
      id: "default_prisma",
      title: "PRISMA",
      url: "https://gist.axenov.dev/PRISMA/f332731d327f41149cbfcecefeda4591/download/HEAD/PRISMA.m3u",
      readOnly: true
    }
  ];

  var APP_STATE = {
    channels: [],
    filteredChannels: [],
    groups: [],
    activeGroup: "all",
    activePlaylist: null,
    loading: false,
    error: "",
    searchQuery: "",
    selectedIndex: 0
  };

  var utils = {
    now: function () {
      return Date.now();
    },
    log: function () {
      var args = Array.prototype.slice.call(arguments);
      args.unshift("[IPTV]");
      console.log.apply(console, args);
    },
    safeJsonParse: function (raw, fallback) {
      if (!raw) return fallback;
      try {
        return JSON.parse(raw);
      } catch (e) {
        return fallback;
      }
    },
    saveJson: function (key, value) {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (e) {
        utils.log("Failed to save JSON:", key, e);
      }
    },
    loadJson: function (key, fallback) {
      return utils.safeJsonParse(localStorage.getItem(key), fallback);
    },
    debounce: function (fn, wait) {
      var t;
      return function () {
        var ctx = this;
        var args = arguments;
        clearTimeout(t);
        t = setTimeout(function () {
          fn.apply(ctx, args);
        }, wait);
      };
    },
    sanitizeText: function (text) {
      return String(text || "")
        .replace(/[&<>"']/g, function (m) {
          return {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
          }[m];
        });
    },
    createId: function (prefix) {
      return (prefix || "id") + "_" + Math.random().toString(36).slice(2, 10);
    },
    isValidUrl: function (url) {
      try {
        var u = new URL(String(url || "").trim());
        return u.protocol === "http:" || u.protocol === "https:";
      } catch (e) {
        return false;
      }
    },
    normalizeKey: function (value) {
      return String(value || "").trim().toLowerCase();
    }
  };

  var parserM3U = (function () {
    function parseAttrs(extinfLine) {
      var attrs = {};
      var re = /([a-zA-Z0-9_-]+)="([^"]*)"/g;
      var m;
      while ((m = re.exec(extinfLine))) attrs[m[1]] = m[2];
      return attrs;
    }

    async function parse(text, playlistId) {
      var lines = String(text || "")
        .replace(/\r/g, "")
        .split("\n");
      var channels = [];
      var epgUrl = "";
      var pendingMeta = null;

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;

        if (line.indexOf("#EXTM3U") === 0) {
          var attrs = parseAttrs(line);
          if (attrs["x-tvg-url"]) epgUrl = attrs["x-tvg-url"];
          if (attrs["url-tvg"]) epgUrl = attrs["url-tvg"];
          continue;
        }

        if (line.indexOf("#EXTINF:") === 0) {
          var commaPos = line.indexOf(",");
          var namePart = commaPos > -1 ? line.slice(commaPos + 1).trim() : "";
          var extAttrs = parseAttrs(line);
          pendingMeta = {
            name: extAttrs["tvg-name"] || namePart || "Unknown channel",
            tvgName: extAttrs["tvg-name"] || "",
            logo: extAttrs["tvg-logo"] || "",
            group: extAttrs["group-title"] || "Без категории",
            tvgId: extAttrs["tvg-id"] || "",
            tvgShift: extAttrs["tvg-shift"] || ""
          };
          continue;
        }

        if (line[0] === "#") continue;

        if (pendingMeta) {
          channels.push({
            id: utils.createId("ch"),
            playlistId: playlistId,
            name: pendingMeta.name,
            tvgName: pendingMeta.tvgName,
            logo: pendingMeta.logo,
            group: pendingMeta.group,
            tvgId: pendingMeta.tvgId,
            tvgShift: pendingMeta.tvgShift,
            streamUrl: line
          });
          pendingMeta = null;
        }

        if (i % 800 === 0) {
          await new Promise(function (resolve) {
            requestAnimationFrame(resolve);
          });
        }
      }

      return { channels: channels, epgUrl: epgUrl };
    }

    return { parse: parse };
  })();

  var favoritesManager = (function () {
    var favorites = utils.loadJson(STORAGE_KEYS.favorites, {});
    function keyFor(channel) {
      return (
        utils.normalizeKey(channel.playlistId) +
        "::" +
        utils.normalizeKey(channel.tvgId || channel.tvgName || channel.name) +
        "::" +
        utils.normalizeKey(channel.streamUrl)
      );
    }
    return {
      isFavorite: function (channel) {
        return !!favorites[keyFor(channel)];
      },
      toggle: function (channel) {
        var key = keyFor(channel);
        if (favorites[key]) delete favorites[key];
        else favorites[key] = channel;
        utils.saveJson(STORAGE_KEYS.favorites, favorites);
      },
      all: function () {
        return Object.keys(favorites).map(function (k) {
          return favorites[k];
        });
      }
    };
  })();

  var playlistManager = (function () {
    var userPlaylists = utils.loadJson(STORAGE_KEYS.playlists, []);
    var visibility = utils.loadJson(STORAGE_KEYS.playlistVisibility, {});
    var activeId = localStorage.getItem(STORAGE_KEYS.activePlaylistId) || "";
    var cache = utils.loadJson(STORAGE_KEYS.playlistCache, {});
    var cacheTtlMs = 8 * 60 * 1000;

    function all() {
      return DEFAULT_PLAYLISTS.concat(userPlaylists).filter(function (pl) {
        return visibility[pl.id] !== false;
      });
    }

    function getById(id) {
      var arr = DEFAULT_PLAYLISTS.concat(userPlaylists);
      for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return arr[i];
      return null;
    }

    function getActive() {
      var list = all();
      if (activeId) {
        var p = getById(activeId);
        if (p && visibility[p.id] !== false) return p;
      }
      return list[0] || null;
    }

    function setActive(id) {
      activeId = id;
      localStorage.setItem(STORAGE_KEYS.activePlaylistId, id);
    }

    function add(url, title) {
      if (!utils.isValidUrl(url)) throw new Error("Некорректный URL");
      var id = "user_" + Date.now();
      var item = {
        id: id,
        title: title || "Пользовательский плейлист",
        url: url.trim(),
        readOnly: false
      };
      userPlaylists.push(item);
      utils.saveJson(STORAGE_KEYS.playlists, userPlaylists);
      return item;
    }

    function remove(id) {
      userPlaylists = userPlaylists.filter(function (p) {
        return p.id !== id;
      });
      utils.saveJson(STORAGE_KEYS.playlists, userPlaylists);
      if (activeId === id) setActive("");
    }

    function toggleVisibility(id) {
      var p = getById(id);
      if (!p || !p.readOnly) return;
      visibility[id] = visibility[id] === false ? true : false;
      utils.saveJson(STORAGE_KEYS.playlistVisibility, visibility);
    }

    async function loadText(pl) {
      if (!pl || !pl.url) throw new Error("Playlist not found");

      var c = cache[pl.id];
      if (c && utils.now() - c.ts < cacheTtlMs) return c.text;

      var r = await fetch(pl.url, { method: "GET", cache: "no-store" });
      if (!r.ok) throw new Error("Playlist HTTP error: " + r.status);
      var t = await r.text();
      if (!t || t.indexOf("#EXTM3U") === -1) {
        throw new Error("Поврежденный M3U: отсутствует #EXTM3U");
      }
      cache[pl.id] = { ts: utils.now(), text: t };
      utils.saveJson(STORAGE_KEYS.playlistCache, cache);
      return t;
    }

    return {
      all: all,
      getById: getById,
      getActive: getActive,
      setActive: setActive,
      add: add,
      remove: remove,
      toggleVisibility: toggleVisibility,
      loadText: loadText
    };
  })();

  var epgManager = (function () {
    var cache = utils.loadJson(STORAGE_KEYS.epgCache, {});
    var urlOverrides = utils.loadJson(STORAGE_KEYS.epgUrlOverrides, {});
    var ttlMs = 3 * 60 * 60 * 1000;

    function setUrlForPlaylist(playlistId, url) {
      if (!url) delete urlOverrides[playlistId];
      else urlOverrides[playlistId] = url.trim();
      utils.saveJson(STORAGE_KEYS.epgUrlOverrides, urlOverrides);
    }

    function getUrlForPlaylist(playlistId) {
      return urlOverrides[playlistId] || "";
    }

    function pickUrl(playlistId, fromM3u) {
      return getUrlForPlaylist(playlistId) || fromM3u || "";
    }

    async function load(playlistId, epgUrl) {
      if (!epgUrl || !utils.isValidUrl(epgUrl)) return null;
      var key = playlistId + "::" + epgUrl;
      var c = cache[key];
      if (c && utils.now() - c.ts < ttlMs) return c.data;

      try {
        var r = await fetch(epgUrl, { method: "GET", cache: "no-store" });
        if (!r.ok) throw new Error("EPG HTTP error: " + r.status);
        var xml = await r.text();
        var parsed = parseXmlTv(xml);
        cache[key] = { ts: utils.now(), data: parsed };
        utils.saveJson(STORAGE_KEYS.epgCache, cache);
        return parsed;
      } catch (e) {
        utils.log("EPG load failed", e);
        return null;
      }
    }

    function parseXmlTv(xmlText) {
      var parser = new DOMParser();
      var xml = parser.parseFromString(xmlText, "text/xml");
      var programs = {};
      var nodes = xml.getElementsByTagName("programme");
      var now = new Date();

      for (var i = 0; i < nodes.length; i++) {
        var node = nodes[i];
        var channelId = node.getAttribute("channel") || "";
        if (!channelId) continue;

        var startRaw = node.getAttribute("start") || "";
        var stopRaw = node.getAttribute("stop") || "";
        var titleNode = node.getElementsByTagName("title")[0];
        var title = titleNode ? titleNode.textContent : "Без названия";

        var start = parseXmlTvDate(startRaw);
        var stop = parseXmlTvDate(stopRaw);
        if (!start || !stop) continue;

        if (!programs[channelId]) programs[channelId] = [];
        programs[channelId].push({
          start: start,
          stop: stop,
          title: title
        });

        if (i % 3000 === 0) {
          var dummy = now.getTime();
          if (!dummy) break;
        }
      }

      Object.keys(programs).forEach(function (chId) {
        programs[chId].sort(function (a, b) {
          return a.start - b.start;
        });
      });
      return programs;
    }

    function parseXmlTvDate(raw) {
      if (!raw) return null;
      var c = String(raw).replace(/\s+\+?[\d-]+$/, "");
      var m = c.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
      if (!m) return null;
      return new Date(
        Number(m[1]),
        Number(m[2]) - 1,
        Number(m[3]),
        Number(m[4]),
        Number(m[5]),
        Number(m[6])
      );
    }

    function getProgramInfo(epgData, channel) {
      if (!epgData || !channel) return null;
      var ids = [channel.tvgId, channel.tvgName, channel.name].filter(Boolean);
      var arr = null;
      for (var i = 0; i < ids.length; i++) {
        if (epgData[ids[i]]) {
          arr = epgData[ids[i]];
          break;
        }
      }
      if (!arr || !arr.length) return null;

      var now = new Date();
      var current = null;
      var next = null;
      for (var j = 0; j < arr.length; j++) {
        if (arr[j].start <= now && arr[j].stop > now) {
          current = arr[j];
          next = arr[j + 1] || null;
          break;
        }
        if (arr[j].start > now) {
          next = arr[j];
          break;
        }
      }
      return { current: current, next: next, schedule: arr.slice(0, 200) };
    }

    return {
      load: load,
      setUrlForPlaylist: setUrlForPlaylist,
      pickUrl: pickUrl,
      getUrlForPlaylist: getUrlForPlaylist,
      getProgramInfo: getProgramInfo
    };
  })();

  var playerController = (function () {
    var current = null;
    var fallbackVideo = null;

    function stopFallback() {
      if (!fallbackVideo) return;
      try {
        fallbackVideo.pause();
        fallbackVideo.src = "";
        fallbackVideo.remove();
      } catch (e) {}
      fallbackVideo = null;
    }

    function play(channel) {
      if (!channel || !channel.streamUrl) return;
      current = channel;

      try {
        if (window.Lampa && Lampa.Player && typeof Lampa.Player.play === "function") {
          Lampa.Player.play({
            title: channel.name,
            url: channel.streamUrl,
            quality: {
              default: channel.streamUrl
            },
            timeline: 0
          });
          return;
        }
      } catch (e) {
        utils.log("Lampa player play failed, fallback to HTML5", e);
      }

      stopFallback();
      fallbackVideo = document.createElement("video");
      fallbackVideo.setAttribute("playsinline", "true");
      fallbackVideo.autoplay = true;
      fallbackVideo.controls = true;
      fallbackVideo.src = channel.streamUrl;
      fallbackVideo.style.position = "fixed";
      fallbackVideo.style.left = "0";
      fallbackVideo.style.top = "0";
      fallbackVideo.style.width = "100vw";
      fallbackVideo.style.height = "100vh";
      fallbackVideo.style.background = "#000";
      fallbackVideo.style.zIndex = "99999";
      document.body.appendChild(fallbackVideo);
      fallbackVideo.play().catch(function (e) {
        utils.log("Fallback playback failed", e);
      });
      fallbackVideo.addEventListener("error", function () {
        uiRenderer.notify("Ошибка воспроизведения канала");
      });
    }

    function playNext(channels, currentIndex) {
      if (!channels || !channels.length) return;
      var i = Math.max(0, Math.min(channels.length - 1, currentIndex + 1));
      play(channels[i]);
      return i;
    }

    function playPrev(channels, currentIndex) {
      if (!channels || !channels.length) return;
      var i = Math.max(0, Math.min(channels.length - 1, currentIndex - 1));
      play(channels[i]);
      return i;
    }

    return {
      play: play,
      playNext: playNext,
      playPrev: playPrev,
      stopFallback: stopFallback,
      current: function () {
        return current;
      }
    };
  })();

  var uiRenderer = (function () {
    var root = null;
    var listViewport = null;
    var listInner = null;
    var rowHeight = 76;
    var overscan = 8;
    var epgData = null;

    function ensureStyles() {
      if (document.getElementById(PLUGIN_ID + "_styles")) return;
      var css = [
        "." + PLUGIN_ID + "{position:fixed;inset:0;z-index:9990;background:#141821;color:#fff;font-family:Arial,sans-serif;display:flex;flex-direction:column;}",
        "." + PLUGIN_ID + " .top{padding:10px;display:flex;gap:8px;align-items:center;background:#1b2230;}",
        "." + PLUGIN_ID + " input,." + PLUGIN_ID + " select,." + PLUGIN_ID + " button{background:#222b3c;color:#fff;border:1px solid #2f3b52;border-radius:8px;padding:8px 10px;font-size:14px;}",
        "." + PLUGIN_ID + " button{cursor:pointer;min-height:40px;}",
        "." + PLUGIN_ID + " .grow{flex:1;}",
        "." + PLUGIN_ID + " .main{display:flex;gap:10px;flex:1;min-height:0;padding:10px;}",
        "." + PLUGIN_ID + " .left{width:260px;display:flex;flex-direction:column;gap:8px;}",
        "." + PLUGIN_ID + " .right{flex:1;display:flex;flex-direction:column;min-width:0;}",
        "." + PLUGIN_ID + " .groups{display:flex;flex-wrap:wrap;gap:8px;max-height:132px;overflow:auto;}",
        "." + PLUGIN_ID + " .group{padding:7px 10px;background:#20293a;border-radius:16px;border:1px solid #2d3a53;}",
        "." + PLUGIN_ID + " .group.active{background:#2f6fe4;border-color:#5a93ff;}",
        "." + PLUGIN_ID + " .list{flex:1;min-height:0;position:relative;background:#101521;border:1px solid #2a3448;border-radius:10px;overflow:auto;}",
        "." + PLUGIN_ID + " .list-inner{position:relative;width:100%;}",
        "." + PLUGIN_ID + " .row{position:absolute;left:0;right:0;height:72px;display:flex;align-items:center;gap:10px;padding:8px 10px;border-bottom:1px solid #242f44;}",
        "." + PLUGIN_ID + " .row.focused{background:#203458;}",
        "." + PLUGIN_ID + " .logo{width:64px;height:40px;object-fit:contain;background:#0d111a;border-radius:6px;}",
        "." + PLUGIN_ID + " .meta{display:flex;flex-direction:column;gap:3px;min-width:0;}",
        "." + PLUGIN_ID + " .name{font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
        "." + PLUGIN_ID + " .epg{font-size:12px;color:#9bb5e6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}",
        "." + PLUGIN_ID + " .fav{margin-left:auto;font-size:20px;color:#ffd966;}",
        "." + PLUGIN_ID + " .status{font-size:12px;color:#9bb5e6;padding:0 10px 10px;}",
        "." + PLUGIN_ID + " .panel{background:#111828;border:1px solid #2b3751;border-radius:10px;padding:10px;}",
        "." + PLUGIN_ID + " .hidden{display:none!important;}",
        "." + PLUGIN_ID + " .notify{position:fixed;right:15px;bottom:15px;background:#1f2a3c;border:1px solid #33486d;border-radius:8px;padding:10px 12px;z-index:10020;}",
        "@media(max-width:1024px){." + PLUGIN_ID + " .main{flex-direction:column;}." + PLUGIN_ID + " .left{width:auto;}}",
        "@media(max-width:640px){." + PLUGIN_ID + " .top{flex-wrap:wrap;}." + PLUGIN_ID + " .row{height:78px;}." + PLUGIN_ID + " button,input,select{font-size:15px;}}"
      ].join("");
      var style = document.createElement("style");
      style.id = PLUGIN_ID + "_styles";
      style.textContent = css;
      document.head.appendChild(style);
    }

    function renderShell() {
      ensureStyles();
      if (root) root.remove();
      root = document.createElement("div");
      root.className = PLUGIN_ID;
      root.innerHTML =
        '<div class="top">' +
        '<select id="iptv_playlist_select"></select>' +
        '<button id="iptv_btn_add">+ Плейлист</button>' +
        '<button id="iptv_btn_manage">Плейлисты</button>' +
        '<button id="iptv_btn_favorites">Избранное</button>' +
        '<input id="iptv_search" class="grow" placeholder="Поиск каналов..." />' +
        '<button id="iptv_btn_close">Закрыть</button>' +
        "</div>" +
        '<div class="main">' +
        '<div class="left"><div class="panel"><div><strong>Категории</strong></div><div id="iptv_groups" class="groups"></div></div><div class="panel"><div><strong>EPG URL</strong></div><input id="iptv_epg_url" placeholder="https://...xml" /><button id="iptv_epg_save">Сохранить EPG URL</button></div></div>' +
        '<div class="right"><div id="iptv_list" class="list"><div class="list-inner" id="iptv_list_inner"></div></div><div id="iptv_status" class="status"></div></div>' +
        "</div>";
      document.body.appendChild(root);
      listViewport = root.querySelector("#iptv_list");
      listInner = root.querySelector("#iptv_list_inner");

      bindStaticEvents();
      bindRemoteEvents();
      return root;
    }

    function bindStaticEvents() {
      root.querySelector("#iptv_btn_close").addEventListener("click", close);
      root.querySelector("#iptv_btn_add").addEventListener("click", onAddPlaylist);
      root.querySelector("#iptv_btn_manage").addEventListener("click", onManagePlaylists);
      root.querySelector("#iptv_btn_favorites").addEventListener("click", showFavorites);
      root.querySelector("#iptv_playlist_select").addEventListener("change", onPlaylistChanged);
      root.querySelector("#iptv_epg_save").addEventListener("click", onSaveEpgUrl);
      root
        .querySelector("#iptv_search")
        .addEventListener(
          "input",
          utils.debounce(function (e) {
            APP_STATE.searchQuery = String(e.target.value || "").trim().toLowerCase();
            applyFilters();
          }, 180)
        );

      listViewport.addEventListener("scroll", renderVirtualRows);
      listViewport.addEventListener("click", function (e) {
        var row = e.target.closest(".row");
        if (!row) return;
        var idx = Number(row.getAttribute("data-index"));
        if (!isFinite(idx)) return;
        APP_STATE.selectedIndex = idx;
        var channel = APP_STATE.filteredChannels[idx];
        if (!channel) return;
        if (e.target.classList.contains("fav")) {
          favoritesManager.toggle(channel);
          renderVirtualRows();
          return;
        }
        playerController.play(channel);
      });
    }

    function bindRemoteEvents() {
      document.addEventListener("keydown", onKeyDown, true);
    }

    function unbindRemoteEvents() {
      document.removeEventListener("keydown", onKeyDown, true);
    }

    function onKeyDown(e) {
      if (!root || !document.body.contains(root)) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        APP_STATE.selectedIndex = Math.min(APP_STATE.filteredChannels.length - 1, APP_STATE.selectedIndex + 1);
        ensureSelectedVisible();
        renderVirtualRows();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        APP_STATE.selectedIndex = Math.max(0, APP_STATE.selectedIndex - 1);
        ensureSelectedVisible();
        renderVirtualRows();
      } else if (e.key === "Enter") {
        e.preventDefault();
        var ch = APP_STATE.filteredChannels[APP_STATE.selectedIndex];
        if (ch) playerController.play(ch);
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        var c = APP_STATE.filteredChannels[APP_STATE.selectedIndex];
        if (!c) return;
        favoritesManager.toggle(c);
        renderVirtualRows();
      } else if (e.key === "PageDown") {
        e.preventDefault();
        var n = playerController.playNext(APP_STATE.filteredChannels, APP_STATE.selectedIndex);
        if (typeof n === "number") {
          APP_STATE.selectedIndex = n;
          renderVirtualRows();
        }
      } else if (e.key === "PageUp") {
        e.preventDefault();
        var p = playerController.playPrev(APP_STATE.filteredChannels, APP_STATE.selectedIndex);
        if (typeof p === "number") {
          APP_STATE.selectedIndex = p;
          renderVirtualRows();
        }
      } else if (e.key === "Escape" || e.key === "Backspace") {
        e.preventDefault();
        close();
      }
    }

    function ensureSelectedVisible() {
      var top = APP_STATE.selectedIndex * rowHeight;
      var bottom = top + rowHeight;
      if (top < listViewport.scrollTop) listViewport.scrollTop = top;
      else if (bottom > listViewport.scrollTop + listViewport.clientHeight) {
        listViewport.scrollTop = bottom - listViewport.clientHeight;
      }
    }

    function setStatus(text) {
      var el = root && root.querySelector("#iptv_status");
      if (el) el.textContent = text || "";
    }

    function renderPlaylists() {
      var sel = root.querySelector("#iptv_playlist_select");
      var pls = playlistManager.all();
      sel.innerHTML = pls
        .map(function (p) {
          var selected = APP_STATE.activePlaylist && APP_STATE.activePlaylist.id === p.id ? " selected" : "";
          return '<option value="' + p.id + '"' + selected + ">" + utils.sanitizeText(p.title) + "</option>";
        })
        .join("");
      var epgInput = root.querySelector("#iptv_epg_url");
      epgInput.value = epgManager.getUrlForPlaylist(APP_STATE.activePlaylist.id) || "";
    }

    function renderGroups() {
      var groupsNode = root.querySelector("#iptv_groups");
      var groups = APP_STATE.groups || [];
      var html = ['<div class="group ' + (APP_STATE.activeGroup === "all" ? "active" : "") + '" data-group="all">Все</div>'];
      groups.forEach(function (g) {
        html.push(
          '<div class="group ' +
            (APP_STATE.activeGroup === g ? "active" : "") +
            '" data-group="' +
            utils.sanitizeText(g) +
            '">' +
            utils.sanitizeText(g) +
            "</div>"
        );
      });
      groupsNode.innerHTML = html.join("");
      groupsNode.querySelectorAll(".group").forEach(function (el) {
        el.addEventListener("click", function () {
          APP_STATE.activeGroup = el.getAttribute("data-group");
          applyFilters();
          renderGroups();
        });
      });
    }

    function renderVirtualRows() {
      if (!listViewport || !listInner) return;
      var items = APP_STATE.filteredChannels;
      var total = items.length;
      listInner.style.height = total * rowHeight + "px";

      var start = Math.max(0, Math.floor(listViewport.scrollTop / rowHeight) - overscan);
      var end = Math.min(total, Math.ceil((listViewport.scrollTop + listViewport.clientHeight) / rowHeight) + overscan);

      var html = [];
      for (var i = start; i < end; i++) {
        var ch = items[i];
        if (!ch) continue;
        var info = epgManager.getProgramInfo(epgData, ch);
        var epgText = info && info.current ? "Сейчас: " + info.current.title : "EPG: нет данных";
        var epgNext = info && info.next ? " | Далее: " + info.next.title : "";
        var fav = favoritesManager.isFavorite(ch) ? "★" : "☆";

        html.push(
          '<div class="row ' +
            (APP_STATE.selectedIndex === i ? "focused" : "") +
            '" data-index="' +
            i +
            '" style="top:' +
            i * rowHeight +
            'px">' +
            '<img class="logo" src="' +
            utils.sanitizeText(ch.logo || "") +
            '" onerror="this.style.visibility=\'hidden\'" />' +
            '<div class="meta"><div class="name">' +
            utils.sanitizeText(ch.name) +
            '</div><div class="epg">' +
            utils.sanitizeText(epgText + epgNext) +
            '</div></div><div class="fav">' +
            fav +
            "</div></div>"
        );
      }
      listInner.innerHTML = html.join("");
      setStatus("Каналов: " + total + " | Выбран: " + (APP_STATE.selectedIndex + 1));
    }

    function notify(text) {
      var n = document.createElement("div");
      n.className = "notify";
      n.textContent = text;
      root.appendChild(n);
      setTimeout(function () {
        n.remove();
      }, 2200);
    }

    function onAddPlaylist() {
      var url = prompt("Введите URL плейлиста (M3U):");
      if (!url) return;
      if (!utils.isValidUrl(url)) {
        notify("Некорректный URL");
        return;
      }
      var title = prompt("Название плейлиста:", "Мой IPTV") || "Мой IPTV";
      try {
        var p = playlistManager.add(url, title);
        playlistManager.setActive(p.id);
        initLoad();
      } catch (e) {
        notify("Не удалось добавить плейлист");
      }
    }

    function onManagePlaylists() {
      var allPl = DEFAULT_PLAYLISTS.concat(utils.loadJson(STORAGE_KEYS.playlists, []));
      var lines = allPl.map(function (p, idx) {
        return (
          idx +
          1 +
          ". " +
          p.title +
          " [" +
          (p.readOnly ? "default" : "custom") +
          "] id=" +
          p.id
        );
      });
      alert("Управление плейлистами:\n" + lines.join("\n") + "\n\nУдаление custom: введите ID в следующем окне.\nHide/show default: префикс h:ID");
      var input = prompt("Команда (ID или h:ID):");
      if (!input) return;
      if (input.indexOf("h:") === 0) {
        playlistManager.toggleVisibility(input.slice(2));
        initLoad();
        return;
      }
      var pl = playlistManager.getById(input);
      if (!pl) {
        notify("Плейлист не найден");
        return;
      }
      if (pl.readOnly) {
        notify("Default-плейлист нельзя удалить");
        return;
      }
      playlistManager.remove(pl.id);
      initLoad();
    }

    function showFavorites() {
      APP_STATE.activeGroup = "all";
      APP_STATE.searchQuery = "";
      root.querySelector("#iptv_search").value = "";
      APP_STATE.filteredChannels = favoritesManager.all();
      APP_STATE.selectedIndex = 0;
      renderGroups();
      renderVirtualRows();
      setStatus("Избранное: " + APP_STATE.filteredChannels.length);
    }

    function onPlaylistChanged(e) {
      playlistManager.setActive(e.target.value);
      initLoad();
    }

    function onSaveEpgUrl() {
      var value = root.querySelector("#iptv_epg_url").value.trim();
      if (value && !utils.isValidUrl(value)) {
        notify("Некорректный EPG URL");
        return;
      }
      epgManager.setUrlForPlaylist(APP_STATE.activePlaylist.id, value);
      notify("EPG URL сохранен");
      initLoad(true);
    }

    function applyFilters() {
      var q = APP_STATE.searchQuery;
      var g = APP_STATE.activeGroup;
      var filtered = APP_STATE.channels;
      if (g && g !== "all") {
        filtered = filtered.filter(function (c) {
          return c.group === g;
        });
      }
      if (q) {
        filtered = filtered.filter(function (c) {
          return utils.normalizeKey(c.name).indexOf(q) > -1;
        });
      }
      APP_STATE.filteredChannels = filtered;
      APP_STATE.selectedIndex = Math.min(APP_STATE.selectedIndex, Math.max(0, filtered.length - 1));
      renderVirtualRows();
    }

    async function initLoad(skipPlaylistFetch) {
      APP_STATE.loading = true;
      APP_STATE.error = "";
      setStatus("Загрузка...");
      try {
        APP_STATE.activePlaylist = playlistManager.getActive();
        if (!APP_STATE.activePlaylist) throw new Error("Нет доступных плейлистов");
        renderPlaylists();

        if (!skipPlaylistFetch) {
          var txt = await playlistManager.loadText(APP_STATE.activePlaylist);
          var parsed = await parserM3U.parse(txt, APP_STATE.activePlaylist.id);
          APP_STATE.channels = parsed.channels;
          APP_STATE.groups = Array.from(
            APP_STATE.channels.reduce(function (acc, c) {
              acc.add(c.group || "Без категории");
              return acc;
            }, new Set())
          ).sort();

          var epgUrl = epgManager.pickUrl(APP_STATE.activePlaylist.id, parsed.epgUrl);
          epgData = await epgManager.load(APP_STATE.activePlaylist.id, epgUrl);
        } else {
          var epgInputUrl = epgManager.pickUrl(APP_STATE.activePlaylist.id, "");
          epgData = await epgManager.load(APP_STATE.activePlaylist.id, epgInputUrl);
        }

        APP_STATE.activeGroup = "all";
        APP_STATE.searchQuery = "";
        APP_STATE.selectedIndex = 0;
        if (root.querySelector("#iptv_search")) root.querySelector("#iptv_search").value = "";
        renderGroups();
        applyFilters();
        if (!APP_STATE.channels.length) {
          APP_STATE.error = "Нет каналов в плейлисте";
          setStatus("Нет каналов. Проверьте M3U.");
        }
      } catch (e) {
        APP_STATE.error = e.message || "Ошибка загрузки";
        APP_STATE.channels = [];
        APP_STATE.filteredChannels = [];
        APP_STATE.groups = [];
        renderGroups();
        renderVirtualRows();
        setStatus("Ошибка: " + APP_STATE.error);
        utils.log("Load failed:", e);
      } finally {
        APP_STATE.loading = false;
      }
    }

    function close() {
      if (root) root.remove();
      root = null;
      unbindRemoteEvents();
      playerController.stopFallback();
    }

    async function open() {
      renderShell();
      await initLoad(false);
    }

    return {
      open: open,
      close: close,
      notify: notify
    };
  })();

  var pluginApi = {
    start: function () {
      uiRenderer.open();
    },
    stop: function () {
      uiRenderer.close();
    }
  };

  function addFallbackLauncherButton() {
    if (document.getElementById(PLUGIN_ID + "_launcher")) return;
    var btn = document.createElement("button");
    btn.id = PLUGIN_ID + "_launcher";
    btn.textContent = "IPTV";
    btn.style.position = "fixed";
    btn.style.right = "12px";
    btn.style.bottom = "12px";
    btn.style.zIndex = "9998";
    btn.style.background = "#2f6fe4";
    btn.style.color = "#fff";
    btn.style.border = "none";
    btn.style.borderRadius = "8px";
    btn.style.padding = "10px 14px";
    btn.style.fontSize = "14px";
    btn.style.cursor = "pointer";
    btn.addEventListener("click", function () {
      pluginApi.start();
    });
    document.body.appendChild(btn);
  }

  function registerLampaButton() {
    try {
      if (!window.Lampa) return false;

      if (Lampa.Listener && Lampa.Listener.follow) {
        Lampa.Listener.follow("app", function (e) {
          if (e.type === "ready") {
            try {
              if (Lampa.SettingsApi && Lampa.SettingsApi.addComponent) {
                Lampa.SettingsApi.addComponent({
                  component: "iptv_plugin_component",
                  name: "IPTV"
                });
              }
              if (Lampa.SettingsApi && Lampa.SettingsApi.addParam) {
                // Some Lampa builds require both `param` and `field` objects.
                Lampa.SettingsApi.addParam({
                  component: "iptv_plugin_component",
                  param: {
                    name: "Открыть IPTV",
                    type: "button"
                  },
                  field: {
                    name: "Открыть IPTV",
                    description: "Запуск IPTV-плеера"
                  },
                  onChange: function () {
                    pluginApi.start();
                  }
                });
              } else {
                addFallbackLauncherButton();
              }
            } catch (err) {
              utils.log("Settings API integration error", err);
              addFallbackLauncherButton();
            }
          }
        });
      }
      return true;
    } catch (e) {
      utils.log("Lampa registration failed", e);
      return false;
    }
  }

  function addGlobalEntryPoint() {
    window.LampaIPTVPlugin = pluginApi;
    utils.log("Global entry point available: window.LampaIPTVPlugin.start()");
  }

  addGlobalEntryPoint();
  if (!registerLampaButton()) addFallbackLauncherButton();

  // Optional auto-start on plain web page (outside Lampa) for testing.
  if (!window.Lampa) {
    window.addEventListener("load", function () {
      setTimeout(function () {
        pluginApi.start();
      }, 50);
    });
  }
})();
