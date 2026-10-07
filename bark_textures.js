// Procedural bark textures for tree trunks (see tree_build_trunk in tree_system.cpp).
//
// A trunk ring has u running round the trunk (mirrored: 0 -> 1 -> 0, so there is no seam) and v along the branch, so a
// bark texture is an ordinary repeating, tileable image. Each style paints a tileable height field, from which two
// images are made:
//   albedo  RGB brightness (grey-ish: the species colour comes from the trunk's vertex colour, which multiplies it),
//           darker in the crevices, plus a style colour (the white of a birch with its dark lenticels, ...)
//   normal  tangent-space normal map of the height field (OpenGL convention: +x along u, +y along v), the "bump"
//
// bark_textures.pixels(style, size, seed) -> { width, height, albedo: Uint8Array RGBA, normal: Uint8Array RGBA }
//   row 0 is v = 0, which is also GL's first row: upload as is (engine.textures.create({ source }), repeat wrapping)
// bark_textures.STYLES                    -> the style names
//
// No DOM needed (plain arrays), deterministic: the same (style, size, seed) gives the same pixels.
const bark_textures = (function () {
  function hash2(ix, iy, seed) {
    let h = Math.imul(ix | 0, 374761393) ^ Math.imul(iy | 0, 668265263) ^ Math.imul(seed | 0, 1442695041);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  const smooth = function (a, b, x) { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const mix = function (a, b, t) { return a + (b - a) * t; };

  // value noise on a lattice of px x py cells that wraps, so it tiles over x, y in [0, 1)
  function vnoise(x, y, px, py, seed) {
    const fx = x * px, fy = y * py, ix = Math.floor(fx), iy = Math.floor(fy);
    const tx = fx - ix, ty = fy - iy, sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty);
    const x0 = ((ix % px) + px) % px, x1 = (x0 + 1) % px, y0 = ((iy % py) + py) % py, y1 = (y0 + 1) % py;
    return mix(mix(hash2(x0, y0, seed), hash2(x1, y0, seed), sx), mix(hash2(x0, y1, seed), hash2(x1, y1, seed), sx), sy);
  }
  function fbm(x, y, px, py, octaves, seed) {
    let sum = 0, amp = 0.5, norm = 0;
    for (let o = 0; o < octaves; o++) {
      sum += amp * vnoise(x, y, px, py, seed + o * 31);
      norm += amp; amp *= 0.5; px *= 2; py *= 2;
    }
    return sum / norm;
  }
  // tileable cellular noise on cx x cy cells (cells are stretched when cx != cy): [nearest, second nearest] distance in cell units
  function worley(x, y, cx, cy, seed) {
    const fx = x * cx, fy = y * cy, ix = Math.floor(fx), iy = Math.floor(fy);
    let d1 = 9, d2 = 9;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const gx = ix + dx, gy = iy + dy, wx = ((gx % cx) + cx) % cx, wy = ((gy % cy) + cy) % cy;
        const ex = gx + 0.15 + 0.7 * hash2(wx, wy, seed) - fx, ey = gy + 0.15 + 0.7 * hash2(wx, wy, seed + 77) - fy;
        const d = Math.sqrt(ex * ex + ey * ey);
        if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) d2 = d;
      }
    }
    return [d1, d2];
  }

  // Every style: fn(x, y, seed, out) writes out[0] = height (1 = top of a ridge, 0 = bottom of a crevice) and
  // out[1] = a 0..1 mask that blends to the style's second colour. bump: normal-map slope; lo/hi: albedo for crevice / ridge top.
  const STYLES = {
    // long meandering fissures between ridges that peter out and break across: oak, elm, walnut
    furrowed: {
      bump: 7, lo: [0.34, 0.31, 0.29], hi: [1.0, 0.96, 0.92],
      fn(x, y, s, o) {
        const fx = 7, warp = (fbm(x, y, 2, 3, 3, s + 5) - 0.5) * 0.9 + (fbm(x, y, 6, 12, 2, s + 6) - 0.5) * 0.25;
        const sn = Math.abs(Math.sin(Math.PI * fx * (x + warp / fx * 2)));              // 0 along the fissure lines, 1 on the ridge middles
        const width = 0.25 + 0.5 * fbm(x, y, 5, 5, 2, s + 7);                            // fissure width varies along its length
        const live = smooth(0.3, 0.55, fbm(x, y, 8, 4, 2, s + 8));                       // some fissures fade out
        let h = 1 - (1 - smooth(0.0, width, sn)) * (0.35 + 0.65 * live);
        h *= 1 - 0.6 * smooth(0.72, 0.88, vnoise(x + warp * 0.1, y, 14, 18, s + 9)) * (1 - sn * 0.5);   // short cross cracks
        h = h * 0.86 + 0.14 * fbm(x, y, 44, 22, 3, s + 13);
        o[0] = h; o[1] = 0;
      },
    },
    // the same with wide, deep valleys: old oaks, cork oak, douglas fir
    deep_furrowed: {
      bump: 10, lo: [0.28, 0.25, 0.23], hi: [1.0, 0.95, 0.9],
      fn(x, y, s, o) {
        const fx = 4, warp = (fbm(x, y, 2, 3, 3, s + 5) - 0.5) * 1.1 + (fbm(x, y, 5, 9, 2, s + 6) - 0.5) * 0.3;
        const sn = Math.abs(Math.sin(Math.PI * fx * (x + warp / fx * 2)));
        const width = 0.4 + 0.45 * fbm(x, y, 4, 4, 2, s + 7);
        const live = smooth(0.2, 0.5, fbm(x, y, 6, 3, 2, s + 8));
        let h = 1 - (1 - smooth(0.0, width, sn)) * (0.45 + 0.55 * live);
        h *= 1 - 0.7 * smooth(0.7, 0.86, vnoise(x, y, 10, 8, s + 9)) * (1 - sn * 0.4);
        h = h * 0.84 + 0.16 * fbm(x, y, 32, 14, 3, s + 13);
        o[0] = h; o[1] = 0;
      },
    },
    // criss-crossing ridges forming diamonds: ash, hickory, date palm leaf bases
    diamond: {
      bump: 8, lo: [0.34, 0.32, 0.30], hi: [1.0, 0.97, 0.93],
      fn(x, y, s, o) {
        const w1 = fbm(x, y, 4, 4, 2, s + 3) - 0.5, w2 = fbm(x + 0.5, y, 4, 4, 2, s + 8) - 0.5;
        const a = Math.sin(6.2832 * (4 * x + 3 * y) + w1 * 5), b = Math.sin(6.2832 * (4 * x - 3 * y) + w2 * 5);
        let h = smooth(0.04, 0.55, Math.min(Math.abs(a), Math.abs(b)));
        h = h * 0.85 + 0.15 * fbm(x, y, 36, 36, 3, s + 13);
        o[0] = h; o[1] = 0;
      },
    },
    // one family of slanted, twisting ridges: sweet chestnut, black locust, olive
    twisted: {
      bump: 8, lo: [0.32, 0.30, 0.28], hi: [1.0, 0.96, 0.92],
      fn(x, y, s, o) {
        const w = fbm(x, y, 3, 5, 3, s + 4) - 0.5;
        const a = Math.sin(6.2832 * (5 * x + 1 * y) + w * 10);          // (only a slight slant: u is mirrored round the trunk, so a strong one would show as chevrons)
        let h = smooth(-0.7, 0.35, a);
        h *= 1 - 0.5 * smooth(0.7, 0.9, vnoise(x, y, 12, 18, s + 9)) * (1 - h * 0.5);
        h = h * 0.84 + 0.16 * fbm(x, y, 40, 40, 3, s + 13);
        o[0] = h; o[1] = 0;
      },
    },
    // overlapping scaly plates, taller than wide: pines, ponderosa
    plates: {
      bump: 8, lo: [0.32, 0.28, 0.26], hi: [1.0, 0.88, 0.78], c2: [1.0, 0.72, 0.5],
      fn(x, y, s, o) {
        const w = fbm(x, y, 3, 3, 2, s + 4) - 0.5, [d1, d2] = worley(x + w * 0.05, y + w * 0.05, 6, 4, s);
        const edge = d2 - d1;
        let h = smooth(0.0, 0.34, edge);
        h = h * 0.7 + 0.3 * (1 - smooth(0.0, 0.85, d1));
        h += 0.05 * Math.sin(6.2832 * 40 * y + w * 30);              // fine horizontal growth lines on every plate
        o[0] = Math.min(1, Math.max(0, h)); o[1] = smooth(0.25, 0.7, h) * smooth(0.45, 0.8, vnoise(x, y, 5, 6, s + 2));   // warm plate tops
      },
    },
    // small scales, as many wide as tall: spruce, larch
    flakes: {
      bump: 9, lo: [0.34, 0.30, 0.30], hi: [1.0, 0.92, 0.88], c2: [0.86, 0.7, 0.66],
      fn(x, y, s, o) {
        const [d1, d2] = worley(x, y, 12, 12, s), edge = d2 - d1;
        let h = smooth(0.0, 0.26, edge) * 0.75 + 0.25 * (1 - smooth(0.0, 0.8, d1));
        h = h * 0.9 + 0.1 * fbm(x, y, 40, 40, 2, s + 13);
        o[0] = h; o[1] = smooth(0.4, 0.8, vnoise(x, y, 6, 6, s + 2)) * 0.6;
      },
    },
    // blocky, deeply checked: alligator juniper, persimmon, old cherry
    blocks: {
      bump: 11, lo: [0.26, 0.24, 0.22], hi: [1.0, 0.94, 0.88],
      fn(x, y, s, o) {
        const [d1, d2] = worley(x, y, 6, 6, s), edge = d2 - d1;
        let h = smooth(0.03, 0.4, edge);
        h = h * 0.9 + 0.1 * fbm(x, y, 28, 28, 3, s + 13);
        o[0] = h; o[1] = 0;
      },
    },
    // long stringy fibres: redwood, cedar, bald cypress
    fibrous: {
      bump: 5, lo: [0.38, 0.33, 0.30], hi: [1.0, 0.92, 0.86],
      fn(x, y, s, o) {
        const w = fbm(x, y, 3, 2, 2, s + 4) - 0.5, xw = x + w * 0.12;
        let h = fbm(xw, y, 22, 2, 3, s) * 0.55 + fbm(xw, y, 9, 2, 3, s + 20) * 0.45;
        h = smooth(0.2, 0.8, h);
        h *= 1 - 0.5 * smooth(0.78, 0.92, vnoise(xw, y, 10, 5, s + 9));       // the odd tear across
        o[0] = h; o[1] = 0;
      },
    },
    // wide soft ridges with fibrous grooves: giant sequoia, coast redwood
    fluted: {
      bump: 6, lo: [0.34, 0.26, 0.22], hi: [1.0, 0.84, 0.72], c2: [0.9, 0.6, 0.45],
      fn(x, y, s, o) {
        const w = fbm(x, y, 2, 3, 3, s + 4) - 0.5, w2 = fbm(x, y, 5, 8, 2, s + 5) - 0.5;
        const r = 0.5 + 0.5 * Math.sin(6.2832 * 5 * (x + w * 0.25 + w2 * 0.06) + w2 * 3);
        let h = smooth(0.05, 0.85, r) * 0.55 + 0.45 * fbm(x + w * 0.1, y, 26, 3, 3, s);
        h *= 1 - 0.4 * smooth(0.74, 0.9, vnoise(x, y, 8, 6, s + 9));
        o[0] = h; o[1] = smooth(0.4, 0.9, vnoise(x, y, 3, 3, s + 2)) * 0.8;
      },
    },
    // smooth bark with dark horizontal lenticels: birch, cherry, aspen
    lenticels: {
      bump: 3, lo: [0.30, 0.29, 0.28], hi: [1.0, 1.0, 0.98], c2: [0.12, 0.11, 0.10],
      fn(x, y, s, o) {
        let h = 0.62 + 0.1 * (fbm(x, y, 3, 3, 3, s) - 0.5);
        const band = smooth(0.6, 0.78, vnoise(x, y, 3, 16, s + 6)) * 0.06;     // faint peeling bands
        const n = vnoise(x, y, 6, 44, s + 3) * 0.65 + vnoise(x, y, 14, 90, s + 4) * 0.35;
        const mark = smooth(0.62, 0.74, n);
        h = h - band - 0.4 * mark;
        o[0] = Math.min(1, Math.max(0, h)); o[1] = mark;
      },
    },
    // almost smooth with faint ring wrinkles and mottling: beech, hornbeam, baobab
    smooth: {
      bump: 3, lo: [0.62, 0.62, 0.58], hi: [1.0, 1.0, 0.97], c2: [0.72, 0.76, 0.7],
      fn(x, y, s, o) {
        const w = fbm(x, y, 3, 3, 2, s + 4) - 0.5;
        let h = 0.55 + 0.4 * (fbm(x, y, 5, 5, 5, s) - 0.5);
        h += 0.07 * Math.sin(6.2832 * 14 * y + w * 12) * vnoise(x, y, 4, 4, s + 6);   // faint ring wrinkles
        o[0] = Math.min(1, Math.max(0, h)); o[1] = smooth(0.35, 0.75, fbm(x, y, 4, 4, 4, s + 21));
      },
    },
    // flaking patches that show lighter bark below: plane tree, snow gum, sycamore
    patchy: {
      bump: 4, lo: [0.5, 0.48, 0.42], hi: [1.0, 0.98, 0.9], c2: [0.8, 0.82, 0.74],
      fn(x, y, s, o) {
        const n = fbm(x, y, 3, 4, 4, s), edge = smooth(0.46, 0.54, n);
        let h = 0.45 + 0.2 * edge + 0.12 * (fbm(x, y, 12, 12, 4, s + 7) - 0.5);
        o[0] = Math.min(1, Math.max(0, h)); o[1] = 1 - edge;
      },
    },
    // horizontal ring scars on a fibrous trunk: palms
    rings: {
      bump: 6, lo: [0.36, 0.32, 0.28], hi: [1.0, 0.93, 0.86],
      fn(x, y, s, o) {
        const w = fbm(x, y, 4, 4, 2, s + 4) - 0.5;
        const r = Math.abs(Math.sin(3.1416 * 10 * y + w * 2.5));
        let h = smooth(0.0, 0.7, r) * 0.6 + 0.4 * fbm(x, y, 28, 3, 3, s);
        o[0] = h; o[1] = 0;
      },
    },
    // thick corky, knobbly ridges: cork oak
    corky: {
      bump: 9, lo: [0.30, 0.25, 0.22], hi: [1.0, 0.86, 0.7], c2: [0.8, 0.6, 0.5],
      fn(x, y, s, o) {
        const w = fbm(x, y, 3, 3, 2, s + 4) - 0.5;
        const n = fbm(x + w * 0.2, y + w * 0.1, 5, 4, 5, s);
        let h = smooth(0.25, 0.75, n);
        h = h * 0.75 + 0.25 * fbm(x, y, 24, 24, 4, s + 13);
        o[0] = h; o[1] = 1 - smooth(0.2, 0.55, n);
      },
    },
  };

  function build_height(style, N, seed) {
    const def = STYLES[style] || STYLES.furrowed, h = new Float32Array(N * N), m = new Float32Array(N * N), o = [0, 0];
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        def.fn(i / N, j / N, seed, o);
        h[j * N + i] = o[0]; m[j * N + i] = o[1];
      }
    }
    return { def: def, h: h, m: m };
  }

  function pixels(style, size, seed) {
    const N = size || 256, b = build_height(style, N, (seed || 1) * 7919), def = b.def, h = b.h, m = b.m;
    const albedo = new Uint8Array(N * N * 4), normal = new Uint8Array(N * N * 4), c2 = def.c2;
    const at = function (i, j) { return h[((j + N) % N) * N + ((i + N) % N)]; };
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const k = j * N + i, t = Math.min(1, Math.max(0, h[k])), e = k * 4;
        // albedo: crevices dark, ridge tops light, optionally blended towards the style's second colour
        const shade = Math.pow(t, 0.8);
        let r = mix(def.lo[0], def.hi[0], shade), g = mix(def.lo[1], def.hi[1], shade), bl = mix(def.lo[2], def.hi[2], shade);
        if (c2) {
          const mk = m[k];
          if (style === "lenticels") { r = mix(r, c2[0], mk); g = mix(g, c2[1], mk); bl = mix(bl, c2[2], mk); }      // lenticels are dark outright
          else { r = mix(r, r * c2[0], mk * 0.6); g = mix(g, g * c2[1], mk * 0.6); bl = mix(bl, bl * c2[2], mk * 0.6); }
        }
        albedo[e] = Math.round(255 * Math.min(1, r)); albedo[e + 1] = Math.round(255 * Math.min(1, g)); albedo[e + 2] = Math.round(255 * Math.min(1, bl)); albedo[e + 3] = 255;
        // normal map from the height field (central differences over wrapped neighbours)
        const dx = (at(i + 1, j) - at(i - 1, j)) * 0.5, dy = (at(i, j + 1) - at(i, j - 1)) * 0.5;
        let nx = -dx * def.bump, ny = -dy * def.bump, nz = 1;
        const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
        normal[e] = Math.round(255 * (nx / len * 0.5 + 0.5)); normal[e + 1] = Math.round(255 * (ny / len * 0.5 + 0.5)); normal[e + 2] = Math.round(255 * (nz / len * 0.5 + 0.5)); normal[e + 3] = 255;
      }
    }
    return { width: N, height: N, albedo: albedo, normal: normal };
  }

  return { pixels: pixels, STYLES: Object.keys(STYLES) };
})();
