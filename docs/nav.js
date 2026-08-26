/* ==========================================================================
   ai-search-mcp 官方文档 — 共享导航（所有 docs/*.html 页面复用）
   - 根据 body[data-page] 从 DOCS_NAV 生成左侧多级侧边栏 + 高亮当前页
   - 生成面包屑（主页 / 分组 / 当前页）
   - 页面内目录 .page-toc 滚动高亮（scroll spy）
   - 移动端侧边栏抽屉（汉堡 + 遮罩）
   ========================================================================== */
(function () {
  "use strict";

  /* 站点文档结构：分组 + 页面（file 为 docs/ 下的文件名，anchor 可定位页内章节） */
  var DOCS_NAV = [
    {
      group: "开始",
      items: [
        { id: "index", file: "index.html", title: "概览" },
        { id: "quickstart", file: "quickstart.html", title: "快速开始" }
      ]
    },
    {
      group: "指南",
      items: [
        { id: "guide", file: "guide.html", title: "使用指南" }
      ]
    },
    {
      group: "参考",
      items: [
        { id: "api", file: "api.html", title: "API 参考" },
        { id: "config", file: "config.html", title: "配置指南" }
      ]
    },
    {
      group: "常见问题",
      items: [
        { id: "faq", file: "faq.html", title: "FAQ" }
      ]
    }
  ];

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  var PAGE_ID = document.body.getAttribute("data-page") || "";
  var navEl = $("#docs-nav");
  var crumbEl = $("#docs-breadcrumb");
  var sidebar = $("#docs-sidebar");
  var maskEl = $("#docs-mask");
  var toggleBtn = $("#docs-nav-toggle");

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ---------- 1. 侧边栏（多级目录） ---------- */
  function buildSidebar() {
    if (!navEl) return;
    var html = "";
    DOCS_NAV.forEach(function (group) {
      var groupOpen = group.items.some(function (item) { return item.id === PAGE_ID; });
      html += '<div class="docs-group' + (groupOpen ? "" : " is-collapsed") + '">';
      html += '<button type="button" class="docs-group-toggle" aria-expanded="' + (groupOpen ? "true" : "false") + '">' +
              '<svg class="docs-group-caret" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
              "<span>" + esc(group.group) + "</span></button>";
      html += '<div class="docs-group-items">';
      group.items.forEach(function (item) {
        var on = item.id === PAGE_ID;
        html += '<a class="docs-link' + (on ? " is-active" : "") + '" href="' + item.file + '" data-page-target="' + item.id + '">' + esc(item.title) + "</a>";
      });
      html += "</div></div>";
    });
    navEl.innerHTML = html;

    /* 分组折叠 */
    $$(".docs-group-toggle", navEl).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var group = btn.closest(".docs-group");
        var isOpen = group.classList.toggle("is-collapsed");
        btn.setAttribute("aria-expanded", isOpen ? "false" : "true");
      });
    });
  }

  /* ---------- 2. 面包屑 ---------- */
  function buildBreadcrumb() {
    if (!crumbEl) return;
    var current = null, groupName = "";
    DOCS_NAV.forEach(function (group) {
      group.items.forEach(function (item) {
        if (item.id === PAGE_ID) { current = item; groupName = group.group; }
      });
    });
    var html = '<a href="../index.html">主页</a><span>/</span>';
    if (current) {
      html += "<span>" + esc(groupName) + "</span><span>/</span><span class=\"muted\">" + esc(current.title) + "</span>";
    } else {
      html += "<span class=\"muted\">文档</span>";
    }
    crumbEl.innerHTML = html;
  }

  /* ---------- 3. 页面内目录（.page-toc）滚动高亮 ---------- */
  var tocLinks = $$(".page-toc-link");
  var tocSections = tocLinks.map(function (link) {
    var id = link.getAttribute("href").slice(1);
    return { id: id, el: document.getElementById(id) };
  }).filter(function (s) { return s.el; });

  function onTocScroll() {
    if (!tocSections.length) return;
    var probe = 96; /* header + breadcrumb 高度 */
    var activeId = null;
    for (var i = 0; i < tocSections.length; i++) {
      var r = tocSections[i].el.getBoundingClientRect();
      if (r.top <= probe && r.bottom > probe) { activeId = tocSections[i].id; break; }
    }
    if (!activeId) {
      /* 兜底：取视口内最靠上的 */
      var best = null, bestTop = Infinity;
      tocSections.forEach(function (s) {
        var r = s.el.getBoundingClientRect();
        if (r.top < bestTop && r.bottom > 0) { bestTop = r.top; best = s.id; }
      });
      activeId = best;
    }
    tocLinks.forEach(function (link) {
      link.classList.toggle("is-active", link.getAttribute("href").slice(1) === activeId);
    });
  }

  /* ---------- 4. 移动端侧边栏抽屉 ---------- */
  function openSidebar() {
    if (!sidebar) return;
    sidebar.classList.add("is-open");
    if (maskEl) maskEl.hidden = false;
    document.body.style.overflow = "hidden";
    if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "true");
  }
  function closeSidebar() {
    if (!sidebar) return;
    sidebar.classList.remove("is-open");
    if (maskEl) maskEl.hidden = true;
    document.body.style.overflow = "";
    if (toggleBtn) toggleBtn.setAttribute("aria-expanded", "false");
  }
  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      sidebar.classList.contains("is-open") ? closeSidebar() : openSidebar();
    });
  }
  if (maskEl) maskEl.addEventListener("click", closeSidebar);
  /* 点击侧边栏链接后收起抽屉 */
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest(".docs-link") && window.innerWidth <= 1024) closeSidebar();
  });

  /* ---------- 5. 初始化 ---------- */
  buildSidebar();
  buildBreadcrumb();
  onTocScroll();

  var ticking = false;
  function onScroll() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(function () {
        onTocScroll();
        ticking = false;
      });
    }
  }
  window.addEventListener("scroll", onScroll, { passive: true });
})();
