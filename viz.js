// Visualiseur affiché à la place de la pochette, volontairement sobre :
// un trait blanc fin et un second anneau très pâle dont la forme suit le spectre
// de l'extrait, reflété en quatre pétales. Chaque point de contrôle est un petit ressort amorti : le
// mouvement est élastique plutôt que saccadé. Les contours sont tracés avec une
// spline de Catmull-Rom pour rester lisses.
window.Viz = (() => {
  const canvas = document.getElementById("viz");
  const g = canvas.getContext("2d");

  const BANDS = 10;               // bandes de fréquence par quart de cercle
  const CTRL = BANDS * 4;         // points de contrôle par anneau
  const STEPS = 6;                // sous-points de spline par segment
  const F_LO = 60, F_HI = 8000;   // plage utile, en Hz

  const RINGS = [
    { alpha: 0.85, width: 1.25, size: 0.2, reach: 0.09, spin: 0.05, shift: 0 },
    { alpha: 0.22, width: 1, size: 0.26, reach: 0.06, spin: -0.03, shift: 5 },
  ];

  // État des ressorts : une position et une vitesse par bande.
  const pos = new Float32Array(BANDS);
  const vel = new Float32Array(BANDS);
  const angle = RINGS.map((_, i) => i * 0.7);

  let analyser = null, freq = null, binHz = 0, ranges = null;
  let w = 0, h = 0, dpr = 1, raf = 0, last = 0;
  let bass = 0;

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
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.6;
      freq = new Uint8Array(analyser.frequencyBinCount);
      binHz = ac.sampleRate / analyser.fftSize;
      // Bandes espacées en log : autant de place aux graves qu'aux aigus perçus.
      ranges = [];
      for (let i = 0; i < BANDS; i++) {
        const f0 = F_LO * Math.pow(F_HI / F_LO, i / BANDS);
        const f1 = F_LO * Math.pow(F_HI / F_LO, (i + 1) / BANDS);
        const b0 = Math.max(1, Math.floor(f0 / binHz));
        ranges.push([b0, Math.max(b0 + 1, Math.ceil(f1 / binHz))]);
      }
      analyser.connect(ac.destination);
    }
    node.connect(analyser);
  }

  // Lecture du spectre et mise à jour des ressorts.
  function update(t, dt) {
    if (analyser) analyser.getByteFrequencyData(freq);
    const k = Math.min(3, dt * 60); // normalise pour 60 i/s
    for (let i = 0; i < BANDS; i++) {
      let a = 0;
      if (freq) {
        const [b0, b1] = ranges[i];
        for (let b = b0; b < b1; b++) a += freq[b];
        a /= (b1 - b0) * 255;
        // Les aigus ont naturellement moins d'énergie : on les remonte un peu.
        a = Math.min(1, Math.pow(a * (1 + i * 0.06), 1.5));
      }
      // Respiration au repos : lente, décalée d'une bande à l'autre.
      const idle = 0.07 + 0.022 * Math.sin(t * 0.9 + i * 0.8) * Math.sin(t * 0.37 + i * 1.7);
      const target = Math.max(idle, a);
      // Ressort amorti : léger dépassement, puis retour souple.
      vel[i] += (target - pos[i]) * 0.16 * k;
      vel[i] *= Math.pow(0.74, k);
      pos[i] += vel[i] * k;
    }
    bass = (pos[0] + pos[1]) / 2;
  }

  // Valeur d'un point de contrôle : le spectre reflété en quatre pétales.
  function level(j) {
    const q = j % (BANDS * 2);
    return pos[q < BANDS ? q : BANDS * 2 - 1 - q];
  }

  function drawRing(ring, idx, cx, cy, m) {
    const base = m * ring.size * (1 + 0.03 * Math.sin(angle[idx] * 3));
    const reach = m * ring.reach;
    const ctrl = [];
    for (let j = 0; j < CTRL; j++) {
      const r = base + Math.max(0, level((j + ring.shift) % CTRL)) * reach;
      const a = (j / CTRL) * Math.PI * 2 + angle[idx];
      ctrl.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    // Spline de Catmull-Rom fermée.
    g.beginPath();
    for (let j = 0; j < CTRL; j++) {
      const p0 = ctrl[(j - 1 + CTRL) % CTRL], p1 = ctrl[j], p2 = ctrl[(j + 1) % CTRL], p3 = ctrl[(j + 2) % CTRL];
      for (let s = 0; s < STEPS; s++) {
        const t = s / STEPS, t2 = t * t, t3 = t2 * t;
        const x = 0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3);
        const y = 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3);
        j === 0 && s === 0 ? g.moveTo(x, y) : g.lineTo(x, y);
      }
    }
    g.closePath();
    g.lineJoin = "round";
    g.lineWidth = ring.width * dpr;
    g.strokeStyle = `rgba(255, 255, 255, ${ring.alpha})`;
    g.stroke();
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (document.hidden || !w) { last = now; return; }
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    const t = now / 1000;
    update(t, dt);

    RINGS.forEach((r, i) => { angle[i] += r.spin * dt; });

    const cx = w / 2, cy = h / 2, m = Math.min(w, h);

    g.clearRect(0, 0, w, h);

    // Voile bleu très léger au centre, qui s'éclaire à peine avec les basses.
    const veil = m * 0.3;
    const glow = g.createRadialGradient(cx, cy, 0, cx, cy, veil);
    glow.addColorStop(0, `rgba(90, 130, 255, ${0.06 + bass * 0.08})`);
    glow.addColorStop(1, "rgba(90, 130, 255, 0)");
    g.fillStyle = glow;
    g.fillRect(cx - veil, cy - veil, veil * 2, veil * 2);

    RINGS.forEach((r, i) => drawRing(r, i, cx, cy, m));

  }

  // Tourne seulement tant que la pochette est cachée.
  function setActive(on) {
    cancelAnimationFrame(raf);
    last = 0;
    if (on) raf = requestAnimationFrame(frame);
  }

  setActive(true);
  return { connect, setActive };
})();
