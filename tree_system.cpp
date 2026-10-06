// ============================================================================
// tree_system.cpp — procedural tree skeleton + mesh generation
//

// Internally the trunk is still built as an indexed mesh (ring-sharing is
// inherently an indexed problem — see tree_create_forks/tree_create_faces),
// then unwrapped once into the flat output in tree_build_trunk. Every
// intermediate buffer (skeleton, compact mesh, index list) lives in
// scratch_alloc and is discarded the moment tree_generate() returns.
//
// tree_props is one flat float block so JS can bind a single Float32Array view
// directly over the struct's WASM memory (see tra_node/tra_model in engine.js
// for the same pattern) and mutate fields live from UI sliders with zero
// marshalling. Fields that need integer semantics in C++ (segments, levels,
// etc.) are still stored as floats here and cast locally where needed.
// ============================================================================

#define TREE_MAX_BRANCHES   4096
#define TREE_MAX_SEGMENTS   16
#define TREE_MAX_LEVELS     8
#define TREE_PRESET_COUNT   1
#define TREE_FRUIT_VERTS_PER_UNIT 156 // 6x5 UV-sphere (144 verts) + 12-vert stem quad

#define TREE_PROPS_COUNT 43



// Single flat float block, bound as ONE Float32Array from JS (see tra_node/tra_model
// in engine.js for the same "typed array view directly over WASM struct memory"
// pattern -- that precedent is pure floats too, so treeSteps/segments/levels below are
// floats, not a separate int block. Values that need real integer semantics (loop
// bounds, bitwise/modulo ops, array indices) are cast locally at their point of use;
// every value here is astronomically below float32's exact-integer ceiling (2^24), so
// this costs nothing in precision.
struct tree_props {
    number clumpMax;
    number clumpMin;
    number lengthFalloffFactor;
    number lengthFalloffPower;
    number branchFactor;
    number radiusFalloffRate;
    number climbRate;
    number trunkKink;
    number maxRadius;
    number taperRate;
    number twistRate;
    number sweepAmount;
    number initialBranchLength;
    number trunkLength;
    number dropAmount;
    number growAmount;
    number vMultiplier;
    number twigScale;
    number seed;
    // branchFactor/clumpMax/clumpMin above are the CANOPY (tip) values; these
    // are their TRUNK (root) counterparts. tree_split_branch blends between
    // them by recursion depth, so a species can be tight near the trunk and
    // fan out at the crown (oak) or stay uniform top to bottom (pine, bush)
    // by simply setting these equal to their canopy counterpart. This is the
    // main lever for silhouette identity — see tree_props_set_* below.
    number branchFactorTrunk;
    number clumpMaxTrunk;
    number clumpMinTrunk;
    // Per-vertex color (multiplied with any texture in the shader, or used
    // standalone with no texture at all). *Variance jitters each channel
    // independently per branch (bark) / per twig (leaf) via veg_rand3, so a
    // whole tree isn't one uniform flat color.
    number barkColor[3];
    number barkColorVariance;
    number fruitChance;
    number fruitSize;
    number fruitColor[3];
    number treeSteps;
    number segments;
    number levels;
    // ---- new realism knobs (all default to an exact no-op, see tree_props_set_default) ----
    number rootFlare;         // buttress/flare widening at the trunk base, 0 = none
    number twigAngleJitter;   // radians, random extra rotation of the twig plane
    number fruitClusterCount; // fruits grown per twig when fruitChance hits (grape/cherry clusters)
    // ---- per-branch variation (every one defaults to 0 = an exact no-op) ----
    // Without these the skeleton is a fixed pattern: every fork has two children, a limb is its
    // parent's length times lengthFalloffFactor, side limbs along the trunk turn by a constant
    // angle (twistRate), and the noise-driven value only nudges the direction a little, so trees
    // of one species look alike for any seed. Each knob below draws its own independent,
    // seed-dependent random number per branch (tree_jit) and spreads it by that amount.
    number lengthJitter;      // 0..0.9  fractional +/- spread of each branch's length
    number radiusJitter;      // 0..0.5  fractional +/- spread of each side branch's radius
    number azimuthJitter;     // radians, random extra turn of a side limb around its parent
    number elevationJitter;   // random extra up/down tilt of a side limb (a direction offset, ~0..1)
    // ---- foliage volume (defaults reproduce the old single flat card per twig exactly) ----
    number twigCards;         // 1..4  cards per twig, crossed around the branch axis like a star, so the cluster has volume
    number twigNormalBlend;   // 0..1  0 = each card shades with its own face normal; 1 = every vertex's normal points away
                              //       from the middle of the crown, so foliage shades like a soft volume instead of flat cards
};

struct tree_branch {
    number head[3];
    number tangent[3];
    int32_t parent;
    int32_t child0;
    int32_t child1;
    uint32_t type;      // 0 = fork, 1 = trunk/kink segment
    number length;
    number radius;
    int32_t end_index;  // compact vertex index at the tip; valid only for terminal branches
};

// ----------------------------------------------------------------------------
// properties: defaults + presets
// ----------------------------------------------------------------------------

static void tree_props_set_default(tree_props* p) {
    p->clumpMax = 0.8f;
    p->clumpMin = 0.5f;
    p->lengthFalloffFactor = 0.85f;
    p->lengthFalloffPower = 1.0f;
    p->branchFactor = 3.5f;
    p->radiusFalloffRate = 0.6f;
    p->climbRate = 2.5f;
    p->trunkKink = 0.0f;
    p->maxRadius = 0.25f;
    p->taperRate = 0.95f;
    p->twistRate = 13.0f;
    p->sweepAmount = 0.0f;
    p->initialBranchLength = 0.85f;
    p->trunkLength = 2.5f;
    p->dropAmount = 0.5f;
    p->growAmount = 0.0f;
    p->vMultiplier = 0.2f;
    p->twigScale = 2.0f;
    p->seed = 10.0f;
    p->branchFactorTrunk = p->branchFactor; // no trunk/canopy contrast unless a preset overrides it
    p->clumpMaxTrunk = p->clumpMax;
    p->clumpMinTrunk = p->clumpMin;
    p->barkColor[0] = 0.35f; p->barkColor[1] = 0.22f; p->barkColor[2] = 0.12f; p->barkColorVariance = 0.08f;
    p->fruitChance = 0.0f; p->fruitSize = 0.5f; p->fruitColor[0] = 0.8f; p->fruitColor[1] = 0.1f; p->fruitColor[2] = 0.1f;
    p->treeSteps = 2;
    p->segments = 6;
    p->levels = 5;
    p->rootFlare = 0.0f;
    p->twigAngleJitter = 0.0f;
    p->fruitClusterCount = 1.0f;
    p->lengthJitter = 0.0f;
    p->radiusJitter = 0.0f;
    p->azimuthJitter = 0.0f;
    p->elevationJitter = 0.0f;
    p->twigCards = 1.0f;
    p->twigNormalBlend = 0.0f;
}

// Species are defined entirely in species_catalog_2.json now -- this is the only
// shape a tree_props can start from; apply_species() (demo_global.js) resets to
// this via apply_preset(0) before layering a catalog entry's params on top.
WASM_EXPORT void tree_props_apply_preset(tree_props* p, uint32_t preset_id) {
    tree_props_set_default(p);
}

WASM_EXPORT tree_props* tree_props_create() {
    tree_props* p = (tree_props*)math_alloc(sizeof(tree_props));
    tree_props_set_default(p);
    return p;
}

WASM_EXPORT uint32_t tree_props_count() { return TREE_PROPS_COUNT; }
WASM_EXPORT uint32_t tree_props_preset_count() { return TREE_PRESET_COUNT; }
WASM_EXPORT uint32_t tree_props_size() { return sizeof(tree_props); }

