// ============================================================================
// plant_system.cpp — grass / small ground-cover plant generation
//
// tree_system.cpp's branch-and-ring pipeline is the wrong tool for grass and
// small plants: forcing a thin bent blade through a tapered-cylinder branch
// recursion fights the algorithm. This is a separate, much simpler generator
// built around ONE primitive -- a tapering ribbon swept along a quadratic
// bezier curve (base to tip) -- placed by one of two arrangements:
//   0 = random scatter  (grass: blades scattered across a small disc)
//   1 = radial rosette   (fern/clover-like: blades fan out evenly from a point)
// Same output contract as tree_system: pure data (positions/normals/uvs),
// ONE flat unindexed vertex buffer, no rdr_geometry_* calls. There's only one
// kind of geometry here (no trunk/twig split), so plant_generate just returns
// the total vertex count.
//
// Reuses veg_rand3 (real simplex noise) from tree_system.cpp -- this file
// must be #include'd after tree_system.cpp in the build chain.
// ============================================================================

#define PLANT_MAX_BLADES    512
#define PLANT_MAX_SEGMENTS  12
#define PLANT_PRESET_COUNT  1

#define PLANT_PROPS_COUNT 31

// Single flat float block, bound as ONE Float32Array from JS -- see the matching
// comment on tree_props in tree_system.cpp for why bladeCount/segments/arrangement
// below are floats rather than a separate int block.
struct plant_props {
    number bladeLength;
    number bladeLengthVariance;
    number bladeWidth;
    number bladeWidthVariance;
    number tipTaper;         // width at the tip, as a fraction of base width (0..1)
    number curveAmount;      // how far the blade bows forward from a straight lean line
    number curveVariance;
    number lean;             // radians, tilt from vertical
    number leanVariance;
    number twistVariance;    // extra per-blade azimuth jitter
    number clusterRadius;    // scatter disc radius (arrangement 0) / rosette base offset (arrangement 1)
    number vMultiplier;
    number seed;
    // Vertex color gradient along each blade (base -> tip), e.g. darker/richer
    // at the base, lighter or sun-bleached at the tip. colorVariance jitters
    // each channel independently per blade via veg_rand3.
    number bladeColorBase[3];
    number bladeColorTip[3];
    number colorVariance;
    number flowerChance;
    number flowerSize;
    number flowerColor[3];
    number bladeCount;
    number segments;     // curve subdivisions per blade
    number arrangement;  // 0 = random scatter (grass), 1 = radial rosette (fern/clover)
    // ---- new realism knobs (default to an exact no-op, see plant_props_set_default) ----
    number bladeFold;    // cross-section V-channel depth, 0 = flat ribbon
    number tuftRadius;   // local scatter radius within a tuft, as a fraction of clusterRadius
    number tuftCount;    // tussock/tiller clump count (arrangement 0 only), 1 = today's uniform scatter
};

// ----------------------------------------------------------------------------
// properties: defaults + presets
// ----------------------------------------------------------------------------

static void plant_props_set_default(plant_props* p) { // baseline grass
    p->bladeLength = 0.35f;
    p->bladeLengthVariance = 0.10f;
    p->bladeWidth = 0.025f;
    p->bladeWidthVariance = 0.008f;
    p->tipTaper = 0.10f;
    p->curveAmount = 0.15f;
    p->curveVariance = 0.08f;
    p->lean = 0.25f;
    p->leanVariance = 0.20f;
    p->twistVariance = 0.30f;
    p->clusterRadius = 0.30f;
    p->vMultiplier = 1.0f;
    p->seed = 5.0f;
    p->bladeColorBase[0] = 0.15f; p->bladeColorBase[1] = 0.35f; p->bladeColorBase[2] = 0.08f;
    p->bladeColorTip[0] = 0.45f; p->bladeColorTip[1] = 0.55f; p->bladeColorTip[2] = 0.15f;
    p->colorVariance = 0.08f;
    p->flowerChance = 0.0f; p->flowerSize = 0.05f; p->flowerColor[0] = 0.9f; p->flowerColor[1] = 0.8f; p->flowerColor[2] = 0.2f;
    p->bladeCount = 40;
    p->segments = 4;
    p->arrangement = 0;
    p->bladeFold = 0.0f;
    p->tuftRadius = 0.3f;
    p->tuftCount = 1.0f;
}

// Species are defined entirely in species_catalog_2.json now -- this is the only
// shape a plant_props can start from; apply_species() (demo_global.js) resets to
// this via apply_preset(0) before layering a catalog entry's params on top.
WASM_EXPORT void plant_props_apply_preset(plant_props* p, uint32_t preset_id) {
    plant_props_set_default(p);
}

WASM_EXPORT plant_props* plant_props_create() {
    plant_props* p = (plant_props*)math_alloc(sizeof(plant_props));
    plant_props_set_default(p);
    return p;
}

WASM_EXPORT uint32_t plant_props_count() { return PLANT_PROPS_COUNT; }
WASM_EXPORT uint32_t plant_props_preset_count() { return PLANT_PRESET_COUNT; }
WASM_EXPORT uint32_t plant_props_size() { return sizeof(plant_props); }

static inline void plant_props_clamp(plant_props* p) {
    if (p->bladeCount > PLANT_MAX_BLADES) p->bladeCount = PLANT_MAX_BLADES;
    if (p->segments < 1) p->segments = 1;
    if (p->segments > PLANT_MAX_SEGMENTS) p->segments = PLANT_MAX_SEGMENTS;
    if (p->arrangement > 1) p->arrangement = 1;
    if (p->tuftCount < 1.0f) p->tuftCount = 1.0f;
    if (p->tuftCount > 32.0f) p->tuftCount = 32.0f;
}

