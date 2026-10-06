packing("engine.js","debug.js")(function (engine, dom, httprequest) {
  import("leaf_textures.js")

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
            scene.camera.control.distance = Math.max(10, top * 1.5);
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

        scr.on_shadowmap = function (time, time_delta) {
          render_scene();
        };
        scr.on_frame = function (time, time_delta) {
          engine.debug.grid.render_plane();
          render_scene();
        };



      }



      // ---------------------------------------------------------------------------------------------
      // plants and grass (plant_system.cpp), loaded with  ?scene=plants[&habitat=<id>]
      //
      // plant_generate makes blade plants (grass, rosettes, ferns) and rich_plant_generate makes a stem with
      // leaves and a flower. plant_presets.json holds a catalog of both; every plant is generated with a few
      // seeds, uploaded once as an engine geometry, and then scattered over a habitat with instancing: the
      // geometry holds one plant and a per-instance position attribute (divisor 1) places the copies.
      function plants_test() {
        const plant_binder = make_plant_props(wa);        // flat float-block binders over the C++ structs (also give the sliders)
        const rich_binder = make_rich_plant_props(wa);

        // plant_estimate_max_verts ignores the flower / ear geometry that flowerChance adds, so don't size from it
        const MAX_VERTS = 60000;
        const positions = wa.fp32_array(MAX_VERTS * 3);
        const normals = wa.fp32_array(MAX_VERTS * 3);
        const uvs = wa.fp32_array(MAX_VERTS * 2);
        const colors = wa.fp32_array(MAX_VERTS * 4);
        const counts = wa.u32_array(2);                   // rich_plant_generate: stem verts, leaf verts
        const VARIANTS = 4;                               // seeds per plant: the copies of one species are not clones
        const DYNAMIC_DRAW = 35048;                       // GL_DYNAMIC_DRAW
        const library = {};                               // plant id -> { def, variants: [{ geo, total, inst, count }] }

        function upload_plant(def, seed) {
          const binder = def.generator === "rich" ? rich_binder : plant_binder;
          binder.apply_preset(0);
          Object.keys(def.props).forEach(function (k) { binder[k] = def.props[k]; });
          binder.seed = seed;
          const total = def.generator === "rich"
            ? wa.rich_plant_generate(binder.ptr, positions.byteOffset, normals.byteOffset, uvs.byteOffset, colors.byteOffset, MAX_VERTS, counts.byteOffset, counts.byteOffset + 4)
            : wa.plant_generate(binder.ptr, positions.byteOffset, normals.byteOffset, uvs.byteOffset, colors.byteOffset, MAX_VERTS);
          // the colour alpha holds a per-part wind phase, not opacity: the material would read it as opacity
          for (let i = 3; i < total * 4; i += 4) colors[i] = 1;

          const geo = engine.create_geometry();
          geo.positions = engine.geometry_set_attr({ item_size: 3 });
          geo.normals = engine.geometry_set_attr({ item_size: 3 });
          geo.uvs = engine.geometry_set_attr({ item_size: 2 });
          geo.colors = engine.geometry_set_attr({ item_size: 4 });
          geo.attr.a_position = geo.positions.uuid;
          geo.attr.a_normal = geo.normals.uuid;
          geo.attr.a_uv = geo.uvs.uuid;
          geo.attr.a_color = geo.colors.uuid;
          engine.geometry_set_attr(geo.positions, positions, total * 3);
          engine.geometry_set_attr(geo.normals, normals, total * 3);
          engine.geometry_set_attr(geo.uvs, uvs, total * 2);
          engine.geometry_set_attr(geo.colors, colors, total * 4);

          const inst = engine.geometry_set_attr({ buffer_type: DYNAMIC_DRAW, item_size: 3, divisor: 1 });
          geo.attr.a_instance_a_position = inst.uuid;
          engine.geometry_set_attr(inst, new Float32Array(3), 3);
          return { geo: geo, total: total, inst: inst, count: 0 };
        }

        const plant_mat = engine.materials.create({
          compiler: "pbr",
          props: { enable_vertex_color: true },
          state: { cullFace: null },                      // blades and petals are single ribbons: draw both faces
          uniforms: { u_roughness: 0.8 },
        });
        const ground_geo = engine.geometries.plane(40, 40, 1, 1, 2);   // last argument: 1 = XY (a wall), 2 = XZ (the ground)
        const ground_mat = engine.materials.create({
          compiler: "pbr",
          state: { cullFace: null },
          uniforms: { u_base_color: engine.math.vec4(0.09, 0.075, 0.035, 1), u_roughness: 1 },
        });

        let habitat = null, density_scale = 1, scatter_seed = 1, stats = { instances: 0, vertices: 0 };
        const stats_div = dom.$.div({ $style: "color:white;padding:4px;font-size:90%" });

        function mulberry(a) {
          return function () {
            a = (a + 0x6D2B79F5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
          };
        }

        function place(variant_lists) {                   // upload the instance positions of every variant
          stats.instances = 0; stats.vertices = 0;
          Object.keys(library).forEach(function (id) {
            library[id].variants.forEach(function (v, i) {
              const list = (variant_lists[id] && variant_lists[id][i]) || [];
              v.count = list.length / 3;
              if (v.count > 0) engine.geometry_set_attr(v.inst, new Float32Array(list), list.length);
              stats.instances += v.count;
              stats.vertices += v.count * v.total;
            });
          });
          stats_div.textContent = stats.instances + " plants, " + (stats.vertices / 1e6).toFixed(2) + " M vertices drawn";
        }

        function build_habitat(h) {
          habitat = h;
          scene.camera.control.distance = Math.max(2.5, h.size_m * 0.8);   // pull back to fit the habitat
          engine.tra_model.set_position(scene.camera.control, 0, 0.25, 0);
          const rand = mulberry(7919 * scatter_seed);
          const lists = {};
          if (h.id === "showcase") {                      // one of each, in a row
            const ids = Object.keys(library);
            ids.forEach(function (id, i) { lists[id] = [[(i - (ids.length - 1) / 2) * 1.1, 0, 0], [], [], []]; });
          }
          else {
            h.plants.forEach(function (e) {
              if (!library[e.plant]) return;
              const n = Math.min(40000, Math.round(e.density_per_m2 * density_scale * h.size_m * h.size_m));
              const per = []; for (let i = 0; i < VARIANTS; i++) per.push([]);
              for (let i = 0; i < n; i++) per[Math.floor(rand() * VARIANTS)].push((rand() - 0.5) * h.size_m, 0, (rand() - 0.5) * h.size_m);
              lists[e.plant] = per;
            });
          }
          place(lists);
        }

        httprequest.get_url("plant_presets.json", "json").then(function (doc) {
          if (!doc || !doc.plants) return;
          doc.plants.forEach(function (def) {
            library[def.id] = { def: def, variants: [] };
            for (let i = 0; i < VARIANTS; i++) library[def.id].variants.push(upload_plant(def, def.props.seed + i));
          });
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
          dom.sidebar$.insertBefore(dom.$.div({ $style: "padding:4px;color:white" }, habitat_select, "density ", density_slider, reseed, stats_div), dom.sidebar$.firstChild);
          const want = (new URLSearchParams(location.search)).get("habitat");
          const found = Math.max(0, habitats.findIndex(function (h) { return h.id === want; }));
          habitat_select.value = found;
          build_habitat(habitats[found]);
          console.log("plants", Object.keys(library).length, "species,", VARIANTS, "seeds each");
        });

        function render_scene() {
          engine.render_item(ground_geo, ground_mat, 0, 0, 0);
          Object.keys(library).forEach(function (id) {
            library[id].variants.forEach(function (v) {
              if (v.count > 0) engine.render_item(v.geo, plant_mat, 0, v.total, v.count);
            });
          });
          engine.debug.render();
        }

        engine.tra_model.yaw_pitch(scene.camera.control, 0, 0.38);        // look down at the ground, not along it

        const scr = engine.deffered_rendering({
          camera: scene.camera,
          dlight0: scene.dlight0,
          ENABLE_ATMOSPHERE: !true,
          ENABLE_SHADOWS: true,
          ENABLE_LOGDEPTH: false,
        });
        scr.on_shadowmap = function (time, time_delta) { render_scene(); };
        scr.on_frame = function (time, time_delta) { render_scene(); };
      }


      // ?scene=plants shows the plant / grass catalog, anything else the tree test
      const scene_select = dom.$.select({
        $style: "width:100%; margin-bottom: 6px;",
        onchange: function () { location.search = "?scene=" + this.value; },
      }, dom.$.option({ value: "trees" }, "Scene: trees"), dom.$.option({ value: "plants" }, "Scene: plants and grass"));
      const scene_name = (new URLSearchParams(location.search)).get("scene") === "plants" ? "plants" : "trees";
      scene_select.value = scene_name;
      dom.sidebar$.insertBefore(dom.$.div({ $style: "padding:4px" }, scene_select), dom.sidebar$.firstChild);

      if (scene_name === "plants") plants_test();
      else test1();

    }

    suit0();

    

  }

  engine({})(ready);
});