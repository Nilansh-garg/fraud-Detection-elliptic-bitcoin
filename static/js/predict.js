/**
 * predict.js — FraudSense
 * Handles:
 *  · Nav scroll class
 *  · Hero data-reveal on load (staggered)
 *  · Scroll-triggered reveals with sibling stagger
 *  · TX input: clear button visibility, has-value class
 *  · Sample chip click → fill input
 *  · Form loading state on submit
 *  · Confidence bar animation on results load
 *  · Result card entrance stagger
 */
(function () {
  'use strict';

  /* ══════════════════════════════════════
     NAV SCROLL CLASS
  ══════════════════════════════════════ */
  var nav = document.getElementById('nav');

  function onScroll() {
    if (window.scrollY > 30) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ══════════════════════════════════════
     HERO REVEALS (immediate, staggered)
  ══════════════════════════════════════ */
  var heroEls = document.querySelectorAll('[data-reveal]');

  heroEls.forEach(function (el, i) {
    el.style.setProperty('--delay', (i * 0.1) + 's');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        el.classList.add('visible');
      });
    });
  });

  /* ══════════════════════════════════════
     SCROLL-TRIGGERED REVEALS
  ══════════════════════════════════════ */
  var srEls = document.querySelectorAll('[data-scroll-reveal]');

  // Stagger siblings within same parent
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
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  srEls.forEach(function (el) {
    srObserver.observe(el);
  });

  /* ══════════════════════════════════════
     TX INPUT — clear button + has-value
  ══════════════════════════════════════ */
  var txInput   = document.getElementById('tx_id');
  var clearBtn  = document.getElementById('clearBtn');

  function syncClearBtn() {
    if (!txInput || !clearBtn) return;
    var hasVal = txInput.value.trim().length > 0;
    clearBtn.classList.toggle('visible', hasVal);
    txInput.classList.toggle('has-value', hasVal);
  }

  if (txInput) {
    txInput.addEventListener('input', syncClearBtn);
    syncClearBtn(); // run on load (in case of browser autofill or pre-filled value)
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      txInput.value = '';
      syncClearBtn();
      txInput.focus();
    });
  }

  /* ══════════════════════════════════════
     SAMPLE CHIPS → fill input
  ══════════════════════════════════════ */
  var chips = document.querySelectorAll('.sample-chip');

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var id = chip.getAttribute('data-id');
      if (txInput && id) {
        txInput.value = id;
        syncClearBtn();
        txInput.focus();

        // Subtle "written" animation on the input
        txInput.style.transition = 'background 0.2s';
        txInput.style.background = 'rgba(0,212,184,0.06)';
        setTimeout(function () {
          txInput.style.background = '';
        }, 400);
      }
    });
  });

  /* ══════════════════════════════════════
     FORM SUBMIT — loading state
  ══════════════════════════════════════ */
  var form        = document.getElementById('predictForm');
  var analyzeBtn  = document.getElementById('analyzeBtn');

  if (form && analyzeBtn) {
    form.addEventListener('submit', function () {
      var input = txInput ? txInput.value.trim() : '';

      // Basic client-side guard
      if (!input) {
        return; // let browser/server handle it
      }

      // Show loading state
      var inner   = analyzeBtn.querySelector('.analyze-btn-inner');
      var loading = analyzeBtn.querySelector('.analyze-btn-loading');

      if (inner && loading) {
        inner.hidden   = true;
        loading.hidden = false;
      }
      analyzeBtn.disabled = true;
    });
  }

  /* ══════════════════════════════════════
     CONFIDENCE BAR ANIMATION
     Run after results render on page load
  ══════════════════════════════════════ */
  var confBars = document.querySelectorAll('.confidence-bar');

  if (confBars.length > 0) {
    // Animate each bar to its target width (encoded in --conf-w CSS var)
    // We read it from the inline style set by Jinja: style="--conf-w: 87.50%"
    confBars.forEach(function (bar, i) {
      var style     = bar.getAttribute('style') || '';
      var match     = style.match(/--conf-w:\s*([\d.]+)%/);
      var targetPct = match ? parseFloat(match[1]) : 0;

      // Reset to 0 before animating
      bar.style.width = '0%';

      // Stagger each bar
      setTimeout(function () {
        bar.style.width = targetPct + '%';
      }, 200 + i * 150);
    });
  }

  /* ══════════════════════════════════════
     RESULT CARD STAGGER
     Adds animation-delay to each card
  ══════════════════════════════════════ */
  var resultCards = document.querySelectorAll('.result-card');

  resultCards.forEach(function (card, i) {
    card.style.animationDelay = (i * 0.12) + 's';
  });

  /* ══════════════════════════════════════
     AUTO-SCROLL TO RESULTS
     If results are present, smooth-scroll
     down to them after page loads
  ══════════════════════════════════════ */
  var resultsSection = document.getElementById('resultsSection');

  if (resultsSection) {
    setTimeout(function () {
      resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 350);
  }

  /* ══════════════════════════════════════
     SMOOTH SCROLL FOR ANCHOR LINKS
  ══════════════════════════════════════ */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var id  = a.getAttribute('href').slice(1);
      var tgt = document.getElementById(id);
      if (!tgt) return;
      e.preventDefault();
      tgt.scrollIntoView({ behavior: 'smooth' });
    });
  });

})();