// Ring construction bisects each ring into two symmetric halves (segments/2),
// so segments must be even; this also keeps every loop bound below an exact
// integer instead of replicating JS's implicit float-division loop bounds.
// segments is stored as a float (see the struct comment) but bitwise AND needs
// a real integer operand, so it's read/written through a local uint32_t here.
static inline void tree_props_clamp(tree_props* p) {
    if (p->segments < 4) p->segments = 4;
    if (p->segments > TREE_MAX_SEGMENTS) p->segments = TREE_MAX_SEGMENTS;
    uint32_t segs = (uint32_t)p->segments;
    if (segs & 1u) segs += 1;
    p->segments = (number)segs;
    if (p->levels > TREE_MAX_LEVELS) p->levels = TREE_MAX_LEVELS;
    if (p->fruitClusterCount < 1.0f) p->fruitClusterCount = 1.0f;
    if (p->fruitClusterCount > 4.0f) p->fruitClusterCount = 4.0f;
    if (p->lengthJitter < 0.0f) p->lengthJitter = 0.0f;
    if (p->lengthJitter > 0.9f) p->lengthJitter = 0.9f;   // keeps 1 + jitter > 0 so a branch never flips or vanishes
    if (p->radiusJitter < 0.0f) p->radiusJitter = 0.0f;
    if (p->radiusJitter > 0.5f) p->radiusJitter = 0.5f;
    if (p->azimuthJitter < 0.0f) p->azimuthJitter = 0.0f;
    if (p->azimuthJitter > 3.14f) p->azimuthJitter = 3.14f;
    if (p->elevationJitter < 0.0f) p->elevationJitter = 0.0f;
    if (p->elevationJitter > 1.5f) p->elevationJitter = 1.5f;
    if (p->twigCards < 1.0f) p->twigCards = 1.0f;
    if (p->twigCards > 4.0f) p->twigCards = 4.0f;
    if (p->twigNormalBlend < 0.0f) p->twigNormalBlend = 0.0f;
    if (p->twigNormalBlend > 1.0f) p->twigNormalBlend = 1.0f;
}

// ----------------------------------------------------------------------------
// small helpers specific to the skeleton/ring math
// ----------------------------------------------------------------------------

// Real simplex noise (already used for terrain, see noise.cpp) instead of the
// old abs(cos(a+a*a)) hash -- that hash has visible periodicity/correlation
// which reads as artificial, repeating "kinks" once you look at more than one
// branch. The 0.37/0.61/0.53 multipliers keep (a,b,c) off the simplex lattice's
// integer corners, where the noise degenerates toward 0.
// Shared across the vegetation system (tree_system.cpp, plant_system.cpp) --
// not tree-specific despite living in this file first.
static inline number veg_rand3(number a, number b, number c, number seed) {
    number n = simplex_noise_3d(a * 0.37f, b * 0.61f, c * 0.53f, (int)seed);
    return n * 0.5f + 0.5f; // remap [-1,1] -> [0,1]
}

static inline number veg_clamp01(number v) { return v < 0.0f ? 0.0f : (v > 1.0f ? 1.0f : v); }

// v*cos(T) + (axis x v)*sin(T) + axis*(axis.v)*(1-cos(T))
static inline void tree_axis_angle(number* out, const number* vec, const number* axis, number angle) {
    number cosr = wcos(angle), sinr = wsin(angle);
    number t1[3]; v3_scale(t1, vec, cosr);
    number t2[3]; v3_cross(t2, axis, vec); v3_scale_eq(t2, sinr);
    number t3[3]; v3_scale(t3, axis, v3_dot(axis, vec) * (1.0f - cosr));
    number sum[3]; v3_add(sum, t1, t2);
    v3_add(out, sum, t3);
}

static inline void tree_scale_in_direction(number* out, const number* vector, const number* direction, number scale) {
    number d = v3_dot(vector, direction);
    number add[3]; v3_scale(add, direction, d * scale - d);
    v3_add(out, vector, add);
}

static inline void tree_mirror(number* out, const number* vec, const number* norm, number branchFactor) {
    number tmp[3]; v3_cross(tmp, vec, norm);
    number m_v[3]; v3_cross(m_v, norm, tmp);
    number m_s = branchFactor * v3_dot(m_v, vec);
    out[0] = vec[0] - m_v[0] * m_s;
    out[1] = vec[1] - m_v[1] * m_s;
    out[2] = vec[2] - m_v[2] * m_s;
}

// Independent per-branch random number in [-1, 1] for the jitter knobs. veg_rand3 is smooth
// noise sampled at integer lattice points, so neighbouring branches get nearly the same value;
// that is what direction wants but not jitter, which needs real hash scatter. `stream` makes
// each use of a branch's random numbers independent of the others.
static inline number tree_jit(const tree_props* props, number a, number b, number c, number stream) {
    return hash_3d(a + stream * 3.1f, b + stream * 0.7f, c + stream * 1.7f, props->seed + stream * 11.0f);
}

// A fork whose two child directions are (almost) the same makes the ring math degenerate:
// cross(axis1, axis2) collapses to ~0, the normalize divides by zero and every vertex after it
// is NaN. Seen with clumpMax ~0.98 together with branchFactor <= 1.5. "Almost" is judged by
// sin^2 of the angle between them. Tight forks of a fraction of a degree are legitimate (the
// brush of near-parallel twigs at a limb tip; sin^2 there is >= ~3e-8) and must come out exactly
// as they always did, while the broken ones sit at 1e-8 and below (down to ~1e-11).
#define TREE_MIN_FORK_SIN2 1e-8f

static inline bool tree_nearly_parallel(const number* a, const number* b) {
    number c[3]; v3_cross(c, a, b);
    return v3_dot(a, b) > 0.0f && v3_len_sq(c) < TREE_MIN_FORK_SIN2;
}

// Any unit vector perpendicular to a (a is unit length).
static inline void tree_any_perp(number* out, const number* a) {
    number ref[3] = { 0.0f, 1.0f, 0.0f };
    if (a[1] > 0.9f || a[1] < -0.9f) { ref[0] = 1.0f; ref[1] = 0.0f; }
    v3_cross(out, a, ref); v3_normalize(out, out);
}

// Swing two (near-)identical unit directions apart. A no-op for any pair that is not degenerate
// (see tree_nearly_parallel), so ordinary trees come out exactly as before.
static inline void tree_separate(number* a, number* b) {
    for (int it = 0; it < 12 && tree_nearly_parallel(a, b); it++) {
        number p[3]; number d = v3_dot(a, b);
        p[0] = b[0] - a[0] * d; p[1] = b[1] - a[1] * d; p[2] = b[2] - a[2] * d;
        if (v3_len_sq(p) < 1e-6f) tree_any_perp(p, a); else v3_normalize(p, p);   // too short to trust its direction
        a[0] -= p[0] * 0.12f; a[1] -= p[1] * 0.12f; a[2] -= p[2] * 0.12f; v3_normalize(a, a);
        b[0] += p[0] * 0.12f; b[1] += p[1] * 0.12f; b[2] += p[2] * 0.12f; v3_normalize(b, b);
    }
}

// ----------------------------------------------------------------------------
// skeleton growth
// ----------------------------------------------------------------------------

static bool tree_branch_overflow_warned = false;

static int32_t tree_create_branch(tree_branch* branches, int32_t* branch_count, int32_t parent, const number* head) {
    if (*branch_count >= TREE_MAX_BRANCHES) {
        if (!tree_branch_overflow_warned) {
            print("tree_system: TREE_MAX_BRANCHES exceeded, tree truncated");
            tree_branch_overflow_warned = true;
        }
        return -1;
    }
    int32_t bi = (*branch_count)++;
    tree_branch* b = &branches[bi];
    b->parent = parent;
    v3_copy(b->head, head);
    v3_zero(b->tangent);
    b->length = 1.0f;
    b->radius = 0.0f;
    b->type = 0;
    b->child0 = -1;
    b->child1 = -1;
    b->end_index = -1;
    return bi;
}

