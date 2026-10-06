// Distance LOD for instanced scatter (plants, trees, rocks, ...).
//
// A "kind" is one species: a few geometry variants (different seeds) and, for each variant, one geometry per level of
// detail (0 = full detail). Instances are just positions. Every update the manager sorts each instance into a level by
// its distance from the camera and uploads one per-instance position buffer per (variant, level), so a draw call is one
// instanced draw of one geometry. Nothing is rebuilt per frame: the buffers are refreshed only when the camera has
// moved more than update_distance (or the instances/bias changed).
//
//   const lod = scatter_lod.create(engine, { camera_position: camera.world_position });
//   const g = lod.upload(total, { positions, normals, uvs, colors });     // -> { geo, inst } ready for instancing
//   lod.add_kind({ id: "oak", distances: [35, 90, 220, 400], keep: [1, 1, 1, 0.5], shadow_levels: 3,
//                  variants: [[ { geo, inst, vertices, draws: [{ material, offset, count }] }, /* level 1 */ ... ], ...] });
//   lod.set_instances("oak", float32_xyz_array);
//   each frame:  lod.update();  then in the pass:  lod.render("main" | "shadow");
//
// distances[i] is the distance at which level i hands over to level i + 1; the last entry is the cull distance.
// keep[i] is the fraction of instances still drawn at level i (stable, by a per-instance random rank, so thinning never
// flickers). A level switch only happens once an instance is 8% past the boundary (hysteresis), so instances sitting
// on a boundary do not flip every update.
const scatter_lod = (function () {
  const DYNAMIC_DRAW = 35048;   // GL_DYNAMIC_DRAW

  function hash01(i) {          // stable per-instance pseudo-random number in [0, 1)
    let x = (i + 1) * 2654435761 >>> 0;
    x ^= x >>> 15; x = Math.imul(x, 2246822519) >>> 0; x ^= x >>> 13; x = Math.imul(x, 3266489917) >>> 0; x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  }

  function create(engine, def) {
    def = def || {};
    const camera = def.camera_position;                  // live [x, y, z] (a Float32Array view that the engine keeps updating)
    const manager = {
      kinds: {}, enabled: true, bias: 1,                 // bias > 1 keeps detail further out; enabled = false forces level 0 everywhere
      update_distance: def.update_distance || 1.5,
      stats: { instances: 0, drawn: 0, vertices: 0, full_vertices: 0, updates: 0, per_kind: {} },
    };
    const last_cam = [1e9, 1e9, 1e9];
    let dirty = true;

    // one geometry with the usual attributes plus a per-instance position attribute (divisor 1)
    manager.upload = function (total, arrays) {
      const geo = engine.create_geometry();
      geo.positions = engine.geometry_set_attr({ item_size: 3 });
      geo.normals = engine.geometry_set_attr({ item_size: 3 });
      geo.uvs = engine.geometry_set_attr({ item_size: 2 });
      geo.colors = engine.geometry_set_attr({ item_size: 4 });
      geo.attr.a_position = geo.positions.uuid;
      geo.attr.a_normal = geo.normals.uuid;
      geo.attr.a_uv = geo.uvs.uuid;
      geo.attr.a_color = geo.colors.uuid;
      engine.geometry_set_attr(geo.positions, arrays.positions, total * 3);
      engine.geometry_set_attr(geo.normals, arrays.normals, total * 3);
      engine.geometry_set_attr(geo.uvs, arrays.uvs, total * 2);
      engine.geometry_set_attr(geo.colors, arrays.colors, total * 4);
      const inst = engine.geometry_set_attr({ buffer_type: DYNAMIC_DRAW, item_size: 3, divisor: 1 });
      geo.attr.a_instance_a_position = inst.uuid;
      engine.geometry_set_attr(inst, new Float32Array(3), 3);
      return { geo: geo, inst: inst, total: total };
    };

    manager.add_kind = function (k) {
      k.n = k.distances.length - 1;                      // number of levels; the last distance is the cull distance
      k.keep = k.keep || k.distances.map(function () { return 1; });
      k.shadow_levels = k.shadow_levels === undefined ? k.n : k.shadow_levels;
      k.positions = new Float32Array(0);
      k.count = 0;
      k.levels = null;
      k.counts = [];
      k.variants.forEach(function (v) {
        v.forEach(function (level) { level.count = 0; });
      });
      manager.kinds[k.id] = k;
      return k;
    };

    manager.set_instances = function (id, xyz) {
      const k = manager.kinds[id];
      k.positions = xyz;
      k.count = xyz.length / 3;
      k.cur = new Int8Array(k.count);                    // current level of every instance (for the hysteresis)
      k.variant = new Uint8Array(k.count);
      k.rank = new Float32Array(k.count);
      for (let i = 0; i < k.count; i++) {
        k.variant[i] = Math.floor(hash01(i * 7 + 3) * k.variants.length);
        k.rank[i] = hash01(i * 13 + 11);
        k.cur[i] = 0;
      }
      dirty = true;
    };

    manager.invalidate = function () { dirty = true; };

    manager.update = function (force) {
      const cx = camera[0], cy = camera[1], cz = camera[2];
      const moved = Math.hypot(cx - last_cam[0], cy - last_cam[1], cz - last_cam[2]);
      if (!force && !dirty && moved < manager.update_distance) return;
      last_cam[0] = cx; last_cam[1] = cy; last_cam[2] = cz; dirty = false;

      const bias = Math.max(0.05, manager.bias), enabled = manager.enabled;
      const st = manager.stats;
      st.instances = 0; st.drawn = 0; st.vertices = 0; st.full_vertices = 0; st.updates++;
      st.per_kind = {};

      Object.keys(manager.kinds).forEach(function (id) {
        const k = manager.kinds[id], n = k.n, d = k.distances, keep = k.keep, nv = k.variants.length;
        const lists = [];
        for (let v = 0; v < nv; v++) { lists.push([]); for (let l = 0; l < n; l++) lists[v].push([]); }
        const per_level = new Array(n).fill(0);
        const P = k.positions;
        for (let i = 0; i < k.count; i++) {
          const dist = Math.hypot(P[i * 3] - cx, P[i * 3 + 1] - cy, P[i * 3 + 2] - cz) / bias;
          let L = enabled ? k.cur[i] : 0;
          if (enabled) {
            while (L > 0 && dist < d[L - 1] * 0.92) L--;          // closer: more detail only once clearly inside
            while (L < n && dist > d[L] * 1.08) L++;              // farther: less detail only once clearly outside
            k.cur[i] = L;
          }
          else if (dist > d[n - 1] * 1.08) L = n;
          if (L >= n || k.rank[i] >= (enabled ? keep[L] : 1)) continue;
          const list = lists[k.variant[i]][L];
          list.push(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
          per_level[L]++;
        }
        for (let v = 0; v < nv; v++) {
          for (let l = 0; l < n; l++) {
            const level = k.variants[v][l], list = lists[v][l];
            level.count = list.length / 3;
            if (level.count > 0) engine.geometry_set_attr(level.inst, new Float32Array(list), list.length);
            st.drawn += level.count; st.vertices += level.count * level.vertices;
            st.full_vertices += level.count * k.variants[v][0].vertices;      // what the same instances would cost without LOD
          }
        }
        st.instances += k.count;
        st.per_kind[id] = per_level;
      });
    };

    // pass: "main" draws every level; "shadow" only the levels below shadow_levels (small distant plants do not need shadows)
    manager.render = function (pass) {
      Object.keys(manager.kinds).forEach(function (id) {
        const k = manager.kinds[id], max_level = pass === "shadow" ? k.shadow_levels : k.n;
        k.variants.forEach(function (v) {
          for (let l = 0; l < max_level; l++) {
            const level = v[l];
            if (level.count <= 0) continue;
            level.draws.forEach(function (dr) { if (dr.count > 0) engine.render_item(level.geo, dr.material, dr.offset, dr.count, level.count); });   // (count 0 would mean "the whole geometry")
          }
        });
      });
    };

    return manager;
  }

  return { create: create };
})();
