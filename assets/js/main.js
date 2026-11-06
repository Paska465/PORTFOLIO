/* ==========================================================================
   Itumeleng — portfolio behaviour
   No dependencies. Everything is progressive enhancement: the page reads
   fine with JavaScript disabled.
   ========================================================================== */
(function () {
  "use strict";

  document.documentElement.classList.add("js");

  const $ = (selector, scope) => (scope || document).querySelector(selector);
  const $$ = (selector, scope) => Array.from((scope || document).querySelectorAll(selector));
  const prefersReducedMotion = () =>
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ------------------------------------------------------------------ *
   * Theme
   * ------------------------------------------------------------------ */
  (function theme() {
    const root = document.documentElement;
    const toggle = $("[data-theme-toggle]");
    if (!toggle) return;

    const sync = (theme) => {
      const isDark = theme === "dark";
      toggle.setAttribute("aria-pressed", String(!isDark));
      toggle.setAttribute(
        "aria-label",
        isDark ? "Switch to light theme" : "Switch to dark theme"
      );
    };

    sync(root.dataset.theme || "dark");

    toggle.addEventListener("click", () => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      root.dataset.theme = next;
      try {
        localStorage.setItem("theme", next);
      } catch (error) {
        /* Private mode: the preference just will not persist. */
      }
      sync(next);
    });

    window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", (event) => {
      let stored = null;
      try {
        stored = localStorage.getItem("theme");
      } catch (error) {
        stored = null;
      }
      if (!stored) {
        const next = event.matches ? "light" : "dark";
        root.dataset.theme = next;
        sync(next);
      }
    });
  })();

  /* ------------------------------------------------------------------ *
   * Mobile menu
   * ------------------------------------------------------------------ */
  (function menu() {
    const toggle = $("[data-menu-toggle]");
    const nav = $("#primary-nav");
    if (!toggle || !nav) return;

    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      nav.classList.toggle("is-open", open);
    };

    toggle.addEventListener("click", () => {
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });

    nav.addEventListener("click", (event) => {
      if (event.target.closest("a")) setOpen(false);
    });

    document.addEventListener("click", (event) => {
      if (
        toggle.getAttribute("aria-expanded") === "true" &&
        !nav.contains(event.target) &&
        !toggle.contains(event.target)
      ) {
        setOpen(false);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setOpen(false);
        toggle.focus();
      }
    });

    // A resize past the breakpoint should not leave the panel in a stale state.
    window.matchMedia("(min-width: 901px)").addEventListener("change", (event) => {
      if (event.matches) setOpen(false);
    });
  })();

  /* ------------------------------------------------------------------ *
   * Header progress + scrollspy
   * ------------------------------------------------------------------ */
  (function scrollChrome() {
    const header = $(".site-header");
    const bar = $("[data-scroll-progress]");
    let queued = false;

    const paint = () => {
      queued = false;
      const doc = document.documentElement;
      const max = doc.scrollHeight - window.innerHeight;
      const ratio = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      if (bar) bar.style.width = (ratio * 100).toFixed(2) + "%";
      if (header) header.classList.toggle("is-stuck", window.scrollY > 8);
    };

    const request = () => {
      if (!queued) {
        queued = true;
        window.requestAnimationFrame(paint);
      }
    };

    paint();
    window.addEventListener("scroll", request, { passive: true });
    window.addEventListener("resize", request, { passive: true });

    const links = $$('.nav-list a[href^="#"]');
    const sections = links
      .map((link) => document.getElementById(link.getAttribute("href").slice(1)))
      .filter(Boolean);

    if (!("IntersectionObserver" in window) || sections.length === 0) return;

    const setCurrent = (id) => {
      links.forEach((link) => {
        const match = link.getAttribute("href") === "#" + id;
        link.classList.toggle("is-current", match);
        if (match) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setCurrent(visible.target.id);
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.15, 0.4, 0.75] }
    );

    sections.forEach((section) => observer.observe(section));
  })();

  /* ------------------------------------------------------------------ *
   * Reveal on scroll
   * ------------------------------------------------------------------ */
  (function reveal() {
    const items = $$("[data-reveal]");
    if (items.length === 0) return;

    if (prefersReducedMotion() || !("IntersectionObserver" in window)) {
      items.forEach((item) => item.classList.add("is-revealed"));
      return;
    }

    items.forEach((item, index) => {
      if (item.dataset.revealGroup === undefined) {
        item.style.setProperty("--reveal-delay", Math.min(index % 4, 3) * 55 + "ms");
      }
    });

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-revealed");
          obs.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.1 }
    );

    items.forEach((item) => observer.observe(item));
  })();

  /* ------------------------------------------------------------------ *
   * Stat counters
   * ------------------------------------------------------------------ */
  (function counters() {
    const values = $$("[data-count]");
    if (values.length === 0) return;

    const run = (node) => {
      const target = Number(node.dataset.count);
      const prefix = node.dataset.prefix || "";
      const suffix = node.dataset.suffix || "";
      if (!Number.isFinite(target)) return;

      if (prefersReducedMotion()) {
        node.textContent = prefix + target + suffix;
        return;
      }

      const duration = 1100;
      const start = performance.now();

      const tick = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        node.textContent = prefix + Math.round(target * eased) + suffix;
        if (progress < 1) window.requestAnimationFrame(tick);
      };

      window.requestAnimationFrame(tick);
    };

    if (!("IntersectionObserver" in window)) {
      values.forEach(run);
      return;
    }

    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          run(entry.target);
          obs.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );

    values.forEach((node) => observer.observe(node));
  })();

  /* ------------------------------------------------------------------ *
   * Project filter (state kept in the URL)
   * ------------------------------------------------------------------ */
  (function projectFilter() {
    const grid = $("[data-work-grid]");
    const chips = $$("[data-filter]");
    const status = $("[data-filter-status]");
    if (!grid || chips.length === 0) return;

    const cards = $$("[data-category]", grid);
    const valid = chips.map((chip) => chip.dataset.filter);

    const apply = (value, updateUrl) => {
      const filter = valid.includes(value) ? value : "all";
      let shown = 0;

      cards.forEach((card) => {
        const match = filter === "all" || card.dataset.category === filter;
        card.hidden = !match;
        if (match) shown += 1;
        if (match) {
          // Replay the reveal transition so filtered cards are never invisible.
          card.classList.add("is-revealed");
        }
      });

      chips.forEach((chip) => {
        const active = chip.dataset.filter === filter;
        chip.setAttribute("aria-pressed", String(active));
        chip.classList.toggle("is-active", active);
      });

      if (status) {
        const label =
          filter === "all"
            ? "all " + shown + " projects"
            : shown + (shown === 1 ? " project" : " projects") + " in " + filterLabel(filter);
        status.textContent = "Showing " + label;
      }

      if (updateUrl) {
        const url = new URL(window.location.href);
        if (filter === "all") url.searchParams.delete("filter");
        else url.searchParams.set("filter", filter);
        history.pushState({ filter: filter }, "", url);
      }
    };

    const filterLabel = (value) => {
      const chip = chips.find((item) => item.dataset.filter === value);
      return chip ? chip.textContent.replace(/\d+$/, "").trim().toLowerCase() : value;
    };

    chips.forEach((chip) => {
      chip.addEventListener("click", () => apply(chip.dataset.filter, true));
    });

    window.addEventListener("popstate", () => {
      apply(new URLSearchParams(window.location.search).get("filter") || "all", false);
    });

    apply(new URLSearchParams(window.location.search).get("filter") || "all", false);
  })();

  /* ------------------------------------------------------------------ *
   * Copy to clipboard
   * ------------------------------------------------------------------ */
  (function clipboard() {
    const toast = $("[data-toast]");
    let timer = 0;

    const announce = (message) => {
      if (!toast) return;
      window.clearTimeout(timer);
      toast.textContent = message;
      toast.hidden = false;
      // Force a frame so the transition runs when the toast is re-used.
      void toast.offsetWidth;
      toast.classList.add("is-visible");
      timer = window.setTimeout(() => {
        toast.classList.remove("is-visible");
        timer = window.setTimeout(() => {
          toast.hidden = true;
        }, 250);
      }, 2200);
    };

    const copy = async (text) => {
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
        } else {
          const area = document.createElement("textarea");
          area.value = text;
          area.setAttribute("readonly", "");
          area.style.position = "fixed";
          area.style.opacity = "0";
          document.body.appendChild(area);
          area.select();
          document.execCommand("copy");
          area.remove();
        }
        announce("Copied " + text);
        return true;
      } catch (error) {
        announce("Could not copy — the address is " + text);
        return false;
      }
    };

    $$("[data-copy]").forEach((button) => {
      button.addEventListener("click", () => copy(button.dataset.copy));
    });
  })();

  /* ------------------------------------------------------------------ *
   * Command palette
   * ------------------------------------------------------------------ */
  (function palette() {
    const dialog = $("[data-palette]");
    if (!dialog || typeof dialog.showModal !== "function") return;

    const input = $("[data-palette-input]", dialog);
    const items = $$("[data-palette-item]", dialog);
    const empty = $("[data-palette-empty]", dialog);
    const opener = $("[data-palette-open]");
    let active = 0;

    const visibleItems = () => items.filter((item) => !item.parentElement.hidden);

    const select = (index) => {
      const list = visibleItems();
      if (list.length === 0) return;
      active = (index + list.length) % list.length;
      items.forEach((item) => item.setAttribute("aria-selected", "false"));
      list[active].setAttribute("aria-selected", "true");
      list[active].scrollIntoView({ block: "nearest" });
    };

    const filter = () => {
      const query = input.value.trim().toLowerCase();
      items.forEach((item) => {
        const match = item.textContent.toLowerCase().includes(query);
        item.parentElement.hidden = !match;
        item.setAttribute("aria-selected", "false");
      });
      const list = visibleItems();
      if (empty) empty.hidden = list.length > 0;
      active = 0;
      if (list.length > 0) list[0].setAttribute("aria-selected", "true");
    };

    const open = () => {
      if (dialog.open) return;
      input.value = "";
      filter();
      dialog.showModal();
      input.focus({ preventScroll: true });
    };

    const close = () => {
      if (dialog.open) dialog.close();
    };

    if (opener) opener.addEventListener("click", open);

    document.addEventListener("keydown", (event) => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && key === "k") {
        event.preventDefault();
        dialog.open ? close() : open();
      }
    });

    input.addEventListener("input", filter);

    input.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        select(active + 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        select(active - 1);
      } else if (event.key === "Enter") {
        const list = visibleItems();
        const target = list[active];
        if (target) {
          event.preventDefault();
          target.click();
          close();
        }
      }
    });

    items.forEach((item) => {
      item.setAttribute("role", "option");
      item.addEventListener("mouseenter", () => {
        const list = visibleItems();
        select(list.indexOf(item));
      });
      item.addEventListener("click", close);
    });

    // Click on the backdrop (outside the dialog box) closes it.
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) close();
    });

    dialog.addEventListener("close", () => {
      if (opener) opener.focus({ preventScroll: true });
    });
  })();

  /* ------------------------------------------------------------------ *
   * Back to top
   * ------------------------------------------------------------------ */
  (function backToTop() {
    const button = $("[data-back-to-top]");
    if (!button) return;
    button.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: prefersReducedMotion() ? "auto" : "smooth",
      });
      const brand = $(".site-header .brand");
      if (brand) brand.focus({ preventScroll: true });
    });
  })();

  /* ------------------------------------------------------------------ *
   * Contact form
   * ------------------------------------------------------------------ */
  (function contactForm() {
    const form = $("[data-contact-form]");
    if (!form) return;

    const status = $("[data-form-status]", form);
    const submit = $(".form-submit", form);
    const label = $("[data-submit-label]", form);
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    const fields = {
      name: {
        el: $("#name", form),
        test: (value) => value.trim().length >= 2,
        message: "Enter your name so I know who I'm replying to.",
      },
      email: {
        el: $("#email", form),
        test: (value) => emailPattern.test(value.trim()),
        message: "That email doesn't look right. Try name@company.co.za.",
      },
      topic: {
        el: $("#topic", form),
        test: (value) => value.trim() !== "",
        message: "Pick the closest option — “Something else” is fine.",
      },
      message: {
        el: $("#message", form),
        test: (value) => value.trim().length >= 20,
        message: "A little more detail, please — at least 20 characters.",
      },
    };

    const setError = (field, invalid) => {
      const wrapper = field.el.closest(".field");
      const error = $('[data-error-for="' + field.el.name + '"]', form);
      wrapper.classList.toggle("has-error", invalid);
      field.el.setAttribute("aria-invalid", invalid ? "true" : "false");
      if (error) error.textContent = invalid ? field.message : "";
    };

    const validate = (field) => {
      const valid = field.test(field.el.value);
      setError(field, !valid);
      return valid;
    };

    Object.values(fields).forEach((field) => {
      field.el.addEventListener("blur", () => {
        if (field.el.value !== "") validate(field);
      });
      field.el.addEventListener("input", () => {
        const wrapper = field.el.closest(".field");
        if (wrapper.classList.contains("has-error") && field.test(field.el.value)) {
          setError(field, false);
        }
      });
    });

    if (status) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        status.textContent = "";
        status.classList.remove("is-error");

        const results = Object.values(fields).map(validate);
        const firstInvalid = Object.values(fields).find(
          (field) => field.el.getAttribute("aria-invalid") === "true"
        );

        if (results.includes(false)) {
          status.textContent = "Check the highlighted fields and try again.";
          status.classList.add("is-error");
          if (firstInvalid) firstInvalid.el.focus();
          return;
        }

        const honeypot = $("#company-url", form);
        if (honeypot && honeypot.value !== "") {
          status.textContent = "Message sent. I'll reply within 2 working days.";
          form.reset();
          return;
        }

        const data = new FormData(form);
        const body = [
          "Name: " + data.get("name"),
          "Email: " + data.get("email"),
          "Topic: " + data.get("topic"),
          "",
          data.get("message"),
        ].join("\n");

        submit.setAttribute("aria-busy", "true");
        if (label) label.textContent = "Opening mail app…";

        window.setTimeout(() => {
          window.location.href =
            "mailto:itumelengmosesane22@gmail.com?subject=" +
            encodeURIComponent("Portfolio enquiry — " + data.get("topic")) +
            "&body=" +
            encodeURIComponent(body);

          submit.removeAttribute("aria-busy");
          if (label) label.textContent = "Send message";
          status.textContent =
            "Your mail app should be open with the message ready. If nothing happened, email itumelengmosesane22@gmail.com directly.";
          form.reset();
        }, 450);
      });
    }
  })();

  /* ------------------------------------------------------------------ *
   * Small things
   * ------------------------------------------------------------------ */
  const year = $("[data-year]");
  if (year) year.textContent = String(new Date().getFullYear());
})();