static void tree_split_branch(tree_props* props, tree_branch* branches, int32_t* branch_count,
                                int32_t bi, int level, int steps, int l1, int l2) {
    int32_t pid = branches[bi].parent;
    number po[3], so[3];
    if (pid >= 0) v3_copy(po, branches[pid].head);
    else { v3_zero(po); branches[bi].type = 1; }
    v3_copy(so, branches[bi].head);

    number dir[3]; v3_sub(dir, so, po); v3_normalize(dir, dir);
    number normal[3] = { dir[2], dir[0], dir[1] };
    { number tmp[3]; v3_cross(tmp, dir, normal); v3_copy(normal, tmp); }
    // the permutation trick above is parallel to dir (so normal -> 0) for a dir along (1,1,1)
    if (v3_len_sq(normal) < 1e-6f) tree_any_perp(normal, dir);
    number tangent[3]; v3_cross(tangent, dir, normal);

    int rLevel = (int)props->levels - level;
    number r = veg_rand3((number)rLevel, (number)l1, (number)l2, props->seed);

    // 0 at the trunk, 1 at the outermost canopy tips -- blends every
    // trunk/canopy pair below by recursion depth instead of applying one
    // constant everywhere.
    number levelFrac = props->levels > 0 ? (number)rLevel / (number)props->levels : 0.0f;
    number clumpmax = props->clumpMaxTrunk + (props->clumpMax - props->clumpMaxTrunk) * levelFrac;
    number clumpmin = props->clumpMinTrunk + (props->clumpMin - props->clumpMinTrunk) * levelFrac;
    number branchFactorLevel = props->branchFactorTrunk + (props->branchFactor - props->branchFactorTrunk) * levelFrac;

    number adj[3];
    { number a1[3]; v3_scale(a1, normal, r);
      number a2[3]; v3_scale(a2, tangent, 1.0f - r);
      v3_add(adj, a1, a2);
      if (r > 0.5f) v3_scale_eq(adj, -1.0f); }

    number clump = (clumpmax - clumpmin) * r + clumpmin;
    number newdir[3];
    { number t1[3]; v3_scale(t1, adj, 1.0f - clump);
      number t2[3]; v3_scale(t2, dir, clump);
      v3_add(newdir, t1, t2);
      v3_normalize(newdir, newdir); }

    number newdir2[3];
    tree_mirror(newdir2, newdir, dir, branchFactorLevel);
    v3_normalize(newdir2, newdir2);

    if (r > 0.5f) { number t[3]; v3_copy(t, newdir); v3_copy(newdir, newdir2); v3_copy(newdir2, t); }

    // random turn of each child around the parent's axis (side-limb azimuth, plain-recursion case)
    if (steps == 0 && props->azimuthJitter > 0.0f) {
        number rot[3];
        tree_axis_angle(rot, newdir, dir, tree_jit(props, (number)rLevel, (number)l1, (number)l2, 1.0f) * props->azimuthJitter); v3_copy(newdir, rot);
        tree_axis_angle(rot, newdir2, dir, tree_jit(props, (number)rLevel, (number)l1, (number)l2, 2.0f) * props->azimuthJitter); v3_copy(newdir2, rot);
    }

    // along the trunk chain (steps > 0) child0 is overwritten below by a near-vertical "kink" head,
    // so only the side limb (newdir2) matters; it must also stay clear of that chain direction
    number chain_kink[3] = { 0.0f, 1.0f, 0.0f };
    const bool on_chain = (level > 0 && steps > 0);
    if (on_chain) {
        chain_kink[0] = (r - 0.5f) * 2.0f * props->trunkKink;
        chain_kink[1] = props->climbRate;
        chain_kink[2] = (r - 0.5f) * 2.0f * props->trunkKink;
        v3_normalize(chain_kink, chain_kink);
    }
    number chain_angle = 0.0f;

    if (steps > 0) {
        number angle = (number)steps / (number)props->treeSteps * TWO_PI_F * props->twistRate;
        angle += tree_jit(props, (number)rLevel, (number)l1, (number)l2, 3.0f) * props->azimuthJitter;
        chain_angle = angle;
        newdir2[0] = wsin(angle);
        newdir2[1] = r + tree_jit(props, (number)rLevel, (number)l1, (number)l2, 4.0f) * props->elevationJitter;
        newdir2[2] = wcos(angle);
        v3_normalize(newdir2, newdir2);
    }

    number growAmount = (number)(level * level) / (number)((int)props->levels * (int)props->levels) * props->growAmount;
    number dropAmount = (number)rLevel * props->dropAmount;
    number sweepAmount = (number)rLevel * props->sweepAmount;
    number off[3] = { sweepAmount, dropAmount + growAmount, 0.0f };
    number off0[3] = { off[0], off[1], off[2] }, off1[3] = { off[0], off[1], off[2] };
    if (steps == 0 && props->elevationJitter > 0.0f) {   // (on the chain the tilt jitter is already in newdir2 above)
        off0[1] += tree_jit(props, (number)rLevel, (number)l1, (number)l2, 5.0f) * props->elevationJitter;
        off1[1] += tree_jit(props, (number)rLevel, (number)l1, (number)l2, 6.0f) * props->elevationJitter;
    }
    v3_add(newdir, newdir, off0); v3_normalize(newdir, newdir);
    v3_add(newdir2, newdir2, off1); v3_normalize(newdir2, newdir2);

    if (on_chain) {
        // keep the side limb off the trunk direction (see tree_nearly_parallel) by swinging it outwards
        for (int it = 0; it < 8 && tree_nearly_parallel(newdir2, chain_kink); it++) {
            newdir2[0] += wsin(chain_angle) * 0.35f; newdir2[2] += wcos(chain_angle) * 0.35f;
            v3_normalize(newdir2, newdir2);
        }
    }
    else {
        tree_separate(newdir, newdir2);
    }

    number head0[3], head1[3], scaled[3];
    v3_scale(scaled, newdir, branches[bi].length); v3_add(head0, so, scaled);
    v3_scale(scaled, newdir2, branches[bi].length); v3_add(head1, so, scaled);

    int32_t child0 = tree_create_branch(branches, branch_count, bi, head0);
    int32_t child1 = tree_create_branch(branches, branch_count, bi, head1);
    if (child0 < 0 || child1 < 0) return;

    branches[bi].child0 = child0;
    branches[bi].child1 = child1;

    number lenPow = wpow(branches[bi].length, props->lengthFalloffPower);
    number lenJit0 = 1.0f + tree_jit(props, (number)rLevel, (number)l1, (number)l2, 7.0f) * props->lengthJitter;
    number lenJit1 = 1.0f + tree_jit(props, (number)rLevel, (number)l1, (number)l2, 8.0f) * props->lengthJitter;
    branches[child0].length = lenPow * props->lengthFalloffFactor * lenJit0;
    branches[child1].length = lenPow * props->lengthFalloffFactor * lenJit1;

    if (level > 0) {
        if (steps > 0) {
            number kink[3] = { (r - 0.5f) * 2.0f * props->trunkKink, props->climbRate, (r - 0.5f) * 2.0f * props->trunkKink };
            v3_add(branches[child0].head, branches[bi].head, kink);
            branches[child0].type = 1;
            branches[child0].length = branches[bi].length * props->taperRate * lenJit0;
            tree_split_branch(props, branches, branch_count, child0, level, steps - 1, l1 + 1, l2);
        } else {
            tree_split_branch(props, branches, branch_count, child0, level - 1, 0, l1 + 1, l2);
        }
        tree_split_branch(props, branches, branch_count, child1, level - 1, 0, l1, l2 + 1);
    }
}

// Exact branch count for a given (levels, steps): every split creates exactly
// 2 children; M(L) = branches under a plain (steps=0) recursion of depth L,
// N(L,S) adds the extra trunk-kink chain steps consume before descending a level.
static uint32_t tree_estimate_branch_count(uint32_t levels, uint32_t steps) {
    if (levels == 0) return 3; // root + 2 terminal children, recursion never continues
    uint32_t M_prev = 2;       // M(0)
    for (uint32_t l = 1; l < levels; l++) M_prev = 2 + 2 * M_prev; // -> M(levels-1)
    uint32_t M_L = 2 + 2 * M_prev;                                  // M(levels)
    uint32_t N = M_L + steps * (2 + M_prev);
    return N + 1; // +1 for the root branch itself
}

