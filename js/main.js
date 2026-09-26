/* ==========================================================================
   ai-search-mcp — 官网交互脚本 v2
   纯原生 JavaScript，零依赖、零构建。所有能力挂在 window.AiSearchSite 上，
   供首页与文档页共用。
   --------------------------------------------------------------------------
   模块：主题 / 导航抽屉 / 阅读进度条 / 回到顶部 / Toast 与复制 / 代码高亮
        / 标签页 / 引擎筛选 / 环境变量检索 / 终端逐行动画 / 快速跳转面板
        / 入场动画 / 数字滚动 / 滚动高亮 / 宽表格降级 / 文档目录 / 快捷键
   约定：boot() 内逐个 try/catch，任一模块异常不中断后续初始化；
        入场动画隐藏规则只挂 html.reveal-armed（见 initReveal）。
   ========================================================================== */
(function () {
  "use strict";

  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };

  var THEME_KEY = "aisearch-theme";
  var reduceMotion = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;

  /* ======================================================================
     1 · 主题
     ====================================================================== */
  function currentTheme() {
    var t = document.documentElement.getAttribute("data-theme");
    return t === "light" ? "light" : "dark";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* 隐私模式下忽略 */ }
    var meta = $('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#f5f7fc" : "#04060d");
  }

  function initTheme() {
    var btn = $("#theme-toggle");
    if (!btn) return;
    btn.addEventListener("click", function () {
      applyTheme(currentTheme() === "dark" ? "light" : "dark");
    });
  }

  /* ======================================================================
     2 · 导航：移动端抽屉 + 滚动状态
     ====================================================================== */
  function initNav() {
    var toggle = $("#nav-toggle");
    var links = $("#nav-links");
    var header = $("#site-header");
    var backdrop = null;

    // 背景遮罩由 JS 注入，避免污染每页的 HTML
    if (toggle && links) {
      backdrop = document.createElement("div");
      backdrop.className = "nav-backdrop";
      document.body.appendChild(backdrop);

      var closeMenu = function () {
        links.classList.remove("is-open");
        backdrop.classList.remove("is-visible");
        toggle.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        toggle.setAttribute("aria-label", "打开菜单");
      };

      toggle.addEventListener("click", function () {
        var open = links.classList.toggle("is-open");
        backdrop.classList.toggle("is-visible", open);
        toggle.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
        toggle.setAttribute("aria-label", open ? "关闭菜单" : "打开菜单");
      });

      $$(".nav-link", links).forEach(function (a) {
        a.addEventListener("click", closeMenu);
      });
      backdrop.addEventListener("click", closeMenu);
      document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeMenu();
      });
    }

    if (header) {
      var onScroll = function () {
        header.classList.toggle("is-scrolled", window.scrollY > 20);
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("load", onScroll);
    }
  }

  /* ======================================================================
     3 · 阅读进度条（元素由 JS 注入）
     ====================================================================== */
  function initProgress() {
    var bar = document.createElement("div");
    bar.className = "progress";
    bar.setAttribute("aria-hidden", "true");
    document.body.appendChild(bar);

    var raf = 0;
    var update = function () {
      raf = 0;
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var ratio = max > 0 ? Math.min(1, window.scrollY / max) : 0;
      bar.style.transform = "scaleX(" + ratio + ")";
      bar.classList.toggle("is-visible", window.scrollY > 40);
    };
    var onScroll = function () {
      if (!raf) raf = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
  }

  /* ======================================================================
     4 · 回到顶部
     ====================================================================== */
  function initBackTop() {
    var btn = $("#back-top");
    if (!btn) return;
    var onScroll = function () {
      btn.classList.toggle("is-visible", window.scrollY > 520);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    btn.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }

  /* ======================================================================
     5 · Toast + 复制
     ====================================================================== */
  var toastTimer = null;
  function showToast(msg) {
    var el = $("#toast");
    if (!el) return;
    el.textContent = msg || "已复制到剪贴板";
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("is-visible"); }, 1900);
  }

  function copyText(text, onDone) {
    var done = function () {
      if (typeof onDone === "function") onDone();
      else showToast("已复制到剪贴板");
    };
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done, function () { legacyCopy(text, done); });
    } else {
      legacyCopy(text, done);
    }
  }

  function legacyCopy(text, done) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:-1000px;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      done();
    } catch (e) {
      showToast("复制失败，请手动选择");
    }
  }

  function initCopy() {
    document.addEventListener("click", function (e) {
      var trigger = e.target.closest ? e.target.closest("[data-copy]") : null;
      if (trigger) {
        e.preventDefault();
        copyText(trigger.getAttribute("data-copy"), null);
        return;
      }
      var btn = e.target.closest ? e.target.closest(".copy-btn") : null;
      if (btn) {
        var block = btn.closest(".code-block");
        var code = block ? $("code", block) : null;
        if (code) {
          copyText(code.innerText, function () {
            var label = $(".copy-label", btn);
            btn.classList.add("is-done");
            if (label) label.textContent = "已复制";
            showToast("已复制到剪贴板");
            setTimeout(function () {
              btn.classList.remove("is-done");
              if (label) label.textContent = "复制";
            }, 1800);
          });
        }
      }
    });
  }

  /* ======================================================================
     6 · 代码块：注入复制按钮 + JSON 高亮
     ====================================================================== */
  var JSON_TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|([{}[\],:])/g;

  function escapeHtml(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return c === "&" ? "&amp;" : c === "<" ? "&lt;" : "&gt;";
    });
  }

  function highlightJson(text) {
    var out = "";
    var last = 0;
    text.replace(JSON_TOKEN, function (m, str, colon, bool, num, punct, offset) {
      out += escapeHtml(text.slice(last, offset));
      if (str !== undefined) {
        out += colon
          ? '<span class="tk-key">' + escapeHtml(str) + "</span>" + escapeHtml(colon)
          : '<span class="tk-str">' + escapeHtml(str) + "</span>";
      } else if (bool !== undefined) {
        out += '<span class="tk-bool">' + bool + "</span>";
      } else if (num !== undefined) {
        out += '<span class="tk-num">' + num + "</span>";
      } else if (punct !== undefined) {
        out += '<span class="tk-punct">' + escapeHtml(punct) + "</span>";
      }
      last = offset + m.length;
      return m;
    });
    out += escapeHtml(text.slice(last));
    return out;
  }

  function initCodeBlocks(root) {
    $$(".code-block", root).forEach(function (block) {
      var code = $("code", block);
      if (!code) return;

      var lang = (block.getAttribute("data-lang") || "").toLowerCase();
      if (lang === "json" && !code.getAttribute("data-highlighted")) {
        code.innerHTML = highlightJson(code.textContent);
        code.setAttribute("data-highlighted", "1");
      }

      if (!$(".copy-btn", block) && block.getAttribute("data-no-copy") !== "1") {
        var head = $(".code-head", block);
        if (!head) {
          head = document.createElement("div");
          head.className = "code-head";
          var langSpan = document.createElement("span");
          langSpan.className = "code-lang";
          langSpan.textContent = lang || "text";
          head.appendChild(langSpan);
          block.insertBefore(head, block.firstChild);
        }
        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "copy-btn";
        btn.setAttribute("aria-label", "复制代码");
        btn.innerHTML =
          '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" ' +
          'stroke-width="2" aria-hidden="true"><rect x="9" y="9" width="11" height="11" rx="2"/>' +
          '<path d="M5 15V5a2 2 0 0 1 2-2h8" stroke-linecap="round"/></svg>' +
          '<span class="copy-label">复制</span>';
        head.appendChild(btn);
      }
    });
  }

  /* ======================================================================
     7 · 标签页 / 面板切换（通用）
     容器标记 [data-tabs]，按钮 [data-tab="k"]，面板 [data-panel="k"]
     ====================================================================== */
  function initTabs(root) {
    $$("[data-tabs]", root).forEach(function (group) {
      var buttons = $$("[data-tab]", group);
      var panels = $$("[data-panel]", group);
      if (!buttons.length || !panels.length) return;

      function activate(key) {
        buttons.forEach(function (b) {
          b.classList.toggle("is-active", b.getAttribute("data-tab") === key);
          b.setAttribute("aria-selected", b.getAttribute("data-tab") === key ? "true" : "false");
        });
        panels.forEach(function (p) {
          var match = p.getAttribute("data-panel") === key;
          p.classList.toggle("is-active", match);
          if (match) p.removeAttribute("hidden");
          else p.setAttribute("hidden", "");
        });
      }

      buttons.forEach(function (b) {
        b.addEventListener("click", function () { activate(b.getAttribute("data-tab")); });
      });

      var initial = buttons.filter(function (b) { return b.classList.contains("is-active"); })[0] || buttons[0];
      activate(initial.getAttribute("data-tab"));
    });
  }

  /* ======================================================================
     8 · 引擎表格筛选
     ====================================================================== */
  function initEngineTable() {
    var segs = $$("#engine-filter .seg-btn");
    var input = $("#engine-search");
    var rows = $$("#engine-table tbody tr");
    if (!rows.length) return;

    var filter = "all";

    function apply() {
      var kw = (input && input.value ? input.value : "").trim().toLowerCase();
      var shown = 0;
      rows.forEach(function (row) {
        var tags = (row.getAttribute("data-tags") || "").toLowerCase();
        var text = row.textContent.toLowerCase();
        var okFilter = filter === "all" || tags.indexOf(filter) !== -1;
        var okKw = !kw || text.indexOf(kw) !== -1 || tags.indexOf(kw) !== -1;
        var show = okFilter && okKw;
        row.style.display = show ? "" : "none";
        if (show) shown += 1;
      });
      var empty = $("#engine-empty");
      if (empty) empty.style.display = shown === 0 ? "" : "none";
    }

    segs.forEach(function (b) {
      b.addEventListener("click", function () {
        segs.forEach(function (x) { x.classList.remove("is-active"); });
        b.classList.add("is-active");
        filter = b.getAttribute("data-filter") || "all";
        apply();
      });
    });

    if (input) input.addEventListener("input", apply);
  }

  /* ======================================================================
     9 · 环境变量检索（文档页）
     ====================================================================== */
  function initEnvSearch() {
    var input = $("#env-search");
    if (!input) return;
    var cards = $$("[data-env]");
    input.addEventListener("input", function () {
      var kw = input.value.trim().toLowerCase();
      cards.forEach(function (card) {
        var hay = (card.getAttribute("data-env") + " " + card.textContent).toLowerCase();
        card.style.display = !kw || hay.indexOf(kw) !== -1 ? "" : "none";
      });
    });
  }

  /* ======================================================================
     10 · 终端逐行动画
     结构约定：.terminal[data-animate] 内的 .term-line 依次显示；
     第一行带 data-cmd="命令文本"，命令会逐字打入 .term-type。
     无 JS / 降级：不添加 .is-armed，全部行默认可见。
     ====================================================================== */
  function playTerminal(term) {
    var lines = $$(".term-line", term);
    if (!lines.length) return;

    term.classList.add("is-armed");
    var cmdLine = lines[0];
    var typeEl = $(".term-type", cmdLine);
    var fullCmd = cmdLine.getAttribute("data-cmd") || "";
    cmdLine.classList.add("is-on");

    var revealRest = function () {
      var i = 1;
      var step = function () {
        if (i >= lines.length) return;
        lines[i].classList.add("is-on");
        i += 1;
        setTimeout(step, 300);
      };
      setTimeout(step, 260);
    };

    if (!typeEl || reduceMotion || !fullCmd) {
      if (typeEl) typeEl.textContent = fullCmd;
      revealRest();
      return;
    }

    var pos = 0;
    var tick = function () {
      pos += 1;
      typeEl.textContent = fullCmd.slice(0, pos);
      if (pos < fullCmd.length) {
        setTimeout(tick, 46 + Math.random() * 60);
      } else {
        setTimeout(revealRest, 300);
      }
    };
    setTimeout(tick, 420);
  }

  function initTerminal() {
    var term = $(".terminal[data-animate]");
    if (!term) return;
    if (reduceMotion || !("IntersectionObserver" in window)) return; // 静态展示即可

    var played = false;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting || played) return;
        played = true;
        io.disconnect();
        try {
          playTerminal(term);
        } catch (err) {
          term.classList.remove("is-armed"); // 出错退回静态完整展示
        }
      });
    }, { threshold: 0.35 });
    io.observe(term);
  }

  /* ======================================================================
     11 · 快速跳转面板（Ctrl/⌘+K 或 /）
     站内导航检索：落地页章节 + 全部文档页。仅做定位跳转，不做联网搜索。
     ====================================================================== */
  function buildCmdkIndex() {
    var isDocs = !!$(".docs-layout");
    var base = isDocs ? ".." : ".";

    var landing = [
      { name: "主页 · 为什么选它", hint: "四种方案对比与核心能力", kw: "why features 对比 特性", url: "/index.html#features" },
      { name: "主页 · 工作原理", hint: "三步拿到可用结果 + 架构图", kw: "how 架构 流程", url: "/index.html#how" },
      { name: "主页 · 四大工具", hint: "search / research / fetch_page / status", kw: "tools 工具", url: "/index.html#tools" },
      { name: "主页 · 引擎矩阵", hint: "9 个引擎筛选与对比", kw: "engines 引擎", url: "/index.html#engines" },
      { name: "主页 · 配置速览", hint: "常用环境变量", kw: "config 环境变量 配置", url: "/index.html#config" }
    ];

    var docs = [
      { name: "文档 · 概览", hint: "项目定位与核心能力", kw: "overview 概览 介绍", page: "index.html" },
      { name: "文档 · 快速开始", hint: "3 步接入 MCP 客户端", kw: "quickstart 接入 安装 mcpServers", page: "quickstart.html" },
      { name: "文档 · 工具指南", hint: "四个工具的参数与用法", kw: "guide 工具 search research fetch", page: "guide.html" },
      { name: "文档 · 引擎详解", hint: "引擎链与 9 个引擎选型", kw: "engines 引擎 bing baidu", page: "engines.html" },
      { name: "文档 · API 参考", hint: "参数、返回值与错误码", kw: "api 错误码 schema", page: "api.html" },
      { name: "文档 · 配置指南", hint: "19 个环境变量", kw: "config 环境变量 env", page: "config.html" },
      { name: "文档 · 常见问题", hint: "接入与排错 FAQ", kw: "faq 问题 排错 限流", page: "faq.html" }
    ];

    var items = [];
    landing.forEach(function (p) {
      items.push({ name: p.name, hint: p.hint, kw: p.kw, group: "主页", url: base + p.url });
    });
    docs.forEach(function (p) {
      items.push({ name: p.name, hint: p.hint, kw: p.kw, group: "文档", url: base + "/docs/" + p.page });
    });
    return items;
  }

  function initCmdk() {
    var overlay = $("#cmdk");
    if (!overlay) {
      // 面板 DOM 由本模块注入，落地页与 7 个文档页共用同一份能力
      overlay = document.createElement("div");
      overlay.className = "cmdk";
      overlay.id = "cmdk";
      overlay.setAttribute("hidden", "");
      overlay.innerHTML =
        '<div class="cmdk-backdrop"></div>' +
        '<div class="cmdk-panel" role="dialog" aria-modal="true" aria-label="快速跳转">' +
          '<div class="cmdk-head">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3" stroke-linecap="round"/></svg>' +
            '<input id="cmdk-input" type="text" placeholder="搜索页面与章节，回车跳转…" aria-label="搜索页面与章节">' +
            "<kbd>ESC</kbd>" +
          "</div>" +
          '<ul class="cmdk-list" id="cmdk-list" role="listbox" aria-label="跳转目标"></ul>' +
          '<div class="cmdk-foot"><span><kbd>↑</kbd><kbd>↓</kbd> 选择</span><span><kbd>↵</kbd> 跳转</span><span><kbd>ESC</kbd> 关闭</span></div>' +
        "</div>";
      document.body.appendChild(overlay);
    }
    if (overlay.getAttribute("data-bound") === "1") return;
    overlay.setAttribute("data-bound", "1");

    var input = $("#cmdk-input", overlay);
    var list = $("#cmdk-list", overlay);
    if (!input || !list) return;

    var items = buildCmdkIndex();
    var filtered = items.slice();
    var active = 0;
    var lastFocus = null;

    function render() {
      if (!filtered.length) {
        list.innerHTML = '<li class="cmdk-empty">没有匹配的页面，换个关键词试试。</li>';
        return;
      }
      var html = "";
      var icon =
        '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" ' +
        'stroke-width="1.8" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      filtered.forEach(function (item, i) {
        html +=
          '<li class="cmdk-item' + (i === active ? " is-active" : "") + '" role="option" ' +
          'aria-selected="' + (i === active) + '" data-idx="' + i + '">' + icon +
          '<span class="cmdk-text"><span class="cmdk-name">' + item.name + "</span>" +
          '<span class="cmdk-hint">' + item.hint + "</span></span>" +
          '<span class="cmdk-group">' + item.group + "</span></li>";
      });
      list.innerHTML = html;
      var el = $(".cmdk-item.is-active", list);
      if (el) el.scrollIntoView({ block: "nearest" });
    }

    function applyFilter() {
      var kw = input.value.trim().toLowerCase();
      filtered = !kw
        ? items.slice()
        : items.filter(function (it) {
            return (it.name + " " + it.hint + " " + it.kw).toLowerCase().indexOf(kw) !== -1;
          });
      active = 0;
      render();
    }

    function open() {
      lastFocus = document.activeElement;
      overlay.removeAttribute("hidden");
      input.value = "";
      applyFilter();
      document.body.style.overflow = "hidden";
      setTimeout(function () { input.focus(); }, 30);
    }

    function close() {
      overlay.setAttribute("hidden", "");
      document.body.style.overflow = "";
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function go(item) {
      if (!item) return;
      close();
      window.location.href = item.url;
    }

    function move(delta) {
      if (!filtered.length) return;
      active = (active + delta + filtered.length) % filtered.length;
      render();
    }

    input.addEventListener("input", applyFilter);
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); move(-1); }
      else if (e.key === "Enter") { e.preventDefault(); go(filtered[active]); }
      else if (e.key === "Escape") { e.preventDefault(); close(); }
    });

    list.addEventListener("click", function (e) {
      var li = e.target.closest ? e.target.closest(".cmdk-item") : null;
      if (li) go(filtered[Number(li.getAttribute("data-idx"))]);
    });
    list.addEventListener("mousemove", function (e) {
      var li = e.target.closest ? e.target.closest(".cmdk-item") : null;
      if (!li) return;
      var idx = Number(li.getAttribute("data-idx"));
      if (idx !== active) { active = idx; render(); }
    });

    var backdrop = $(".cmdk-backdrop", overlay);
    if (backdrop) backdrop.addEventListener("click", close);

    // 头部触发按钮（由本模块注入）
    var actions = $(".nav-actions");
    if (actions && !$("#cmdk-open")) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cmdk-trigger";
      btn.id = "cmdk-open";
      btn.setAttribute("aria-label", "快速跳转（Ctrl K）");
      btn.innerHTML =
        '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" ' +
        'stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3" stroke-linecap="round"/></svg>' +
        "<kbd>Ctrl K</kbd>";
      btn.addEventListener("click", open);
      actions.insertBefore(btn, actions.firstChild);
    }

    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        if (overlay.hasAttribute("hidden")) open(); else close();
      }
    });
  }

  /* ======================================================================
     12 · 入场动画 + 数字滚动
     ====================================================================== */
  function initReveal() {
    var targets = $$(".reveal, .stagger");
    if (!targets.length) return;

    var revealAll = function () {
      targets.forEach(function (el) { el.classList.add("is-visible"); });
    };

    if (reduceMotion || !("IntersectionObserver" in window)) {
      revealAll();
      return;
    }

    // 只有真正走到这一步才「武装」入场动画。CSS 的隐藏规则挂在 .reveal-armed 上，
    // 因此即使 main.js 完全没执行（或在本函数之前就抛错），内容也始终可见 ——
    // 宁可没有动画，也绝不能出现整页空白。
    document.documentElement.classList.add("reveal-armed");

    var fired = false;
    var io = new IntersectionObserver(function (entries) {
      fired = true;
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -6% 0px", threshold: 0 });

    targets.forEach(function (el) { io.observe(el); });

    // 兜底：个别内嵌预览 / iframe 环境下观察器可能始终不回调，
    // 1.2s 后仍未收到任何回调就强制显示全部内容。
    setTimeout(function () {
      if (!fired) revealAll();
    }, 1200);
  }

  function initCountUp() {
    var nums = $$("[data-count]");
    if (!nums.length) return;

    var run = function (el) {
      var target = Number(el.getAttribute("data-count"));
      var suffix = el.getAttribute("data-suffix") || "";
      if (!isFinite(target) || reduceMotion) {
        el.textContent = String(target) + suffix;
        return;
      }
      var start = performance.now();
      var dur = 900;
      function tick(now) {
        var p = Math.min(1, (now - start) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = String(Math.round(target * eased)) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    };

    if (!("IntersectionObserver" in window)) {
      nums.forEach(run);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        run(entry.target);
        io.unobserve(entry.target);
      });
    }, { threshold: 0.4 });
    nums.forEach(function (el) { io.observe(el); });
  }

  /* ======================================================================
     13 · 首页导航滚动高亮
     ====================================================================== */
  function initScrollSpy() {
    var links = $$(".nav-link[data-nav]").filter(function (a) {
      return (a.getAttribute("href") || "").indexOf("#") !== -1;
    });
    if (!links.length || !("IntersectionObserver" in window)) return;

    var map = [];
    links.forEach(function (a) {
      var id = a.getAttribute("href").split("#")[1];
      var section = id ? document.getElementById(id) : null;
      if (section) map.push({ link: a, section: section });
    });
    if (!map.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        map.forEach(function (m) { m.link.classList.toggle("is-active", m.section === entry.target); });
      });
    }, { rootMargin: "-25% 0px -60% 0px" });

    map.forEach(function (m) { io.observe(m.section); });

    window.addEventListener("scroll", function () {
      if (window.scrollY < 120) {
        map.forEach(function (m) {
          m.link.classList.toggle("is-active", m.link.getAttribute("data-nav") === "home");
        });
      }
    }, { passive: true });
  }

  /* ======================================================================
     14 · 宽表格的移动端降级
     把 <thead> 的文字写进每个 <td data-label>，CSS 在窄屏据此把表格行
     渲染成「标签 + 值」的卡片，彻底消除横向滚动。
     ====================================================================== */
  function initResponsiveTables(root) {
    $$(".table[data-stack]", root).forEach(function (table) {
      var heads = $$("thead th", table).map(function (th) {
        return th.textContent.trim();
      });
      if (!heads.length) return;
      $$("tbody tr", table).forEach(function (row) {
        $$("td", row).forEach(function (td, i) {
          if (!td.hasAttribute("data-label")) {
            td.setAttribute("data-label", heads[i] || "");
          }
        });
      });
    });
  }

  /* ======================================================================
     15 · 文档站滚动高亮（页内目录）
     ====================================================================== */
  function initDocTocSpy() {
    var list = $("#docs-toc-list");
    if (!list || !("IntersectionObserver" in window)) return;
    if (list.getAttribute("data-spy-bound") === "1") return; // 幂等：避免重复绑定
    list.setAttribute("data-spy-bound", "1");
    var links = $$("a", list);
    if (!links.length) return;

    var map = links.map(function (a) {
      var id = decodeURIComponent((a.getAttribute("href") || "").replace(/^#/, ""));
      return { link: a, target: id ? document.getElementById(id) : null };
    }).filter(function (m) { return m.target; });
    if (!map.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        map.forEach(function (m) { m.link.classList.toggle("is-active", m.target === entry.target); });
      });
    }, { rootMargin: "-12% 0px -72% 0px" });

    map.forEach(function (m) { io.observe(m.target); });
  }

  /* ======================================================================
     16 · 文档侧边栏移动端折叠
     ====================================================================== */
  function initDocsMenu() {
    var btn = $("#docs-menu-toggle");
    var sidebar = $("#docs-sidebar");
    if (!btn || !sidebar) return;
    btn.addEventListener("click", function () {
      var collapsed = sidebar.classList.toggle("is-collapsed");
      btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
      btn.textContent = collapsed ? "展开目录" : "收起目录";
    });
  }

  /* ======================================================================
     17 · 键盘快捷键："/" 聚焦搜索框，否则打开快速跳转
     ====================================================================== */
  function initShortcuts() {
    document.addEventListener("keydown", function (e) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      var tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target.isContentEditable) return;
      var box = $("#engine-search") || $("#env-search");
      if (box) { e.preventDefault(); box.focus(); }
    });
  }

  /* ======================================================================
     启动
     ====================================================================== */
  function boot() {
    // 逐个隔离：任一模块出错都必须被吞掉，否则会中断后续初始化。
    // （曾经因为这里一个 TypeError 没被捕获，导致 initReveal 未执行、整页空白）
    [
      initTheme,
      initNav,
      initProgress,
      initBackTop,
      initCopy,
      function () { initCodeBlocks(document); },
      function () { initTabs(document); },
      initEngineTable,
      function () { initResponsiveTables(document); },
      initEnvSearch,
      initTerminal,
      initCmdk,
      initReveal,
      initCountUp,
      initScrollSpy,
      initDocTocSpy,
      initDocsMenu,
      initShortcuts
    ].forEach(function (step) {
      try {
        step();
      } catch (err) {
        if (window.console && console.warn) {
          console.warn("[ai-search-mcp] 初始化步骤失败（已跳过）:", err && err.message ? err.message : err);
        }
      }
    });
  }

  window.AiSearchSite = {
    boot: boot,
    copyText: copyText,
    showToast: showToast,
    highlightJson: highlightJson,
    initCodeBlocks: initCodeBlocks,
    initDocTocSpy: initDocTocSpy,
    initResponsiveTables: initResponsiveTables,
    applyTheme: applyTheme,
    currentTheme: currentTheme
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