// ----------------------------------------------------------------------------
// blade curve sampling: given a blade's shape parameters and a point t along
// it [0,1], returns the world-space center/tangent/width-axis at that point.
// This is the one piece of math a "blade" actually is; plant_build_blade uses
// it to sweep the ribbon, and rich_plant_generate below reuses it directly to
// find attachment points along a STEM for leaves and a flower -- a leaf or
// petal is just another blade whose base sits on a point sampled from its
// parent's curve instead of the ground.
// ----------------------------------------------------------------------------

struct plant_curve_sample { number center[3]; number tangent[3]; number width_axis[3]; number normal[3]; };

static void plant_sample_curve(const number* base_pos, number azimuth, number lean, number length, number curve,
                                 number t, plant_curve_sample* out) {
    number s = wsin(lean), c = wcos(lean);
    number p0z = 0.0f, p0y = 0.0f;
    number p2z = s * length, p2y = c * length;
    number p1z = (p0z + p2z) * 0.5f + curve * length;
    number p1y = (p0y + p2y) * 0.5f;

    number mt = 1.0f - t;
    number bz = mt * mt * p0z + 2.0f * mt * t * p1z + t * t * p2z;
    number by = mt * mt * p0y + 2.0f * mt * t * p1y + t * t * p2y;
    number dz = 2.0f * mt * (p1z - p0z) + 2.0f * t * (p2z - p1z);
    number dy = 2.0f * mt * (p1y - p0y) + 2.0f * t * (p2y - p1y);

    number cosA = wcos(azimuth), sinA = wsin(azimuth);
    number width_axis[3] = { -sinA, 0.0f, cosA };
    number spine_dir[3] = { cosA, 0.0f, sinA };

    out->center[0] = base_pos[0] + spine_dir[0] * bz;
    out->center[1] = base_pos[1] + by;
    out->center[2] = base_pos[2] + spine_dir[2] * bz;

    number tangent[3] = { spine_dir[0] * dz, dy, spine_dir[2] * dz };
    v3_normalize(tangent, tangent);
    v3_copy(out->tangent, tangent);
    v3_copy(out->width_axis, width_axis);

    number normal[3]; v3_cross(normal, width_axis, tangent); v3_normalize(normal, normal);
    v3_copy(out->normal, normal);
}

// ----------------------------------------------------------------------------
// single blade: a tapering ribbon swept along a quadratic bezier spine,
// double-sided (front + back), written directly in flat/unindexed form --
// there's no vertex sharing worth indexing for a single straight strip.
// Takes explicit scalars rather than a plant_props* so it's reusable for
// grass blades, leaves, and flower petals, each driven by a different struct.
// ----------------------------------------------------------------------------

static uint32_t plant_build_blade(uint32_t segments, number tipTaper, number vMultiplier, number fold,
                                    number* out_positions, number* out_normals, number* out_uvs, number* out_colors,
                                    uint32_t out_offset, uint32_t max_verts,
                                    const number* base_pos, number azimuth, number lean,
                                    number length, number width, number curve,
                                    const number* color_base, const number* color_tip) {
    uint32_t need = segments * 12; // 2 tris * 3 verts * 2 (front+back) per segment
    if (out_offset + need > max_verts) return 0;

    uint32_t o = out_offset;
    number prev_left[3] = {0}, prev_right[3] = {0}, prev_left_normal[3] = {0}, prev_right_normal[3] = {0}, prev_color[4] = {0}, prev_v = 0.0f;
    bool has_prev = false;

    auto emit = [&](const number* p, const number* n, const number* c, number u, number v) {
        out_positions[o * 3 + 0] = p[0]; out_positions[o * 3 + 1] = p[1]; out_positions[o * 3 + 2] = p[2];
        out_normals[o * 3 + 0] = n[0]; out_normals[o * 3 + 1] = n[1]; out_normals[o * 3 + 2] = n[2];
        out_uvs[o * 2 + 0] = u; out_uvs[o * 2 + 1] = v;
        out_colors[o * 4 + 0] = c[0]; out_colors[o * 4 + 1] = c[1]; out_colors[o * 4 + 2] = c[2]; out_colors[o * 4 + 3] = c[3];
        o++;
    };

    for (uint32_t i = 0; i <= segments; i++) {
        number t = (number)i / (number)segments;

        plant_curve_sample s;
        plant_sample_curve(base_pos, azimuth, lean, length, curve, t, &s);

        number taper = 1.0f - t * (1.0f - tipTaper);
        number halfw_l = width * taper * 0.5f;
        number halfw_r = width * taper * 0.5f;

        // Cross-section fold: offset the two edge verts along -normal by fold*halfw
        // (a shallow V-channel instead of a perfectly flat ribbon) and tilt each
        // edge's normal around the blade's tangent to match. fold==0 (default) is an
        // exact no-op -- zero position offset, zero rotation, byte-identical to today.
        number fold_depth_l = fold * halfw_l;
        number fold_depth_r = fold * halfw_r;
        number left[3]  = { s.center[0] - s.width_axis[0]*halfw_l - s.normal[0]*fold_depth_l,
                             s.center[1]                          - s.normal[1]*fold_depth_l,
                             s.center[2] - s.width_axis[2]*halfw_l - s.normal[2]*fold_depth_l };
        number right[3] = { s.center[0] + s.width_axis[0]*halfw_r - s.normal[0]*fold_depth_r,
                             s.center[1]                          - s.normal[1]*fold_depth_r,
                             s.center[2] + s.width_axis[2]*halfw_r - s.normal[2]*fold_depth_r };

        number left_normal[3]  = { s.normal[0], s.normal[1], s.normal[2] };
        number right_normal[3] = { s.normal[0], s.normal[1], s.normal[2] };
        if (fold != 0.0f) {
            number fold_angle = fold * 0.6f;
            number ln[3]; tree_axis_angle(ln, s.normal, s.tangent, -fold_angle); v3_normalize(ln, ln);
            number rn[3]; tree_axis_angle(rn, s.normal, s.tangent, fold_angle); v3_normalize(rn, rn);
            v3_copy(left_normal, ln);
            v3_copy(right_normal, rn);
        }

        number v_coord = t * vMultiplier;
        // RGBA -- color_base/color_tip are vec4 (alpha included) even though
        // every caller currently passes alpha=1 for both ends
        number color[4] = {
            color_base[0] + (color_tip[0] - color_base[0]) * t,
            color_base[1] + (color_tip[1] - color_base[1]) * t,
            color_base[2] + (color_tip[2] - color_base[2]) * t,
            color_base[3] + (color_tip[3] - color_base[3]) * t,
        };

        if (has_prev) {
            // front face
            emit(prev_left, prev_left_normal, prev_color, 0.0f, prev_v);
            emit(left, left_normal, color, 0.0f, v_coord);
            emit(right, right_normal, color, 1.0f, v_coord);
            emit(prev_left, prev_left_normal, prev_color, 0.0f, prev_v);
            emit(right, right_normal, color, 1.0f, v_coord);
            emit(prev_right, prev_right_normal, prev_color, 1.0f, prev_v);

            // back face (reversed winding + negated normals, so it isn't backface-culled)
            number nprev_l[3]; v3_scale(nprev_l, prev_left_normal, -1.0f);
            number nprev_r[3]; v3_scale(nprev_r, prev_right_normal, -1.0f);
            number ncur_l[3]; v3_scale(ncur_l, left_normal, -1.0f);
            number ncur_r[3]; v3_scale(ncur_r, right_normal, -1.0f);
            emit(prev_left, nprev_l, prev_color, 0.0f, prev_v);
            emit(right, ncur_r, color, 1.0f, v_coord);
            emit(left, ncur_l, color, 0.0f, v_coord);
            emit(prev_left, nprev_l, prev_color, 0.0f, prev_v);
            emit(prev_right, nprev_r, prev_color, 1.0f, prev_v);
            emit(right, ncur_r, color, 1.0f, v_coord);
        }

        v3_copy(prev_left, left);
        v3_copy(prev_right, right);
        v3_copy(prev_left_normal, left_normal);
        v3_copy(prev_right_normal, right_normal);
        prev_color[0] = color[0]; prev_color[1] = color[1]; prev_color[2] = color[2]; prev_color[3] = color[3];
        prev_v = v_coord;
        has_prev = true;
    }

    return o - out_offset;
}