WASM_EXPORT uint32_t tree_estimate_max_verts(tree_props* props) {
    tree_props_clamp(props);
    uint32_t levels = (uint32_t)props->levels;
    uint32_t treeSteps = (uint32_t)props->treeSteps;
    uint32_t segments = (uint32_t)props->segments;
    uint32_t fruitClusterCount = (uint32_t)props->fruitClusterCount;

    uint32_t branch_count = tree_estimate_branch_count(levels, treeSteps);
    if (branch_count > TREE_MAX_BRANCHES) branch_count = TREE_MAX_BRANCHES;
    uint32_t trunk_est = branch_count * segments * 6;
    uint32_t fruit_unit = (props->fruitChance > 0.0f) ? (fruitClusterCount * TREE_FRUIT_VERTS_PER_UNIT) : 0u;
    uint32_t card_unit = 12u * (uint32_t)props->twigCards;
    uint32_t twig_unit = fruit_unit > card_unit ? fruit_unit : card_unit;

    return trunk_est + branch_count * twig_unit;
}

// ----------------------------------------------------------------------------
// trunk mesh: compact indexed build (scratch) -> unwrap into flat output
// ----------------------------------------------------------------------------

struct tree_build_ctx {
    tree_props* props;
    tree_branch* branches;
    uint32_t* ring_pool;               // [branch_id*segments*3 + ring*segments + i]
    uint32_t root_ring[TREE_MAX_SEGMENTS];
    number* cpos;
    number* cnorm;
    number* cuv;
    number* ccolor;
    uint32_t* indices;
    uint32_t cvi;
    uint32_t ii;
    uint32_t compact_cap;
    uint32_t index_cap;
    bool overflow;
};

// color is RGBA (vec4 in the shader's a_color attribute), everything else here is vec3
static int32_t tree_push_vert(tree_build_ctx* ctx, const number* pos, const number* color) {
    if (ctx->overflow) return -1;
    if (ctx->cvi >= ctx->compact_cap) {
        print("tree_system: compact vertex buffer exceeded (%d)", ctx->compact_cap);
        ctx->overflow = true;
        return -1;
    }
    uint32_t vi = ctx->cvi++;
    v3_copy(&ctx->cpos[vi * 3], pos);
    ctx->ccolor[vi * 4 + 0] = color[0];
    ctx->ccolor[vi * 4 + 1] = color[1];
    ctx->ccolor[vi * 4 + 2] = color[2];
    ctx->ccolor[vi * 4 + 3] = color[3];
    return (int32_t)vi;
}

static bool tree_push_tri(tree_build_ctx* ctx, uint32_t a, uint32_t b, uint32_t c) {
    if (ctx->overflow) return false;
    if (ctx->ii + 3 > ctx->index_cap) {
        print("tree_system: index buffer exceeded (%d)", ctx->index_cap);
        ctx->overflow = true;
        return false;
    }
    ctx->indices[ctx->ii++] = a;
    ctx->indices[ctx->ii++] = b;
    ctx->indices[ctx->ii++] = c;
    return true;
}

static void tree_create_forks(tree_build_ctx* ctx, int32_t bi, number radius) {
    if (ctx->overflow) return;
    tree_props* props = ctx->props;
    tree_branch* branches = ctx->branches;
    tree_branch* b = &branches[bi];
    uint32_t segments = (uint32_t)props->segments;
    number segmentAngle = TWO_PI_F / (number)segments;

    // One jittered color per branch (not per vertex) -- real bark isn't a flat
    // color, but it also doesn't need to vary within a single ring/segment.
    number branch_color[4] = {
        veg_clamp01(props->barkColor[0] + (veg_rand3((number)bi, 42.0f, 0.0f, props->seed) * 2.0f - 1.0f) * props->barkColorVariance),
        veg_clamp01(props->barkColor[1] + (veg_rand3((number)bi, 43.0f, 0.0f, props->seed) * 2.0f - 1.0f) * props->barkColorVariance),
        veg_clamp01(props->barkColor[2] + (veg_rand3((number)bi, 44.0f, 0.0f, props->seed) * 2.0f - 1.0f) * props->barkColorVariance),
        1.0f,
    };

    b->radius = radius;
    if (radius > b->length) radius = b->length;

    int32_t pid = b->parent;

    if (pid < 0) {
        number axis[3] = { 0, 1, 0 };
        // Root flare: widen the ring sitting at ground level so the trunk doesn't
        // read as a pole stuck into the soil. 1.0 at rootFlare==0 is an exact no-op.
        number flareScale = 1.0f + props->rootFlare;
        for (uint32_t i = 0; i < segments; i++) {
            number v0[3] = { -1, 0, 0 };
            number vec[3]; tree_axis_angle(vec, v0, axis, -segmentAngle * (number)i);
            number scaled[3]; v3_scale(scaled, vec, (radius / props->radiusFalloffRate) * flareScale);
            int32_t vi = tree_push_vert(ctx, scaled, branch_color);
            if (vi < 0) return;
            ctx->root_ring[i] = (uint32_t)vi;
        }
    }

    int32_t child0 = b->child0;
    int32_t child1 = b->child1;

    if (child0 >= 0) {
        number axis[3], axis1[3], axis2[3], axis3[3], tangent[3], dir[3], centerloc[3];

        if (pid >= 0) { v3_sub(axis, b->head, branches[pid].head); v3_normalize(axis, axis); }
        else v3_normalize(axis, b->head);

        v3_sub(axis1, b->head, branches[child0].head); v3_normalize(axis1, axis1);
        v3_sub(axis2, b->head, branches[child1].head); v3_normalize(axis2, axis2);

        v3_cross(tangent, axis1, axis2); v3_normalize(tangent, tangent);
        v3_copy(b->tangent, tangent);

        {
            number na1[3]; v3_scale(na1, axis1, -1.0f);
            number na2[3]; v3_scale(na2, axis2, -1.0f);
            number sum[3]; v3_add(sum, na1, na2); v3_normalize(sum, sum);
            v3_cross(axis3, tangent, sum); v3_normalize(axis3, axis3);
        }

        dir[0] = axis2[0]; dir[1] = 0.0f; dir[2] = axis2[2];
        { number scaled[3]; v3_scale(scaled, dir, -props->maxRadius * 0.5f); v3_add(centerloc, b->head, scaled); }

        number scale = props->radiusFalloffRate;
        if (branches[child0].type == 1 || b->type == 1) scale = 1.0f / props->taperRate;

        uint32_t ring0[TREE_MAX_SEGMENTS], ring1[TREE_MAX_SEGMENTS], ring2[TREE_MAX_SEGMENTS];
        uint32_t r0n = 0, r1n = 0, r2n = 0;

        number p0[3]; { number scaled[3]; v3_scale(scaled, tangent, radius * scale); v3_add(p0, centerloc, scaled); }
        int32_t linch0 = tree_push_vert(ctx, p0, branch_color);
        if (linch0 < 0) return;
        ring0[r0n++] = (uint32_t)linch0; ring2[r2n++] = (uint32_t)linch0;

        uint32_t start = (uint32_t)linch0;
        number d1[3]; tree_axis_angle(d1, tangent, axis2, 1.57f);
        number d2[3]; v3_cross(d2, tangent, axis); v3_normalize(d2, d2);
        number s = 1.0f / v3_dot(d1, d2);

        for (uint32_t i = 1; i < segments / 2; i++) {
            number vec[3]; tree_axis_angle(vec, tangent, axis2, segmentAngle * (number)i);
            tree_scale_in_direction(vec, vec, d2, s);
            number p[3]; number scaled[3]; v3_scale(scaled, vec, radius * scale); v3_add(p, centerloc, scaled);
            int32_t vi = tree_push_vert(ctx, p, branch_color);
            if (vi < 0) return;
            ring0[r0n++] = (uint32_t)vi; ring2[r2n++] = (uint32_t)vi;
        }

        number p1[3]; { number scaled[3]; v3_scale(scaled, tangent, -radius * scale); v3_add(p1, centerloc, scaled); }
        int32_t linch1 = tree_push_vert(ctx, p1, branch_color);
        if (linch1 < 0) return;
        ring0[r0n++] = (uint32_t)linch1; ring1[r1n++] = (uint32_t)linch1;

        for (uint32_t i = segments / 2 + 1; i < segments; i++) {
            number vec[3]; tree_axis_angle(vec, tangent, axis1, segmentAngle * (number)i);
            number p[3]; number scaled[3]; v3_scale(scaled, vec, radius * scale); v3_add(p, centerloc, scaled);
            int32_t vi = tree_push_vert(ctx, p, branch_color);
            if (vi < 0) return;
            ring0[r0n++] = (uint32_t)vi; ring1[r1n++] = (uint32_t)vi;
        }

        ring1[r1n++] = (uint32_t)linch0; ring2[r2n++] = (uint32_t)linch1;
        start = ctx->cvi - 1;
        for (uint32_t i = 1; i < segments / 2; i++) {
            number vec[3]; tree_axis_angle(vec, tangent, axis3, segmentAngle * (number)i);
            number p[3]; number scaled[3]; v3_scale(scaled, vec, radius * scale); v3_add(p, centerloc, scaled);
            int32_t vi = tree_push_vert(ctx, p, branch_color);
            if (vi < 0) return;
            ring1[r1n++] = (uint32_t)vi;
            ring2[r2n++] = start + (segments / 2 - i);
        }

        uint32_t ring_base = (uint32_t)bi * segments * 3;
        for (uint32_t i = 0; i < segments; i++) {
            ctx->ring_pool[ring_base + i] = ring0[i];
            ctx->ring_pool[ring_base + segments + i] = ring1[i];
            ctx->ring_pool[ring_base + segments * 2 + i] = ring2[i];
        }

        // side branches only (the trunk chain keeps its smooth taper); never thicker than the parent
        number rj0 = 1.0f + tree_jit(props, (number)bi, 11.0f, 5.0f, 9.0f) * props->radiusJitter;
        number rj1 = 1.0f + tree_jit(props, (number)bi, 13.0f, 5.0f, 10.0f) * props->radiusJitter;
        number rc0 = branches[child0].type == 1 ? radius * props->taperRate : radius * props->radiusFalloffRate * rj0;
        number rc1 = radius * props->radiusFalloffRate * rj1;
        if (props->radiusJitter > 0.0f) {
            if (rc0 > radius * 0.98f && branches[child0].type != 1) rc0 = radius * 0.98f;
            if (rc1 > radius * 0.98f) rc1 = radius * 0.98f;
        }
        tree_create_forks(ctx, child0, rc0);
        tree_create_forks(ctx, child1, rc1);

    } else {
        int32_t vi = tree_push_vert(ctx, b->head, branch_color);
        if (vi < 0) return;
        b->end_index = vi;
    }
}

