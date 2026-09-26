/* ==========================================================================
   ai-search-mcp 文档站 — 共享导航模块
   职责：渲染左侧多级侧边栏、面包屑、页内目录（自动为标题生成锚点）
       与上一页/下一页导航。所有文档页共享同一份 DOCS_NAV 配置，
   新增页面只需在 DOCS_NAV 中登记 + 复制一份页面骨架。
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- 文档结构（唯一数据源） ---------- */
  var DOCS_NAV = [
    {
      group: "开始",
      pages: [
        { id: "index", title: "概览", href: "./index.html", desc: "项目定位与核心能力" },
        { id: "quickstart", title: "快速开始", href: "./quickstart.html", desc: "3 步接入你的 MCP 客户端" }
      ]
    },
    {
      group: "使用",
      pages: [
        { id: "guide", title: "工具指南", href: "./guide.html", desc: "search / research / fetch_page / status" },
        { id: "engines", title: "引擎详解", href: "./engines.html", desc: "9 个引擎的能力与选型" }
      ]
    },
    {
      group: "参考",
      pages: [
        { id: "api", title: "API 参考", href: "./api.html", desc: "参数、返回值与错误码" },
        { id: "config", title: "配置指南", href: "./config.html", desc: "19 个环境变量" },
        { id: "faq", title: "常见问题", href: "./faq.html", desc: "接入与排错" }
      ]
    }
  ];

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };

  /* ---------- 扁平化，便于取上/下一篇 ---------- */
  function flatten() {
    var out = [];
    DOCS_NAV.forEach(function (g) {
      g.pages.forEach(function (p) { out.push({ group: g.group, page: p }); });
    });
    return out;
  }

  /* ---------- 标题锚点 id ---------- */
  function slugify(text, used) {
    var base = String(text)
      .trim()
      .toLowerCase()
      .replace(/[\s\u3000]+/g, "-")
      .replace(/[!-/:-@[-`{-~。，、；：？！“”‘’（）《》【】…—]/g, "")
      .replace(/-{2,}/g, "-")
      .replace(/^-|-$/g, "");
    if (!base) base = "section";
    var id = base;
    var n = 2;
    while (used[id]) { id = base + "-" + n; n += 1; }
    used[id] = true;
    return id;
  }

  /* ---------- 渲染侧边栏 ---------- */
  function renderSidebar(activeId) {
    var host = $("#docs-sidebar");
    if (!host) return;

    // 移动端开关必须挂在侧边栏「外面」——否则折叠侧边栏时会把它一起隐藏，无法再展开。
    if (host.parentNode && !document.getElementById("docs-menu-toggle")) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-outline btn-sm";
      btn.id = "docs-menu-toggle";
      btn.setAttribute("aria-expanded", "true");
      btn.textContent = "收起目录";
      host.parentNode.insertBefore(btn, host);
    }

    var html = "";
    DOCS_NAV.forEach(function (g) {
      html += '<nav class="docs-group" aria-label="' + g.group + '">';
      html += '<p class="docs-group-title">' + g.group + "</p>";
      html += '<ul class="docs-nav-list">';
      g.pages.forEach(function (p) {
        var active = p.id === activeId;
        html +=
          "<li><a class=\"docs-nav-link" + (active ? " is-active" : "") + "\"" +
          (active ? ' aria-current="page"' : "") +
          ' href="' + p.href + '">' + p.title + "</a></li>";
      });
      html += "</ul></nav>";
    });

    host.innerHTML = html;
  }

  /* ---------- 渲染面包屑 ---------- */
  function renderBreadcrumb(group, title) {
    var host = $("#docs-breadcrumb");
    if (!host) return;
    host.innerHTML =
      '<a href="../index.html">ai-search-mcp</a>' +
      '<span class="sep" aria-hidden="true">/</span>' +
      '<span>' + group + "</span>" +
      '<span class="sep" aria-hidden="true">/</span>' +
      '<span class="crumb-current">' + title + "</span>";
  }

  /* ---------- 渲染页内目录 + 为标题补锚点 ---------- */
  function renderToc() {
    var host = $("#docs-toc-list");
    var prose = $(".prose");
    if (!prose) return;

    var used = {};
    var headings = prose.querySelectorAll("h2, h3");
    var html = "";

    Array.prototype.forEach.call(headings, function (h) {
      var text = h.textContent.replace(/#$/, "").trim();
      if (!h.id) h.id = slugify(text, used);
      else used[h.id] = true;

      if (!h.querySelector(".anchor-link")) {
        var a = document.createElement("a");
        a.className = "anchor-link";
        a.href = "#" + h.id;
        a.setAttribute("aria-label", "锚点链接");
        a.textContent = "#";
        h.appendChild(a);
      }

      var lvl = h.tagName.toLowerCase() === "h2" ? 2 : 3;
      html +=
        '<li class="lvl-' + lvl + '"><a href="#' + h.id + '">' + text + "</a></li>";
    });

    if (host) {
      host.innerHTML = html;
      var panel = host.closest(".docs-toc");
      if (panel && !html) panel.style.display = "none";
    }
  }

  /* ---------- 渲染上一页 / 下一页 ---------- */
  function renderPager(activeId) {
    var host = $("#docs-pager");
    if (!host) return;
    var flat = flatten();
    var idx = -1;
    flat.forEach(function (item, i) { if (item.page.id === activeId) idx = i; });
    if (idx === -1) return;

    var prev = idx > 0 ? flat[idx - 1] : null;
    var next = idx < flat.length - 1 ? flat[idx + 1] : null;
    var html = "";

    if (prev) {
      html +=
        '<a class="pager-link is-prev" href="' + prev.page.href + '">' +
          '<span class="pager-dir">← 上一篇</span>' +
          '<span class="pager-title">' + prev.page.title + "</span>" +
        "</a>";
    }
    if (next) {
      html +=
        '<a class="pager-link is-next" href="' + next.page.href + '">' +
          '<span class="pager-dir">下一篇 →</span>' +
          '<span class="pager-title">' + next.page.title + "</span>" +
        "</a>";
    }
    host.innerHTML = html;
  }

  /* ---------- 移动端默认折叠侧边栏 ---------- */
  function autoCollapse() {
    if (window.innerWidth > 980) return;
    var sidebar = $("#docs-sidebar");
    var btn = $("#docs-menu-toggle");
    if (!sidebar || !btn) return;
    sidebar.classList.add("is-collapsed");
    btn.setAttribute("aria-expanded", "false");
    btn.textContent = "展开目录";
  }

  /* ---------- 启动 ---------- */
  function boot() {
    var pageId = document.body.getAttribute("data-page") || "index";
    var flat = flatten();
    var current = null;
    flat.forEach(function (item) { if (item.page.id === pageId) current = item; });

    var group = current ? current.group : "文档";
    var title =
      document.body.getAttribute("data-title") ||
      (current ? current.page.title : document.title);

    renderSidebar(pageId);
    renderBreadcrumb(group, title);
    renderToc();
    renderPager(pageId);
    autoCollapse();

    // 若 main.js 已完成首轮初始化（脚本顺序相反时），补做一次目录高亮与代码块增强
    if (window.AiSearchSite && document.readyState !== "loading") {
      window.AiSearchSite.initCodeBlocks(document);
      window.AiSearchSite.initDocTocSpy();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