// ----------------------------------------------------------------------------
// public entry points
// ----------------------------------------------------------------------------

WASM_EXPORT uint32_t plant_estimate_max_verts(plant_props* props) {
    plant_props_clamp(props);
    uint32_t bladeCount = (uint32_t)props->bladeCount;
    uint32_t segments = (uint32_t)props->segments;
    return bladeCount * segments * 12; // exact, not just an upper bound -- bladeFold/tuftCount don't affect vertex count
}

static bool plant_overflow_warned = false;

WASM_EXPORT uint32_t plant_generate(
    plant_props* props,
    number* out_positions,
    number* out_normals,
    number* out_uvs,
    number* out_colors,
    uint32_t max_verts
) {
    plant_props_clamp(props);
    uint32_t o = 0;
    uint32_t bladeCount = (uint32_t)props->bladeCount;
    uint32_t segments = (uint32_t)props->segments;
    uint32_t arrangement = (uint32_t)props->arrangement;
    uint32_t tuftCount = (uint32_t)props->tuftCount;

    for (uint32_t bi = 0; bi < bladeCount; bi++) {
        number rand_pos_r   = veg_rand3((number)bi, 1.0f, 0.0f, props->seed);
        number rand_pos_a   = veg_rand3((number)bi, 2.0f, 0.0f, props->seed);
        number rand_azimuth = veg_rand3((number)bi, 3.0f, 0.0f, props->seed);
        number rand_lean    = veg_rand3((number)bi, 4.0f, 0.0f, props->seed);
        number rand_len     = veg_rand3((number)bi, 5.0f, 0.0f, props->seed);
        number rand_width   = veg_rand3((number)bi, 6.0f, 0.0f, props->seed);
        number rand_curve   = veg_rand3((number)bi, 7.0f, 0.0f, props->seed);

        number base_pos[3];
        number azimuth;

        if (arrangement == 1) {
            // radial rosette: evenly spaced around the crown, close to its base
            number base_angle = TWO_PI_F * (number)bi / (number)bladeCount;
            azimuth = base_angle + (rand_azimuth * 2.0f - 1.0f) * props->twistVariance;
            number r = props->clusterRadius * 0.15f * rand_pos_r;
            base_pos[0] = wcos(base_angle) * r;
            base_pos[1] = 0.0f;
            base_pos[2] = wsin(base_angle) * r;
        } else if (tuftCount <= 1) {
            // random scatter across a disc (grass) -- today's exact formula
            number r = props->clusterRadius * wsqrt(rand_pos_r);
            number a = rand_pos_a * TWO_PI_F;
            base_pos[0] = wcos(a) * r;
            base_pos[1] = 0.0f;
            base_pos[2] = wsin(a) * r;
            azimuth = rand_azimuth * TWO_PI_F;
        } else {
            // Tussock/tiller clustering: real grass grows in clumps from shared
            // crown points rather than as independently-rooted individuals. Blades
            // are assigned to one of tuftCount tuft centers, then scattered locally
            // around that center within a clusterRadius*tuftRadius radius.
            uint32_t tuft_index = bi % tuftCount;
            number tuft_r = props->clusterRadius * wsqrt(veg_rand3((number)tuft_index, 91.0f, 0.0f, props->seed));
            number tuft_a = veg_rand3((number)tuft_index, 92.0f, 0.0f, props->seed) * TWO_PI_F;
            number tuft_cx = wcos(tuft_a) * tuft_r, tuft_cz = wsin(tuft_a) * tuft_r;
            number local_r = props->clusterRadius * props->tuftRadius * wsqrt(rand_pos_r);
            number local_a = rand_pos_a * TWO_PI_F;
            base_pos[0] = tuft_cx + wcos(local_a) * local_r;
            base_pos[1] = 0.0f;
            base_pos[2] = tuft_cz + wsin(local_a) * local_r;
            azimuth = rand_azimuth * TWO_PI_F;
        }

        number lean = props->lean + (rand_lean * 2.0f - 1.0f) * props->leanVariance;
        number length = props->bladeLength + (rand_len * 2.0f - 1.0f) * props->bladeLengthVariance;
        number width = props->bladeWidth + (rand_width * 2.0f - 1.0f) * props->bladeWidthVariance;
        number curve = props->curveAmount + (rand_curve * 2.0f - 1.0f) * props->curveVariance;
        if (length < 0.001f) length = 0.001f;
        if (width < 0.001f) width = 0.001f;

        // one jitter per channel, applied to both ends of the gradient so a
        // jittered blade stays internally consistent (not two random colors)
        number jr = (veg_rand3((number)bi, 8.0f, 0.0f, props->seed) * 2.0f - 1.0f) * props->colorVariance;
        number jg = (veg_rand3((number)bi, 9.0f, 0.0f, props->seed) * 2.0f - 1.0f) * props->colorVariance;
        number jb = (veg_rand3((number)bi, 10.0f, 0.0f, props->seed) * 2.0f - 1.0f) * props->colorVariance;
        number wind_phase = veg_rand3((number)bi, 99.0f, 0.0f, props->seed) * TWO_PI_F;
        number color_base[4] = { veg_clamp01(props->bladeColorBase[0] + jr), veg_clamp01(props->bladeColorBase[1] + jg), veg_clamp01(props->bladeColorBase[2] + jb), wind_phase };
        number color_tip[4]  = { veg_clamp01(props->bladeColorTip[0] + jr),  veg_clamp01(props->bladeColorTip[1] + jg),  veg_clamp01(props->bladeColorTip[2] + jb),  wind_phase };

        uint32_t written = plant_build_blade(segments, props->tipTaper, props->vMultiplier, props->bladeFold,
                                               out_positions, out_normals, out_uvs, out_colors, o, max_verts,
                                               base_pos, azimuth, lean, length, width, curve, color_base, color_tip);
        if (written == 0) {
            if (!plant_overflow_warned) {
                print("plant_generate: output buffer too small, truncating at blade %d", bi);
                plant_overflow_warned = true;
            }
            break;
        }
        o += written;

        if (props->flowerChance > 0.0f && veg_rand3((number)bi, 22.0f, 0.0f, props->seed) < props->flowerChance) {
            if (o + 24 > max_verts) { print("plant_generate: output overflow for flower"); break; }
            plant_curve_sample tip;
            plant_sample_curve(base_pos, azimuth, lean, length, curve, 1.0f, &tip);

            number wind_phase = veg_rand3((number)bi, 99.0f, 0.0f, props->seed) * TWO_PI_F;
            number flower_color[4] = { props->flowerColor[0], props->flowerColor[1], props->flowerColor[2], wind_phase };
            number c[3]; v3_copy(c, tip.center);
            number s = props->flowerSize;

            auto emit_f = [&](const number* p, const number* n, number u, number v) {
                out_positions[o * 3 + 0] = p[0]; out_positions[o * 3 + 1] = p[1]; out_positions[o * 3 + 2] = p[2];
                out_normals[o * 3 + 0] = n[0]; out_normals[o * 3 + 1] = n[1]; out_normals[o * 3 + 2] = n[2];
                out_uvs[o * 2 + 0] = u; out_uvs[o * 2 + 1] = v;
                out_colors[o * 4 + 0] = flower_color[0]; out_colors[o * 4 + 1] = flower_color[1]; out_colors[o * 4 + 2] = flower_color[2]; out_colors[o * 4 + 3] = flower_color[3];
                o++;
            };
            auto emit_tri = [&](const number* p1, const number* p2, const number* p3) {
                number e1[3]; v3_sub(e1, p2, p1);
                number e2[3]; v3_sub(e2, p3, p1);
                number n[3]; v3_cross(n, e1, e2); v3_normalize(n, n);
                // The flower sits at the tip of the blade, so its V coordinate must match the blade tip's V
                // to ensure the wind shader displaces them by the exact same amount without detachment.
                number v_coord = props->vMultiplier; 
                emit_f(p1, n, 0.5f, v_coord);
                emit_f(p2, n, 0.5f, v_coord);
                emit_f(p3, n, 0.5f, v_coord);
            };

            number spike_len = s * 2.5f;
            number spike_w = s * 0.4f;

            for (int k = 0; k < 3; k++) {
                number angle = 3.14159f * (number)k / 3.0f;
                number dx = wcos(angle) * spike_w;
                number dz = wsin(angle) * spike_w;
                
                number p0[3] = { c[0] - dx, c[1], c[2] - dz };
                number p1[3] = { c[0] + dx, c[1], c[2] + dz };
                number p2[3] = { c[0] - dx, c[1] + spike_len, c[2] - dz };
                number p3[3] = { c[0] + dx, c[1] + spike_len, c[2] + dz };

                emit_tri(p0, p1, p2);
                emit_tri(p1, p3, p2);
                // Double sided
                emit_tri(p0, p2, p1);
                emit_tri(p1, p2, p3);
            }
        }
    }

    return o;
}