static void tree_create_faces(tree_build_ctx* ctx, int32_t bi) {
    if (ctx->overflow) return;
    tree_props* props = ctx->props;
    tree_branch* branches = ctx->branches;
    tree_branch* b = &branches[bi];
    uint32_t segments = (uint32_t)props->segments;

    int32_t pid = b->parent;
    int32_t child0 = b->child0;
    int32_t child1 = b->child1;

    uint32_t ring_base = (uint32_t)bi * segments * 3;
    uint32_t ring0_base = ring_base;
    uint32_t ring1_base = ring_base + segments;
    uint32_t ring2_base = ring_base + segments * 2;

    if (pid < 0) {
        // Runs exactly once, on the trunk root, after the full ring pass has
        // already finished — ctx->cvi already holds the final compact vertex count.
        for (uint32_t i = 0; i < ctx->cvi; i++) { ctx->cuv[i * 2 + 0] = 0.0f; ctx->cuv[i * 2 + 1] = 0.0f; }

        number t1[3]; v3_sub(t1, branches[child0].head, b->head);
        number t2[3]; v3_sub(t2, branches[child1].head, b->head);
        number tangent[3]; v3_cross(tangent, t1, t2); v3_normalize(tangent, tangent);
        number normal[3]; v3_normalize(normal, b->head);
        number negx[3] = { -1, 0, 0 };
        number angle = wacos(v3_dot(tangent, negx));
        number cr[3]; v3_cross(cr, negx, tangent);
        if (v3_dot(cr, normal) > 0.0f) angle = TWO_PI_F - angle;
        uint32_t segOffset = (uint32_t)(angle / TWO_PI_F * (number)segments + 0.5f);

        for (uint32_t i = 0; i < segments; i++) {
            uint32_t v1 = ctx->ring_pool[ring0_base + i];
            uint32_t v2 = ctx->root_ring[(i + segOffset + 1) % segments];
            uint32_t v3 = ctx->root_ring[(i + segOffset) % segments];
            uint32_t v4 = ctx->ring_pool[ring0_base + (i + 1) % segments];
            if (!tree_push_tri(ctx, v1, v4, v3)) return;
            if (!tree_push_tri(ctx, v4, v2, v3)) return;

            number uabs = wabs((number)i / (number)segments - 0.5f) * 2.0f;
            ctx->cuv[v3 * 2 + 0] = uabs; ctx->cuv[v3 * 2 + 1] = 0.0f;

            number d[3]; v3_sub(d, &ctx->cpos[v1 * 3], &ctx->cpos[v3 * 3]);
            number len = v3_len(d) * props->vMultiplier;
            ctx->cuv[v1 * 2 + 0] = uabs; ctx->cuv[v1 * 2 + 1] = len;
            uint32_t r2i = ctx->ring_pool[ring2_base + i];
            ctx->cuv[r2i * 2 + 0] = uabs; ctx->cuv[r2i * 2 + 1] = len;
        }
    }

    bool c0_internal = branches[child0].child0 >= 0;
    bool c1_internal = branches[child1].child0 >= 0;

    uint32_t c0_ring0 = c0_internal ? (uint32_t)child0 * segments * 3 : 0;
    uint32_t c1_ring0 = c1_internal ? (uint32_t)child1 * segments * 3 : 0;
    uint32_t c0_ring2 = c0_internal ? c0_ring0 + segments * 2 : 0;
    uint32_t c1_ring2 = c1_internal ? c1_ring0 + segments * 2 : 0;

    int32_t segOffset0 = -1, segOffset1 = -1;
    number match0 = 0.0f, match1 = 0.0f;

    if (c0_internal) {
        number v1[3]; v3_sub(v1, &ctx->cpos[ctx->ring_pool[ring1_base] * 3], b->head); v3_normalize(v1, v1);
        number dir0[3]; v3_sub(dir0, branches[child0].head, b->head); v3_normalize(dir0, dir0);
        tree_scale_in_direction(v1, v1, dir0, 0.0f);
        for (uint32_t i = 0; i < segments; i++) {
            number d0[3]; v3_sub(d0, &ctx->cpos[ctx->ring_pool[c0_ring0 + i] * 3], branches[child0].head); v3_normalize(d0, d0);
            number l0 = v3_dot(d0, v1);
            if (segOffset0 < 0 || l0 > match0) { match0 = l0; segOffset0 = (int32_t)(segments - i); }
        }
    }

    if (c1_internal) {
        number v2[3]; v3_sub(v2, &ctx->cpos[ctx->ring_pool[ring2_base] * 3], b->head); v3_normalize(v2, v2);
        number dir1[3]; v3_sub(dir1, branches[child1].head, b->head); v3_normalize(dir1, dir1);
        tree_scale_in_direction(v2, v2, dir1, 0.0f);
        for (uint32_t i = 0; i < segments; i++) {
            number d1v[3]; v3_sub(d1v, &ctx->cpos[ctx->ring_pool[c1_ring0 + i] * 3], branches[child1].head); v3_normalize(d1v, d1v);
            number l1 = v3_dot(d1v, v2);
            if (segOffset1 < 0 || l1 > match1) { match1 = l1; segOffset1 = (int32_t)(segments - i); }
        }
    }

    number uvScale = props->maxRadius / b->radius;
    uint32_t so0 = (uint32_t)(segOffset0 < 0 ? 0 : segOffset0);
    uint32_t so1 = (uint32_t)(segOffset1 < 0 ? 0 : segOffset1);

    for (uint32_t i = 0; i < segments; i++) {
        if (c0_internal) {
            uint32_t va = ctx->ring_pool[c0_ring0 + i];
            uint32_t vb = ctx->ring_pool[ring1_base + ((i + so0 + 1) % segments)];
            uint32_t vc = ctx->ring_pool[ring1_base + ((i + so0) % segments)];
            uint32_t vd = ctx->ring_pool[c0_ring0 + ((i + 1) % segments)];
            if (!tree_push_tri(ctx, va, vd, vc)) return;
            if (!tree_push_tri(ctx, vd, vb, vc)) return;

            number dlen0[3]; v3_sub(dlen0, &ctx->cpos[va * 3], &ctx->cpos[vc * 3]);
            number len0 = v3_len(dlen0) * uvScale;
            uint32_t uv0src = ctx->ring_pool[ring1_base + ((i + so0 + segments - 1) % segments)];
            number u0 = ctx->cuv[uv0src * 2 + 0], v0v = ctx->cuv[uv0src * 2 + 1];
            uint32_t c0r0i = ctx->ring_pool[c0_ring0 + i];
            uint32_t c0r2i = ctx->ring_pool[c0_ring2 + i];
            ctx->cuv[c0r0i * 2 + 0] = u0; ctx->cuv[c0r0i * 2 + 1] = v0v + len0 * props->vMultiplier;
            ctx->cuv[c0r2i * 2 + 0] = u0; ctx->cuv[c0r2i * 2 + 1] = v0v + len0 * props->vMultiplier;
        } else {
            uint32_t r1a = ctx->ring_pool[ring1_base + ((i + 1) % segments)];
            uint32_t r1b = ctx->ring_pool[ring1_base + i];
            uint32_t e0 = (uint32_t)branches[child0].end_index;
            if (!tree_push_tri(ctx, e0, r1a, r1b)) return;

            number d0[3]; v3_sub(d0, &ctx->cpos[e0 * 3], &ctx->cpos[r1b * 3]);
            number len0 = v3_len(d0);
            number u0 = wabs((number)i / (number)segments - 1.0f - 0.5f) * 2.0f;
            ctx->cuv[e0 * 2 + 0] = u0; ctx->cuv[e0 * 2 + 1] = len0 * props->vMultiplier;
        }

        if (c1_internal) {
            uint32_t wa = ctx->ring_pool[c1_ring0 + i];
            uint32_t wb = ctx->ring_pool[ring2_base + ((i + so1 + 1) % segments)];
            uint32_t wc = ctx->ring_pool[ring2_base + ((i + so1) % segments)];
            uint32_t wd = ctx->ring_pool[c1_ring0 + ((i + 1) % segments)];
            if (!tree_push_tri(ctx, wa, wb, wc)) return;
            if (!tree_push_tri(ctx, wa, wd, wb)) return;

            number dlen1[3]; v3_sub(dlen1, &ctx->cpos[wa * 3], &ctx->cpos[wc * 3]);
            number len1 = v3_len(dlen1) * uvScale;
            uint32_t uv1src = ctx->ring_pool[ring2_base + ((i + so1 + segments - 1) % segments)];
            number u1 = ctx->cuv[uv1src * 2 + 0], v1v = ctx->cuv[uv1src * 2 + 1];
            uint32_t c1r0i = ctx->ring_pool[c1_ring0 + i];
            uint32_t c1r2i = ctx->ring_pool[c1_ring2 + i];
            ctx->cuv[c1r0i * 2 + 0] = u1; ctx->cuv[c1r0i * 2 + 1] = v1v + len1 * props->vMultiplier;
            ctx->cuv[c1r2i * 2 + 0] = u1; ctx->cuv[c1r2i * 2 + 1] = v1v + len1 * props->vMultiplier;
        } else {
            uint32_t r2a = ctx->ring_pool[ring2_base + ((i + 1) % segments)];
            uint32_t r2b = ctx->ring_pool[ring2_base + i];
            uint32_t e1 = (uint32_t)branches[child1].end_index;
            if (!tree_push_tri(ctx, e1, r2a, r2b)) return;

            number d1[3]; v3_sub(d1, &ctx->cpos[e1 * 3], &ctx->cpos[r2b * 3]);
            number len1 = v3_len(d1);
            number u1 = wabs((number)i / (number)segments - 0.5f) * 2.0f;
            ctx->cuv[e1 * 2 + 0] = u1; ctx->cuv[e1 * 2 + 1] = len1 * props->vMultiplier;
        }
    }

    if (c0_internal) tree_create_faces(ctx, child0);
    if (c1_internal) tree_create_faces(ctx, child1);
}

