/* ============================================================
   闲云阁 · 共享脚本：主题切换 / 移动端菜单 / 复制 / Toast / 动效
   ============================================================ */

(function () {
  "use strict";

  /* ---------- 深浅主题 ---------- */
  var THEME_KEY = "xyg-theme";
  var root = document.documentElement;

  function applyTheme(t) {
    root.setAttribute("data-theme", t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", t === "dark" ? "#10161280" : "#f5f8f4cc");
  }

  // head 内已有预置脚本设置了初始主题，这里只负责切换
  var toggleBtn = document.getElementById("themeToggle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      applyTheme(next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    });
  }

  /* ---------- 移动端菜单 ---------- */
  var menuBtn = document.getElementById("menuBtn");
  var nav = document.getElementById("siteNav");
  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      nav.classList.toggle("open");
    });
    document.addEventListener("click", function (e) {
      if (!nav.contains(e.target)) nav.classList.remove("open");
    });
  }

  /* ---------- 当前导航高亮 ---------- */
  var links = document.querySelectorAll(".nav a");
  var path = location.pathname.split("/").pop() || "index.html";
  links.forEach(function (a) {
    var target = a.getAttribute("href");
    if (target === path) {
      a.classList.add("active");
      a.setAttribute("aria-current", "page");
    }
  });

  /* ---------- 复制到剪贴板（含 http 降级） ---------- */
  window.xygCopy = function (text) {
    return new Promise(function (resolve) {
      function fallback() {
        try {
          var ta = document.createElement("textarea");
          ta.value = text;
          ta.style.cssText = "position:fixed;opacity:0;top:0;left:0;";
          document.body.appendChild(ta);
          ta.select();
          var ok = document.execCommand("copy");
          document.body.removeChild(ta);
          resolve(ok);
        } catch (e) { resolve(false); }
      }
      if (navigator.clipboard && window.isSecureContext !== false) {
        navigator.clipboard.writeText(text).then(
          function () { resolve(true); },
          fallback
        );
      } else {
        fallback();
      }
    });
  };

  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      window.xygCopy(btn.getAttribute("data-copy")).then(function (ok) {
        showToast(ok ? "已复制：" + btn.getAttribute("data-copy") : "复制失败，请手动复制");
      });
    });
  });

  /* ---------- Toast ---------- */
  var toastEl = document.getElementById("toast");
  var toastTimer = null;
  window.showToast = function (msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove("show");
    }, 2200);
  };

  /* ---------- 进场动效 ---------- */
  var revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    revealEls.forEach(function (el, i) {
      el.style.transitionDelay = Math.min(i * 60, 300) + "ms";
      io.observe(el);
    });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in"); });
  }
})();
