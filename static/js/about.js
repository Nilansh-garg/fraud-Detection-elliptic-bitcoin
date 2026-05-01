/**
 * about.js — FraudSense
 * Handles:
 *  · Nav scroll class
 *  · Hero data-reveal on load (staggered)
 *  · Scroll-triggered reveals with sibling stagger
 *  · Skill card hover shimmer
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
    el.style.setProperty('--delay', (i * 0.12) + 's');
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

  // Stagger siblings within the same parent container
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
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  srEls.forEach(function (el) {
    srObserver.observe(el);
  });

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

  /* ══════════════════════════════════════
     SKILL CARD — SUBTLE MOUSE PARALLAX
     Tilts the card slightly toward cursor
  ══════════════════════════════════════ */
  var skillCards = document.querySelectorAll('.skill-card');

  skillCards.forEach(function (card) {
    card.addEventListener('mousemove', function (e) {
      var rect   = card.getBoundingClientRect();
      var x      = (e.clientX - rect.left) / rect.width  - 0.5; // -0.5 → 0.5
      var y      = (e.clientY - rect.top)  / rect.height - 0.5;
      var rotX   = -(y * 5).toFixed(2);
      var rotY   =  (x * 5).toFixed(2);
      card.style.transform = 'perspective(600px) rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg) translateY(-2px)';
    });

    card.addEventListener('mouseleave', function () {
      card.style.transform = '';
    });
  });

  /* ══════════════════════════════════════
     PROJECT CARD — HOVER REVEAL BORDER
     Animates a teal left border on scroll-in
  ══════════════════════════════════════ */
  var projCards = document.querySelectorAll('.proj-card');

  var projObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.style.borderLeftWidth = '2px';
        entry.target.style.borderLeftColor = 'rgba(0,212,184,0.3)';
        projObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  projCards.forEach(function (card) {
    projObserver.observe(card);
  });

})();
