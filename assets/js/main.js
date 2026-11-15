/*
 * UAV 搜救任務規劃講義 — 全站互動
 * 1. 首頁：依 data/lessons.js 產生講義卡片
 * 2. 講義頁：產生右側目錄、上一篇／下一篇導覽
 * 3. 格子地圖元件 .grid-map：BFS 最短路徑、互動禁飛格、多無人機分配
 * 規則見 CLAUDE.md；講義 HTML 內不要另外寫 <script>。
 */
(function () {
  "use strict";

  var LESSONS = (window.LESSONS || []).filter(function (l) { return !l.hidden; });
  var SITE = window.SITE || { units: [] };
  var SVGNS = "http://www.w3.org/2000/svg";

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text != null) node.textContent = text;
    return node;
  }
  function svg(tag, attrs, text) {
    var node = document.createElementNS(SVGNS, tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text != null) node.textContent = text;
    return node;
  }
  function unitVar(unit) { return "var(--unit-" + String(unit).replace(/\s+/g, "") + ", var(--teal))"; }

  /* ---------------- 首頁卡片 ---------------- */
  function renderIndex() {
    var box = document.getElementById("lesson-list");
    if (!box) return;
    var units = SITE.units.slice();
    LESSONS.forEach(function (l) { if (units.indexOf(l.unit) < 0) units.push(l.unit); });

    units.forEach(function (unit) {
      var list = LESSONS.filter(function (l) { return l.unit === unit; });
      if (!list.length) return;
      var block = el("section", { "class": "unit-block" });
      var head = el("div", { "class": "unit-title" });
      head.appendChild(el("h2", {}, unit));
      head.appendChild(el("span", {}, list.length + " 篇"));
      block.appendChild(head);
      var grid = el("div", { "class": "cards" });
      list.forEach(function (l) {
        var a = el("a", { "class": "card", href: "lessons/" + l.slug + ".html", style: "--unit-color:" + unitVar(l.unit) });
        a.appendChild(el("span", { "class": "num" }, "LESSON " + l.id));
        a.appendChild(el("h3", {}, l.title));
        a.appendChild(el("p", {}, l.summary));
        var meta = el("div", { "class": "meta-row" });
        meta.appendChild(el("span", { "class": "chip level" }, l.level));
        meta.appendChild(el("span", { "class": "chip" }, l.minutes + " 分鐘"));
        (l.tags || []).forEach(function (t) { meta.appendChild(el("span", { "class": "chip" }, t)); });
        a.appendChild(meta);
        grid.appendChild(a);
      });
      block.appendChild(grid);
      box.appendChild(block);
    });

    var count = document.querySelector("[data-stat=count]");
    var mins = document.querySelector("[data-stat=minutes]");
    var unitsN = document.querySelector("[data-stat=units]");
    if (count) count.textContent = LESSONS.length;
    if (mins) mins.textContent = LESSONS.reduce(function (s, l) { return s + (l.minutes || 0); }, 0);
    if (unitsN) unitsN.textContent = units.filter(function (u) { return LESSONS.some(function (l) { return l.unit === u; }); }).length;
  }

  /* ---------------- 講義頁：目錄與上下篇 ---------------- */
  function renderToc() {
    var toc = document.querySelector("[data-toc]");
    var article = document.querySelector("article");
    if (!toc || !article) return;
    var heads = article.querySelectorAll("h2[id]");
    if (!heads.length) { toc.remove(); return; }
    toc.appendChild(el("p", {}, "本篇目錄"));
    var links = [];
    heads.forEach(function (h) {
      var a = el("a", { href: "#" + h.id }, h.textContent);
      toc.appendChild(a);
      links.push([h, a]);
    });
    function onScroll() {
      var current = links[0];
      links.forEach(function (pair) { if (pair[0].getBoundingClientRect().top < 120) current = pair; });
      links.forEach(function (pair) { pair[1].classList.toggle("active", pair === current); });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  function renderPager() {
    var pager = document.querySelector("[data-pager]");
    var id = document.body.getAttribute("data-lesson-id");
    if (!pager || !id) return;
    var i = LESSONS.findIndex(function (l) { return l.id === id; });
    if (i < 0) return;
    var prev = LESSONS[i - 1], next = LESSONS[i + 1];
    if (prev) {
      var a = el("a", { "class": "prev", href: prev.slug + ".html" });
      a.appendChild(el("small", {}, "← 上一篇"));
      a.appendChild(document.createTextNode(prev.title));
      pager.appendChild(a);
    }
    if (next) {
      var b = el("a", { "class": "next", href: next.slug + ".html" });
      b.appendChild(el("small", {}, "下一篇 →"));
      b.appendChild(document.createTextNode(next.title));
      pager.appendChild(b);
    }
  }

  /* ---------------- 格子地圖 ---------------- */
  // 座標字串 "4,1;2,3" → [[4,1],[2,3]]（列,欄，從 1 開始）
  function parseCoords(text) {
    if (!text) return [];
    return text.split(";").map(function (s) { return s.trim(); }).filter(Boolean).map(function (s) {
      var p = s.split(",").map(Number);
      return [p[0], p[1]];
    });
  }
  function key(c) { return c[0] + "," + c[1]; }

  // BFS：四方向、每格成本相同；回傳路徑（含起終點）或 null
  function bfs(rows, cols, start, goal, blocked) {
    var dirs = [[0, 1], [1, 0], [-1, 0], [0, -1]];
    var prev = {}; prev[key(start)] = null;
    var queue = [start], head = 0;
    while (head < queue.length) {
      var cur = queue[head++];
      if (cur[0] === goal[0] && cur[1] === goal[1]) {
        var path = [], k = key(cur);
        while (k) { path.push(k.split(",").map(Number)); k = prev[k]; }
        return path.reverse();
      }
      for (var d = 0; d < 4; d++) {
        var n = [cur[0] + dirs[d][0], cur[1] + dirs[d][1]], nk = key(n);
        if (n[0] < 1 || n[1] < 1 || n[0] > rows || n[1] > cols) continue;
        if (blocked[nk] || nk in prev) continue;
        prev[nk] = key(cur);
        queue.push(n);
      }
    }
    return null;
  }
  window.UAV = { bfs: bfs, parseCoords: parseCoords }; // 方便在瀏覽器主控台驗證

  // 多無人機：貪婪分配，每輪挑「步數最少」的（無人機, 目標）配對
  function greedyAssign(rows, cols, drones, targets, blocked) {
    var freeD = drones.map(function (_, i) { return i; });
    var freeT = targets.map(function (_, i) { return i; });
    var result = [];
    while (freeD.length && freeT.length) {
      var best = null;
      freeD.forEach(function (di) {
        freeT.forEach(function (ti) {
          var p = bfs(rows, cols, drones[di], targets[ti], blocked);
          if (p && (!best || p.length < best.path.length)) best = { d: di, t: ti, path: p };
        });
      });
      if (!best) break;
      result.push(best);
      freeD.splice(freeD.indexOf(best.d), 1);
      freeT.splice(freeT.indexOf(best.t), 1);
    }
    return { pairs: result, idleDrones: freeD, unreached: freeT };
  }

  function GridMap(node) {
    var rows = +node.dataset.rows || 8;
    var cols = +node.dataset.cols || 8;
    var start = parseCoords(node.dataset.start)[0];
    var goal = parseCoords(node.dataset.goal)[0];
    var drones = parseCoords(node.dataset.drones);
    var targets = parseCoords(node.dataset.targets);
    var multi = drones.length > 0 && targets.length > 0;
    var interactive = node.dataset.interactive === "true";
    var base = {};
    parseCoords(node.dataset.blocked).forEach(function (c) { base[key(c)] = true; });
    var added = {};

    var S = 36, PAD = 20;
    var W = PAD + cols * S + 4, H = PAD + rows * S + 4;

    node.innerHTML = "";
    var head = el("div", { "class": "gm-head" });
    head.appendChild(el("span", { "class": "gm-title" }, node.dataset.title || (multi ? "多無人機分配" : "搜救地圖")));
    var status = el("span", { "class": "gm-status", "aria-live": "polite" });
    head.appendChild(status);
    node.appendChild(head);
    var body = el("div", { "class": "gm-body" });
    var root = svg("svg", { viewBox: "0 0 " + W + " " + H, role: "img" });
    body.appendChild(root);
    node.appendChild(body);
    var assignList = multi ? el("ul", { "class": "gm-assign" }) : null;
    if (assignList) node.appendChild(assignList);

    var foot = el("div", { "class": "gm-foot" });
    var legend = el("div", { "class": "gm-legend" });
    var items = multi
      ? [["lg-s", "無人機 U"], ["lg-t", "待查點"], ["lg-b", "禁飛格"]]
      : [["lg-s", "起點 S"], ["lg-t", "待查點 T"], ["lg-b", "禁飛格"]];
    if (interactive) items.push(["lg-a", "你新增的禁飛格"]);
    items.forEach(function (it) {
      var s = el("span"); s.appendChild(el("i", { "class": it[0] })); s.appendChild(document.createTextNode(it[1])); legend.appendChild(s);
    });
    foot.appendChild(legend);
    if (interactive) {
      var hint = el("span", {}, "點格子可新增／移除禁飛格　");
      var reset = el("button", { "class": "gm-reset", type: "button" }, "重設");
      reset.addEventListener("click", function () { added = {}; Object.keys(base).forEach(function (k) { base[k] = base[k] === "removed" ? true : base[k]; }); draw(); });
      hint.appendChild(reset);
      foot.appendChild(hint);
    }
    node.appendChild(foot);

    function cx(c) { return PAD + (c - 1) * S + S / 2; }
    function cy(r) { return PAD + (r - 1) * S + S / 2; }
    function isBlocked(k) { return base[k] === true || added[k]; }
    function isSpecial(k) {
      if (multi) return drones.concat(targets).some(function (c) { return key(c) === k; });
      return k === key(start) || k === key(goal);
    }

    function badge(c, label, cls, shape) {
      var g = svg("g", { "class": "gm-badge" });
      if (shape === "circle") g.appendChild(svg("circle", { cx: cx(c[1]), cy: cy(c[0]), r: 12, "class": cls }));
      else g.appendChild(svg("rect", { x: cx(c[1]) - 12, y: cy(c[0]) - 12, width: 24, height: 24, rx: 5, "class": cls }));
      g.appendChild(svg("text", { x: cx(c[1]), y: cy(c[0]) + 4.5, "text-anchor": "middle" }, label));
      root.appendChild(g);
    }
    function line(path, cls) {
      var pts = path.map(function (c) { return cx(c[1]) + "," + cy(c[0]); }).join(" ");
      root.appendChild(svg("polyline", { points: pts, "class": "gm-path " + cls }));
    }

    function draw() {
      root.innerHTML = "";
      for (var c = 1; c <= cols; c++) root.appendChild(svg("text", { x: cx(c), y: 13, "text-anchor": "middle", "class": "gm-axis" }, c));
      for (var r = 1; r <= rows; r++) root.appendChild(svg("text", { x: 9, y: cy(r) + 3.5, "text-anchor": "middle", "class": "gm-axis" }, r));
      var blockedMap = {};
      for (r = 1; r <= rows; r++) {
        for (c = 1; c <= cols; c++) {
          var k = r + "," + c;
          var cls = "gm-cell";
          if (base[k] === true) { cls += " blocked"; blockedMap[k] = true; }
          if (added[k]) { cls += " added"; blockedMap[k] = true; }
          if (interactive && !isSpecial(k)) cls += " click";
          var rect = svg("rect", { x: PAD + (c - 1) * S, y: PAD + (r - 1) * S, width: S, height: S, "class": cls, "data-k": k });
          root.appendChild(rect);
          if (added[k]) {
            var x0 = PAD + (c - 1) * S, y0 = PAD + (r - 1) * S;
            root.appendChild(svg("line", { x1: x0 + 11, y1: y0 + 11, x2: x0 + S - 11, y2: y0 + S - 11, "class": "gm-x" }));
            root.appendChild(svg("line", { x1: x0 + S - 11, y1: y0 + 11, x2: x0 + 11, y2: y0 + S - 11, "class": "gm-x" }));
          }
        }
      }

      if (!multi) {
        var path = bfs(rows, cols, start, goal, blockedMap);
        if (path) line(path, "c0");
        badge(start, "S", "c0");
        badge(goal, "T", "goal-mark");
        status.classList.toggle("fail", !path);
        status.textContent = path ? "共 " + (path.length - 1) + " 步" : "無可行路徑";
        root.setAttribute("aria-label", (node.dataset.title || "搜救地圖") + "：" + status.textContent);
      } else {
        var res = greedyAssign(rows, cols, drones, targets, blockedMap);
        res.pairs.forEach(function (p, i) { line(p.path, "c" + (p.d % 4)); });
        targets.forEach(function (t, i) { badge(t, String.fromCharCode(65 + i), "goal-mark"); });
        drones.forEach(function (d, i) { badge(d, "U" + (i + 1), "c" + (i % 4), "circle"); });
        var total = res.pairs.reduce(function (s, p) { return s + p.path.length - 1; }, 0);
        status.classList.toggle("fail", res.unreached.length > 0);
        status.textContent = res.unreached.length ? "有目標無法抵達" : "總步數 " + total;
        assignList.innerHTML = "";
        res.pairs.sort(function (a, b) { return a.d - b.d; }).forEach(function (p) {
          var li = el("li");
          li.appendChild(el("i", { "class": "c" + (p.d % 4) }));
          li.appendChild(document.createTextNode("U" + (p.d + 1) + " → 目標 " + String.fromCharCode(65 + p.t) + "：" + (p.path.length - 1) + " 步"));
          assignList.appendChild(li);
        });
        res.unreached.forEach(function (t) { assignList.appendChild(el("li", {}, "目標 " + String.fromCharCode(65 + t) + "：沒有無人機能抵達")); });
        res.idleDrones.forEach(function (d) { assignList.appendChild(el("li", {}, "U" + (d + 1) + "：待命（沒有可分配的目標）")); });
      }
    }

    if (interactive) {
      root.addEventListener("click", function (e) {
        var k = e.target.getAttribute && e.target.getAttribute("data-k");
        if (!k || isSpecial(k)) return;
        if (base[k] === true) base[k] = "removed";
        else if (base[k] === "removed") base[k] = true;
        else if (added[k]) delete added[k];
        else added[k] = true;
        draw();
      });
    }
    draw();
  }

  function wrapTables() {
    document.querySelectorAll("article table.data").forEach(function (t) {
      if (t.parentElement.classList.contains("table-wrap")) return;
      var w = el("div", { "class": "table-wrap" });
      t.parentNode.insertBefore(w, t);
      w.appendChild(t);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    renderIndex();
    renderToc();
    renderPager();
    wrapTables();
    document.querySelectorAll(".grid-map").forEach(GridMap);
  });
})();
