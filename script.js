(function () {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const prefersReducedMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ----- Cursor glow + subtle parallax -----
  if (!prefersReducedMotion) {
    const glow = document.createElement("div");
    glow.className = "cursor-glow";
    document.body.appendChild(glow);

    let mouseX = window.innerWidth * 0.5;
    let mouseY = window.innerHeight * 0.5;
    let raf = null;
    const updateGlow = () => {
      raf = null;
      document.body.style.setProperty("--mx", `${mouseX}px`);
      document.body.style.setProperty("--my", `${mouseY}px`);
    };
    window.addEventListener("pointermove", (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!raf) raf = window.requestAnimationFrame(updateGlow);
    }, { passive: true });

    // Parallax for hero card/visual elements.
    const parallaxEls = $$("[data-reveal]");
    let scrollRaf = null;
    const onParallax = () => {
      scrollRaf = null;
      const y = window.scrollY;
      const factor = Math.min(16, y * 0.03);
      parallaxEls.forEach((el, i) => {
        if (i > 5) return; // keep it lightweight
        el.style.setProperty("--parallax-y", `${(-(factor * (0.08 + i * 0.01))).toFixed(2)}px`);
      });
    };
    window.addEventListener("scroll", () => {
      if (!scrollRaf) scrollRaf = window.requestAnimationFrame(onParallax);
    }, { passive: true });
  }

  // ----- Loading screen -----
  const loadingScreen = $("#loadingScreen");
  const loadingBar = $("[data-loading-bar]");
  const loadingFill = $("[data-loading-fill]");
  const loadingSub = $("[data-loading-sub]");

  if (loadingScreen) {
    document.body.classList.add("is-loading");
    const startTs = performance.now();
    const minShowMs = prefersReducedMotion ? 450 : 3200;
    let progress = 0;
    const setProgress = (value) => {
      progress = Math.max(0, Math.min(100, value));
      if (loadingFill) loadingFill.style.width = `${progress}%`;
      if (loadingBar) loadingBar.setAttribute("aria-valuenow", String(progress));
    };
    setProgress(0);

    const messages = ["Just a sec.", "Warming up effects.", "Polishing details.", "Almost there…"];
    let msgIndex = 0;

    let intervalId = null;
    if (!prefersReducedMotion) {
      intervalId = window.setInterval(() => {
        // Move smoothly toward 90–92% while assets load.
        if (progress >= 92) return;
        const jump = Math.max(1, Math.round(Math.random() * 6));
        setProgress(Math.min(92, progress + jump));
        const target = Math.floor(progress / 25);
        if (target > msgIndex && msgIndex < messages.length - 1) {
          msgIndex = target;
          if (loadingSub) loadingSub.textContent = messages[msgIndex];
        }
      }, 65);
    }

    const complete = () => {
      // Ensure we show the loading process for a bit longer.
      const elapsed = performance.now() - startTs;
      const waitMs = Math.max(0, minShowMs - elapsed);

      const finalize = () => {
        if (intervalId) window.clearInterval(intervalId);
        const from = progress;
        const duration = prefersReducedMotion ? 0 : 900;
        const start = performance.now();

        const tick = (now) => {
          const t = duration ? Math.min(1, (now - start) / duration) : 1;
          const eased = 1 - Math.pow(1 - t, 3);
          const value = Math.round(from + (100 - from) * eased);
          setProgress(value);

          if (t < 1) {
            requestAnimationFrame(tick);
            return;
          }

          if (loadingSub) loadingSub.textContent = "Ready.";
          loadingScreen.setAttribute("aria-busy", "false");
          loadingScreen.classList.add("is-hidden");
          document.body.classList.remove("is-loading");

          window.setTimeout(() => {
            loadingScreen.remove();
          }, prefersReducedMotion ? 0 : 650);
        };

        requestAnimationFrame(tick);
      };

      // If the page loads fast, we still wait so users see the full progress.
      window.setTimeout(finalize, waitMs);
    };

    if (document.readyState === "complete") complete();
    else window.addEventListener("load", complete, { once: true });
  }

  // ----- Theme -----
  const rootEl = document.documentElement;
  const themeToggleButtons = $$("[data-theme-toggle], [data-theme-toggle-footer]");
  const STORAGE_KEY = "portfolio_theme";

  function getSystemTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }

  function applyTheme(theme) {
    // theme: "light" | "dark" | "auto"
    if (theme === "auto") {
      const sys = getSystemTheme();
      rootEl.dataset.theme = sys;
      return;
    }
    rootEl.dataset.theme = theme;
  }

  function loadTheme() {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    const theme = saved || "auto";
    rootEl.dataset.theme = "auto";
    applyTheme(theme);
  }

  // Apply saved theme on first load.
  loadTheme();

  function cycleTheme() {
    // Only cycles between explicit light/dark; "auto" becomes system on reload.
    const current = rootEl.dataset.theme === "light" ? "light" : "dark";
    const next = current === "light" ? "dark" : "light";
    window.localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  }

  themeToggleButtons.forEach((btn) => {
    btn.addEventListener("click", () => cycleTheme());
  });

  // ----- Header Elevation -----
  const header = $(".site-header");
  const onScroll = () => {
    if (!header) return;
    const elevate = window.scrollY > 8;
    header.classList.toggle("is-elevated", elevate);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // ----- Smooth navigation + Active state (scrollspy) -----
  const navLinks = $$("[data-nav-link]");
  const sections = ["about", "projects", "experience", "education", "contact"]
    .map((id) => document.getElementById(id))
    .filter(Boolean);

  function setActiveLink(id) {
    navLinks.forEach((a) => {
      const href = a.getAttribute("href") || "";
      const targetId = href.startsWith("#") ? href.slice(1) : null;
      a.classList.toggle("is-active", targetId === id);
    });
  }

  function scrollToHash(targetId) {
    const target = document.getElementById(targetId);
    if (!target) return;
    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target.scrollIntoView({ behavior: prefersReduced ? "auto" : "smooth", block: "start" });
  }

  navLinks.forEach((a) => {
    a.addEventListener("click", (e) => {
      const href = a.getAttribute("href") || "";
      if (!href.startsWith("#")) return;
      e.preventDefault();
      const id = href.slice(1);
      // Close mobile menu if open
      document.body.classList.remove("nav-open");
      $(".nav")?.classList.remove("is-open");
      a.blur();
      scrollToHash(id);
      history.pushState(null, "", href);
    });
  });

  // Mobile hamburger
  const hamburger = $("[data-hamburger]");
  const nav = $(".nav");
  if (hamburger && nav) {
    hamburger.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      document.body.classList.toggle("nav-open", isOpen);
      hamburger.setAttribute("aria-expanded", String(isOpen));
    });
  }

  // Scrollspy
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio || 0) - (a.intersectionRatio || 0))[0];
        if (!visible) return;
        const id = visible.target.id;
        if (id) setActiveLink(id);
      },
      { root: null, threshold: [0.15, 0.25, 0.4], rootMargin: "-15% 0px -70% 0px" }
    );
    sections.forEach((s) => observer.observe(s));
  }

  // ----- Reveal animations -----
  const revealEls = $$("[data-reveal]");
  if ("IntersectionObserver" in window && revealEls.length) {
    revealEls.forEach((el, idx) => {
      el.style.transitionDelay = `${Math.min(360, idx * 45)}ms`;
    });
    const revealObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => revealObs.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  // ----- Project carousel (horizontal motion) -----
  const carousel = $("[data-project-carousel]");
  const carouselPrev = $("[data-carousel-prev]");
  const carouselNext = $("[data-carousel-next]");
  const carouselToggle = $("[data-carousel-toggle]");

  function getCarouselStep() {
    if (!carousel) return 300;
    return Math.max(260, Math.round(carousel.clientWidth * 0.68));
  }

  let autoTimer = null;
  let autoplayEnabled = !prefersReducedMotion;

  function scrollToX(x) {
    if (!carousel) return;
    const max = Math.max(0, carousel.scrollWidth - carousel.clientWidth);
    const clamped = Math.max(0, Math.min(max, x));
    carousel.scrollTo({ left: clamped, behavior: prefersReducedMotion ? "auto" : "smooth" });
  }

  function autoStep() {
    if (!carousel) return;
    const max = Math.max(0, carousel.scrollWidth - carousel.clientWidth);
    if (max <= 0) return;
    const step = getCarouselStep();
    let next = carousel.scrollLeft + step;
    if (next >= max - 2) next = 0;
    scrollToX(next);
  }

  function startAutoplay() {
    if (!carousel || !autoplayEnabled) return;
    if (autoTimer) return;
    autoTimer = window.setInterval(autoStep, 3200);
  }

  function stopAutoplay() {
    if (autoTimer) window.clearInterval(autoTimer);
    autoTimer = null;
  }

  if (carousel) {
    // Drag / swipe to scroll
    let isDown = false;
    let startX = 0;
    let startScroll = 0;

    carousel.addEventListener("pointerdown", (e) => {
      // Don't turn clicks on interactive elements (links/buttons) into a drag.
      // This keeps the "Watch" button working even inside the carousel.
      const interactive = e.target && e.target.closest
        ? e.target.closest("a, button, input, textarea, select, [role='button']")
        : null;
      if (interactive) return;

      if (e.pointerType === "mouse" && e.button !== 0) return;
      isDown = true;
      startX = e.clientX;
      startScroll = carousel.scrollLeft;
      carousel.classList.add("is-dragging");
      stopAutoplay();
      try {
        carousel.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    });

    carousel.addEventListener("pointermove", (e) => {
      if (!isDown) return;
      const dx = e.clientX - startX;
      carousel.scrollLeft = startScroll - dx;
    });

    const endDrag = () => {
      if (!isDown) return;
      isDown = false;
      carousel.classList.remove("is-dragging");
      if (autoplayEnabled) startAutoplay();
    };

    carousel.addEventListener("pointerup", endDrag);
    carousel.addEventListener("pointercancel", endDrag);

    // Buttons
    carouselPrev?.addEventListener("click", () => {
      stopAutoplay();
      scrollToX(carousel.scrollLeft - getCarouselStep());
      startAutoplay();
    });
    carouselNext?.addEventListener("click", () => {
      stopAutoplay();
      scrollToX(carousel.scrollLeft + getCarouselStep());
      startAutoplay();
    });

    // Pause toggle
    carouselToggle?.addEventListener("click", () => {
      const isRunning = autoTimer !== null;
      if (isRunning) {
        stopAutoplay();
        autoplayEnabled = false;
        carouselToggle.setAttribute("aria-pressed", "true");
        carouselToggle.textContent = "Play";
        return;
      }

      autoplayEnabled = !prefersReducedMotion;
      if (autoplayEnabled) {
        startAutoplay();
        carouselToggle.setAttribute("aria-pressed", "false");
        carouselToggle.textContent = "Pause";
      } else {
        // Reduced motion: don't autoplay.
        carouselToggle.setAttribute("aria-pressed", "true");
        carouselToggle.textContent = "Play";
      }
    });

    // Pause on hover / focus for usability
    carousel.addEventListener("mouseenter", () => stopAutoplay());
    carousel.addEventListener("mouseleave", () => {
      if (autoplayEnabled) startAutoplay();
    });
    carousel.addEventListener("focusin", () => stopAutoplay());
    carousel.addEventListener("focusout", () => {
      if (autoplayEnabled) startAutoplay();
    });

    startAutoplay();
  }

  // ----- Tilt effect for "advanced / crazy" feel -----
  const tiltEls = $$("[data-tilt]");
  tiltEls.forEach((el) => {
    let rafId = null;
    let lastEvent = null;

    function applyTilt() {
      rafId = null;
      if (!lastEvent) return;
      const e = lastEvent;
      lastEvent = null;
      if (prefersReducedMotion) return;

      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      const ry = (x - 0.5) * 16; // left/right
      const rx = -(y - 0.5) * 12; // up/down

      el.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
      el.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
      el.classList.add("is-tilting");
    }

    el.addEventListener("pointermove", (e) => {
      if (prefersReducedMotion) return;
      if (e.pointerType === "touch") return;
      lastEvent = e;
      if (!rafId) rafId = window.requestAnimationFrame(applyTilt);
    });

    el.addEventListener("pointerleave", () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = null;
      lastEvent = null;
      el.classList.remove("is-tilting");
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    });
  });

  // ----- Hero badge count up -----
  const countEls = $$("[data-count]");
  function countUp(el, to) {
    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      el.textContent = String(to);
      return;
    }
    const duration = 900;
    const start = performance.now();
    const from = 0;
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const value = Math.round(from + (to - from) * eased);
      el.textContent = String(value);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  const countOnce = new Set();
  if ("IntersectionObserver" in window && countEls.length) {
    const countObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          if (countOnce.has(el)) return;
          const to = Number(el.getAttribute("data-count") || "0");
          countOnce.add(el);
          countUp(el, to);
        });
      },
      { threshold: 0.25 }
    );
    countEls.forEach((el) => countObs.observe(el));
  } else {
    countEls.forEach((el) => {
      const to = Number(el.getAttribute("data-count") || "0");
      countUp(el, to);
    });
  }

  // ----- Project modal -----
  const modal = $("[data-modal]");
  const modalBackdrop = $("[data-modal-close]");
  const modalTitle = $("[data-modal-title]");
  const modalContent = $("[data-modal-content]");
  const projectOpenButtons = $$("[data-project-open]");

  let lastFocused = null;

  function openModal(title, htmlContent) {
    if (!modal || !modalContent) return;
    lastFocused = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    modalTitle && (modalTitle.textContent = title || "Project");
    modalContent.innerHTML = "";
    modalContent.appendChild(htmlContent);
    document.addEventListener("keydown", onKeyDown);
    // Focus close button
    const closeBtn = $("[data-modal-close]");
    closeBtn && closeBtn.focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = "";
    modalContent && (modalContent.innerHTML = "");
    document.removeEventListener("keydown", onKeyDown);
    if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
  }

  function onKeyDown(e) {
    if (e.key === "Escape") closeModal();
  }

  projectOpenButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest("[data-project]");
      if (!card) return;
      const tpl = card.querySelector('template[data-project-template]');
      const title = btn.getAttribute("data-project-title") || "Project";
      if (!tpl) return;
      const fragment = tpl.content.cloneNode(true);
      openModal(title, fragment);
    });
  });

  modalBackdrop && modalBackdrop.addEventListener("click", closeModal);

  // Close on backdrop click area specifically (the element with data-modal-close)
  $$("[data-modal-close]").forEach((el) => {
    el.addEventListener("click", (e) => {
      // If click is on close button, also close.
      closeModal();
      e.preventDefault();
    });
  });

  // ----- Contact form (mailto) + validation -----
  const form = $("#contactForm");
  const note = $("#formNote");
  const errors = $$("[data-error-for]");

  function setError(name, msg) {
    const el = $(`[data-error-for="${name}"]`);
    if (!el) return;
    el.textContent = msg || "";
  }

  function clearErrors() {
    errors.forEach((e) => (e.textContent = ""));
    if (note) note.textContent = "";
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function buildMailto({ name, email, message }) {
    const to = "Faseehzhd@gmail.com";
    const subject = `Portfolio message from ${name}`;
    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      "",
      message
    ].join("\n");
    return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    clearErrors();

    const fd = new FormData(form);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const message = String(fd.get("message") || "").trim();

    let ok = true;

    if (name.length < 2) {
      setError("name", "Please enter your name.");
      ok = false;
    }
    if (!isValidEmail(email)) {
      setError("email", "Please enter a valid email address.");
      ok = false;
    }
    if (message.length < 10) {
      setError("message", "Message should be at least 10 characters.");
      ok = false;
    }

    if (!ok) {
      if (note) note.textContent = "Please fix the highlighted fields.";
      return;
    }

    if (note) note.textContent = "Opening your email client…";
    const href = buildMailto({ name, email, message });
    window.location.href = href;
  });

  // ----- Copy email -----
  const copyBtn = $$("[data-copy-email]")[0];
  const toast = $("[data-copy-toast]");
  copyBtn?.addEventListener("click", async () => {
    const email = copyBtn.getAttribute("data-email") || "";
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(email);
      } else {
        // Fallback: create a temporary textarea
        const ta = document.createElement("textarea");
        ta.value = email;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      if (toast) toast.textContent = "Email copied to clipboard.";
      setTimeout(() => toast && (toast.textContent = ""), 1400);
    } catch {
      if (toast) toast.textContent = "Could not copy. Please copy manually.";
    }
  });

  // ----- Footer year -----
  const year = $("#year");
  if (year) year.textContent = String(new Date().getFullYear());

  // ----- Card mouse-tracking glow -----
  if (!prefersReducedMotion) {
    document.querySelectorAll(".card").forEach((card) => {
      card.addEventListener("mousemove", (e) => {
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty("--mouse-x", `${x}%`);
        card.style.setProperty("--mouse-y", `${y}%`);
      }, { passive: true });
    });
  }

})();