static uint32_t tree_build_trunk(tree_props* props, tree_branch* branches, int32_t branch_count,
                                   number* out_positions, number* out_normals, number* out_uvs, number* out_colors,
                                   uint32_t max_verts) {
    uint32_t segments = (uint32_t)props->segments;

    // Generous scratch upper bounds — cheap and reclaimed automatically, so
    // there's no reason to fight for a tight fit here (unlike max_verts below,
    // which is the caller's real, budgeted output buffer).
    uint32_t compact_cap = (uint32_t)branch_count * segments * 4 + segments + 16;
    uint32_t index_cap = (uint32_t)branch_count * segments * 14 + 32;

    tree_build_ctx ctx;
    ctx.props = props;
    ctx.branches = branches;
    ctx.ring_pool = (uint32_t*)scratch_alloc((uint32_t)branch_count * segments * 3 * sizeof(uint32_t));
    ctx.cpos = (number*)scratch_alloc(compact_cap * 3 * sizeof(number));
    ctx.cnorm = (number*)scratch_alloc(compact_cap * 3 * sizeof(number));
    ctx.cuv = (number*)scratch_alloc(compact_cap * 2 * sizeof(number));
    ctx.ccolor = (number*)scratch_alloc(compact_cap * 4 * sizeof(number)); // RGBA
    ctx.indices = (uint32_t*)scratch_alloc(index_cap * sizeof(uint32_t));
    ctx.cvi = 0;
    ctx.ii = 0;
    ctx.compact_cap = compact_cap;
    ctx.index_cap = index_cap;
    ctx.overflow = false;

    if (!ctx.ring_pool || !ctx.cpos || !ctx.cnorm || !ctx.cuv || !ctx.ccolor || !ctx.indices) {
        print("tree_build_trunk: scratch allocation failed");
        return 0;
    }

    tree_create_forks(&ctx, 0, props->maxRadius);
    if (ctx.overflow) return 0;

    tree_create_faces(&ctx, 0);
    if (ctx.overflow) return 0;

    geometry_calculate_normals_raw(ctx.cpos, ctx.cnorm, ctx.indices, ctx.cvi, ctx.ii);

    if (ctx.ii > max_verts) {
        print("tree_build_trunk: output buffer too small, need %d have %d", ctx.ii, max_verts);
        return 0;
    }

    for (uint32_t i = 0; i < ctx.ii; i++) {
        uint32_t vi = ctx.indices[i];
        out_positions[i * 3 + 0] = ctx.cpos[vi * 3 + 0];
        out_positions[i * 3 + 1] = ctx.cpos[vi * 3 + 1];
        out_positions[i * 3 + 2] = ctx.cpos[vi * 3 + 2];
        out_normals[i * 3 + 0] = ctx.cnorm[vi * 3 + 0];
        out_normals[i * 3 + 1] = ctx.cnorm[vi * 3 + 1];
        out_normals[i * 3 + 2] = ctx.cnorm[vi * 3 + 2];
        out_uvs[i * 2 + 0] = ctx.cuv[vi * 2 + 0];
        out_uvs[i * 2 + 1] = ctx.cuv[vi * 2 + 1];
        out_colors[i * 4 + 0] = ctx.ccolor[vi * 4 + 0];
        out_colors[i * 4 + 1] = ctx.ccolor[vi * 4 + 1];
        out_colors[i * 4 + 2] = ctx.ccolor[vi * 4 + 2];
        out_colors[i * 4 + 3] = ctx.ccolor[vi * 4 + 3];
    }

    return ctx.ii;
}

// ----------------------------------------------------------------------------
// twigs: leaf-quad billboards at every terminal branch tip, written directly
// in flat form right after the trunk range (no indexing needed — a double
// sided quad has no vertex sharing worth the bookkeeping).
// ----------------------------------------------------------------------------

