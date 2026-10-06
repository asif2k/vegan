packing("engine.js","debug.js")(function (engine, dom, httprequest) {
  import("leaf_textures.js")
  import("scatter_lod.js")

  function ready(engine) {

    const math = engine.math;
    const wa = engine.wa;

    function suit0() {
      const scene = engine.debug.scene();
      console.log("engine is ready", [engine, scene]);

      // Each list's order must exactly match its C++ struct's (now single) float
      // block -- see tree_props/plant_props/rich_plant_props in tree_system.cpp /
      // plant_system.cpp. whole_number_names below marks which of these should be
      // rounded on write (former int fields, plus new int-like knobs).
      const TREE_PROP_NAMES = [
        "clumpMax", "clumpMin", "lengthFalloffFactor", "lengthFalloffPower",
        "branchFactor", "radiusFalloffRate", "climbRate", "trunkKink", "maxRadius",
        "taperRate", "twistRate", "sweepAmount", "initialBranchLength", "trunkLength",
        "dropAmount", "growAmount", "vMultiplier", "twigScale", "seed",
        "branchFactorTrunk", "clumpMaxTrunk", "clumpMinTrunk",
        "barkColorR", "barkColorG", "barkColorB", "barkColorVariance",
        "fruitChance", "fruitSize", "fruitColorR", "fruitColorG", "fruitColorB",
        "treeSteps", "segments", "levels",
        "rootFlare", "twigAngleJitter", "fruitClusterCount",
        "lengthJitter", "radiusJitter", "azimuthJitter", "elevationJitter",
      ];
      const TREE_WHOLE_NUMBER_NAMES = [
        "treeSteps", "segments", "levels", "fruitClusterCount",
      ];
      const TREE_COLOR_NAMES = ["barkColor", "fruitColor"];

      const PLANT_PROP_NAMES = [
        "bladeLength", "bladeLengthVariance", "bladeWidth", "bladeWidthVariance",
        "tipTaper", "curveAmount", "curveVariance", "lean", "leanVariance",
        "twistVariance", "clusterRadius", "vMultiplier", "seed",
        "bladeColorBaseR", "bladeColorBaseG", "bladeColorBaseB",
        "bladeColorTipR", "bladeColorTipG", "bladeColorTipB", "colorVariance",
        "flowerChance", "flowerSize", "flowerColorR", "flowerColorG", "flowerColorB",
        "bladeCount", "segments", "arrangement",
        "bladeFold", "tuftRadius", "tuftCount",
      ];
      const PLANT_WHOLE_NUMBER_NAMES = ["bladeCount", "segments", "arrangement", "tuftCount"];
      const PLANT_COLOR_NAMES = ["bladeColorBase", "bladeColorTip", "flowerColor"];

      const RICH_PLANT_PROP_NAMES = [
        "stemLength", "stemWidth", "stemLean", "stemCurve",
        "leafLength", "leafLengthVariance", "leafWidth", "leafWidthVariance", "leafTipTaper",
        "leafAttachStart", "leafAttachEnd", "leafOutwardAngle", "leafOutwardVariance",
        "petalLength", "petalWidth", "petalTipTaper", "petalCurl",
        "flowerRadius", "bloomSize", "vMultiplier", "seed",
        "stemColorR", "stemColorG", "stemColorB",
        "leafColorR", "leafColorG", "leafColorB",
        "petalColorR", "petalColorG", "petalColorB", "colorVariance",
        "petalPitch", "petalPitchOuter", "petalRadiusInner",
        "leafCount", "petalCount", "segments", "petalArrangement",
      ];
      const RICH_PLANT_WHOLE_NUMBER_NAMES = ["leafCount", "petalCount", "segments", "petalArrangement"];
      const RICH_PLANT_COLOR_NAMES = ["stemColor", "leafColor", "petalColor"];

      const UI_RANGES = {
        tree_props: {
          clumpMax: { min: 0.0, max: 2.0, step: 0.01, desc: "Canopy clumping max", example: 0.8 },
          clumpMin: { min: 0.0, max: 2.0, step: 0.01, desc: "Canopy clumping min", example: 0.5 },
          lengthFalloffFactor: { min: 0.1, max: 1.5, step: 0.01, desc: "Length scaling per level", example: 0.85 },
          lengthFalloffPower: { min: 0.1, max: 3.0, step: 0.01, desc: "Power of length falloff", example: 1.0 },
          branchFactor: { min: 1.0, max: 5.0, step: 0.1, desc: "Splitting factor", example: 3.5 },
          radiusFalloffRate: { min: 0.1, max: 1.5, step: 0.01, desc: "Radius shrinking per level", example: 0.6 },
          climbRate: { min: 0.1, max: 5.0, step: 0.1, desc: "Rate of branch climbing", example: 2.5 },
          trunkKink: { min: 0.0, max: 1.0, step: 0.01, desc: "Trunk displacement", example: 0.0 },
          maxRadius: { min: 0.01, max: 2.0, step: 0.01, desc: "Max base radius", example: 0.25 },
          taperRate: { min: 0.5, max: 1.0, step: 0.01, desc: "Radius taper per segment", example: 0.95 },
          twistRate: { min: 0.0, max: 30.0, step: 0.1, desc: "Twisting of branches", example: 13.0 },
          sweepAmount: { min: -2.0, max: 2.0, step: 0.01, desc: "Bending/sweeping", example: 0.0 },
          initialBranchLength: { min: 0.1, max: 5.0, step: 0.01, desc: "Length of initial branch", example: 0.85 },
          trunkLength: { min: 0.1, max: 10.0, step: 0.1, desc: "Base trunk length", example: 2.5 },
          dropAmount: { min: -2.0, max: 2.0, step: 0.01, desc: "Limb droop", example: 0.5 },
          growAmount: { min: -2.0, max: 2.0, step: 0.01, desc: "Upwards reach", example: 0.0 },
          vMultiplier: { min: 0.1, max: 10.0, step: 0.1, desc: "UV v-multiplier", example: 0.2 },
          twigScale: { min: 0.1, max: 10.0, step: 0.1, desc: "Canopy tip size", example: 2.0 },
          seed: { min: 0, max: 1000, step: 1, desc: "Random seed", example: 10 },
          branchFactorTrunk: { min: 1.0, max: 5.0, step: 0.1, desc: "Splitting factor at trunk", example: 1.6 },
          clumpMaxTrunk: { min: 0.0, max: 2.0, step: 0.01, desc: "Trunk clumping max", example: 0.95 },
          clumpMinTrunk: { min: 0.0, max: 2.0, step: 0.01, desc: "Trunk clumping min", example: 0.8 },
          barkColorVariance: { min: 0.0, max: 1.0, step: 0.01, desc: "Bark color variance", example: 0.08 },
          treeSteps: { min: 1, max: 10, step: 1, desc: "Number of branch layers", example: 2 },
          segments: { min: 3, max: 20, step: 1, desc: "Segments per branch", example: 6 },
          levels: { min: 1, max: 7, step: 1, desc: "Recursion levels", example: 5 },
          fruitChance: { min: 0.0, max: 1.0, step: 0.01, desc: "Chance of fruit on twigs", example: 0.2 },
          fruitSize: { min: 0.01, max: 2.0, step: 0.01, desc: "Size of fruit", example: 0.5 },
          rootFlare: { min: 0.0, max: 2.0, step: 0.01, desc: "Root flare / buttress widening", example: 0.0 },
          twigAngleJitter: { min: 0.0, max: 1.57, step: 0.01, desc: "Random twig-plane rotation (radians)", example: 0.0 },
          fruitClusterCount: { min: 1, max: 4, step: 1, desc: "Fruits per twig (grape/cherry clusters)", example: 1 },
          lengthJitter: { min: 0.0, max: 0.9, step: 0.01, desc: "Random length variation per branch (+/- fraction)", example: 0.0 },
          radiusJitter: { min: 0.0, max: 0.5, step: 0.01, desc: "Random thickness variation per side branch (+/- fraction)", example: 0.0 },
          azimuthJitter: { min: 0.0, max: 3.14, step: 0.01, desc: "Random extra turn of side limbs around the trunk (radians)", example: 0.0 },
          elevationJitter: { min: 0.0, max: 1.5, step: 0.01, desc: "Random extra up/down tilt of side limbs", example: 0.0 }
        },
        plant_props: {
          bladeLength: { min: 0.01, max: 3.0, step: 0.01, desc: "Length of blade", example: 0.35 },
          bladeLengthVariance: { min: 0.0, max: 1.0, step: 0.01, desc: "Variance of length", example: 0.1 },
          bladeWidth: { min: 0.001, max: 0.5, step: 0.001, desc: "Width of base", example: 0.025 },
          bladeWidthVariance: { min: 0.0, max: 0.1, step: 0.001, desc: "Variance of width", example: 0.008 },
          tipTaper: { min: 0.0, max: 1.0, step: 0.01, desc: "Width fraction at tip", example: 0.1 },
          curveAmount: { min: -1.0, max: 1.0, step: 0.01, desc: "Forward bow", example: 0.15 },
          curveVariance: { min: 0.0, max: 1.0, step: 0.01, desc: "Variance of curve", example: 0.08 },
          lean: { min: 0.0, max: 3.14, step: 0.01, desc: "Tilt from vertical", example: 0.25 },
          leanVariance: { min: 0.0, max: 3.14, step: 0.01, desc: "Variance of lean", example: 0.2 },
          twistVariance: { min: 0.0, max: 6.28, step: 0.01, desc: "Azimuth jitter", example: 0.3 },
          clusterRadius: { min: 0.0, max: 2.0, step: 0.01, desc: "Scatter disc radius", example: 0.3 },
          vMultiplier: { min: 0.1, max: 10.0, step: 0.1, desc: "UV v-multiplier", example: 1.0 },
          seed: { min: 0, max: 1000, step: 1, desc: "Random seed", example: 5 },
          colorVariance: { min: 0.0, max: 1.0, step: 0.01, desc: "Color variance", example: 0.08 },
          bladeCount: { min: 1, max: 200, step: 1, desc: "Number of blades", example: 40 },
          segments: { min: 1, max: 20, step: 1, desc: "Curve subdivisions", example: 4 },
          arrangement: { min: 0, max: 1, step: 1, desc: "0: scatter, 1: rosette", example: 0 },
          flowerChance: { min: 0.0, max: 1.0, step: 0.01, desc: "Chance of flower/seed head", example: 0.2 },
          flowerSize: { min: 0.01, max: 1.0, step: 0.01, desc: "Size of flower", example: 0.05 },
          bladeFold: { min: 0.0, max: 1.0, step: 0.01, desc: "Cross-section fold depth (V-channel)", example: 0.0 },
          tuftRadius: { min: 0.0, max: 1.0, step: 0.01, desc: "Local scatter radius within a tuft (fraction of cluster radius)", example: 0.3 },
          tuftCount: { min: 1, max: 32, step: 1, desc: "Tussock/tiller clump count (arrangement 0 only)", example: 1 }
        },
        rich_plant_props: {
          stemLength: { min: 0.1, max: 5.0, step: 0.01, desc: "Length of stem", example: 1.0 },
          stemWidth: { min: 0.002, max: 0.5, step: 0.001, desc: "Width of stem", example: 0.05 },
          stemLean: { min: 0.0, max: 3.14, step: 0.01, desc: "Tilt from vertical", example: 0.1 },
          stemCurve: { min: -1.0, max: 1.0, step: 0.01, desc: "Forward bow", example: 0.1 },
          leafLength: { min: 0.01, max: 3.0, step: 0.01, desc: "Length of leaves", example: 0.3 },
          leafLengthVariance: { min: 0.0, max: 1.0, step: 0.01, desc: "Variance of length", example: 0.1 },
          leafWidth: { min: 0.01, max: 1.0, step: 0.01, desc: "Width of leaves", example: 0.1 },
          leafWidthVariance: { min: 0.0, max: 1.0, step: 0.01, desc: "Variance of width", example: 0.05 },
          leafTipTaper: { min: 0.0, max: 1.0, step: 0.01, desc: "Taper at leaf tip", example: 0.1 },
          leafAttachStart: { min: 0.0, max: 1.0, step: 0.01, desc: "Stem position to start leaves", example: 0.2 },
          leafAttachEnd: { min: 0.0, max: 1.0, step: 0.01, desc: "Stem position to end leaves", example: 0.8 },
          leafOutwardAngle: { min: 0.0, max: 3.14, step: 0.01, desc: "Angle outward from stem", example: 1.0 },
          leafOutwardVariance: { min: 0.0, max: 3.14, step: 0.01, desc: "Variance of outward angle", example: 0.2 },
          petalLength: { min: 0.01, max: 2.0, step: 0.01, desc: "Length of petals", example: 0.2 },
          petalWidth: { min: 0.003, max: 1.0, step: 0.001, desc: "Width of petals", example: 0.1 },
          petalTipTaper: { min: 0.0, max: 1.0, step: 0.01, desc: "Taper at petal tip", example: 0.1 },
          petalCurl: { min: -1.0, max: 1.0, step: 0.01, desc: "Curl of petals", example: 0.2 },
          flowerRadius: { min: 0.0, max: 1.0, step: 0.01, desc: "Radius of flower center", example: 0.05 },
          bloomSize: { min: 0.1, max: 5.0, step: 0.01, desc: "Overall flower bloom scale", example: 1.0 },
          vMultiplier: { min: 0.1, max: 10.0, step: 0.1, desc: "UV v-multiplier", example: 1.0 },
          seed: { min: 0, max: 1000, step: 1, desc: "Random seed", example: 42 },
          colorVariance: { min: 0.0, max: 1.0, step: 0.01, desc: "Color variance", example: 0.1 },
          leafCount: { min: 0, max: 50, step: 1, desc: "Number of leaves", example: 10 },
          petalCount: { min: 0, max: 50, step: 1, desc: "Number of petals", example: 8 },
          petalPitch: { min: 0.0, max: 3.14, step: 0.01, desc: "Inner petal lean", example: 0.1 },
          petalPitchOuter: { min: 0.0, max: 3.14, step: 0.01, desc: "Outer petal lean", example: 1.2 },
          petalRadiusInner: { min: 0.0, max: 1.0, step: 0.01, desc: "Inner petal radius", example: 0.01 },
          petalArrangement: { min: 0, max: 1, step: 1, desc: "0: ring, 1: spiral", example: 0 },
          segments: { min: 1, max: 20, step: 1, desc: "Curve subdivisions", example: 6 }
        }
      };
      const dwind = dom.$.div({ maxHeight$: "600px" });
      
      dom.sidebar$.appendChild(dwind);

      function make_named_props(wa, opts) {
        const ptr = opts.create();
        const count = opts.count();

        if (count !== opts.prop_names.length) {
          console.warn(opts.label + ": prop name list in demo_global is out of sync with its C++ struct layout");
        }

        const f = wa.fp32_array(count, ptr); // ONE typed array over the whole (now unified) struct

        const props = { ptr, preset_count: opts.preset_count(), needs_update: false };
        const ui_updaters = [];
        const whole_number_names = opts.whole_number_names || [];

        // Each color_names entry (e.g. "barkColor") is really 3 slots in prop_names
        // ("barkColorR"/"G"/"B") kept there so index math / the count sync-check above
        // stay simple -- but a per-channel slider next to the composite color picker
        // below is redundant now that the C++ side stores these as one number[3], so
        // we still bind the property (the color picker's get/set below reads/writes
        // it directly) but skip building a slider for it.
        const suppressed_names = {};
        (opts.color_names || []).forEach(function (name) {
          suppressed_names[name + "R"] = true;
          suppressed_names[name + "G"] = true;
          suppressed_names[name + "B"] = true;
        });

        const preset_options = [dom.$.option({ value: -1 }, "-- Select Preset --")];
        for (let j = 0; j < opts.preset_count(); j++) {
          preset_options.push(dom.$.option({ value: j }, "Preset " + j));
        }

        const preset_selector = dom.$.select({
          $style: "width:100%; margin-bottom: 10px;",
          onchange: function () {
            const preset_id = parseInt(this.value);
            if (preset_id >= 0) {
              opts.apply_preset(ptr, preset_id);
              props.needs_update = true;
              ui_updaters.forEach(fn => fn());
            }
          }
        }, ...preset_options);

        dwind.appendChild(
          dom.$.div.collapseable({ heading: opts.label, class$: "collapsed" },
            dom.$.div({ $style: "height:auto;max-height1:calc(100% - 20px);max-height:800px; overflow:hidden; overflow-y:auto" },
              preset_selector,
              opts.prop_names.map(function (name, idx) {
                const whole = whole_number_names.indexOf(name) >= 0;
                Object.defineProperty(props, name, {
                  get: function () { return f[idx]; },
                  set: function (v) { f[idx] = whole ? Math.round(v) : v; },
                  enumerable: true,
                });
                if (suppressed_names[name]) return null; // covered by a color picker below instead

                const range = (UI_RANGES[opts.label] && UI_RANGES[opts.label][name]) || { min: 0, max: 100, step: 1, desc: name };
                const el = dom.$.value_slider(dom.$.div(range.desc || name), {
                  value: props[name],
                  min: range.min, max: range.max, step: range.step,
                  oninput: function () {
                    props[name] = this.value;
                    props.needs_update = true;
                  }
                });
                ui_updaters.push(function () {
                  if (el.querySelectorAll) {
                    const inputs = el.querySelectorAll('input');
                    for (let k = 0; k < inputs.length; k++) {
                      inputs[k].value = props[name];
                    }
                  }
                });
                return el;
              }).filter(function (el) { return el; }),
              (opts.color_names || []).map(function (name) {
                Object.defineProperty(props, name, {
                  get: function () { return [props[name + "R"], props[name + "G"], props[name + "B"], 255]; },
                  set: function (v) { props[name + "R"] = v[0]; props[name + "G"] = v[1]; props[name + "B"] = v[2]; },
                  enumerable: true,
                });
                const col = props[name];
                const el = dom.$.color_input(dom.$.div(name), {
                  multiplier: 255,
                  value: col, oninput: function () {
                    props[name] = col;
                    props.needs_update = true;
                  }
                });
                ui_updaters.push(function () {
                  if (el.update_color) {
                    el.update_color(props[name]);
                  }
                });
                return el;
              })
            )
          )
        );


        props.apply_preset = function (preset_id) {
          opts.apply_preset(ptr, preset_id);
        };

        props.preset_selector = preset_selector;
        props.ui_updaters = ui_updaters;

        props.toJSON = function () {
          const o = {};
          opts.prop_names.forEach(function (n) { o[n] = props[n]; });
          return o;
        };

        return props;
      }

      function make_named_props_object(wa, opts) {
        const ptr = opts.create();
        const count = opts.count();

        if (count !== opts.prop_names.length) {
          console.warn(opts.label + ": prop name list in demo_global is out of sync with its C++ struct layout");
        }

        const f = wa.fp32_array(count, ptr); // ONE typed array over the whole (now unified) struct

        const props = { ptr, preset_count: opts.preset_count(), needs_update: false };

        const whole_number_names = opts.whole_number_names || [];

        const suppressed_names = {};
        (opts.color_names || []).forEach(function (name) {
          suppressed_names[name + "R"] = true;
          suppressed_names[name + "G"] = true;
          suppressed_names[name + "B"] = true;
        });

        const preset_options = [dom.$.option({ value: -1 }, "-- Select Preset --")];
        for (let j = 0; j < opts.preset_count(); j++) {
          preset_options.push(dom.$.option({ value: j }, "Preset " + j));
        }


        opts.prop_names.forEach(function (name, idx) {
          const whole = whole_number_names.indexOf(name) >= 0;
          Object.defineProperty(props, name, {
            get: function () { return f[idx]; },
            set: function (v) { f[idx] = whole ? Math.round(v) : v; },
            enumerable: true,
          });
        });

        (opts.color_names || []).forEach(function (name) {
          Object.defineProperty(props, name, {
            get: function () { return [props[name + "R"], props[name + "G"], props[name + "B"], 255]; },
            set: function (v) { props[name + "R"] = v[0]; props[name + "G"] = v[1]; props[name + "B"] = v[2]; },
            enumerable: true,
          });

        })



        props.apply_preset = function (preset_id) {
          opts.apply_preset(ptr, preset_id);
        };


        props.toJSON = function () {
          const o = {};
          opts.prop_names.forEach(function (n) { o[n] = props[n]; });
          return o;
        };

        let max_verts = opts.estimate_max_verts(props.ptr) * 2;

        const _positions = wa.fp32_array(max_verts * 3);
        const _normals = wa.fp32_array(max_verts * 3);
        const _uvs = wa.fp32_array(max_verts * 2);
        const _colors = wa.fp32_array(max_verts * 4); // RGBA -- a_color is vec4 in the shader
        const _interleaved = wa.fp32_array(max_verts * 12); // position(3) + normal(3) + uv(2) + color(4)


        props.reset = function (def) {
          opts.apply_preset(props.ptr, 0);
          if (def) {
            for (let k in def) {
              props[k] = def[k];
            }
          }
          return this;
        };
        props.create = function (geo) {
          geo = geo || engine.create_geometry({
            attr: {
              a_position: { item_size: 3, stride: 12 * 4, offset: 0 },
              a_normal: { item_size: 3, stride: 12 * 4, offset: 3 * 4 },
              a_uv: { item_size: 2, stride: 12 * 4, offset: 6 * 4 },
              a_color: { item_size: 4, stride: 12 * 4, offset: 8 * 4 }
            }
          });

          const total = opts.regenerate(
            props.ptr,
            _positions.byteOffset,
            _normals.byteOffset,
            _uvs.byteOffset,
            _colors.byteOffset,
            max_verts
          );

          geo.draw_count = total;

          const P = new Float32Array(wa.memory.buffer, _positions.byteOffset, total * 3);
          const N = new Float32Array(wa.memory.buffer, _normals.byteOffset, total * 3);
          const U = new Float32Array(wa.memory.buffer, _uvs.byteOffset, total * 2);
          const C = new Float32Array(wa.memory.buffer, _colors.byteOffset, total * 4);
          const I = new Float32Array(wa.memory.buffer, _interleaved.byteOffset, total * 12);

          for (let i = 0; i < total; i++) {
            const io = i * 12;
            const po = i * 3;
            const no = i * 3;
            const uo = i * 2;
            const co = i * 4;

            I[io + 0] = P[po + 0];
            I[io + 1] = P[po + 1];
            I[io + 2] = P[po + 2];

            I[io + 3] = N[no + 0];
            I[io + 4] = N[no + 1];
            I[io + 5] = N[no + 2];

            I[io + 6] = U[uo + 0];
            I[io + 7] = U[uo + 1];

            I[io + 8] = C[co + 0];
            I[io + 9] = C[co + 1];
            I[io + 10] = C[co + 2];
            I[io + 11] = C[co + 3];
          }

          wa.rdr_update_attribute_data(geo.attr.a_position, total * 12, _interleaved.byteOffset);

          wa.rdr_set_geo_draw_count(geo.uuid, geo.draw_count);
          return geo;
        };
        opts.apply_preset(props.ptr, 0);
        return props;
      }


      function make_tree_props(wa) {
        return make_named_props(wa, {
          label: "tree_props",
          create: wa.tree_props_create,
          count: wa.tree_props_count,
          preset_count: wa.tree_props_preset_count,
          apply_preset: wa.tree_props_apply_preset,
          prop_names: TREE_PROP_NAMES,
          whole_number_names: TREE_WHOLE_NUMBER_NAMES,
          color_names: TREE_COLOR_NAMES,
        });
      }

      function make_plant_props(wa) {
        return make_named_props(wa, {
          label: "plant_props",
          create: wa.plant_props_create,
          count: wa.plant_props_count,
          preset_count: wa.plant_props_preset_count,
          apply_preset: wa.plant_props_apply_preset,
          prop_names: PLANT_PROP_NAMES,
          whole_number_names: PLANT_WHOLE_NUMBER_NAMES,
          color_names: PLANT_COLOR_NAMES,
        });
      }

      function make_rich_plant_props(wa) {
        return make_named_props(wa, {
          label: "rich_plant_props",
          create: wa.rich_plant_props_create,
          count: wa.rich_plant_props_count,
          preset_count: wa.rich_plant_props_preset_count,
          apply_preset: wa.rich_plant_props_apply_preset,
          prop_names: RICH_PLANT_PROP_NAMES,
          whole_number_names: RICH_PLANT_WHOLE_NUMBER_NAMES,
          color_names: RICH_PLANT_COLOR_NAMES,
        });
      }


      function make_plant_props_object(wa) {
        return make_named_props_object(wa, {
          label: "plant_props",
          create: wa.plant_props_create,
          regenerate: wa.plant_generate,
          count: wa.plant_props_count,
          estimate_max_verts: wa.plant_estimate_max_verts,
          preset_count: wa.plant_props_preset_count,
          apply_preset: wa.plant_props_apply_preset,
          prop_names: PLANT_PROP_NAMES,
          whole_number_names: PLANT_WHOLE_NUMBER_NAMES,
          color_names: PLANT_COLOR_NAMES,
        });
      }

      function make_plant_props_custom_object(wa) {
        return make_named_props_object(wa, {
          label: "plant_props",
          create: wa.plant_props_create,
          regenerate: wa.plant_generate_custom,
          count: wa.plant_props_count,
          estimate_max_verts: wa.plant_estimate_max_verts,
          preset_count: wa.plant_props_preset_count,
          apply_preset: wa.plant_props_apply_preset,
          prop_names: PLANT_PROP_NAMES,
          whole_number_names: PLANT_WHOLE_NUMBER_NAMES,
          color_names: PLANT_COLOR_NAMES,
        });
      }


      // anti-aliasing selector for a deferred_rendering screen (none / fxaa / taa); ?aa=taa picks the initial mode
      function antialias_controls(scr) {
        const want = (new URLSearchParams(location.search)).get("aa");
        if (want) scr.antialias = want;
        const aa_select = dom.$.select({
          $style: "width:100%; margin-bottom: 6px;",
          onchange: function () { scr.antialias = this.value; },
        }, dom.$.option({ value: "none" }, "Anti-aliasing: none"), dom.$.option({ value: "fxaa" }, "Anti-aliasing: FXAA"), dom.$.option({ value: "taa" }, "Anti-aliasing: TAA"));
        aa_select.value = scr.antialias;
        dom.sidebar$.insertBefore(dom.$.div({ $style: "padding:4px" }, aa_select), dom.sidebar$.firstChild);
      }

      function test1() {
        const tree = make_tree_props(wa);

        console.log(tree);
        // Room for the woody mesh plus every twig card of a catalog tree (the largest, e.g. birch/maple, are
        // ~11k verts; levels 7 / treeSteps 10 would need far more), so tree_generate never has to truncate.
        const max_verts = 120000;

        const positions = wa.fp32_array(max_verts * 3);
        const normals = wa.fp32_array(max_verts * 3);
        const uvs = wa.fp32_array(max_verts * 2);
        const colors = wa.fp32_array(max_verts * 4); // RGBA -- a_color is vec4 in the shader
        const trunk_count_buf = wa.u32_array(1);
        

        const gg = engine.create_geometry();
        gg.positions = engine.geometry_set_attr({ item_size: 3 });
        gg.normals = engine.geometry_set_attr({ item_size: 3 });
        gg.uvs = engine.geometry_set_attr({ item_size: 2 });
        gg.colors = engine.geometry_set_attr({ item_size: 4 });

        gg.attr.a_position = gg.positions.uuid;
        gg.attr.a_normal = gg.normals.uuid;
        gg.attr.a_uv = gg.uvs.uuid;
        gg.attr.a_color = gg.colors.uuid;


        function update_tree() {
          //tree.apply_preset(0);

          const total = wa.tree_generate(
            tree.ptr,
            positions.byteOffset,
            normals.byteOffset,
            uvs.byteOffset,
            colors.byteOffset,
            max_verts,
            trunk_count_buf.byteOffset
          );

          tree.gg = gg;
          engine.geometry_set_attr(gg.positions, positions, total * 3);
          engine.geometry_set_attr(gg.normals, normals, total * 3);
          engine.geometry_set_attr(gg.uvs, uvs, total * 2);
          engine.geometry_set_attr(gg.colors, colors, total * 4);
          gg.trunk_count = trunk_count_buf[0];
          gg.twig_count = total - gg.trunk_count;

          let top = 0;
          for (let i = 1; i < total * 3; i += 3) if (positions[i] > top) top = positions[i];
          tree.height = top;
          if (tree.frame_pending) {       // a species was just loaded: fit the camera to the new tree
            tree.frame_pending = false;
            engine.tra_model.set_position(scene.camera.control, 0, top * 0.45, 0);
            scene.camera.control.distance = Math.max(10, top * parseFloat(url_params.get("zoomf") || "1.5"));
            if (url_params.has("yaw") || url_params.has("pitch")) engine.tra_model.yaw_pitch(scene.camera.control, parseFloat(url_params.get("yaw") || "0"), parseFloat(url_params.get("pitch") || "0"));   // ?yaw= / ?pitch= (radians) to look from another side
          }
        }


        update_tree();

        const mat = engine.materials.create({
          wireframe: !true, compiler: "pbr",
          props : {
            enable_vertex_color: true,
          },
          uniforms: {
            u_baryframe_opacity: 0.15,
            u_baryframe_width1: 0.5,
          }
        });


        // ---- twigs: tree_generate writes one double-sided card per terminal branch after the woody
        // vertices (gg.trunk_count .. +gg.twig_count). Their UVs are meant for an alpha leaf texture and
        // their vertex colour is the bark colour, so they get their own material: the procedural leaf
        // texture (leaf_textures.js) as base colour, alpha-cut, no vertex colour.
        const leaf_textures_cache = {};
        function leaf_texture(id) {
          if (!leaf_textures_cache[id]) {
            const px = leaf_textures.pixels(id, 256);
            // the canvas has v = 1 at the top row, GL uploads row 0 at v = 0: flip the rows
            const flipped = new Uint8Array(px.data.length), stride = px.width * 4;
            for (let y = 0; y < px.height; y++) flipped.set(px.data.subarray(y * stride, (y + 1) * stride), (px.height - 1 - y) * stride);
            leaf_textures_cache[id] = engine.textures.create({ width: px.width, height: px.height, source: flipped, clamp: true });
          }
          return leaf_textures_cache[id];
        }
        const leaf_mat = engine.materials.create({
          compiler: "pbr",
          uniforms: {
            u_base_color_map: leaf_texture("english_oak"),
            u_alpha_test: 0.5,
            u_roughness: 0.85,
          }
        });
        tree.show_twigs = true;

        // ---- species catalog (tree_trunk_presets.json): pick one to load its props, leaf texture and seed
        function apply_species(sp) {
          tree.apply_preset(0);
          Object.keys(sp.props).forEach(function (k) { tree[k] = sp.props[k]; });
          leaf_mat.uniforms.u_base_color_map = leaf_texture(sp.leaf_texture);
          tree.ui_updaters.forEach(function (fn) { fn(); });
          tree.needs_update = true;
          tree.frame_pending = true;
          console.log("species", sp.id, sp.name);
        }
        httprequest.get_url("tree_trunk_presets.json", "json").then(function (doc) {
          if (!doc || !doc.trees) return;
          const species_select = dom.$.select({
            $style: "width:100%; margin-bottom: 6px;",
            onchange: function () { if (this.value >= 0) apply_species(doc.trees[this.value]); },
          }, dom.$.option({ value: -1 }, "-- Species (" + doc.trees.length + ") --"),
            ...doc.trees.map(function (t, i) { return dom.$.option({ value: i }, t.name); }));
          const twigs_toggle = dom.$.label({ $style: "display:block;color:white" },
            dom.$.input({ type: "checkbox", checked: true, onchange: function () { tree.show_twigs = this.checked; } }), " twigs");
          dom.sidebar$.insertBefore(dom.$.div({ $style: "padding:4px" }, species_select, twigs_toggle), dom.sidebar$.firstChild);
          const want = (new URLSearchParams(location.search)).get("species");
          const found = want ? doc.trees.findIndex(function (t) { return t.id === want; }) : -1;
          if (found >= 0) { species_select.value = found; apply_species(doc.trees[found]); }
        });

        function render_scene() {

          if (tree.needs_update) {
            tree.needs_update = false;
            update_tree();
          }
          engine.render_item(gg, mat, 0, gg.trunk_count, 0);
          if (tree.show_twigs && gg.twig_count > 0) engine.render_item(gg, leaf_mat, gg.trunk_count, gg.twig_count, 0);


          engine.debug.render();
        }


        const scr = engine.deffered_rendering({
          camera: scene.camera,
          dlight0: scene.dlight0,
          ENABLE_ATMOSPHERE: !true,
          ENABLE_SHADOWS: true,
          ENABLE_LOGDEPTH:false,
        });

        //scr.enabled = false;
        antialias_controls(scr);

        scr.on_shadowmap = function (time, time_delta) {
          render_scene();
        };
        scr.on_frame = function (time, time_delta) {
          engine.debug.grid.render_plane();
          render_scene();
        };



      }



      // =============================================================================================
      // shared by the plants and forest scenes: generation scratch buffers, LOD derivation, kind builders
      // =============================================================================================

      let gen_scratch = null;
      function gen_buffers() {
        if (!gen_scratch) {
          // plant_estimate_max_verts ignores the flower / ear geometry that flowerChance adds, so don't size from it
          const MAX = 120000;
          gen_scratch = { max: MAX, positions: wa.fp32_array(MAX * 3), normals: wa.fp32_array(MAX * 3), uvs: wa.fp32_array(MAX * 2), colors: wa.fp32_array(MAX * 4), counts: wa.u32_array(2) };
        }
        return gen_scratch;
      }

      function apply_props(binder, props, seed) {
        binder.apply_preset(0);
        Object.keys(props).forEach(function (k) { binder[k] = props[k]; });
        if (seed !== undefined) binder.seed = seed;
      }

      // Aliasing of distant blades. A blade is a ribbon a few millimetres wide, so beyond a few metres it is much
      // narrower than a pixel and the field turns into shimmering dots. In the vertex shader each edge is pushed outwards
      // by up to half a pixel, fading in with distance, so a ribbon never gets thinner than about a pixel.
      // plant_build_blade writes u = 0 for the left edge and u = 1 for the right, the width axis is always horizontal,
      // and the front-face normal is width_axis x tangent, so up x normal points along the width axis. The 12 vertices of
      // a blade segment are 6 front then 6 back-face ones (negated normals), hence the gl_VertexID test.
      const BLADE_WIDEN_SHADER = `
uniform vec2 u_render_size;
uniform vec3 u_blade_widen;     // x: start distance, y: full-effect distance, z: strength in pixels (0 = off)
void vertex(){
	super_vertex();
	if (u_blade_widen.z > 0.0 && u_projection_matrix[3][3] < 0.5) {      // perspective cameras only, not the sun's cascades
		float side = v_uv.x * 2.0 - 1.0;                                  // -1 left edge ... +1 right edge
		vec3 n = ((gl_VertexID % 12) >= 6) ? -v_normal_world : v_normal_world;
		vec3 w = cross(vec3(0.0, 1.0, 0.0), n);
		float wl = length(w);
		if (wl > 1e-4) {
			float depth = gl_Position.w;                                  // distance along the view axis
			float pixel = depth * 2.0 / (u_projection_matrix[1][1] * u_render_size.y);   // world size of one pixel here
			float fade = smoothstep(u_blade_widen.x, u_blade_widen.y, depth);
			v_position_world += (w / wl) * (side * 0.5 * pixel * u_blade_widen.z * fade);
			gl_Position = u_view_projection_matrix * vec4(v_position_world, 1.0);
		}
	}
}`;
      const url_params = new URLSearchParams(location.search);
      function make_plant_material() {
        return engine.materials.create({
          compiler: "pbr",
          props: { enable_vertex_color: true },
          state: { cullFace: null },                      // blades and petals are single ribbons: draw both faces
          shader: BLADE_WIDEN_SHADER,
          uniforms: {
            u_roughness: 0.8,
            u_blade_widen: engine.math.vec3(3.0, 14.0, url_params.has("widen") ? parseFloat(url_params.get("widen")) : 1.0),
          },
        });
      }

      function make_ground(size, color) {
        const geo = engine.geometries.plane(size, size, 1, 1, 2);   // last argument: 1 = XY (a wall), 2 = XZ (the ground)
        const mat = engine.materials.create({ compiler: "pbr", state: { cullFace: null }, uniforms: { u_base_color: engine.math.vec4(color[0], color[1], color[2], 1), u_roughness: 1 } });
        return { render: function () { engine.render_item(geo, mat, 0, 0, 0); } };
      }

      function mulberry(a) {
        return function () {
          a = (a + 0x6D2B79F5) >>> 0;
          let t = a;
          t = Math.imul(t ^ (t >>> 15), t | 1);
          t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
          return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
      }

      // Lower-detail versions of a plant: fewer, fatter blades and fewer ribbon segments (the blade widening shader keeps
      // the coverage up), fewer petals and leaves for flowers.
      function plant_lod_props(def, level) {
        const p = Object.assign({}, def.props);
        if (level === 0) return p;
        const near = level === 1;
        const seg = Math.max(near ? 2 : 1, Math.round(p.segments * (near ? 0.6 : 0.34)));
        if (def.generator === "plant") {
          p.bladeCount = Math.max(near ? 6 : 4, Math.round(p.bladeCount * (near ? 0.5 : 0.22)));
          const k = near ? 1.7 : 3.6;
          p.bladeWidth *= k; p.bladeWidthVariance *= k;
          p.segments = seg;
        }
        else {
          p.segments = seg;
          if (p.petalCount > 0) p.petalCount = Math.max(3, Math.round(p.petalCount * (near ? 0.6 : 0.35)));
          p.leafCount = Math.max(1, Math.round(p.leafCount * (near ? 0.7 : 0.4)));
          const k = near ? 1.4 : 2.2;
          p.stemWidth *= k; p.leafWidth *= k; p.petalWidth *= k;
        }
        return p;
      }

      // A plant "kind" for the LOD manager: VARIANTS seeds x 3 levels of detail, each uploaded once as an instanced geometry.
      function build_plant_kind(lod, binders, def, material, variants) {
        const b = gen_buffers(), vs = [];
        for (let v = 0; v < variants; v++) {
          const levels = [];
          for (let level = 0; level < 3; level++) {
            const binder = def.generator === "rich" ? binders.rich : binders.plant;
            apply_props(binder, plant_lod_props(def, level), def.props.seed + v);
            const total = def.generator === "rich"
              ? wa.rich_plant_generate(binder.ptr, b.positions.byteOffset, b.normals.byteOffset, b.uvs.byteOffset, b.colors.byteOffset, b.max, b.counts.byteOffset, b.counts.byteOffset + 4)
              : wa.plant_generate(binder.ptr, b.positions.byteOffset, b.normals.byteOffset, b.uvs.byteOffset, b.colors.byteOffset, b.max);
            // the colour alpha holds a per-part wind phase, not opacity: the material would read it as opacity
            for (let i = 3; i < total * 4; i += 4) b.colors[i] = 1;
            const g = lod.upload(total, b);
            levels.push({ geo: g.geo, inst: g.inst, vertices: total, draws: [{ material: material, offset: 0, count: total }] });
          }
          vs.push(levels);
        }
        const s = Math.min(3, Math.max(1, def.generated.height * 1.6));   // taller plants stay detailed further out
        return lod.add_kind({
          id: def.id, group: "plants", variants: vs,
          distances: [6 * s, 16 * s, 34 * s, 52 * s], keep: [1, 1, 0.8],
          shadow_levels: def.generated.height > 0.8 ? 2 : 1,              // small plants only cast shadows while they are close
        });
      }

      // Lower-detail versions of a tree: thinner trunk rings, then one branch level fewer with bigger leaf cards.
      function tree_lod_props(sp, level) {
        const p = Object.assign({}, sp.props);
        if (level === 0) return p;
        p.segments = level === 1 ? Math.max(4, 2 * Math.round((p.segments - 2) / 2)) : 4;
        if (level === 2) { p.levels = Math.max(3, p.levels - 1); p.twigScale *= 1.25; }
        return p;
      }

      function build_tree_kind(lod, binder, sp, bark_mat, leaf_mat, variants) {
        const b = gen_buffers(), vs = [];
        for (let v = 0; v < variants; v++) {
          const levels = [];
          for (let level = 0; level < 3; level++) {
            apply_props(binder, tree_lod_props(sp, level), sp.props.seed + v * 17);
            const total = wa.tree_generate(binder.ptr, b.positions.byteOffset, b.normals.byteOffset, b.uvs.byteOffset, b.colors.byteOffset, b.max, b.counts.byteOffset);
            const woody = b.counts[0];
            const g = lod.upload(total, b);
            levels.push({ geo: g.geo, inst: g.inst, vertices: total,
              draws: [{ material: bark_mat, offset: 0, count: woody }, { material: leaf_mat, offset: woody, count: total - woody }] });
          }
          vs.push(levels);
        }
        return lod.add_kind({ id: sp.id, group: "trees", variants: vs, distances: [40, 100, 240, 420], keep: [1, 1, 1], shadow_levels: 3 });
      }

      const leaf_texture_cache = {};
      function leaf_texture_for(id) {
        if (!leaf_texture_cache[id]) {
          const px = leaf_textures.pixels(id, 256);
          const flipped = new Uint8Array(px.data.length), stride = px.width * 4;   // canvas v = 1 is the top row; GL row 0 is v = 0
          for (let y = 0; y < px.height; y++) flipped.set(px.data.subarray(y * stride, (y + 1) * stride), (px.height - 1 - y) * stride);
          leaf_texture_cache[id] = engine.textures.create({ width: px.width, height: px.height, source: flipped, clamp: true });
        }
        return leaf_texture_cache[id];
      }
      function make_leaf_material(id) {
        return engine.materials.create({ compiler: "pbr", uniforms: { u_base_color_map: leaf_texture_for(id), u_alpha_test: 0.5, u_roughness: 0.85 } });
      }

      // text for the LOD statistics: instances drawn per level, per group
      function lod_stats_text(lod) {
        const st = lod.stats, groups = {};
        Object.keys(lod.kinds).forEach(function (id) {
          const k = lod.kinds[id], g = groups[k.group] = groups[k.group] || [0, 0, 0, 0];
          (st.per_kind[id] || []).forEach(function (c, l) { g[l] += c; });
        });
        return Object.keys(groups).map(function (g) { return g + " L0/L1/L2: " + groups[g].slice(0, 3).join(" / "); }).join("\n")
          + "\n" + st.drawn + " drawn of " + st.instances + "\n" + (st.vertices / 1e6).toFixed(2) + " M vertices (" + (st.full_vertices / 1e6).toFixed(2) + " M at full detail)";
      }

      // camera: a rig that can fly along a path at eye height, to see the LOD switch
      function make_fly(speed_default) {
        const fly = { on: url_params.get("fly") === "1", speed: parseFloat(url_params.get("speed") || speed_default || 3), t: parseFloat(url_params.get("t") || "0"), radius: 34 };
        fly.step = function () {                         // advances a fixed distance per rendered frame, so the motion is the same at any frame rate
          if (!fly.on) return;
          fly.t += fly.speed / 60;
          const a = fly.t / fly.radius;
          const x = Math.cos(a) * fly.radius, z = Math.sin(a) * fly.radius;
          const c = scene.camera.control;
          engine.tra_model.set_position(c, x, 1.35, z);
          // the camera sits behind the control, on its local +z axis (sin yaw, 0, cos yaw), so that axis must point against the travel direction (-sin a, cos a)
          c.eular[1] = Math.atan2(Math.sin(a), -Math.cos(a));
          engine.tra_model.set_eular(c, 0.1, c.eular[1], 0);
        };
        return fly;
      }

      // =============================================================================================
      // plants and grass (plant_system.cpp), loaded with  ?scene=plants[&habitat=<id>]
      //
      // plant_generate makes blade plants (grass, rosettes, ferns) and rich_plant_generate makes a stem with
      // leaves and a flower. plant_presets.json holds a catalog of both; every plant is generated with a few
      // seeds at three levels of detail and scattered over a habitat with instancing. The LOD manager
      // (scatter_lod.js) sorts the instances by distance each time the camera has moved.
      // =============================================================================================
      function plants_test() {
        const binders = { plant: make_plant_props(wa), rich: make_rich_plant_props(wa) };   // also give the sliders
        const lod = scatter_lod.create(engine, { camera_position: scene.camera.world_position });
        lod.enabled = url_params.get("lod") !== "0";
        const VARIANTS = 4;
        const plant_mat = make_plant_material();
        const ground = make_ground(80, [0.09, 0.075, 0.035]);

        let habitat = null, density_scale = 1, scatter_seed = 1;
        const stats_div = dom.$.div({ $style: "color:white;padding:4px;font-size:90%;white-space:pre" });

        function build_habitat(h) {
          habitat = h;
          scene.camera.control.distance = Math.max(2.5, h.size_m * (url_params.has("zoom") ? parseFloat(url_params.get("zoom")) : 0.8));
          engine.tra_model.set_position(scene.camera.control, 0, 0.25, 0);
          const rand = mulberry(7919 * scatter_seed);
          Object.keys(lod.kinds).forEach(function (id) { lod.set_instances(id, new Float32Array(0)); });
          if (h.id === "showcase") {                      // one of each, in a row
            const ids = Object.keys(lod.kinds);
            ids.forEach(function (id, i) { lod.set_instances(id, new Float32Array([(i - (ids.length - 1) / 2) * 1.1, 0, 0])); });
          }
          else {
            h.plants.forEach(function (e) {
              if (!lod.kinds[e.plant]) return;
              const n = Math.min(60000, Math.round(e.density_per_m2 * density_scale * h.size_m * h.size_m));
              const xyz = new Float32Array(n * 3);
              for (let i = 0; i < n; i++) { xyz[i * 3] = (rand() - 0.5) * h.size_m; xyz[i * 3 + 2] = (rand() - 0.5) * h.size_m; }
              lod.set_instances(e.plant, xyz);
            });
          }
          lod.update(true);
        }

        httprequest.get_url("plant_presets.json", "json").then(function (doc) {
          if (!doc || !doc.plants) return;
          doc.plants.forEach(function (def) { build_plant_kind(lod, binders, def, plant_mat, VARIANTS); });
          const habitats = doc.habitats.concat([{ id: "showcase", name: "Showcase (one of each)", size_m: 14, plants: [] }]);
          const habitat_select = dom.$.select({
            $style: "width:100%; margin-bottom: 6px;",
            onchange: function () { build_habitat(habitats[this.value]); },
          }, ...habitats.map(function (h, i) { return dom.$.option({ value: i }, h.name); }));
          const density_slider = dom.$.input({
            type: "range", min: 0.1, max: 2, step: 0.05, value: 1, $style: "width:100%",
            oninput: function () { density_scale = parseFloat(this.value); build_habitat(habitat); },
          });
          const reseed = dom.$.button({ onclick: function () { scatter_seed++; build_habitat(habitat); } }, "scatter again");
          const widen_slider = dom.$.input({                  // how much distant blades are thickened (in pixels); 0 = off, shows the raw aliasing
            type: "range", min: 0, max: 2, step: 0.05, value: plant_mat.uniforms.u_blade_widen[2], $style: "width:100%",
            oninput: function () { plant_mat.uniforms.u_blade_widen[2] = parseFloat(this.value); },
          });
          const lod_toggle = dom.$.label({ $style: "display:block" }, dom.$.input({ type: "checkbox", checked: lod.enabled, onchange: function () { lod.enabled = this.checked; lod.invalidate(); } }), " dynamic LOD");
          dom.sidebar$.insertBefore(dom.$.div({ $style: "padding:4px;color:white" }, habitat_select, "density ", density_slider, "distant blade widening ", widen_slider, lod_toggle, reseed, stats_div), dom.sidebar$.firstChild);
          const want = url_params.get("habitat");
          const found = Math.max(0, habitats.findIndex(function (h) { return h.id === want; }));
          habitat_select.value = found;
          build_habitat(habitats[found]);
          console.log("plants", Object.keys(lod.kinds).length, "species,", VARIANTS, "seeds x 3 LODs each");
        });

        engine.tra_model.yaw_pitch(scene.camera.control, 0, 0.38);        // look down at the ground, not along it

        const scr = engine.deffered_rendering({
          camera: scene.camera,
          dlight0: scene.dlight0,
          ENABLE_ATMOSPHERE: !true,
          ENABLE_SHADOWS: true,
          ENABLE_LOGDEPTH: false,
        });
        antialias_controls(scr);
        scr.on_shadowmap = function (time, time_delta) { lod.render("shadow"); };
        scr.on_frame = function (time, time_delta) {
          lod.update();
          stats_div.textContent = lod_stats_text(lod);
          ground.render();
          lod.render("main");
          engine.debug.render();
        };
      }

      // =============================================================================================
      // forest: trees (tree_system) with undergrowth (plant_system) together, ?scene=forest
      // Everything is instanced and level-of-detail sorted by distance from the camera as it moves; ?fly=1 flies
      // the camera along a path at eye height, ?lod=0 turns the LOD off to compare the cost.
      // =============================================================================================
      function forest_test() {
        const WORLD = parseFloat(url_params.get("world") || "130");   // metres, a square centred on the origin (?world= for a smaller test area)
        const binders = { plant: make_plant_props(wa), rich: make_rich_plant_props(wa) };
        const tree_binder = make_tree_props(wa);
        const lod = scatter_lod.create(engine, { camera_position: scene.camera.world_position });
        lod.enabled = url_params.get("lod") !== "0";
        if (url_params.has("bias")) lod.bias = parseFloat(url_params.get("bias"));
        const plant_mat = make_plant_material();
        const bark_mat = engine.materials.create({ compiler: "pbr", props: { enable_vertex_color: true }, uniforms: { u_roughness: 0.9 } });
        const ground = make_ground(WORLD * 1.6, [0.07, 0.085, 0.03]);
        const fly = make_fly(3);
        const stats_div = dom.$.div({ $style: "color:white;padding:4px;font-size:90%;white-space:pre" });

        const TREES = url_params.has("species") ? [[url_params.get("species"), 1]]       // ?species=<tree id>: a stand of one species
          : [["english_oak", 0.22], ["common_beech", 0.2], ["silver_birch", 0.18], ["scots_pine", 0.15], ["norway_spruce", 0.13], ["sugar_maple", 0.12]];
        // plants per square metre in the forest (the meadow densities are far too high to carry over 17,000 m^2)
        const UNDERGROWTH = { meadow_grass: 1.4, white_clover: 0.7, fern: 0.07, tussock_grass: 0.03, daisy: 0.1, dandelion: 0.06, poppy: 0.05, cornflower: 0.05, lavender: 0.015 };

        function populate() {
          const rand = mulberry(20241);
          // trees: dart throwing with a minimum spacing, species picked by weight
          const trees = [], by_species = {}, MIN_GAP = 5.5, N_TREES = parseInt(url_params.get("trees") || "170");
          for (let tries = 0; tries < N_TREES * 40 && trees.length < N_TREES; tries++) {
            const x = (rand() - 0.5) * WORLD, z = (rand() - 0.5) * WORLD;
            if (Math.hypot(x, z) < 6) continue;           // keep the starting clearing open
            if (trees.some(function (t) { return Math.hypot(t[0] - x, t[1] - z) < MIN_GAP; })) continue;
            let r = rand(), id = TREES[TREES.length - 1][0];
            for (let i = 0; i < TREES.length; i++) { r -= TREES[i][1]; if (r < 0) { id = TREES[i][0]; break; } }
            trees.push([x, z]); (by_species[id] = by_species[id] || []).push(x, 0, z);
          }
          Object.keys(lod.kinds).forEach(function (id) {
            const k = lod.kinds[id];
            if (k.group === "trees") lod.set_instances(id, new Float32Array(by_species[id] || []));
          });
          // undergrowth, kept clear of trunks; ferns cluster under the trees, clover grows in patches
          const near_tree = function (x, z, r) { for (let i = 0; i < trees.length; i++) if (Math.abs(trees[i][0] - x) < r && Math.abs(trees[i][1] - z) < r && Math.hypot(trees[i][0] - x, trees[i][1] - z) < r) return true; return false; };
          Object.keys(UNDERGROWTH).forEach(function (id) {
            if (!lod.kinds[id]) return;
            const n = Math.round(UNDERGROWTH[id] * WORLD * WORLD * (parseFloat(url_params.get("density") || "1")));
            const out = [];
            for (let i = 0; i < n; i++) {
              let x = (rand() - 0.5) * WORLD, z = (rand() - 0.5) * WORLD;
              if (id === "fern" && trees.length) { const t = trees[Math.floor(rand() * trees.length)], a = rand() * 6.283, r = 1.5 + rand() * 4.5; x = t[0] + Math.cos(a) * r; z = t[1] + Math.sin(a) * r; }
              if (id === "white_clover" && Math.sin(x * 0.11) + Math.sin(z * 0.14) + Math.sin((x + z) * 0.06) < 0.9) continue;
              if (near_tree(x, z, 0.7)) continue;
              out.push(x, 0, z);
            }
            lod.set_instances(id, new Float32Array(out));
          });
          lod.update(true);
        }

        Promise.all([httprequest.get_url("tree_trunk_presets.json", "json"), httprequest.get_url("plant_presets.json", "json")]).then(function (docs) {
          const tree_doc = docs[0], plant_doc = docs[1];
          if (!tree_doc || !plant_doc) return;
          TREES.forEach(function (t) {
            const sp = tree_doc.trees.find(function (x) { return x.id === t[0]; });
            if (sp) build_tree_kind(lod, tree_binder, sp, bark_mat, make_leaf_material(sp.leaf_texture), 3);
          });
          plant_doc.plants.forEach(function (def) { if (UNDERGROWTH[def.id] !== undefined) build_plant_kind(lod, binders, def, plant_mat, 3); });
          populate();

          const lod_toggle = dom.$.label({ $style: "display:block" }, dom.$.input({ type: "checkbox", checked: lod.enabled, onchange: function () { lod.enabled = this.checked; lod.invalidate(); } }), " dynamic LOD");
          const bias_slider = dom.$.input({ type: "range", min: 0.3, max: 3, step: 0.05, value: lod.bias, $style: "width:100%", oninput: function () { lod.bias = parseFloat(this.value); lod.invalidate(); } });
          const fly_toggle = dom.$.label({ $style: "display:block" }, dom.$.input({ type: "checkbox", checked: fly.on, onchange: function () { fly.on = this.checked; } }), " fly through the forest");
          const speed_slider = dom.$.input({ type: "range", min: 0.5, max: 12, step: 0.5, value: fly.speed, $style: "width:100%", oninput: function () { fly.speed = parseFloat(this.value); } });
          const widen_slider = dom.$.input({ type: "range", min: 0, max: 2, step: 0.05, value: plant_mat.uniforms.u_blade_widen[2], $style: "width:100%", oninput: function () { plant_mat.uniforms.u_blade_widen[2] = parseFloat(this.value); } });
          dom.sidebar$.insertBefore(dom.$.div({ $style: "padding:4px;color:white" }, lod_toggle, "LOD distance bias ", bias_slider, fly_toggle, "speed (m/s) ", speed_slider, "distant blade widening ", widen_slider, stats_div), dom.sidebar$.firstChild);
          console.log("forest", Object.keys(lod.kinds).length, "kinds");
        });

        scene.camera.control.distance = parseFloat(url_params.get("dist") || "5");
        engine.tra_model.set_position(scene.camera.control, 0, 1.35, 0);
        engine.tra_model.yaw_pitch(scene.camera.control, parseFloat(url_params.get("yaw") || "0"), parseFloat(url_params.get("pitch") || "0.1"));

        const scr = engine.deffered_rendering({
          camera: scene.camera,
          dlight0: scene.dlight0,
          ENABLE_ATMOSPHERE: url_params.get("sky") !== "0",     // the engine's atmosphere (sky, sun disc, aerial perspective); ?sky=0 for a black sky
          ENABLE_SHADOWS: true,
          ENABLE_LOGDEPTH: false,
        });
        antialias_controls(scr);
        scr.on_shadowmap = function (time, time_delta) { lod.render("shadow"); };
        scr.on_frame = function (time, time_delta) {
          fly.step();
          lod.update();
          stats_div.textContent = lod_stats_text(lod);
          ground.render();
          lod.render("main");
          engine.debug.render();
        };
      }


      // ?scene=plants shows the plant / grass catalog, ?scene=forest trees with undergrowth, anything else the tree test
      const scene_select = dom.$.select({
        $style: "width:100%; margin-bottom: 6px;",
        onchange: function () { location.search = "?scene=" + this.value; },
      }, dom.$.option({ value: "trees" }, "Scene: trees"), dom.$.option({ value: "plants" }, "Scene: plants and grass"), dom.$.option({ value: "forest" }, "Scene: forest with undergrowth (LOD)"));
      const scene_name = ["plants", "forest"].indexOf(url_params.get("scene")) >= 0 ? url_params.get("scene") : "trees";
      scene_select.value = scene_name;
      dom.sidebar$.insertBefore(dom.$.div({ $style: "padding:4px" }, scene_select), dom.sidebar$.firstChild);

      if (scene_name === "plants") plants_test();
      else if (scene_name === "forest") forest_test();
      else test1();

    }

    suit0();

    

  }

  engine({})(ready);
});