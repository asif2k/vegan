// Procedural leaf-card textures for tree twigs (see tree_build_twigs in tree_system.cpp).
//
// A twig is one double-sided square card per terminal branch, with UV (0,0) at the branch start
// and (0,1) beyond its tip, so u runs across the card and v runs up along the branch. The
// generator paints a transparent card with a short twig along u = 0.5 and a cloud of leaves
// around its end; the shape, size, density and colour of the leaves depend on the species.
//
// leaf_textures.create(id, size)  -> <canvas>, size x size, RGBA with transparent background
// leaf_textures.pixels(id, size)  -> { width, height, data: Uint8Array RGBA } (engine.textures.create source)
// leaf_textures.SPECS             -> per-species look, keyed by the ids in tree_trunk_presets.json
//
// Needs a DOM (document.createElement('canvas')). Deterministic: the same id gives the same pixels.
const leaf_textures = (function () {
  // kind: leaf shape. color: base leaf rgb. count: leaves per card. size: leaf length as a fraction of the card.
  // spread: radius of the leaf cloud as a fraction of the card. hang: 0 = leaves point outwards, 1 = hang down.
  const SPECS = {
    english_oak:     { kind: 'lobed',   color: [78, 120, 46],  count: 34, size: 0.17, spread: 0.40, hang: 0.15, twig: [70, 52, 38] },
    scots_pine:      { kind: 'needle',  color: [48, 92, 50],   count: 20, size: 0.21, spread: 0.30, hang: 0.30, twig: [96, 62, 40] },
    silver_birch:    { kind: 'ovate',   color: [128, 170, 66], count: 60, size: 0.10, spread: 0.42, hang: 0.45, twig: [200, 195, 185] },
    italian_cypress: { kind: 'scale',   color: [32, 68, 44],  count: 150, size: 0.06, spread: 0.30, hang: 0.00, twig: [60, 50, 40] },
    coast_redwood:   { kind: 'feather', color: [58, 104, 56], count: 12, size: 0.21, spread: 0.30, hang: 0.40, twig: [102, 54, 36] },
    baobab:          { kind: 'palmate', color: [112, 142, 58], count: 9,  size: 0.20, spread: 0.30, hang: 0.10, twig: [128, 106, 90] },
    weeping_willow:  { kind: 'narrow',  color: [138, 172, 70], count: 70, size: 0.34, spread: 0.30, hang: 0.95, twig: [86, 78, 56] },
    olive:           { kind: 'narrow',  color: [112, 134, 94], count: 60, size: 0.17, spread: 0.36, hang: 0.20, twig: [104, 98, 84] },
    sugar_maple:     { kind: 'maple',   color: [74, 132, 48],  count: 14, size: 0.17, spread: 0.34, hang: 0.10, twig: [84, 72, 60] },
    quaking_aspen:   { kind: 'round',   color: [146, 178, 70], count: 44, size: 0.12, spread: 0.40, hang: 0.40, twig: [200, 204, 178] },
    // ---- catalog expansion ----
    common_beech:       { kind: 'ovate',   color: [70, 128, 52],  count: 72, size: 0.10, spread: 0.42, hang: 0.30, twig: [96, 86, 74] },
    norway_spruce:      { kind: 'needle',  color: [30, 70, 48],   count: 40, size: 0.14, spread: 0.36, hang: 0.55, twig: [76, 52, 40] },
    lombardy_poplar:    { kind: 'ovate',   color: [98, 150, 60],  count: 70, size: 0.10, spread: 0.40, hang: 0.35, twig: [100, 92, 82] },
    umbrella_acacia:    { kind: 'feather', color: [112, 150, 62], count: 18, size: 0.16, spread: 0.40, hang: 0.10, twig: [70, 52, 42] },
    coconut_palm:       { kind: 'frond',   color: [66, 120, 48],  count: 5,  size: 0.40, spread: 0.14, hang: 0.55, twig: [110, 92, 70] },
    cherry_blossom:     { kind: 'blossom', color: [246, 184, 204], count: 64, size: 0.085, spread: 0.40, hang: 0.20, twig: [72, 44, 40] },
    blue_gum_eucalyptus:{ kind: 'narrow',  color: [96, 132, 104], count: 55, size: 0.30, spread: 0.32, hang: 0.80, twig: [150, 140, 120] },
    cedar_of_lebanon:   { kind: 'needle',  color: [44, 88, 74],   count: 18, size: 0.18, spread: 0.34, hang: 0.15, twig: [70, 58, 48] },
    ginkgo:             { kind: 'fan',     color: [156, 190, 62], count: 34, size: 0.13, spread: 0.40, hang: 0.20, twig: [110, 96, 82] },
    london_plane:       { kind: 'maple',   color: [88, 140, 56],  count: 12, size: 0.22, spread: 0.34, hang: 0.10, twig: [130, 120, 100] },
    japanese_maple:     { kind: 'maple',   color: [150, 34, 42],  count: 22, size: 0.13, spread: 0.40, hang: 0.15, twig: [92, 60, 56] },
    stone_pine:         { kind: 'needle',  color: [52, 104, 58],  count: 16, size: 0.23, spread: 0.30, hang: 0.25, twig: [120, 72, 50] },
    southern_live_oak:  { kind: 'ovate',   color: [46, 92, 48],   count: 80, size: 0.085, spread: 0.42, hang: 0.20, twig: [60, 48, 40] },
    european_larch:     { kind: 'needle',  color: [126, 166, 72], count: 32, size: 0.14, spread: 0.36, hang: 0.45, twig: [110, 78, 56] },
    // ---- second expansion. pairs / lw: leaflet pairs and width of a compound (pinnate) leaf, lw also the width of 'serrate' leaves
    white_ash:          { kind: 'pinnate', color: [92, 142, 56],  count: 14, size: 0.19, spread: 0.32, hang: 0.20, twig: [96, 90, 78], pairs: 4, lw: 0.2 },
    black_walnut:       { kind: 'pinnate', color: [96, 140, 54],  count: 10, size: 0.22, spread: 0.32, hang: 0.25, twig: [84, 70, 58], pairs: 6, lw: 0.2 },
    horse_chestnut:     { kind: 'palmate', color: [72, 128, 48],  count: 8,  size: 0.27, spread: 0.32, hang: 0.45, twig: [100, 80, 62] },
    sweet_chestnut:     { kind: 'serrate', color: [82, 130, 50],  count: 26, size: 0.20, spread: 0.38, hang: 0.30, twig: [96, 76, 58], lw: 0.17 },
    field_elm:          { kind: 'serrate', color: [80, 124, 50],  count: 54, size: 0.12, spread: 0.40, hang: 0.30, twig: [90, 74, 60], lw: 0.32 },
    small_leaved_lime:  { kind: 'heart',   color: [96, 144, 62],  count: 52, size: 0.12, spread: 0.40, hang: 0.30, twig: [100, 84, 70] },
    douglas_fir:        { kind: 'needle',  color: [50, 96, 62],   count: 42, size: 0.14, spread: 0.36, hang: 0.50, twig: [86, 62, 46] },
    western_red_cedar:  { kind: 'feather', color: [44, 92, 54],   count: 16, size: 0.20, spread: 0.34, hang: 0.60, twig: [96, 62, 46] },
    giant_sequoia:      { kind: 'scale',   color: [58, 108, 88],  count: 150, size: 0.055, spread: 0.32, hang: 0.30, twig: [120, 70, 48] },
    ponderosa_pine:     { kind: 'needle',  color: [64, 112, 56],  count: 14, size: 0.27, spread: 0.30, hang: 0.30, twig: [124, 78, 52] },
    black_locust:       { kind: 'pinnate', color: [104, 150, 66], count: 16, size: 0.19, spread: 0.34, hang: 0.30, twig: [86, 70, 56], pairs: 7, lw: 0.34 },
    cork_oak:           { kind: 'ovate',   color: [52, 96, 54],   count: 70, size: 0.09, spread: 0.40, hang: 0.20, twig: [90, 62, 46] },
    jacaranda:          { kind: 'blossom', color: [150, 112, 206], count: 70, size: 0.075, spread: 0.40, hang: 0.25, twig: [92, 72, 62] },
    date_palm:          { kind: 'frond',   color: [96, 128, 84],  count: 5,  size: 0.40, spread: 0.14, hang: 0.45, twig: [122, 100, 74] },
    bald_cypress:       { kind: 'feather', color: [118, 160, 80], count: 20, size: 0.20, spread: 0.34, hang: 0.45, twig: [110, 78, 60] },
    snow_gum:           { kind: 'narrow',  color: [104, 140, 112], count: 55, size: 0.26, spread: 0.34, hang: 0.65, twig: [170, 160, 140] },
  };

  function rng(seed) {   // small deterministic generator (mulberry32)
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash_id(id) { let h = 2166136261; for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  // every shape is drawn pointing along +x from (0,0) with length 1
  function lens(g, w) { g.moveTo(0, 0); g.quadraticCurveTo(0.5, -w, 1, 0); g.quadraticCurveTo(0.5, w, 0, 0); }
  const SHAPES = {
    ovate(g)  { lens(g, 0.42); },
    round(g)  { g.moveTo(0, 0); g.bezierCurveTo(0.1, -0.62, 0.95, -0.55, 1, 0); g.bezierCurveTo(0.95, 0.55, 0.1, 0.62, 0, 0); },
    narrow(g) { lens(g, 0.11); },
    scale(g)  { lens(g, 0.5); },
    lobed(g) {   // oak: wavy outline, 3-4 rounded lobes per side
      const n = 24;
      for (let side = 0; side < 2; side++) {
        for (let i = 0; i <= n; i++) {
          const t = side === 0 ? i / n : 1 - i / n;
          const w = 0.30 * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.05)), 0.8) * (0.62 + 0.38 * Math.cos(t * Math.PI * 7));
          const y = side === 0 ? -w : w;
          if (side === 0 && i === 0) g.moveTo(t, y); else g.lineTo(t, y);
        }
      }
      g.closePath();
    },
    maple(g) {   // five pointed lobes radiating from the stalk
      const ang = [-1.25, -0.62, 0, 0.62, 1.25], len = [0.62, 0.9, 1, 0.9, 0.62];
      ang.forEach(function (a, i) {
        g.save && 0;
        const c = Math.cos(a), s = Math.sin(a), L = len[i], w = 0.2;
        const p = (x, y) => [x * c - y * s, x * s + y * c];
        const m = p(0, 0), q1 = p(L * 0.5, -w * L), tip = p(L, 0), q2 = p(L * 0.5, w * L);
        g.moveTo(m[0], m[1]); g.lineTo(q1[0], q1[1]); g.lineTo(tip[0], tip[1]); g.lineTo(q2[0], q2[1]); g.closePath();
      });
    },
    fan(g) {   // ginkgo: a fan with a notch in the outer edge
      g.moveTo(0, 0);
      for (let i = 0; i <= 14; i++) { const a = -0.95 + 1.9 * i / 14, notch = Math.abs(a) < 0.12 ? 0.82 : 1.0; g.lineTo(Math.cos(a) * notch, Math.sin(a) * notch); }
      g.closePath();
    },
    heart(g) {   // lime: heart-shaped, notched at the stalk, pointed tip
      g.moveTo(1, 0);
      g.bezierCurveTo(0.8, -0.25, 0.5, -0.55, 0.15, -0.45); g.bezierCurveTo(-0.05, -0.38, -0.02, -0.1, 0.08, 0);
      g.bezierCurveTo(-0.02, 0.1, -0.05, 0.38, 0.15, 0.45); g.bezierCurveTo(0.5, 0.55, 0.8, 0.25, 1, 0);
      g.closePath();
    },
    serrate(g, spec) {   // elm, chestnut: an oval with a toothed edge (spec.lw = half width)
      const n = 22, W = (spec && spec.lw) || 0.3;
      for (let side = 0; side < 2; side++) {
        for (let i = 0; i <= n; i++) {
          const t = side === 0 ? i / n : 1 - i / n;
          const w = W * Math.pow(Math.sin(Math.PI * t), 0.85) * (0.86 + 0.14 * ((i % 2) ? 1 : -1));
          const y = side === 0 ? -w : w;
          if (side === 0 && i === 0) g.moveTo(t, y); else g.lineTo(t, y);
        }
      }
      g.closePath();
    },
    pinnate(g, spec) {   // ash, walnut, locust: a stalk with pairs of leaflets and one at the tip (the midrib the caller strokes is the stalk)
      const pairs = (spec && spec.pairs) || 5, lw = (spec && spec.lw) || 0.25;
      const leaflet = function (x, y, a, L) {
        const c = Math.cos(a), s = Math.sin(a), p = (u, v) => [x + u * c - v * s, y + u * s + v * c];
        const m = p(0, 0), q1 = p(L * 0.5, -lw * L), e = p(L, 0), q2 = p(L * 0.5, lw * L);
        g.moveTo(m[0], m[1]); g.quadraticCurveTo(q1[0], q1[1], e[0], e[1]); g.quadraticCurveTo(q2[0], q2[1], m[0], m[1]);
      };
      for (let i = 0; i < pairs; i++) {
        const t = 0.1 + 0.62 * i / Math.max(1, pairs - 1), L = 0.34 * (1 - 0.35 * Math.abs(i / pairs - 0.4));
        leaflet(t, 0, -0.95, L); leaflet(t, 0, 0.95, L);
      }
      leaflet(0.76, 0, 0, 0.26);
    },
    palmate(g) {   // baobab: leaflets fanning from one point
      for (let i = -2; i <= 2; i++) {
        const a = i * 0.42, c = Math.cos(a), s = Math.sin(a), L = 1 - Math.abs(i) * 0.12, w = 0.15;
        const p = (x, y) => [x * c - y * s, x * s + y * c];
        const a0 = p(0, 0), cp1 = p(L * 0.5, -w * L * 2), e = p(L, 0), cp2 = p(L * 0.5, w * L * 2);
        g.moveTo(a0[0], a0[1]); g.quadraticCurveTo(cp1[0], cp1[1], e[0], e[1]); g.quadraticCurveTo(cp2[0], cp2[1], a0[0], a0[1]);
      }
    },
  };

  function draw_needles(g, n, rand, color) {   // fan of thin needles from one point
    g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const a = (i / (n - 1) - 0.5) * 0.9 + (rand() - 0.5) * 0.1, L = 0.85 + rand() * 0.15;
      g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * L, Math.sin(a) * L); g.stroke();
    }
  }
  function draw_feather(g, rand) {   // redwood spray: a stem with short needles to both sides
    g.beginPath(); g.moveTo(0, 0); g.lineTo(1, 0); g.stroke();
    const n = 16;
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1), L = 0.28 * (1 - t * 0.55);
      for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(t, 0); g.lineTo(t + 0.14, sd * L); g.stroke(); }
    }
  }

  function draw_frond(g, rand) {   // palm frond: a curved rachis with a pair of thin leaflets at each node
    const n = 22, bend = 0.45;
    const pt = t => [t, bend * t * t];
    g.beginPath(); g.moveTo(0, 0); for (let i = 1; i <= 16; i++) { const q = pt(i / 16); g.lineTo(q[0], q[1]); } g.stroke();
    for (let i = 1; i <= n; i++) {
      const t = i / (n + 1), q = pt(t), L = 0.34 * Math.sin(Math.PI * Math.min(1, t * 0.9 + 0.1)) + 0.05;
      for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(q[0], q[1]); g.lineTo(q[0] + 0.12, q[1] + sd * L * 0.9 + 0.04 * L); g.stroke(); }
    }
  }
  function draw_blossom(g, color, k) {   // five-petal flower
    g.fillStyle = shade(color, k);
    for (let i = 0; i < 5; i++) { g.save(); g.rotate(i * Math.PI * 2 / 5); g.beginPath(); g.ellipse(0.5, 0, 0.5, 0.38, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
    g.fillStyle = 'rgb(222,150,90)'; g.beginPath(); g.arc(0, 0, 0.2, 0, Math.PI * 2); g.fill();
  }

  function shade(color, k) { return 'rgb(' + color.map(c => Math.max(0, Math.min(255, Math.round(c * k)))).join(',') + ')'; }

  function create(id, size) {
    const spec = SPECS[id] || SPECS.english_oak;
    size = size || 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const g = canvas.getContext('2d');
    const rand = rng(hash_id(id));
    g.clearRect(0, 0, size, size);

    // the twig itself, from the branch start (bottom centre) to the middle of the leaf cloud
    g.strokeStyle = shade(spec.twig, 1); g.lineWidth = size * 0.016; g.lineCap = 'round';
    g.beginPath(); g.moveTo(size * 0.5, size); g.lineTo(size * 0.5, size * 0.52); g.stroke();

    const cx = 0.5, cy = 0.46;   // centre of the leaf cloud (y down)
    // draw back to front so overlapping leaves read as layers: far (top of the cloud) first
    const pts = [];
    for (let i = 0; i < spec.count; i++) {
      const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * spec.spread;
      pts.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r * 1.05, k: 0.78 + rand() * 0.42, j: rand() - 0.5, j2: rand() });
    }
    pts.sort((p, q) => p.y - q.y);
    pts.forEach(function (p) {
      let ang = Math.atan2(p.y - cy, p.x - cx);                              // outwards from the cloud centre
      ang = ang * (1 - spec.hang) + (Math.PI / 2) * spec.hang;               // ... or hanging down (+y)
      ang += p.j * 1.1;
      g.save();
      g.translate(p.x * size, p.y * size);
      g.rotate(ang);
      g.scale(spec.size * size, spec.size * size);
      g.fillStyle = shade(spec.color, p.k);
      g.strokeStyle = shade(spec.color, p.k * 0.8);
      if (spec.kind === 'needle') { g.lineWidth = 0.035; draw_needles(g, 9, rand, spec.color); }
      else if (spec.kind === 'feather') { g.lineWidth = 0.04; draw_feather(g, rand); }
      else if (spec.kind === 'frond') { g.lineWidth = 0.022; g.lineCap = 'round'; draw_frond(g, rand); }
      else if (spec.kind === 'blossom') {
        if (p.j2 < 0.82) draw_blossom(g, spec.color, p.k);
        else { g.fillStyle = shade([86, 130, 60], p.k); g.beginPath(); SHAPES.ovate(g); g.fill(); }
      }
      else {
        // a blade is lit from one side: lighter on one half, darker on the other, which is what makes a flat shape read as a leaf
        const half = spec.kind === 'narrow' ? 0.12 : 0.34;
        const grad = g.createLinearGradient(0, -half, 0, half);
        grad.addColorStop(0, shade(spec.color, p.k * 1.14));
        grad.addColorStop(0.5, shade(spec.color, p.k));
        grad.addColorStop(1, shade(spec.color, p.k * 0.78));
        g.fillStyle = grad;
        g.beginPath(); SHAPES[spec.kind](g, spec); g.fill();
        g.lineWidth = 0.02; g.strokeStyle = shade(spec.color, p.k * 0.55);   // edge: a slightly darker rim separates overlapping leaves
        g.globalAlpha = 0.5; g.stroke(); g.globalAlpha = 1;
        g.lineWidth = 0.025; g.strokeStyle = shade(spec.color, p.k * 0.62);   // midrib
        g.beginPath(); g.moveTo(0, 0); g.lineTo(0.9, 0); g.stroke();
        if (spec.kind === 'ovate' || spec.kind === 'round' || spec.kind === 'lobed' || spec.kind === 'serrate' || spec.kind === 'heart') {   // side veins
          g.lineWidth = 0.012; g.globalAlpha = 0.55;
          for (let vi = 1; vi <= 3; vi++) { const t = vi * 0.2; for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(t, 0); g.lineTo(t + 0.17, sd * 0.2); g.stroke(); } }
          g.globalAlpha = 1;
        }
      }
      g.restore();
    });
    return canvas;
  }

  function pixels(id, size) {
    const c = create(id, size);
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height);
    return { width: c.width, height: c.height, data: new Uint8Array(d.data.buffer) };
  }

  return { SPECS, create, pixels };
})();