static bool plant_custom_overflow_warned = false;

WASM_EXPORT uint32_t plant_generate_custom(
    plant_props* props,
    number* out_positions,
    number* out_normals,
    number* out_uvs,
    number* out_colors,
    uint32_t max_verts
) {
    plant_props_clamp(props);
    uint32_t o = 0;
    uint32_t bladeCount = (uint32_t)props->bladeCount;
    uint32_t segments = (uint32_t)props->segments;
    uint32_t arrangement = (uint32_t)props->arrangement;
    uint32_t tuftCount = (uint32_t)props->tuftCount;

    for (uint32_t bi = 0; bi < bladeCount; bi++) {
        number rand_pos_r   = veg_rand3((number)bi, 1.0f, 0.0f, props->seed);
        number rand_pos_a   = veg_rand3((number)bi, 2.0f, 0.0f, props->seed);
        number rand_azimuth = veg_rand3((number)bi, 3.0f, 0.0f, props->seed);
        number rand_lean    = veg_rand3((number)bi, 4.0f, 0.0f, props->seed);
        number rand_len     = veg_rand3((number)bi, 5.0f, 0.0f, props->seed);
        number rand_width   = veg_rand3((number)bi, 6.0f, 0.0f, props->seed);
        number rand_curve   = veg_rand3((number)bi, 7.0f, 0.0f, props->seed);

        number base_pos[3];
        number azimuth;

        if (arrangement == 1) {
            // radial rosette: evenly spaced around the crown, close to its base
            number base_angle = TWO_PI_F * (number)bi / (number)bladeCount;
            azimuth = base_angle + (rand_azimuth * 2.0f - 1.0f) * props->twistVariance;
            number r = props->clusterRadius * 0.15f * rand_pos_r;
            base_pos[0] = wcos(base_angle) * r;
            base_pos[1] = 0.0f;
            base_pos[2] = wsin(base_angle) * r;
        } else if (tuftCount <= 1) {
            // random scatter across a disc (grass) -- today's exact formula
            number r = props->clusterRadius * wsqrt(rand_pos_r);
            number a = rand_pos_a * TWO_PI_F;
            base_pos[0] = wcos(a) * r;
            base_pos[1] = 0.0f;
            base_pos[2] = wsin(a) * r;
            azimuth = rand_azimuth * TWO_PI_F;
        } else {
            // Tussock/tiller clustering: real grass grows in clumps from shared
            // crown points rather than as independently-rooted individuals. Blades
            // are assigned to one of tuftCount tuft centers, then scattered locally
            // around that center within a clusterRadius*tuftRadius radius.
            uint32_t tuft_index = bi % tuftCount;
            number tuft_r = props->clusterRadius * wsqrt(veg_rand3((number)tuft_index, 91.0f, 0.0f, props->seed));
            number tuft_a = veg_rand3((number)tuft_index, 92.0f, 0.0f, props->seed) * TWO_PI_F;
            number tuft_cx = wcos(tuft_a) * tuft_r, tuft_cz = wsin(tuft_a) * tuft_r;
            number local_r = props->clusterRadius * props->tuftRadius * wsqrt(rand_pos_r);
            number local_a = rand_pos_a * TWO_PI_F;
            base_pos[0] = tuft_cx + wcos(local_a) * local_r;
            base_pos[1] = 0.0f;
            base_pos[2] = tuft_cz + wsin(local_a) * local_r;
            azimuth = rand_azimuth * TWO_PI_F;
        }

        number lean = props->lean + (rand_lean * 2.0f - 1.0f) * props->leanVariance;
        number length = props->bladeLength + (rand_len * 2.0f - 1.0f) * props->bladeLengthVariance;
        number width = props->bladeWidth + (rand_width * 2.0f - 1.0f) * props->bladeWidthVariance;
        number curve = props->curveAmount + (rand_curve * 2.0f - 1.0f) * props->curveVariance;
        if (length < 0.001f) length = 0.001f;
        if (width < 0.001f) width = 0.001f;

        // variation data instead of color:
        // R: unique blade id (0.0 to 1.0)
        // G: random value 1 (for shape/scale variation)
        // B: random value 2 (for type/texture variation)
        // A: plant part (0.0 for blade, 1.0 for flower)
        number blade_id = (number)bi / (number)bladeCount;
        number rand_shape = veg_rand3((number)bi, 55.0f, 0.0f, props->seed);
        number rand_type = veg_rand3((number)bi, 66.0f, 0.0f, props->seed);
        
        number color_base[4] = { blade_id, rand_shape, rand_type, 0.0f };
        number color_tip[4]  = { blade_id, rand_shape, rand_type, 0.0f };

        uint32_t written = plant_build_blade(segments, props->tipTaper, props->vMultiplier, props->bladeFold,
                                               out_positions, out_normals, out_uvs, out_colors, o, max_verts,
                                               base_pos, azimuth, lean, length, width, curve, color_base, color_tip);
        if (written == 0) {
            if (!plant_custom_overflow_warned) {
                print("plant_generate_custom: output buffer too small, truncating at blade %d", bi);
                plant_custom_overflow_warned = true;
            }
            break;
        }
        o += written;

        if (props->flowerChance > 0.0f && veg_rand3((number)bi, 22.0f, 0.0f, props->seed) < props->flowerChance) {
            if (o + 24 > max_verts) { print("plant_generate_custom: output overflow for flower"); break; }
            plant_curve_sample tip;
            plant_sample_curve(base_pos, azimuth, lean, length, curve, 1.0f, &tip);

            number flower_color[4] = { blade_id, rand_shape, rand_type, 1.0f };
            number c[3]; v3_copy(c, tip.center);
            number s = props->flowerSize;

            auto emit_f = [&](const number* p, const number* n, number u, number v) {
                out_positions[o * 3 + 0] = p[0]; out_positions[o * 3 + 1] = p[1]; out_positions[o * 3 + 2] = p[2];
                out_normals[o * 3 + 0] = n[0]; out_normals[o * 3 + 1] = n[1]; out_normals[o * 3 + 2] = n[2];
                out_uvs[o * 2 + 0] = u; out_uvs[o * 2 + 1] = v;
                out_colors[o * 4 + 0] = flower_color[0]; out_colors[o * 4 + 1] = flower_color[1]; out_colors[o * 4 + 2] = flower_color[2]; out_colors[o * 4 + 3] = flower_color[3];
                o++;
            };
            auto emit_tri = [&](const number* p1, const number* p2, const number* p3) {
                number e1[3]; v3_sub(e1, p2, p1);
                number e2[3]; v3_sub(e2, p3, p1);
                number n[3]; v3_cross(n, e1, e2); v3_normalize(n, n);
                // The flower sits at the tip of the blade, so its V coordinate must match the blade tip's V
                // to ensure the wind shader displaces them by the exact same amount without detachment.
                number v_coord = props->vMultiplier; 
                emit_f(p1, n, 0.5f, v_coord);
                emit_f(p2, n, 0.5f, v_coord);
                emit_f(p3, n, 0.5f, v_coord);
            };

            number spike_len = s * 2.5f;
            number spike_w = s * 0.4f;

            for (int k = 0; k < 3; k++) {
                number angle = 3.14159f * (number)k / 3.0f;
                number dx = wcos(angle) * spike_w;
                number dz = wsin(angle) * spike_w;
                
                number p0[3] = { c[0] - dx, c[1], c[2] - dz };
                number p1[3] = { c[0] + dx, c[1], c[2] + dz };
                number p2[3] = { c[0] - dx, c[1] + spike_len, c[2] - dz };
                number p3[3] = { c[0] + dx, c[1] + spike_len, c[2] + dz };

                emit_tri(p0, p1, p2);
                emit_tri(p1, p3, p2);
                // Double sided
                emit_tri(p0, p2, p1);
                emit_tri(p1, p2, p3);
            }
        }
    }

    return o;
}

