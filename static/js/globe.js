/**
 * globe.js — FraudSense
 * True 3D globe: nodes on a sphere connected by great-circle arc lines.
 * No libraries. Pure Canvas 2D with orthographic projection + Z-sort.
 */
(function () {
  'use strict';

  const canvas = document.getElementById('globeCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');

  /* ── sizing ─────────────────────────────────────────────── */
  let W, H, R, cx, cy, DPR;

  function resize() {
    const stage = canvas.parentElement;
    const size  = Math.min(stage.clientWidth, stage.clientHeight, 520);
    DPR = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width  = size * DPR;
    canvas.height = size * DPR;
    canvas.style.width  = size + 'px';
    canvas.style.height = size + 'px';

    ctx.setTransform(1,0,0,1,0,0);
    ctx.scale(DPR, DPR);

    W = H = size;
    R  = size * 0.38;
    cx = cy = size / 2;
  }

  /* ── math helpers ────────────────────────────────────────── */
  const DEG = Math.PI / 180;

  // lat/lng → unit sphere xyz
  function ll2xyz(lat, lng) {
    const phi   = (90 - lat) * DEG;
    const theta = (lng + 180) * DEG;
    return [
      -Math.sin(phi) * Math.cos(theta),
       Math.cos(phi),
       Math.sin(phi) * Math.sin(theta),
    ];
  }

  // rotate around Y axis, then tilt slightly on X
  function rotate([x, y, z], rotY, tiltX) {
    // Y rotation
    const cx1 = x * Math.cos(rotY) - z * Math.sin(rotY);
    const cz1 = x * Math.sin(rotY) + z * Math.cos(rotY);
    // X tilt
    const cy1 = y * Math.cos(tiltX) - cz1 * Math.sin(tiltX);
    const cz2 = y * Math.sin(tiltX) + cz1 * Math.cos(tiltX);
    return [cx1, cy1, cz2];
  }

  // project to 2D (orthographic with gentle depth scale)
  function project([x, y, z]) {
    const s = 1 + z / (R * 5.5); // very subtle perspective
    return {
      sx: cx + x * R * s,
      sy: cy - y * R * s,
      z,
      visible: z > -R * 0.05,
      alpha: Math.max(0, Math.min(1, (z + R) / (2 * R))),
    };
  }

  /* ── generate nodes ──────────────────────────────────────── */
  const NODE_COUNT  = 90;
  const EDGE_COUNT  = 110;   // static edges
  const ARC_ACTIVE  = 14;    // animated traveling arcs

  let nodes = [];
  let edges = [];
  let arcs  = [];

  // Fibonacci sphere distribution (even coverage)
  function fibonacciSphere(n) {
    const pts = [];
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const y   = 1 - (i / (n - 1)) * 2;
      const r   = Math.sqrt(1 - y * y);
      const phi = golden * i;
      pts.push([r * Math.cos(phi), y, r * Math.sin(phi)]);
    }
    return pts;
  }

  function buildScene() {
    const sphere = fibonacciSphere(NODE_COUNT);
    const illicitRatio = 0.1;

    nodes = sphere.map((pos, i) => {
      const rnd = Math.random();
      return {
        base: pos,          // unit xyz (before rotation)
        type: rnd < illicitRatio ? 'illicit'
            : rnd < 0.55        ? 'licit'
            :                     'unknown',
        pulse: Math.random() * Math.PI * 2,
        pSpeed: 0.035 + Math.random() * 0.025,
        id: i,
      };
    });

    // Build edges: each node connects to 1-2 nearby neighbours
    edges = [];
    const used = new Set();

    for (let i = 0; i < NODE_COUNT; i++) {
      const attempts = Math.floor(1 + Math.random() * 2);
      for (let a = 0; a < attempts; a++) {
        let best = -1, bestDot = -99;
        for (let j = 0; j < NODE_COUNT; j++) {
          if (j === i) continue;
          const key = Math.min(i,j) + '_' + Math.max(i,j);
          if (used.has(key)) continue;
          // dot product (closeness on sphere)
          const d = nodes[i].base[0]*nodes[j].base[0]
                  + nodes[i].base[1]*nodes[j].base[1]
                  + nodes[i].base[2]*nodes[j].base[2];
          // pick a "somewhat close but not closest" neighbour for variety
          if (d > 0.7 && d > bestDot) { bestDot = d; best = j; }
        }
        if (best !== -1) {
          const key = Math.min(i,best) + '_' + Math.max(i,best);
          used.add(key);
          edges.push({ a: i, b: best });
        }
      }
      if (edges.length >= EDGE_COUNT) break;
    }
  }

  /* ── arc helpers ─────────────────────────────────────────── */
  // Great-circle interpolation between two unit vectors
  function slerp(v1, v2, t) {
    let dot = v1[0]*v2[0] + v1[1]*v2[1] + v1[2]*v2[2];
    dot = Math.max(-1, Math.min(1, dot));
    const theta = Math.acos(dot) * t;
    // Gram-Schmidt orthonormal
    const rel = [
      v2[0] - dot * v1[0],
      v2[1] - dot * v1[1],
      v2[2] - dot * v1[2],
    ];
    const len = Math.sqrt(rel[0]*rel[0]+rel[1]*rel[1]+rel[2]*rel[2]) || 1;
    const relN = rel.map(x => x / len);
    return [
      v1[0]*Math.cos(theta) + relN[0]*Math.sin(theta),
      v1[1]*Math.cos(theta) + relN[1]*Math.sin(theta),
      v1[2]*Math.cos(theta) + relN[2]*Math.sin(theta),
    ];
  }

  function spawnArc() {
    const a = nodes[Math.floor(Math.random() * NODE_COUNT)];
    let b;
    do { b = nodes[Math.floor(Math.random() * NODE_COUNT)]; } while (b === a);
    arcs.push({
      a, b,
      progress: 0,
      speed: 0.005 + Math.random() * 0.007,
      illicit: a.type === 'illicit' || b.type === 'illicit',
    });
  }

  /* ── rendering ───────────────────────────────────────────── */
  let rotY  = 0;
  const TILT = 0.38;          // fixed X tilt (radians)
  const ROT_SPEED = 0.0015;

  function drawGlobeSphere() {
    // outer atmosphere glow
    const atm = ctx.createRadialGradient(cx, cy, R * 0.82, cx, cy, R * 1.22);
    atm.addColorStop(0, 'rgba(0,212,184,0.04)');
    atm.addColorStop(1, 'rgba(0,212,184,0)');
    ctx.beginPath();
    ctx.arc(cx, cy, R * 1.22, 0, Math.PI * 2);
    ctx.fillStyle = atm;
    ctx.fill();

    // sphere base
    const sph = ctx.createRadialGradient(cx - R*0.25, cy - R*0.2, 0, cx, cy, R);
    sph.addColorStop(0, 'rgba(0,212,184,0.07)');
    sph.addColorStop(0.6, 'rgba(0,20,30,0.15)');
    sph.addColorStop(1, 'rgba(0,0,0,0.0)');
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = sph;
    ctx.fill();

    // rim
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,212,184,0.15)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function drawLatLng() {
    ctx.lineWidth = 0.5;

    // latitudes
    for (let lat = -60; lat <= 60; lat += 30) {
      ctx.beginPath();
      let started = false;
      for (let lng = -180; lng <= 181; lng += 3) {
        const [x,y,z] = ll2xyz(lat, lng);
        const [rx,ry,rz] = rotate([x,y,z], rotY, TILT);
        const p = project([rx*R, ry*R, rz*R]);
        if (!p.visible) { started = false; continue; }
        if (!started) { ctx.moveTo(p.sx, p.sy); started = true; }
        else ctx.lineTo(p.sx, p.sy);
      }
      ctx.strokeStyle = 'rgba(0,212,184,0.06)';
      ctx.stroke();
    }

    // longitudes
    for (let lng = 0; lng < 360; lng += 30) {
      ctx.beginPath();
      let started = false;
      for (let lat = -90; lat <= 90; lat += 3) {
        const [x,y,z] = ll2xyz(lat, lng);
        const [rx,ry,rz] = rotate([x,y,z], rotY, TILT);
        const p = project([rx*R, ry*R, rz*R]);
        if (!p.visible) { started = false; continue; }
        if (!started) { ctx.moveTo(p.sx, p.sy); started = true; }
        else ctx.lineTo(p.sx, p.sy);
      }
      ctx.strokeStyle = 'rgba(0,212,184,0.06)';
      ctx.stroke();
    }
  }

  function drawEdges() {
    for (const e of edges) {
      const na = nodes[e.a], nb = nodes[e.b];
      const STEPS = 28;

      // check midpoint visibility
      const mid = slerp(na.base, nb.base, 0.5);
      const [mx,my,mz] = rotate([mid[0]*R, mid[1]*R, mid[2]*R], rotY, TILT);
      if (mz < -R * 0.1) continue;

      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= STEPS; i++) {
        const t   = i / STEPS;
        const pt  = slerp(na.base, nb.base, t);
        const [rx,ry,rz] = rotate([pt[0]*R, pt[1]*R, pt[2]*R], rotY, TILT);
        const p = project([rx,ry,rz]);
        if (!p.visible) { started = false; continue; }
        if (!started) { ctx.moveTo(p.sx, p.sy); started = true; }
        else ctx.lineTo(p.sx, p.sy);
      }

      const illicit = na.type === 'illicit' || nb.type === 'illicit';
      ctx.strokeStyle = illicit
        ? 'rgba(255,68,85,0.22)'
        : 'rgba(0,212,184,0.12)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }

  function drawArcs() {
    for (let i = arcs.length - 1; i >= 0; i--) {
      const arc = arcs[i];
      arc.progress = Math.min(arc.progress + arc.speed, 1);
      if (arc.progress >= 1) { arcs.splice(i, 1); continue; }

      const t    = arc.progress;
      const tPrev = Math.max(0, t - 0.045);

      const pt     = slerp(arc.a.base, arc.b.base, t);
      const ptPrev = slerp(arc.a.base, arc.b.base, tPrev);

      const [rx, ry, rz]     = rotate([pt[0]*R,     pt[1]*R,     pt[2]*R],     rotY, TILT);
      const [rxp,ryp,rzp]    = rotate([ptPrev[0]*R, ptPrev[1]*R, ptPrev[2]*R], rotY, TILT);
      const p    = project([rx, ry, rz]);
      const pPrev = project([rxp,ryp,rzp]);

      if (!p.visible) continue;

      const col = arc.illicit ? '255,68,85' : '0,212,184';

      // trail
      ctx.beginPath();
      ctx.moveTo(pPrev.sx, pPrev.sy);
      ctx.lineTo(p.sx, p.sy);
      ctx.strokeStyle = `rgba(${col},0.85)`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // glow head
      const g = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, 7);
      g.addColorStop(0,   `rgba(${col},0.9)`);
      g.addColorStop(0.4, `rgba(${col},0.35)`);
      g.addColorStop(1,   `rgba(${col},0)`);
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, 7, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    }
  }

  function drawNodes() {
    // z-sort: back to front
    const sorted = [...nodes].sort((a, b) => {
      const [,,za] = rotate([a.base[0]*R, a.base[1]*R, a.base[2]*R], rotY, TILT);
      const [,,zb] = rotate([b.base[0]*R, b.base[1]*R, b.base[2]*R], rotY, TILT);
      return za - zb;
    });

    for (const n of sorted) {
      n.pulse += n.pSpeed;
      const [rx,ry,rz] = rotate([n.base[0]*R, n.base[1]*R, n.base[2]*R], rotY, TILT);
      const p = project([rx,ry,rz]);
      if (!p.visible) continue;

      const pulse  = 0.82 + 0.18 * Math.sin(n.pulse);
      const depth  = Math.max(0.25, p.alpha);
      const size   = (n.type === 'unknown' ? 1.8 : 2.4) * pulse * Math.max(0.55, depth);

      const color  = n.type === 'illicit' ? '#ff4455'
                   : n.type === 'licit'   ? '#00e5a0'
                   :                        'rgba(160,175,200,0.55)';

      // halo glow for classified nodes
      if (n.type !== 'unknown') {
        const hue = n.type === 'illicit' ? '255,68,85' : '0,229,160';
        const halo = ctx.createRadialGradient(p.sx, p.sy, 0, p.sx, p.sy, size * 5);
        halo.addColorStop(0,   `rgba(${hue},${0.3 * depth})`);
        halo.addColorStop(1,   `rgba(${hue},0)`);
        ctx.beginPath();
        ctx.arc(p.sx, p.sy, size * 5, 0, Math.PI * 2);
        ctx.fillStyle = halo;
        ctx.fill();
      }

      // node
      ctx.globalAlpha = Math.max(0.2, depth);
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, size, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  /* ── main loop ───────────────────────────────────────────── */
  let lastSpawn = 0;

  function draw(ts) {
    ctx.clearRect(0, 0, W, H);
    rotY += ROT_SPEED;

    drawGlobeSphere();
    drawLatLng();
    drawEdges();
    drawArcs();
    drawNodes();

    if (arcs.length < ARC_ACTIVE && ts - lastSpawn > 350) {
      spawnArc();
      lastSpawn = ts;
    }
    requestAnimationFrame(draw);
  }

  /* ── init ────────────────────────────────────────────────── */
  function init() {
    resize();
    buildScene();
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  init();
})();
