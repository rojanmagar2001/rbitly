(function () {
  "use strict";

  // Utility functions
  function qs(sel) {
    return document.querySelector(sel);
  }

  function qsa(sel) {
    return document.querySelectorAll(sel);
  }

  // Toast notification system
  function showToast(el, text, type = "success") {
    if (!el) return;

    el.textContent = text;
    el.classList.remove("opacity-0", "translate-y-1");
    el.classList.add("opacity-100", "translate-y-0");

    // Add success/error styling
    if (type === "error") {
      el.classList.remove("bg-slate-900");
      el.classList.add("bg-red-600");
    } else {
      el.classList.remove("bg-red-600");
      el.classList.add("bg-slate-900");
    }

    setTimeout(() => {
      el.classList.remove("opacity-100", "translate-y-0");
      el.classList.add("opacity-0", "translate-y-1");
    }, 2000);
  }

  // Enhanced clipboard copy with fallback
  async function copyToClipboard(text) {
    // Modern clipboard API (preferred)
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (err) {
        console.error("Clipboard API failed:", err);
      }
    }

    // Fallback for older browsers
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";

    document.body.appendChild(textarea);

    // iOS Safari specific handling
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isIOS) {
      const range = document.createRange();
      range.selectNodeContents(textarea);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      textarea.setSelectionRange(0, textarea.value.length);
    } else {
      textarea.select();
    }

    let success = false;
    try {
      success = document.execCommand("copy");
    } catch (err) {
      console.error("Copy command failed:", err);
    }

    document.body.removeChild(textarea);
    return success;
  }

  // Copy button handler with improved feedback
  document.addEventListener("click", async (e) => {
    const btn = e.target?.closest("[data-copy-target]");
    if (!btn) return;

    e.preventDefault();

    const targetId = btn.getAttribute("data-copy-target");
    const toastId = btn.getAttribute("data-copy-toast");

    if (!targetId) return;

    const input = document.getElementById(targetId);
    const toast = toastId ? document.getElementById(toastId) : null;

    if (!input) {
      console.error("Copy target not found:", targetId);
      return;
    }

    const value = input.value || input.getAttribute("value") || "";

    if (!value) {
      if (toast) showToast(toast, "Nothing to copy", "error");
      return;
    }

    // Add loading state to button
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = "Copying...";

    try {
      const success = await copyToClipboard(value);

      if (success) {
        if (toast) showToast(toast, "✓ Copied!", "success");
        btn.textContent = "✓ Copied";

        // Visual feedback on input
        input.classList.add("ring-2", "ring-green-500");
        setTimeout(() => {
          input.classList.remove("ring-2", "ring-green-500");
        }, 300);
      } else {
        throw new Error("Copy failed");
      }
    } catch (err) {
      console.error("Copy error:", err);
      if (toast) showToast(toast, "✗ Copy failed", "error");
      btn.textContent = "✗ Failed";
    } finally {
      // Reset button after delay
      setTimeout(() => {
        btn.disabled = false;
        btn.textContent = originalText;
      }, 1500);
    }
  });

  // Form submission handler with better UX
  document.addEventListener("submit", (e) => {
    const form = e.target;
    if (!form?.querySelector) return;

    const btn = form.querySelector("[data-submit]");
    if (!btn) return;

    // Disable button and show loading state
    btn.disabled = true;
    btn.setAttribute("aria-disabled", "true");

    const label = btn.getAttribute("data-label") || btn.textContent || "Submit";
    const icon = btn.querySelector("svg");

    // Store original content
    const originalHTML = btn.innerHTML;

    // Show loading state
    btn.innerHTML = `
      <svg class="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Processing...</span>
    `;

    // Safety timeout to re-enable if something goes wrong
    const timeout = setTimeout(() => {
      if (document.visibilityState === "visible" && form.checkValidity()) {
        btn.disabled = false;
        btn.removeAttribute("aria-disabled");
        btn.innerHTML = originalHTML;
      }
    }, 10000);

    // Clean up if page unloads
    window.addEventListener(
      "beforeunload",
      () => {
        clearTimeout(timeout);
      },
      { once: true },
    );
  });

  // Input validation and UX improvements
  function setupInputEnhancements() {
    const urlInput = qs("#url");
    const customAliasInput = qs("#customAlias");

    // URL input: auto-focus and select on click
    if (urlInput) {
      // Auto-focus on page load
      window.addEventListener("DOMContentLoaded", () => {
        urlInput.focus();
      });

      // Select all on focus for easy replacement
      urlInput.addEventListener("focus", () => {
        urlInput.select();
      });

      // Real-time validation feedback
      urlInput.addEventListener(
        "input",
        debounce(() => {
          const value = urlInput.value.trim();

          if (value && !isValidUrl(value)) {
            urlInput.classList.add("border-amber-300", "bg-amber-50/50");
          } else {
            urlInput.classList.remove("border-amber-300", "bg-amber-50/50");
          }
        }, 300),
      );
    }

    // Custom alias: auto-format and validate
    if (customAliasInput) {
      customAliasInput.addEventListener("input", (e) => {
        let value = e.target.value;

        // Remove invalid characters as user types
        value = value.replace(/[^a-zA-Z0-9_-]/g, "");

        if (value !== e.target.value) {
          e.target.value = value;
        }
      });
    }
  }

  // URL validation helper
  function isValidUrl(string) {
    try {
      const url = new URL(string);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  // Debounce utility
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Keyboard shortcuts
  function setupKeyboardShortcuts() {
    document.addEventListener("keydown", (e) => {
      // Cmd/Ctrl + K: Focus URL input
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        const urlInput = qs("#url");
        if (urlInput) {
          urlInput.focus();
          urlInput.select();
        }
      }
    });
  }

  // Animate elements on scroll
  function setupScrollAnimations() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fadeIn");
          }
        });
      },
      { threshold: 0.1 },
    );

    // Observe cards and sections
    qsa('[class*="rounded-2xl"]').forEach((el) => {
      observer.observe(el);
    });
  }

  // Initialize all enhancements
  function init() {
    setupInputEnhancements();
    setupKeyboardShortcuts();

    // Only setup animations if user hasn't reduced motion
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setupScrollAnimations();
    }

    // Console easter egg
    console.log("%c🔗 rbitly", "font-size: 24px; font-weight: bold; color: #3b82f6;");
    console.log(
      "%cBuilt with Fastify + Nunjucks + Tailwind CSS",
      "font-size: 12px; color: #64748b;",
    );
  }

  // Run when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