// ============================================================================
// rich_plant: a composite plant -- ONE stem-blade, with leaf-blades attached
// along it and (optionally) a small rosette of petal-blades clustered at its
// tip. Same primitive as plant_generate above (plant_build_blade), just
// composed via plant_sample_curve instead of scattered independently.
//
// Output layout: stem [0,stem_count), leaves [stem_count,stem_count+leaf_count),
// flower/petals [stem_count+leaf_count, total) -- three ranges so the caller
// can use up to three materials (stem, leaf, petal), same draw_offset/count
// pattern as tree_system's trunk/twig split.
// ============================================================================

#define RICH_PLANT_PRESET_COUNT   1
#define RICH_PLANT_MAX_LEAVES     32
#define RICH_PLANT_MAX_PETALS     24
#define PLANT_GOLDEN_ANGLE        2.39996323f // real phyllotaxis angle -- gives a natural non-overlapping leaf spiral for free

#define RICH_PLANT_PROPS_COUNT 38

// Single flat float block, same rationale as tree_props/plant_props above -- no new
// fields added to this struct in this pass, only the former int fields converted.
struct rich_plant_props {
    number stemLength;
    number stemWidth;
    number stemLean;
    number stemCurve;
    number leafLength;
    number leafLengthVariance;
    number leafWidth;
    number leafWidthVariance;
    number leafTipTaper;
    number leafAttachStart;   // t along the stem [0..1] where the lowest leaf attaches
    number leafAttachEnd;     // t along the stem where the highest leaf attaches
    number leafOutwardAngle;  // radians, how far a leaf tilts away from the stem
    number leafOutwardVariance;
    number petalLength;
    number petalWidth;
    number petalTipTaper;
    number petalCurl;         // like curveAmount, but for petal bend
    number flowerRadius;      // how far petals sit from the stem tip's center point
    number bloomSize;         // overall flower scale multiplier
    number vMultiplier;
    number seed;
    // Solid vertex color per part -- for a flower, petal color is usually the
    // single biggest visual distinguisher between species (a red poppy vs a
    // yellow daisy are nearly the same geometry). colorVariance jitters each
    // channel independently per leaf/petal via veg_rand3.
    number stemColor[3];
    number leafColor[3];
    number petalColor[3];
    number colorVariance;
    number petalPitch;
    number petalPitchOuter;
    number petalRadiusInner;
    number leafCount;
    number petalCount;      // 0 = no flower at all
    number segments;
    number petalArrangement; // 0 = ring, 1 = spiral
};