static uint32_t tree_build_twigs(tree_props* props, tree_branch* branches, int32_t branch_count,
                                   number* out_positions, number* out_normals, number* out_uvs, number* out_colors,
                                   uint32_t out_offset, uint32_t max_verts) {
    uint32_t o = out_offset;
    uint32_t fruitClusterMax = (uint32_t)props->fruitClusterCount;
    uint32_t cards = (uint32_t)props->twigCards;
    if (cards < 1u) cards = 1u;
    number blend = props->twigNormalBlend;

    // Middle of the foliage (the mean of the twig tips). With twigNormalBlend > 0 the normals of the cards lean away from
    // it: a flat card lit by its own face normal reads as a flat card, while normals that point out of the crown make a
    // cluster of cards shade like one soft rounded mass of leaves (the same trick as spherical-normal tree impostors).
    number crown[3] = { 0.0f, 0.0f, 0.0f };
    if (blend > 0.0f) {
        int32_t n_tips = 0;
        for (int32_t bi = 0; bi < branch_count; bi++) {
            tree_branch* b = &branches[bi];
            if (b->child0 >= 0 || b->parent < 0) continue;
            crown[0] += b->head[0]; crown[1] += b->head[1]; crown[2] += b->head[2];
            n_tips++;
        }
        if (n_tips > 0) { crown[0] /= (number)n_tips; crown[1] /= (number)n_tips; crown[2] /= (number)n_tips; }
    }

    auto emit_double_quad = [&](const number* tp_, const number* tn_, const number* bn_, const number* bp_, const number* color) {
        number e1[3]; v3_sub(e1, tp_, bn_);
        number e2[3]; v3_sub(e2, tn_, bn_);
        number normal[3]; v3_cross(normal, e1, e2); v3_normalize(normal, normal);
        number normal2[3]; v3_scale(normal2, normal, -1.0f);
        auto emit = [&](const number* pos, const number* n, number u, number v) {
            number nb[3] = { n[0], n[1], n[2] };
            if (blend > 0.0f) {
                number radial[3]; v3_sub(radial, pos, crown); v3_normalize(radial, radial);
                nb[0] = n[0] * (1.0f - blend) + radial[0] * blend;
                nb[1] = n[1] * (1.0f - blend) + radial[1] * blend;
                nb[2] = n[2] * (1.0f - blend) + radial[2] * blend;
                v3_normalize(nb, nb);
            }
            out_positions[o * 3 + 0] = pos[0]; out_positions[o * 3 + 1] = pos[1]; out_positions[o * 3 + 2] = pos[2];
            out_normals[o * 3 + 0] = nb[0]; out_normals[o * 3 + 1] = nb[1]; out_normals[o * 3 + 2] = nb[2];
            out_uvs[o * 2 + 0] = u; out_uvs[o * 2 + 1] = v;
            out_colors[o * 4 + 0] = color[0]; out_colors[o * 4 + 1] = color[1]; out_colors[o * 4 + 2] = color[2]; out_colors[o * 4 + 3] = color[3];
            o++;
        };
        // front face
        emit(tp_, normal, 0, 1); emit(tn_, normal, 1, 1); emit(bn_, normal, 1, 0);
        emit(bp_, normal, 0, 0); emit(tp_, normal, 0, 1); emit(bn_, normal, 1, 0);
        // back face (same quad, reversed winding + normal so it isn't backface-culled)
        emit(bn_, normal2, 1, 0); emit(tn_, normal2, 1, 1); emit(tp_, normal2, 0, 1);
        emit(bn_, normal2, 1, 0); emit(tp_, normal2, 0, 1); emit(bp_, normal2, 0, 0);
    };

    for (int32_t bi = 0; bi < branch_count; bi++) {
        tree_branch* b = &branches[bi];
        if (b->child0 >= 0) continue; // twigs only grow from terminal branch tips
        int32_t pid = b->parent;
        if (pid < 0) continue;
        tree_branch* p = &branches[pid];
        if (p->child0 < 0 || p->child1 < 0) continue;

        if (props->fruitChance > 0.0f && veg_rand3((number)bi, 65.0f, 0.0f, props->seed) < props->fruitChance) {
            number fruit_color[4] = { props->fruitColor[0], props->fruitColor[1], props->fruitColor[2], 1.0f };
            number stem_color[4] = { 0.15f, 0.35f, 0.12f, 1.0f };
            number s = props->fruitSize;
            bool ran_out = false;

            auto emit_f = [&](const number* pos, const number* n, number u, number v, const number* col) {
                out_positions[o * 3 + 0] = pos[0]; out_positions[o * 3 + 1] = pos[1]; out_positions[o * 3 + 2] = pos[2];
                out_normals[o * 3 + 0] = n[0]; out_normals[o * 3 + 1] = n[1]; out_normals[o * 3 + 2] = n[2];
                out_uvs[o * 2 + 0] = u; out_uvs[o * 2 + 1] = v;
                out_colors[o * 4 + 0] = col[0]; out_colors[o * 4 + 1] = col[1]; out_colors[o * 4 + 2] = col[2]; out_colors[o * 4 + 3] = col[3];
                o++;
            };

            auto emit_tri = [&](const number* p1, const number* p2, const number* p3, const number* col) {
                number e1[3]; v3_sub(e1, p2, p1);
                number e2[3]; v3_sub(e2, p3, p1);
                number n[3]; v3_cross(n, e1, e2); v3_normalize(n, n);
                emit_f(p1, n, 0.5f, 0.5f, col);
                emit_f(p2, n, 0.5f, 0.5f, col);
                emit_f(p3, n, 0.5f, 0.5f, col);
            };

            // fruitClusterCount fruits per twig (grape/cherry-style clustering). fi==0
            // sits at exactly today's position; fi>0 gets a small position jitter.
            for (uint32_t fi = 0; fi < fruitClusterMax; fi++) {
                if (o + TREE_FRUIT_VERTS_PER_UNIT > max_verts) { print("tree_build_twigs: output overflow, truncating"); ran_out = true; break; }

                number jitterX = 0.0f, jitterZ = 0.0f, jitterYExtra = 0.0f;
                if (fi > 0) {
                    jitterX = (veg_rand3((number)bi, 66.0f + (number)fi, 0.0f, props->seed) * 2.0f - 1.0f) * s * 0.6f;
                    jitterZ = (veg_rand3((number)bi, 67.0f + (number)fi, 0.0f, props->seed) * 2.0f - 1.0f) * s * 0.6f;
                    jitterYExtra = veg_rand3((number)bi, 68.0f + (number)fi, 0.0f, props->seed) * s * 0.4f;
                }
                number c[3]; v3_copy(c, b->head);
                c[0] += jitterX; c[2] += jitterZ;

                // Hang the fruit down slightly
                c[1] -= s * 1.2f - jitterYExtra;

                // Emit spherical fruit (6 slices, 5 stacks)
                int slices = 6;
                int stacks = 5;
                for (int i = 0; i < stacks; i++) {
                    number phi0 = 3.14159f * (number)i / (number)stacks;
                    number phi1 = 3.14159f * (number)(i + 1) / (number)stacks;
                    number y0 = wcos(phi0);
                    number y1 = wcos(phi1);
                    number r0 = wsin(phi0);
                    number r1 = wsin(phi1);

                    for (int j = 0; j < slices; j++) {
                        number theta0 = 2.0f * 3.14159f * (number)j / (number)slices;
                        number theta1 = 2.0f * 3.14159f * (number)(j + 1) / (number)slices;

                        number p00[3] = { c[0] + r0 * wcos(theta0) * s, c[1] + y0 * s, c[2] + r0 * wsin(theta0) * s };
                        number p01[3] = { c[0] + r0 * wcos(theta1) * s, c[1] + y0 * s, c[2] + r0 * wsin(theta1) * s };
                        number p10[3] = { c[0] + r1 * wcos(theta0) * s, c[1] + y1 * s, c[2] + r1 * wsin(theta0) * s };
                        number p11[3] = { c[0] + r1 * wcos(theta1) * s, c[1] + y1 * s, c[2] + r1 * wsin(theta1) * s };

                        if (i != 0) emit_tri(p00, p10, p01, fruit_color);
                        if (i != stacks - 1) emit_tri(p01, p10, p11, fruit_color);
                    }
                }

                // Emit a small stem quad connecting b->head to the top of this fruit
                number fruit_top[3] = { c[0], c[1] + s, c[2] };
                number stem_w = s * 0.1f;
                number b_head[3]; v3_copy(b_head, b->head);
                number st_p1[3] = { b_head[0] - stem_w, b_head[1], b_head[2] };
                number st_p2[3] = { b_head[0] + stem_w, b_head[1], b_head[2] };
                number st_p3[3] = { fruit_top[0] - stem_w, fruit_top[1], fruit_top[2] };
                number st_p4[3] = { fruit_top[0] + stem_w, fruit_top[1], fruit_top[2] };
                emit_tri(st_p1, st_p3, st_p2, stem_color);
                emit_tri(st_p2, st_p3, st_p4, stem_color);

                // Double-sided stem
                emit_tri(st_p1, st_p2, st_p3, stem_color);
                emit_tri(st_p2, st_p4, st_p3, stem_color);
            }

            if (ran_out) break;
            continue;
        }

        uint32_t need = 12u * cards;
        if (o + need > max_verts) { print("tree_build_twigs: output overflow, truncating"); break; }

        number bark_color[4] = {
            veg_clamp01(props->barkColor[0] + (veg_rand3((number)bi, 55.0f, 0.0f, props->seed) * 2.0f - 1.0f) * props->barkColorVariance),
            veg_clamp01(props->barkColor[1] + (veg_rand3((number)bi, 56.0f, 0.0f, props->seed) * 2.0f - 1.0f) * props->barkColorVariance),
            veg_clamp01(props->barkColor[2] + (veg_rand3((number)bi, 57.0f, 0.0f, props->seed) * 2.0f - 1.0f) * props->barkColorVariance),
            // alpha carries a per-twig wind phase in [0, 2 pi) (as plant_system.cpp does for blades), not opacity: it lets a
            // foliage shader sway every cluster out of step with its neighbours and tint each one a little differently
            veg_rand3((number)bi, 78.0f, 0.0f, props->seed) * TWO_PI_F,
        };

        number t1[3]; v3_sub(t1, branches[p->child0].head, p->head);
        number t2[3]; v3_sub(t2, branches[p->child1].head, p->head);
        number tangent[3]; v3_cross(tangent, t1, t2); v3_normalize(tangent, tangent);
        number binormal[3]; v3_sub(binormal, b->head, p->head); v3_normalize(binormal, binormal);

        if (props->twigAngleJitter > 0.0f) {
            number jr = (veg_rand3((number)bi, 95.0f, 0.0f, props->seed) * 2.0f - 1.0f) * props->twigAngleJitter;
            number rotated[3]; tree_axis_angle(rotated, tangent, binormal, jr); v3_normalize(rotated, rotated);
            v3_copy(tangent, rotated);
        }

        number top[3], bot[3];
        v3_scale(top, binormal, props->twigScale * 2.0f - b->length); v3_add(top, b->head, top);
        v3_scale(bot, binormal, -b->length); v3_add(bot, b->head, bot);

        number half_width = props->twigScale; // 1:1 default ratio
        // twigCards cards per twig, all containing the branch axis and spread evenly around it (a star seen along the axis):
        // from any direction one of them is close to face-on, and together they read as a clump with depth, not a card
        for (uint32_t ci = 0; ci < cards; ci++) {
            number ct[3];
            if (ci == 0) v3_copy(ct, tangent);
            else { tree_axis_angle(ct, tangent, binormal, (number)ci * 3.14159265f / (number)cards); v3_normalize(ct, ct); }
            number l1[3] = { bot[0] - ct[0] * half_width, bot[1] - ct[1] * half_width, bot[2] - ct[2] * half_width };
            number r1[3] = { bot[0] + ct[0] * half_width, bot[1] + ct[1] * half_width, bot[2] + ct[2] * half_width };
            number l2[3] = { top[0] - ct[0] * half_width, top[1] - ct[1] * half_width, top[2] - ct[2] * half_width };
            number r2[3] = { top[0] + ct[0] * half_width, top[1] + ct[1] * half_width, top[2] + ct[2] * half_width };
            emit_double_quad(r2, l2, l1, r1, bark_color);
        }
    }

    return o - out_offset;
}

