// Visualiseur « floraison spectrale » affiché à la place de la pochette.
// Trois anneaux lumineux déformés par le spectre de l'extrait, avec des traînées,
// un cœur qui gonfle avec les basses et des étincelles sur les attaques.
// Au repos, les anneaux respirent doucement.
window.Viz = (() => {
  const canvas = document.getElementById("viz");
  const g = canvas.getContext("2d");
  const N = 120;                       // points par anneau
  const Q = N / 4;                     // un quart : le spectre est reflété en 4 pétales
  const levels = new Float32Array(N);  // niveaux lissés, symétriques
  const quarter = new Float32Array(Q);
  const RINGS = [
    { hue: 222, sat: 95, light: 62, offset: 0, spin: 0.12, size: 0.15, reach: 0.2 },
    { hue: 266, sat: 85, light: 70, offset: 8, spin: -0.09, size: 0.19, reach: 0.17 },
    { hue: 188, sat: 95, light: 66, offset: 19, spin: 0.06, size: 0.23, reach: 0.14 },
  ];
  const sparks = [];
  let analyser = null, freq = null;
  let w = 0, h = 0, dpr = 1, raf = 0, active = true;
  let bass = 0, prevBass = 0;

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = canvas.getBoundingClientRect();
    w = Math.max(1, Math.round(r.width * dpr));
    h = Math.max(1, Math.round(r.height * dpr));
    canvas.width = w;
    canvas.height = h;
  }
  new ResizeObserver(resize).observe(canvas);

  // Branche une source audio : elle passe par l'analyseur avant les haut-parleurs.
  function connect(ac, node) {
    if (!analyser) {
      analyser = ac.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.5;
      freq = new Uint8Array(analyser.frequencyBinCount);
      analyser.connect(ac.destination);
    }
    node.connect(analyser);
  }

  function sample(t) {
    if (analyser) analyser.getByteFrequencyData(freq);
    const raw = new Float32Array(Q);
    for (let i = 0; i < Q; i++) {
      // Échelle log : plus de résolution dans les graves, où la musique vit.
      const bin = 2 + Math.floor(Math.pow(i / Q, 1.6) * 140);
      const audio = freq ? freq[bin] / 255 : 0;
      raw[i] = audio * audio * 0.9;
    }
    let sum = 0;
    for (let i = 0; i < Q; i++) {
      // Lissage entre voisins : une courbe fluide plutôt qu'un contour en dents de scie.
      const v = 0.25 * raw[Math.max(0, i - 1)] + 0.5 * raw[i] + 0.25 * raw[Math.min(Q - 1, i + 1)];
      const idle = 0.05 + 0.03 * Math.sin(t * 1.1 + i * 0.5) + 0.02 * Math.sin(t * 0.7 - i * 0.3);
      const target = Math.max(idle, v);
      // Monte vite, retombe lentement : un extrait de 0,5 s laisse une trace.
      const k = target > quarter[i] ? 0.5 : 0.06;
      quarter[i] += (target - quarter[i]) * k;
      sum += quarter[i];
    }
    // Reflet en quatre pétales : le dessin reste équilibré.
    for (let i = 0; i < Q; i++) {
      levels[i] = levels[2 * Q - 1 - i] = levels[2 * Q + i] = levels[4 * Q - 1 - i] = quarter[i];
    }
    prevBass = bass;
    bass = (quarter[0] + quarter[1] + quarter[2]) / 3;
    return sum / Q;
  }

  function ring(ring, t, cx, cy, m) {
    const base = m * ring.size * (1 + 0.04 * Math.sin(t * 0.8 + ring.offset));
    const reach = m * ring.reach;
    const rot = t * ring.spin + ring.offset;
    const pts = [];
    for (let j = 0; j < N; j++) {
      const v = levels[(j + ring.offset) % N];
      const r = base + v * reach;
      const a = (j / N) * Math.PI * 2 + rot;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    // Courbe fermée lissée en passant par les milieux des segments.
    g.beginPath();
    const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
    let m0 = mid(pts[N - 1], pts[0]);
    g.moveTo(m0[0], m0[1]);
    for (let j = 0; j < N; j++) {
      const p = pts[j], m1 = mid(p, pts[(j + 1) % N]);
      g.quadraticCurveTo(p[0], p[1], m1[0], m1[1]);
    }
    g.closePath();
    const color = (a) => `hsla(${ring.hue}, ${ring.sat}%, ${ring.light}%, ${a})`;
    g.fillStyle = color(0.035);
    g.fill();
    g.lineWidth = 7 * dpr; g.strokeStyle = color(0.12); g.stroke();   // halo
    g.lineWidth = 1.6 * dpr; g.strokeStyle = color(0.85); g.stroke(); // trait
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden || !w) return;
    const t = now / 1000;
    const energy = sample(t);
    const cx = w / 2, cy = h / 2, m = Math.min(w, h);

    // Traînées : on estompe l'image précédente au lieu de l'effacer.
    g.globalCompositeOperation = "destination-out";
    g.fillStyle = `rgba(0, 0, 0, ${0.16 + 0.1 * (1 - energy)})`;
    g.fillRect(0, 0, w, h);
    g.globalCompositeOperation = "lighter";

    // Cœur lumineux qui gonfle avec les basses.
    const core = m * (0.04 + bass * 0.09);
    const glow = g.createRadialGradient(cx, cy, 0, cx, cy, core * 2.4);
    glow.addColorStop(0, `rgba(225, 232, 255, ${0.18 + bass * 0.3})`);
    glow.addColorStop(0.35, `rgba(110, 140, 255, ${0.08 + bass * 0.14})`);
    glow.addColorStop(1, "rgba(60, 80, 200, 0)");
    g.fillStyle = glow;
    g.fillRect(cx - core * 2.4, cy - core * 2.4, core * 4.8, core * 4.8);

    for (const r of RINGS) ring(r, t, cx, cy, m);

    // Étincelles sur les attaques de basse.
    if (bass - prevBass > 0.07 && bass > 0.25) {
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2, s = (1.5 + Math.random() * 4) * dpr;
        const r0 = m * (0.18 + bass * 0.2);
        sparks.push({ x: cx + Math.cos(a) * r0, y: cy + Math.sin(a) * r0, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 1, hue: RINGS[i % 3].hue });
      }
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.x += p.vx; p.y += p.vy; p.vx *= 0.97; p.vy *= 0.97; p.life -= 0.022;
      if (p.life <= 0) { sparks.splice(i, 1); continue; }
      g.fillStyle = `hsla(${p.hue}, 95%, 75%, ${p.life})`;
      g.beginPath(); g.arc(p.x, p.y, 1.8 * dpr * p.life + 0.5, 0, Math.PI * 2); g.fill();
    }
    g.globalCompositeOperation = "source-over";
  }

  // Tourne seulement tant que la pochette est cachée.
  function setActive(on) {
    active = on;
    cancelAnimationFrame(raf);
    if (on) raf = requestAnimationFrame(frame);
  }

  setActive(true);
  return { connect, setActive };
})();
