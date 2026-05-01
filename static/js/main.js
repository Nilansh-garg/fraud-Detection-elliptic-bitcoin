/**
 * main.js — FraudSense interactions
 * · Nav scroll class
 * · Hero data-reveal on load
 * · Scroll-triggered reveals
 * · Metric counter animation
 */
(function () {
  'use strict';

  /* ── Nav scroll class ── */
  const nav = document.getElementById('nav');
  function onScroll() {
    if (window.scrollY > 30) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ── Hero reveal (immediate, staggered) ── */
  const heroEls = document.querySelectorAll('[data-reveal]');
  heroEls.forEach((el, i) => {
    el.style.setProperty('--delay', (i * 0.12) + 's');
    requestAnimationFrame(() =>
      requestAnimationFrame(() => el.classList.add('visible'))
    );
  });

  /* ── Scroll-triggered reveal ── */
  const scrollRevealEls = document.querySelectorAll('[data-scroll-reveal]');

  const srObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('visible');
      srObserver.unobserve(entry.target);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -60px 0px' });

  // Stagger siblings within same parent
  const parents = new Map();
  scrollRevealEls.forEach(el => {
    const parent = el.parentElement;
    if (!parents.has(parent)) parents.set(parent, []);
    parents.get(parent).push(el);
  });

  parents.forEach(children => {
    children.forEach((el, i) => {
      el.style.setProperty('--sr-delay', (i * 0.12) + 's');
    });
  });

  scrollRevealEls.forEach(el => srObserver.observe(el));

  /* ── Metric counter animation ── */
  function animateCount(el, target, duration, decimals) {
    const start = performance.now();
    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const val  = ease * target;
      el.textContent = decimals ? val.toFixed(decimals) : Math.round(val);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // Watch metrics section
  const accNum = document.getElementById('accNum');
  const f1Num  = document.getElementById('f1Num');
  const accBar = document.getElementById('accBar');
  const f1Bar  = document.getElementById('f1Bar');

  let metricsFired = false;
  const metricsSection = document.getElementById('metrics');

  if (metricsSection) {
    const metObs = new IntersectionObserver((entries) => {
      if (!entries[0].isIntersecting || metricsFired) return;
      metricsFired = true;

      if (accNum) animateCount(accNum, 92,    1400, 0);
      if (f1Num)  animateCount(f1Num,  58.64, 1600, 2);

      if (accBar) setTimeout(() => accBar.style.width = '92%',    100);
      if (f1Bar)  setTimeout(() => f1Bar.style.width  = '58.64%', 100);

      metObs.disconnect();
    }, { threshold: 0.25 });
    metObs.observe(metricsSection);
  }

  /* ── Smooth scroll for anchor links ── */
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id  = a.getAttribute('href').slice(1);
      const tgt = document.getElementById(id);
      if (!tgt) return;
      e.preventDefault();
      tgt.scrollIntoView({ behavior: 'smooth' });
    });
  });

})();