// ----------------------------------------------------------------------------
// public entry point
// ----------------------------------------------------------------------------

static tree_branch manual_branches[TREE_MAX_BRANCHES];
static int32_t manual_branch_count = 0;

WASM_EXPORT void tree_skeleton_begin() {
    manual_branch_count = 0;
}

WASM_EXPORT int32_t tree_skeleton_add_branch(int32_t parent, number hx, number hy, number hz, number radius, number length, uint32_t type) {
    if (manual_branch_count >= TREE_MAX_BRANCHES) {
        if (!tree_branch_overflow_warned) {
            print("tree_system: TREE_MAX_BRANCHES exceeded in manual skeleton");
            tree_branch_overflow_warned = true;
        }
        return -1;
    }
    int32_t bi = manual_branch_count++;
    tree_branch* b = &manual_branches[bi];
    b->parent = parent;
    b->head[0] = hx;
    b->head[1] = hy;
    b->head[2] = hz;
    b->tangent[0] = 0; b->tangent[1] = 0; b->tangent[2] = 0;
    b->child0 = -1;
    b->child1 = -1;
    b->type = type;
    b->length = length;
    b->radius = radius;
    b->end_index = -1;
    return bi;
}

WASM_EXPORT void tree_skeleton_set_children(int32_t bi, int32_t child0, int32_t child1) {
    if (bi >= 0 && bi < manual_branch_count) {
        manual_branches[bi].child0 = child0;
        manual_branches[bi].child1 = child1;
    }
}

WASM_EXPORT uint32_t tree_skeleton_generate(
    tree_props* props,
    number* out_positions,
    number* out_normals,
    number* out_uvs,
    number* out_colors,
    uint32_t max_verts,
    uint32_t* out_trunk_vert_count
) {
    tree_props_clamp(props);

    if (manual_branch_count == 0) {
        if (out_trunk_vert_count) *out_trunk_vert_count = 0;
        return 0;
    }

    uint32_t trunk_count = tree_build_trunk(props, manual_branches, manual_branch_count, out_positions, out_normals, out_uvs, out_colors, max_verts);
    if (out_trunk_vert_count) *out_trunk_vert_count = trunk_count;
    if (trunk_count == 0) return 0;

    uint32_t twig_count = tree_build_twigs(props, manual_branches, manual_branch_count, out_positions, out_normals, out_uvs, out_colors, trunk_count, max_verts);

    return trunk_count + twig_count;
}

WASM_EXPORT uint32_t tree_generate(
    tree_props* props,
    number* out_positions,
    number* out_normals,
    number* out_uvs,
    number* out_colors,
    uint32_t max_verts,
    uint32_t* out_trunk_vert_count
) {
    tree_props_clamp(props);

    tree_branch* branches = (tree_branch*)scratch_alloc(TREE_MAX_BRANCHES * sizeof(tree_branch));
    if (!branches) {
        print("tree_generate: branch scratch allocation failed");
        if (out_trunk_vert_count) *out_trunk_vert_count = 0;
        return 0;
    }

    int32_t branch_count = 0;
    number origin[3] = { 0.0f, props->trunkLength, 0.0f };
    int32_t root = tree_create_branch(branches, &branch_count, -1, origin);
    branches[root].length = props->initialBranchLength;
    tree_split_branch(props, branches, &branch_count, root, (int)props->levels, (int)props->treeSteps, 1, 1);

    uint32_t trunk_count = tree_build_trunk(props, branches, branch_count, out_positions, out_normals, out_uvs, out_colors, max_verts);
    if (out_trunk_vert_count) *out_trunk_vert_count = trunk_count;
    if (trunk_count == 0) return 0;

    uint32_t twig_count = tree_build_twigs(props, branches, branch_count, out_positions, out_normals, out_uvs, out_colors, trunk_count, max_verts);

    return trunk_count + twig_count;
}


#include("plant_system.cpp")