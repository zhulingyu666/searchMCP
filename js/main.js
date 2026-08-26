/* ==========================================================================
   ai-search-mcp — 展示网站交互脚本（纯原生 JS，无依赖）
   公共能力通过 window.AiSearchDoc 暴露，供 docs 文档应用动态渲染后复用
   ========================================================================== */
(function () {
  "use strict";

  /* ---------- 工具函数 ---------- */
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };

  /* ---------- 主题切换 ---------- */
  var THEME_KEY = "aisearch-theme";
  var themeToggle = $("#theme-toggle");

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }
  }

  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem(THEME_KEY); } catch (e) { /* ignore */ }
    if (saved === "light" || saved === "dark") {
      applyTheme(saved);
    } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
      applyTheme("light");
    }
  }

  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      applyTheme(current === "dark" ? "light" : "dark");
    });
  }
  initTheme();

  /* ---------- 移动端主导航 ---------- */
  var navToggle = $("#nav-toggle");
  var navLinks = $("#nav-links");
  var header = $("#site-header");

  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      var open = navLinks.classList.toggle("is-open");
      navToggle.classList.toggle("is-open", open);
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
      navToggle.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
    });
    $$(".nav-link", navLinks).forEach(function (link) {
      link.addEventListener("click", function () {
        navLinks.classList.remove("is-open");
        navToggle.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* 导航滚动感知：顶部时完全透明无阴影（贴合背景），滚动后浮起（背景/模糊/阴影）
     注意：浏览器刷新后可能恢复上次滚动位置，需在 load 后再校正一次 */
  function onScrollHeader() {
    if (!header) return;
    var scrolled = window.scrollY > 24;
    header.classList.toggle("is-scrolled", scrolled);
  }
  onScrollHeader();
  window.addEventListener("load", onScrollHeader);

  /* ---------- 回到顶部 ---------- */
  var backTop = $("#back-top");
  function onScrollBackTop() {
    if (!backTop) return;
    if (window.scrollY > 500) backTop.classList.add("is-visible");
    else backTop.classList.remove("is-visible");
  }
  if (backTop) {
    backTop.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  /* ---------- Toast ---------- */
  var toastEl = $("#toast");
  var toastTimer = null;
  function showToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg || "已复制到剪贴板";
    toastEl.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("is-visible");
    }, 1800);
  }

  /* ---------- 复制能力 ---------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; });
    }
    return new Promise(function (resolve) {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand("copy");
        document.body.removeChild(ta);
        resolve(ok);
      } catch (e) {
        resolve(false);
      }
    });
  }

  function makeCopyBtn(container, getText) {
    var btn = document.createElement("button");
    btn.className = "copy-btn";
    btn.type = "button";
    btn.setAttribute("aria-label", "复制代码");
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2">' +
      '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></svg>' +
      "<span>复制</span>";
    btn.addEventListener("click", function () {
      copyText(getText()).then(function (ok) {
        if (ok) {
          btn.classList.add("is-copied");
          btn.querySelector("span").textContent = "已复制";
          showToast("已复制到剪贴板");
          setTimeout(function () {
            btn.classList.remove("is-copied");
            btn.querySelector("span").textContent = "复制";
          }, 1600);
        } else {
          showToast("复制失败，请手动选择复制");
        }
      });
    });
    container.style.position = "relative";
    container.appendChild(btn);
  }

  /* ---------- JSON 语法高亮 ---------- */
  function highlightJson(codeEl) {
    var raw = codeEl.textContent;
    var escaped = raw.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    var highlighted = escaped.replace(
      /("(?:[^"\\]|\\.)*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
      function (match, str, colon, bool, num) {
        if (str) {
          return colon
            ? '<span class="hl-key">' + str + "</span>" + colon
            : '<span class="hl-str">' + str + "</span>";
        }
        if (bool) return '<span class="hl-bool">' + bool + "</span>";
        if (num) return '<span class="hl-num">' + num + "</span>";
        return match;
      }
    );
    codeEl.innerHTML = highlighted;
  }

  /* ---------- 代码块增强（复制按钮 + JSON 高亮） ---------- */
  function enhanceCodeBlocks(root) {
    var scope = root || document;
    $$(".code-block", scope).forEach(function (block) {
      if (block.querySelector(".copy-btn")) return; /* 已增强 */
      var code = block.querySelector("code");
      if (!code) return;
      makeCopyBtn(block, function () {
        return block.querySelector("pre").innerText;
      });
    });
    $$("code.lang-json", scope).forEach(highlightJson);
  }

  /* ---------- 配置表格：KEY 复制 + 搜索过滤 ---------- */
  function initConfigSearch(root) {
    var scope = root || document;
    var search = $("#config-search", scope);
    var rows = $$("#config-table tbody tr", scope);
    if (!search || !rows.length) return;
    search.addEventListener("input", function () {
      var q = search.value.trim().toLowerCase();
      rows.forEach(function (row) {
        row.classList.toggle("is-hidden", !!(q && row.textContent.toLowerCase().indexOf(q) === -1));
      });
    });
  }

  function initKvCopy(root) {
    var scope = root || document;
    $$(".table-config .kv", scope).forEach(function (kv) {
      kv.addEventListener("click", function () {
        var tr = kv.closest("tr");
        var text = tr ? tr.getAttribute("data-kv") : kv.textContent;
        copyText(text).then(function (ok) {
          if (ok) showToast("已复制：" + text);
        });
      });
    });
  }

  /* ---------- Tab 切换（通用） ---------- */
  function initTabContainers(root) {
    var scope = root || document;
    $$("[data-tabs]", scope).forEach(function (tabsRoot) {
      if (tabsRoot._tabsInit) return;
      tabsRoot._tabsInit = true;
      var btns = $$(".tab-btn", tabsRoot);
      var panels = $$(".tab-panel", tabsRoot);
      btns.forEach(function (btn) {
        btn.addEventListener("click", function () {
          btns.forEach(function (b) { b.classList.remove("is-active"); });
          btn.classList.add("is-active");
          var target = btn.getAttribute("data-tab");
          panels.forEach(function (p) {
            p.classList.toggle("is-active", p.getAttribute("data-panel") === target);
          });
        });
      });
    });
  }

  /* ---------- FAQ：同一时间只展开一个 ---------- */
  function initFaq(root) {
    var scope = root || document;
    var items = $$("#faq-list .acc-item", scope);
    items.forEach(function (item) {
      if (item._faqInit) return;
      item._faqInit = true;
      item.addEventListener("toggle", function () {
        if (item.open) {
          items.forEach(function (other) {
            if (other !== item) other.open = false;
          });
        }
      });
    });
  }

  /* ---------- 引擎表格：类型筛选 + 搜索（主页） ---------- */
  function initEngineTable() {
    var engineFilter = $("#engine-filter");
    var engineSearch = $("#engine-search");
    var engineRows = $$("#engine-table tbody tr");
    if (!engineFilter) return;

    function filterEngines() {
      var active = engineFilter.querySelector(".seg-btn.is-active").getAttribute("data-filter");
      var q = (engineSearch ? engineSearch.value : "").trim().toLowerCase();
      engineRows.forEach(function (row) {
        var tags = (row.getAttribute("data-tags") || "").toLowerCase();
        var text = row.textContent.toLowerCase();
        var matchFilter =
          active === "all" ||
          (active === "free" && tags.indexOf("free") > -1) ||
          (active === "paid" && tags.indexOf("paid") > -1) ||
          (active === "cn" && tags.indexOf("cn") > -1);
        var matchQuery = !q || text.indexOf(q) > -1;
        row.classList.toggle("is-hidden", !(matchFilter && matchQuery));
      });
    }

    $$(".seg-btn", engineFilter).forEach(function (btn) {
      btn.addEventListener("click", function () {
        $$(".seg-btn", engineFilter).forEach(function (b) { b.classList.remove("is-active"); });
        btn.classList.add("is-active");
        filterEngines();
      });
    });
    if (engineSearch) engineSearch.addEventListener("input", filterEngines);
  }

  /* ---------- 带 data-copy 的按钮 ---------- */
  $$("[data-copy]").forEach(function (el) {
    el.addEventListener("click", function () {
      copyText(el.getAttribute("data-copy")).then(function (ok) {
        showToast(ok ? "已复制：" + el.getAttribute("data-copy") : "复制失败");
      });
    });
  });

  /* ---------- 滚动渐入动画 ---------- */
  var revealEls = $$(".reveal");
  /* 注意：.hero-inner 不使用 reveal（Hero 区由自身 CSS stagger 动画驱动，避免冲突） */
  var initialRevealEls = $$(".section .container");

  function showReveal(el) { el.classList.add("is-visible"); }

  initialRevealEls.forEach(function (el) {
    if (!el.classList.contains("reveal")) {
      el.classList.add("reveal");
      revealEls.push(el);
    }
  });

  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.04, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });

    setTimeout(function () {
      revealEls.forEach(function (el) {
        if (!el.classList.contains("is-visible")) {
          var r = el.getBoundingClientRect();
          if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("is-visible");
        }
      });
    }, 120);

    setTimeout(function () {
      revealEls.forEach(function (el) { el.classList.add("is-visible"); });
    }, 1000);
  } else {
    revealEls.forEach(showReveal);
  }

  /* ================= 主页导航 Scrollspy（滚动高亮 + 滑动下划线指示器） =================
     映射：data-nav → 页面 section id（"文档"为外部链接页，无对应区域，永不参与高亮；
     "主页"对应顶部 hero 区域） */
  var spyNav = $("#nav-links");
  var spyIndicator = $("#nav-indicator");
  var spyHomeLink = null;
  var spyItems = []; /* { nav, el } 有对应 section 的导航项 */
  var SPY_MAP = { features: "features", how: "how", engines: "engines" };

  if (spyNav && spyIndicator) {
    $$(".nav-link", spyNav).forEach(function (link) {
      var key = link.getAttribute("data-nav");
      if (key === "home") { spyHomeLink = link; return; }
      var sec = SPY_MAP[key] ? document.getElementById(SPY_MAP[key]) : null;
      if (sec) spyItems.push({ nav: link, el: sec });
    });
  }

  /* 仅当存在可跟踪区域（主页）且指示器存在时启用 */
  if (spyNav && spyIndicator && spyItems.length) {
    var SPY_OFFSET = 48; /* 探测线相对视口顶部的偏移（header 高度 + 容差） */

    function moveSpyIndicator(link) {
      var r = link.getBoundingClientRect();
      /* 基准必须用指示器的定位上下文（.nav 容器，position: relative + left: 0），
         而非 .nav-links —— 后者前面还有 brand 与 gap，原点不一致会导致下划线偏移 */
      var nr = spyIndicator.parentElement.getBoundingClientRect();
      spyIndicator.style.width = r.width + "px";
      spyIndicator.style.transform = "translateX(" + (r.left - nr.left) + "px)";
    }

    function setSpyActive(link) {
      $$(".nav-link", spyNav).forEach(function (l) {
        var on = l === link;
        l.classList.toggle("is-active", on);
        if (on) l.setAttribute("aria-current", "page");
        else l.removeAttribute("aria-current");
      });
      moveSpyIndicator(link);
    }

    function updateSpy() {
      /* 边界 1：页面顶部（含点击"主页"回到顶部）→ 高亮"主页" */
      if (window.scrollY <= 8 && spyHomeLink) { setSpyActive(spyHomeLink); return; }

      /* 重新计算各区域绝对位置（实时，避免布局变化误差） */
      var positions = spyItems.map(function (item) {
        var r = item.el.getBoundingClientRect();
        return { top: r.top + window.scrollY, bottom: r.bottom + window.scrollY, nav: item.nav };
      });

      /* 边界 2：接近页面底部 → 高亮最后一个区域（搜索引擎） */
      var docH = document.documentElement.scrollHeight;
      if (window.scrollY + window.innerHeight >= docH - 40) {
        setSpyActive(spyItems[spyItems.length - 1].nav);
        return;
      }

      /* 常规：探测线（视口顶部向下 SPY_OFFSET）取"最后一个上边界 <= 探测线"的区域，
         避免区域之间间隙与快速滚动导致的误判 */
      var probe = window.scrollY + SPY_OFFSET;
      var current = null;
      for (var i = positions.length - 1; i >= 0; i--) {
        if (probe >= positions[i].top) { current = positions[i].nav; break; }
      }
      if (!current) {
        /* 探测线在第一个区域之上 → 顶部（主页） */
        current = spyHomeLink || spyItems[0].nav;
      }
      setSpyActive(current);
    }

    /* 初次定位：先禁用过渡，避免加载时指示器从左上角滑入目标项；随后恢复正常过渡 */
    spyIndicator.style.transition = "none";
    updateSpy();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        spyIndicator.style.transition = "";
      });
    });

    /* resize（窗口宽度变化影响链接位置）时校正 */
    window.addEventListener("resize", function () { updateSpy(); });

    /* rAF 节流：滚动事件合并到每帧一次，快速滚动不闪烁、不堆积 */
    var spyTicking = false;
    window.addEventListener("scroll", function () {
      if (spyTicking) return;
      spyTicking = true;
      requestAnimationFrame(function () {
        updateSpy();
        spyTicking = false;
      });
    }, { passive: true });
  }

  window.addEventListener("scroll", function () {
    onScrollHeader();
    onScrollBackTop();
  }, { passive: true });

  /* ================= 交互动画增强 ================= */

  /* --- 数字滚动计数（hero stats） --- */
  function initCountUp() {
    var nums = $$(".stat-num");
    if (!nums.length || !("IntersectionObserver" in window)) return;
    var io2 = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        io2.unobserve(el);
        var target = parseInt(el.textContent, 10);
        if (isNaN(target) || target <= 0) return; /* 0 直接显示 */
        var start = null;
        var dur = Math.min(400 + target * 6, 1600);
        function step(ts) {
          if (!start) start = ts;
          var p = Math.min((ts - start) / dur, 1);
          var eased = 1 - Math.pow(1 - p, 3); /* easeOutCubic */
          el.textContent = Math.round(target * eased);
          if (p < 1) requestAnimationFrame(step);
          else el.textContent = target;
        }
        requestAnimationFrame(step);
      });
    }, { threshold: 0.5 });
    nums.forEach(function (el) { io2.observe(el); });
  }
  initCountUp();

  /* --- 卡片鼠标光晕跟随（spotlight） --- */
  function initSpotlight() {
    var targets = $$(".feature-card-lg, .how-step, .feature-item, .card");
    if (!targets.length || window.matchMedia("(hover: none)").matches) return;
    targets.forEach(function (el) {
      el.addEventListener("mousemove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%");
        el.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%");
      });
    });
  }
  initSpotlight();

  /* --- 按钮点击涟漪 --- */
  function initRipple() {
    $$(".btn").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        var r = btn.getBoundingClientRect();
        var size = Math.max(r.width, r.height);
        var span = document.createElement("span");
        span.className = "ripple";
        span.style.width = span.style.height = size + "px";
        span.style.left = (e.clientX - r.left - size / 2) + "px";
        span.style.top = (e.clientY - r.top - size / 2) + "px";
        btn.appendChild(span);
        setTimeout(function () { span.remove(); }, 600);
      });
    });
  }
  initRipple();

  /* ---------- 页面初始化（主页 / 文档页共用） ---------- */
  enhanceCodeBlocks(document);
  initTabContainers(document);
  initFaq(document);
  initConfigSearch(document);
  initKvCopy(document);
  initEngineTable();

  /* 暴露给 docs/app.js 动态渲染后调用 */
  window.AiSearchDoc = {
    enhanceCodeBlocks: enhanceCodeBlocks,
    initTabContainers: initTabContainers,
    initFaq: initFaq,
    initConfigSearch: initConfigSearch,
    initKvCopy: initKvCopy,
    showToast: showToast,
    copyText: copyText
  };
})();