static void rich_plant_props_set_default(rich_plant_props* p) { // "Wildflower"
    p->stemLength = 0.4f;
    p->stemWidth = 0.015f;
    p->stemLean = 0.1f;
    p->stemCurve = 0.05f;
    p->leafLength = 0.12f;
    p->leafLengthVariance = 0.02f;
    p->leafWidth = 0.04f;
    p->leafWidthVariance = 0.01f;
    p->leafTipTaper = 0.15f;
    p->leafAttachStart = 0.25f;
    p->leafAttachEnd = 0.85f;
    p->leafOutwardAngle = 1.0f;
    p->leafOutwardVariance = 0.15f;
    p->petalLength = 0.05f;
    p->petalWidth = 0.02f;
    p->petalTipTaper = 0.3f;
    p->petalCurl = 0.1f;
    p->flowerRadius = 0.02f;
    p->bloomSize = 1.0f;
    p->vMultiplier = 1.0f;
    p->seed = 8.0f;
    p->stemColor[0] = 0.25f; p->stemColor[1] = 0.45f; p->stemColor[2] = 0.15f;
    p->leafColor[0] = 0.20f; p->leafColor[1] = 0.45f; p->leafColor[2] = 0.15f;
    p->petalColor[0] = 0.95f; p->petalColor[1] = 0.85f; p->petalColor[2] = 0.20f; // yellow daisy-ish
    p->colorVariance = 0.05f;
    p->petalPitch = 1.2f;
    p->petalPitchOuter = 1.2f;
    p->petalRadiusInner = 0.02f;
    p->leafCount = 5;
    p->petalCount = 8;
    p->segments = 3;
    p->petalArrangement = 0;
}

