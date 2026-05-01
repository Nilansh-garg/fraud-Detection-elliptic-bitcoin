/**
 * contact.js — FraudSense
 * Handles:
 *  · Nav scroll class
 *  · Hero data-reveal on load
 *  · Scroll-triggered reveals (with sibling stagger)
 *  · Textarea character counter
 *  · Contact form validation & submission feedback
 */
(function () {
  'use strict';

  /* ══════════════════════════════════════
     NAV SCROLL CLASS
  ══════════════════════════════════════ */
  const nav = document.getElementById('nav');

  function onScroll() {
    if (window.scrollY > 30) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll(); // run once on load

  /* ══════════════════════════════════════
     HERO REVEALS (immediate, staggered)
  ══════════════════════════════════════ */
  const heroEls = document.querySelectorAll('[data-reveal]');

  heroEls.forEach(function (el, i) {
    el.style.setProperty('--delay', (i * 0.1) + 's');
    // Double rAF ensures transition fires after paint
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.classList.add('visible');
      });
    });
  });

  /* ══════════════════════════════════════
     SCROLL-TRIGGERED REVEALS
  ══════════════════════════════════════ */
  const srEls = document.querySelectorAll('[data-scroll-reveal]');

  // Stagger siblings within the same parent
  var parents = new Map();
  srEls.forEach(function (el) {
    var p = el.parentElement;
    if (!parents.has(p)) parents.set(p, []);
    parents.get(p).push(el);
  });
  parents.forEach(function (children) {
    children.forEach(function (el, i) {
      el.style.setProperty('--sr-delay', (i * 0.1) + 's');
    });
  });

  var srObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      srObserver.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  srEls.forEach(function (el) {
    srObserver.observe(el);
  });

  /* ══════════════════════════════════════
     TEXTAREA CHARACTER COUNTER
  ══════════════════════════════════════ */
  var msgEl   = document.getElementById('message');
  var charEl  = document.getElementById('charCount');

  if (msgEl && charEl) {
    msgEl.addEventListener('input', function () {
      charEl.textContent = msgEl.value.length;

      // Subtle colour hint when approaching limit
      if (msgEl.value.length >= 900) {
        charEl.style.color = 'var(--amber)';
      } else if (msgEl.value.length >= 1000) {
        charEl.style.color = 'var(--red)';
      } else {
        charEl.style.color = '';
      }
    });
  }

  /* ══════════════════════════════════════
     CONTACT FORM
  ══════════════════════════════════════ */
  var form       = document.getElementById('contactForm');
  var successEl  = document.getElementById('formSuccess');
  var errorEl    = document.getElementById('formError');

  function showFeedback(el, type) {
    // Hide both first
    successEl.style.display = 'none';
    errorEl.style.display   = 'none';
    successEl.classList.remove('success');
    errorEl.classList.remove('error');

    // Force reflow so transition re-triggers
    void el.offsetWidth;

    el.classList.add(type);
    el.style.display = 'flex';
  }

  function isValidEmail(val) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  }

  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var fname = document.getElementById('fname').value.trim();
      var email = document.getElementById('email').value.trim();
      var msg   = document.getElementById('message').value.trim();

      // Validate required fields
      if (!fname || !email || !msg || !isValidEmail(email)) {
        showFeedback(errorEl, 'error');
        return;
      }

      // Optimistic UI: disable button, show loading state
      var btn = form.querySelector('.form-submit');
      var originalHTML = btn.innerHTML;
      btn.innerHTML  = 'Sending…';
      btn.disabled   = true;

      // ── Swap this setTimeout for a real fetch() to your Flask endpoint ──
      // fetch('/contact', { method: 'POST', body: new FormData(form) })
      //   .then(function(res) { ... })
      //   .catch(function() { ... });
      setTimeout(function () {
        // Reset button
        btn.innerHTML = originalHTML;
        btn.disabled  = false;

        // Reset form
        form.reset();
        if (charEl) charEl.textContent = '0';

        // Show success
        showFeedback(successEl, 'success');

        // Auto-hide success after 6 s
        setTimeout(function () {
          successEl.style.display = 'none';
          successEl.classList.remove('success');
        }, 6000);

      }, 1400);
    });
  }

})();