// Species are defined entirely in species_catalog_2.json now -- this is the only
// shape a rich_plant_props can start from; apply_species() (demo_global.js) resets
// to this via apply_preset(0) before layering a catalog entry's params on top.
WASM_EXPORT void rich_plant_props_apply_preset(rich_plant_props* p, uint32_t preset_id) {
    rich_plant_props_set_default(p);
}

WASM_EXPORT rich_plant_props* rich_plant_props_create() {
    rich_plant_props* p = (rich_plant_props*)math_alloc(sizeof(rich_plant_props));
    rich_plant_props_set_default(p);
    return p;
}

WASM_EXPORT uint32_t rich_plant_props_count() { return RICH_PLANT_PROPS_COUNT; }
WASM_EXPORT uint32_t rich_plant_props_preset_count() { return RICH_PLANT_PRESET_COUNT; }
WASM_EXPORT uint32_t rich_plant_props_size() { return sizeof(rich_plant_props); }

static inline void rich_plant_props_clamp(rich_plant_props* p) {
    if (p->leafCount > RICH_PLANT_MAX_LEAVES) p->leafCount = RICH_PLANT_MAX_LEAVES;
    if (p->petalCount > RICH_PLANT_MAX_PETALS) p->petalCount = RICH_PLANT_MAX_PETALS;
    if (p->segments < 1) p->segments = 1;
    if (p->segments > PLANT_MAX_SEGMENTS) p->segments = PLANT_MAX_SEGMENTS;
}

WASM_EXPORT uint32_t rich_plant_estimate_max_verts(rich_plant_props* props) {
    rich_plant_props_clamp(props);
    uint32_t segments = (uint32_t)props->segments;
    uint32_t leafCount = (uint32_t)props->leafCount;
    uint32_t petalCount = (uint32_t)props->petalCount;
    uint32_t stem = segments * 12;
    uint32_t leaves = leafCount * segments * 12;
    uint32_t petals = petalCount * segments * 12;
    return stem + leaves + petals; // exact, not just an upper bound -- no new rich_plant fields this pass
}

static bool rich_plant_overflow_warned = false;

WASM_EXPORT uint32_t rich_plant_generate(
    rich_plant_props* props,
    number* out_positions,
    number* out_normals,
    number* out_uvs,
    number* out_colors,
    uint32_t max_verts,
    uint32_t* out_stem_count,
    uint32_t* out_leaf_count
) {
    rich_plant_props_clamp(props);
    number origin[3] = { 0.0f, 0.0f, 0.0f };
    uint32_t o = 0;
    uint32_t segments = (uint32_t)props->segments;
    uint32_t leafCount = (uint32_t)props->leafCount;
    uint32_t petalCount = (uint32_t)props->petalCount;
    uint32_t petalArrangement = (uint32_t)props->petalArrangement;

    // 1. stem -- one blade, canonical azimuth 0, slight taper toward the tip.
    // Solid color (base==tip), no gradient needed for a short stem. fold is always
    // 0 here -- rich_plant doesn't use the blade-fold realism knob in this pass.
    number stem_wind_phase = veg_rand3(0.0f, 99.0f, 0.0f, props->seed) * TWO_PI_F;
    number stem_color[4] = { veg_clamp01(props->stemColor[0]), veg_clamp01(props->stemColor[1]), veg_clamp01(props->stemColor[2]), stem_wind_phase };
    uint32_t stem_count = plant_build_blade(segments, 0.7f, props->vMultiplier, 0.0f,
                                              out_positions, out_normals, out_uvs, out_colors, o, max_verts,
                                              origin, 0.0f, props->stemLean, props->stemLength, props->stemWidth, props->stemCurve,
                                              stem_color, stem_color);
    if (stem_count == 0) {
        print("rich_plant_generate: output buffer too small for stem");
        if (out_stem_count) *out_stem_count = 0;
        if (out_leaf_count) *out_leaf_count = 0;
        return 0;
    }
    o += stem_count;

    // 2. leaves -- attached along the stem curve at increasing t, spaced by the
    // golden angle around the stem so they spiral outward without overlapping
    // (real phyllotaxis, not just random scatter).
    uint32_t leaf_total = 0;
    for (uint32_t li = 0; li < leafCount; li++) {
        number t = props->leafCount > 1
            ? props->leafAttachStart + (props->leafAttachEnd - props->leafAttachStart) * (number)li / (number)(props->leafCount - 1)
            : (props->leafAttachStart + props->leafAttachEnd) * 0.5f;

        plant_curve_sample attach;
        plant_sample_curve(origin, 0.0f, props->stemLean, props->stemLength, props->stemCurve, t, &attach);

        number rand_len   = veg_rand3((number)li, 1.0f, 0.0f, props->seed);
        number rand_width = veg_rand3((number)li, 2.0f, 0.0f, props->seed);
        number rand_out   = veg_rand3((number)li, 3.0f, 0.0f, props->seed);
        number rand_twist = veg_rand3((number)li, 4.0f, 0.0f, props->seed);

        number azimuth = (number)li * PLANT_GOLDEN_ANGLE + (rand_twist * 2.0f - 1.0f) * 0.3f;
        number lean = props->leafOutwardAngle + (rand_out * 2.0f - 1.0f) * props->leafOutwardVariance;
        number length = props->leafLength + (rand_len * 2.0f - 1.0f) * props->leafLengthVariance;
        number width = props->leafWidth + (rand_width * 2.0f - 1.0f) * props->leafWidthVariance;
        if (length < 0.001f) length = 0.001f;
        if (width < 0.001f) width = 0.001f;

        number jr = (veg_rand3((number)li, 11.0f, 0.0f, props->seed) * 2.0f - 1.0f) * props->colorVariance;
        number jg = (veg_rand3((number)li, 12.0f, 0.0f, props->seed) * 2.0f - 1.0f) * props->colorVariance;
        number jb = (veg_rand3((number)li, 13.0f, 0.0f, props->seed) * 2.0f - 1.0f) * props->colorVariance;
        number leaf_wind_phase = veg_rand3((number)li, 99.0f, 0.0f, props->seed) * TWO_PI_F;
        number leaf_color[4] = { veg_clamp01(props->leafColor[0] + jr), veg_clamp01(props->leafColor[1] + jg), veg_clamp01(props->leafColor[2] + jb), leaf_wind_phase };

        uint32_t written = plant_build_blade(segments, props->leafTipTaper, props->vMultiplier, 0.0f,
                                               out_positions, out_normals, out_uvs, out_colors, o, max_verts,
                                               attach.center, azimuth, lean, length, width, 0.1f, leaf_color, leaf_color);
        if (written == 0) {
            if (!rich_plant_overflow_warned) {
                print("rich_plant_generate: output buffer too small, truncating at leaf %d", li);
                rich_plant_overflow_warned = true;
            }
            break;
        }
        o += written;
        leaf_total += written;
    }

    if (out_stem_count) *out_stem_count = stem_count;
    if (out_leaf_count) *out_leaf_count = leaf_total;

    // 3. flower -- a small rosette of petals clustered at the stem tip, offset
    // outward from its center by flowerRadius so they ring a "receptacle"
    // rather than all emanating from one point. Skipped entirely if petalCount is 0.
    if (props->petalCount > 0) {
        plant_curve_sample tip;
        plant_sample_curve(origin, 0.0f, props->stemLean, props->stemLength, props->stemCurve, 1.0f, &tip);

        for (uint32_t pi = 0; pi < petalCount; pi++) {
            number rand_len   = veg_rand3((number)pi, 5.0f, 0.0f, props->seed);
            number rand_width = veg_rand3((number)pi, 6.0f, 0.0f, props->seed);
            number rand_jit   = veg_rand3((number)pi, 7.0f, 0.0f, props->seed);

            number azimuth, radius, pitch;
            if (petalArrangement == 1) {
                // spiral (volumetric, e.g. rose)
                number t = props->petalCount > 1 ? (number)pi / (number)(props->petalCount - 1) : 0.5f;
                azimuth = (number)pi * PLANT_GOLDEN_ANGLE + (rand_jit * 2.0f - 1.0f) * 0.1f;
                radius = props->petalRadiusInner + t * (props->flowerRadius - props->petalRadiusInner);
                pitch = props->petalPitch + t * (props->petalPitchOuter - props->petalPitch);
            } else {
                // flat ring (e.g. daisy)
                number base_angle = TWO_PI_F * (number)pi / (number)props->petalCount;
                azimuth = base_angle + (rand_jit * 2.0f - 1.0f) * 0.1f;
                radius = props->flowerRadius;
                pitch = props->petalPitch;
            }

            number petal_base[3] = {
                tip.center[0] + wcos(azimuth) * radius,
                tip.center[1],
                tip.center[2] + wsin(azimuth) * radius,
            };

            number length = (props->petalLength + (rand_len * 2.0f - 1.0f) * props->petalLength * 0.15f) * props->bloomSize;
            number width  = (props->petalWidth  + (rand_width * 2.0f - 1.0f) * props->petalWidth * 0.15f) * props->bloomSize;
            if (length < 0.001f) length = 0.001f;
            if (width < 0.001f) width = 0.001f;

            number jr = (veg_rand3((number)pi, 14.0f, 0.0f, props->seed) * 2.0f - 1.0f) * props->colorVariance;
            number jg = (veg_rand3((number)pi, 15.0f, 0.0f, props->seed) * 2.0f - 1.0f) * props->colorVariance;
            number jb = (veg_rand3((number)pi, 16.0f, 0.0f, props->seed) * 2.0f - 1.0f) * props->colorVariance;
            number petal_wind_phase = veg_rand3((number)pi, 99.0f, 0.0f, props->seed) * TWO_PI_F;
            number petal_base_color[4] = { veg_clamp01(props->petalColor[0] + jr), veg_clamp01(props->petalColor[1] + jg), veg_clamp01(props->petalColor[2] + jb), petal_wind_phase };
            // slight lightening toward the tip -- a common real petal highlight
            number petal_tip_color[4] = {
                veg_clamp01(petal_base_color[0] + (1.0f - petal_base_color[0]) * 0.15f),
                veg_clamp01(petal_base_color[1] + (1.0f - petal_base_color[1]) * 0.15f),
                veg_clamp01(petal_base_color[2] + (1.0f - petal_base_color[2]) * 0.15f),
                petal_wind_phase,
            };

            // lean using the calculated pitch so petals can splay outward or point up
            uint32_t written = plant_build_blade(segments, props->petalTipTaper, props->vMultiplier, 0.0f,
                                                   out_positions, out_normals, out_uvs, out_colors, o, max_verts,
                                                   petal_base, azimuth, pitch, length, width, props->petalCurl,
                                                   petal_base_color, petal_tip_color);
            if (written == 0) {
                if (!rich_plant_overflow_warned) {
                    print("rich_plant_generate: output buffer too small, truncating at petal %d", pi);
                    rich_plant_overflow_warned = true;
                }
                break;
            }
            o += written;
        }
    }

    return o;
}
