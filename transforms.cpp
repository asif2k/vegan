#define TRA_NEEDS_UPDATE 2
#define TRA_SORTED 4
#define TRA_DEAD 8
#define TRA_CAM_PROJECTION 16
#define TRA_CAM_VIEW_PROJECTION 32
#define TRA_CAM_VIEW_UPDATED 64
#define TRA_MODEL_DEAD 1
#define TRA_MAX_STACK_DEPTH 1024

// Pool capacities. #ifndef-guarded so a #define prelude can override before this
// file is #include'd, same convention physics_system.cpp uses for PHY_MAX_*.
#ifndef TRA_MAX_NODES
#define TRA_MAX_NODES 4096
#endif
#ifndef TRA_MAX_MODELS
#define TRA_MAX_MODELS 1024
#endif

// --- DATA ORIENTED POOL ARCHITECTURE (SoA) ---
// tra_node/tra_model used to be math_alloc'd arrays-of-structs, sized at runtime
// from whatever capacity tra_init(node_capacity, model_capacity) was called with
// (engine.js: wa.tra_init(1024*2, 256*2)). That made tra_init's call position
// relative to phy_create_world() load-bearing for the physics/engine wasm merge
// (see physics_system.cpp's port notes) - two dynamic allocations happening
// before `world` would have to be replicated identically on the worker side,
// which never touches transforms.cpp at all. Converting to fixed-size SoA
// columns (below), matching phy_world's bodyPos/bodyOri/etc. layout, removes
// that dependency entirely: nothing here calls math_alloc anymore, so tra_init
// can run whenever without shifting the bump allocator's high-water mark.
//
// Slot 0 in both pools is permanently reserved as the "none" sentinel (mirrors
// physics_system.cpp's PHY_BODY_NULL==0 convention, and keeps JS's existing
// `if (!m) m = wa.tra_create_model()`-style falsy checks correct) - usable
// slots are [1, capacity].
static number   tra_world_position[TRA_MAX_NODES * 3];
static number   tra_world_rotation[TRA_MAX_NODES * 4];
static number   tra_world_scale[TRA_MAX_NODES * 3];
static number   tra_position[TRA_MAX_NODES * 3];
static number   tra_rotation[TRA_MAX_NODES * 4];
static number   tra_scale[TRA_MAX_NODES * 3];
static uint32_t tra_state[TRA_MAX_NODES];
static int32_t  tra_parent_index[TRA_MAX_NODES]; // -1 = no parent (unrelated to the slot-0 sentinel above)
static int32_t  tra_free_next[TRA_MAX_NODES];    // freelist link, separate from tra_parent_index

static int32_t tra_sorted_indices[TRA_MAX_NODES];
static int32_t tra_free_head = 0;
static int32_t tra_active_count = 0;
static int32_t tra_capacity = 0;
static bool tra_hierarchy_dirty = false;

#define TN_WPOS(i)   (&tra_world_position[(i) * 3])
#define TN_WROT(i)   (&tra_world_rotation[(i) * 4])
#define TN_WSCALE(i) (&tra_world_scale[(i) * 3])
#define TN_POS(i)    (&tra_position[(i) * 3])
#define TN_ROT(i)    (&tra_rotation[(i) * 4])
#define TN_SCALE(i)  (&tra_scale[(i) * 3])
#define TN_STATE(i)  (tra_state[i])
#define TN_PARENT(i) (tra_parent_index[i])

// --- DATA ORIENTED MODEL POOL ---
static number   tra_model_matrix[TRA_MAX_MODELS * 16]; // JS builds sd/up/fw_vector + position as byte-offset views into this, same as before
static int32_t  tra_model_node[TRA_MAX_MODELS];
static int32_t  tra_model_next_free[TRA_MAX_MODELS];
static uint32_t tra_model_state[TRA_MAX_MODELS];

static int32_t tra_model_active_indices[TRA_MAX_MODELS];
static int32_t tra_model_free_head = 0;
static int32_t tra_model_active_count = 0;
static int32_t tra_model_capacity = 0;

#define TM_MAT(i)   (&tra_model_matrix[(i) * 16])
#define TM_NODE(i)  (tra_model_node[i])
#define TM_NEXT(i)  (tra_model_next_free[i])
#define TM_STATE(i) (tra_model_state[i])

struct tra_camera_node {
    int32_t node;    // index into the SoA node pool above (was tra_node*)
    int32_t control; // index into the SoA model pool above (was tra_model*)
    number target[3];
    number view_matrix[16];
    number inverse_view_matrix[16];
    number projection_matrix[16];
    number inverse_projection_matrix[16];
    number view_projection_matrix[16];
    number inverse_view_projection_matrix[16];
    number relative_view_projection_matrix[16];
    number camera_bounds[4];
    number mouse_ray[3];
    number frustum_planes[24];
    number near, far, left, right, top, bottom, fov, aspect;
    uint type;
    number control_distance;
    number abs_frustum_planes[24];
};

static int32_t tra_eval_stack[TRA_MAX_STACK_DEPTH];


// Base-pointer accessors so JS can build zero-copy Float32Array views per field
// (base + index*stride), the same pattern physics_system.cpp uses for shape/body
// fields (e.g. phy_shape_position_ptr). See transforms.js's tra_node()/tra_model().
WASM_EXPORT number* tra_get_world_position_base() { return tra_world_position; }
WASM_EXPORT number* tra_get_world_rotation_base() { return tra_world_rotation; }
WASM_EXPORT number* tra_get_world_scale_base()    { return tra_world_scale; }
WASM_EXPORT number* tra_get_position_base()       { return tra_position; }
WASM_EXPORT number* tra_get_rotation_base()       { return tra_rotation; }
WASM_EXPORT number* tra_get_scale_base()          { return tra_scale; }
WASM_EXPORT number* tra_get_model_matrix_base()   { return tra_model_matrix; }
WASM_EXPORT int32_t tra_model_get_node(int32_t mod) { return TM_NODE(mod); }

// Call this ONCE from JS to (re)initialize the node freelist. capacity is clamped
// to the compile-time TRA_MAX_NODES - 1 (slot 0 stays reserved).
WASM_EXPORT void tra_init_pool(int capacity) {
    if (capacity >= TRA_MAX_NODES) capacity = TRA_MAX_NODES - 1;
    tra_capacity = capacity;

    for (int i = 1; i < tra_capacity; i++) { tra_free_next[i] = i + 1; TN_STATE(i) = TRA_DEAD; }
    tra_free_next[tra_capacity] = 0;
    TN_STATE(tra_capacity) = TRA_DEAD;

    tra_free_head = 1;
    tra_active_count = 0;
    tra_hierarchy_dirty = false;
}

WASM_EXPORT void tra_init_model_pool(int capacity) {
    if (capacity >= TRA_MAX_MODELS) capacity = TRA_MAX_MODELS - 1;
    tra_model_capacity = capacity;

    for (int i = 1; i < tra_model_capacity; i++) { TM_NEXT(i) = i + 1; TM_STATE(i) = TRA_MODEL_DEAD; }
    TM_NEXT(tra_model_capacity) = 0;
    TM_STATE(tra_model_capacity) = TRA_MODEL_DEAD;

    tra_model_free_head = 1;
    tra_model_active_count = 0;
}

WASM_EXPORT void tra_init(int node_capacity, int model_capacity) {
    tra_init_pool(node_capacity);
    tra_init_model_pool(model_capacity);
}

WASM_EXPORT int32_t tra_create_node() {
    if (tra_free_head == 0) return 0; // Pool is full!

    int32_t index = tra_free_head;
    tra_free_head = tra_free_next[index];

    v3_set(TN_SCALE(index), 1.0f, 1.0f, 1.0f);
    v3_set(TN_WSCALE(index), 1.0f, 1.0f, 1.0f);
    q4_ident(TN_ROT(index));
    q4_ident(TN_WROT(index));
    v3_set(TN_POS(index), 0.0f, 0.0f, 0.0f);
    v3_set(TN_WPOS(index), 0.0f, 0.0f, 0.0f);

    TN_PARENT(index) = -1;
    TN_STATE(index) = TRA_NEEDS_UPDATE;

    tra_hierarchy_dirty = true;
    tra_active_count++;

    return index;
}

WASM_EXPORT int32_t tra_create_model(int32_t target_node) {
    if (tra_model_free_head == 0) return 0; // Pool full!

    int32_t index = tra_model_free_head;
    tra_model_free_head = TM_NEXT(index);

    if (target_node == 0) target_node = tra_create_node();
    TM_NODE(index) = target_node;
    TM_STATE(index) = 0; // Mark as Alive
    m4_ident(TM_MAT(index));

    tra_model_active_indices[tra_model_active_count++] = index;

    return index;
}

WASM_EXPORT void tra_remove_model(int32_t mod) {
    if (!mod || (TM_STATE(mod) & TRA_MODEL_DEAD)) return;

    TM_STATE(mod) |= TRA_MODEL_DEAD;

    TM_NEXT(mod) = tra_model_free_head;
    tra_model_free_head = mod;

    for (int i = 0; i < tra_model_active_count; i++) {
        if (tra_model_active_indices[i] == mod) {
            tra_model_active_indices[i] = tra_model_active_indices[tra_model_active_count - 1];
            tra_model_active_count--;
            break;
        }
    }
}

WASM_EXPORT tra_camera_node* tra_create_camera_node(int32_t node) {
    tra_camera_node* cam = (tra_camera_node*)math_alloc(sizeof(tra_camera_node));
    m4_ident(cam->view_matrix);
    m4_ident(cam->view_projection_matrix);
    if(node==0) node=tra_create_node();
    cam->node = node;
    return cam;
}



WASM_EXPORT tra_camera_node* tra_set_camera_ortho(tra_camera_node* cam, number near, number  far, number  aspect, number  left, number  right, number  top, number  bottom) {
    cam->type = 2;
    cam->near = near;
    cam->far = far;
    cam->aspect = aspect;
    cam->left = left;
    cam->right = right;
    cam->top = top;
    cam->bottom = bottom;
    TN_STATE(cam->node) |= TRA_CAM_PROJECTION;
    return cam;
}

WASM_EXPORT tra_camera_node* tra_set_camera_perspective(tra_camera_node* cam, number near, number  far, number  aspect, number  fov) {
    cam->type = 1;
    cam->near = near;
    cam->far = far;
    if(aspect>0.0f)  cam->aspect = aspect;
    cam->fov = fov * 0.017453292519f;
    TN_STATE(cam->node) |= TRA_CAM_PROJECTION;
    return cam;
}

WASM_EXPORT int32_t tra_set_position(int32_t node, number x, number y, number z) {
    v3_set(TN_POS(node), x, y, z);
    TN_STATE(node) |= TRA_NEEDS_UPDATE;
    return node;
}

WASM_EXPORT int32_t tra_add_position(int32_t node, number x, number y, number z) {
    TN_POS(node)[0] += x;
    TN_POS(node)[1] += y;
    TN_POS(node)[2] += z;
    TN_STATE(node) |= TRA_NEEDS_UPDATE;
    return node;
}

WASM_EXPORT int32_t tra_set_scale(int32_t node, number x, number y, number z) {
    v3_set(TN_SCALE(node), x, y, z);
    TN_STATE(node) |= TRA_NEEDS_UPDATE;
    return node;
}

WASM_EXPORT int32_t tra_set_rotation(int32_t node, number x, number y, number z, number w) {
    q4_set(TN_ROT(node), x, y, z, w);
    TN_STATE(node) |= TRA_NEEDS_UPDATE;
    return node;
}


WASM_EXPORT int32_t tra_append_eular(int32_t node, number x, number y, number z) {
    q4_from_euler(Q1,x,y,z);
    q4_mult(Q2,Q1,TN_ROT(node));
    q4_normalize(TN_ROT(node),Q2);
    TN_STATE(node) |= TRA_NEEDS_UPDATE;
    return node;
}


WASM_EXPORT int32_t tra_set_eular(int32_t node, number x, number y, number z) {
    q4_from_euler(TN_ROT(node), x, y, z);
    TN_STATE(node) |= TRA_NEEDS_UPDATE;
    return node;
}

WASM_EXPORT int32_t tra_set_parent(int32_t node, int32_t parent) {
    if (!node) return 0;

    TN_PARENT(node) = (parent == 0) ? -1 : parent;

    TN_STATE(node) |= TRA_NEEDS_UPDATE;
    tra_hierarchy_dirty = true; // Triggers a topological resort
    return node;
}

WASM_EXPORT void tra_transform_v3(int32_t node, number* dest, number* v3) {
    v3_transform_quat(dest, v3, TN_WROT(node));
    v3_add(dest, dest, TN_WPOS(node));
}

WASM_EXPORT number* tra_to_mat4(int32_t node, number* mat4) {
    m4_from_q_p_s(mat4, TN_WROT(node), TN_WPOS(node), TN_WSCALE(node));
    return mat4;
}

WASM_EXPORT void tra_camera_look_at(tra_camera_node* cam, int32_t look, number offx, number offy, number offz,number ts) {
    int32_t node = cam->node;
    v3_set(V1, offx, offy, offz);
    v3_transform_quat(V1, V1, TN_WROT(look));

    v3_add(V2, V1, TN_WPOS(look));

    TN_POS(node)[0]+=(V2[0]-TN_POS(node)[0])*ts;
    TN_POS(node)[1]+=(V2[1]-TN_POS(node)[1])*ts;
    TN_POS(node)[2]+=(V2[2]-TN_POS(node)[2])*ts;

    cam->target[0]+=(TN_WPOS(look)[0]-cam->target[0])*ts;
    cam->target[1]+=(TN_WPOS(look)[1]-cam->target[1])*ts;
    cam->target[2]+=(TN_WPOS(look)[2]-cam->target[2])*ts;

    v3_set(UP, 0.0f, 1.0f, 0.0f);

    m4_look_at(cam->view_matrix, TN_POS(node), cam->target, UP);


    TN_STATE(node) |= TRA_NEEDS_UPDATE;
    TN_STATE(node) |= TRA_CAM_VIEW_PROJECTION;
    TN_STATE(node) |= TRA_CAM_VIEW_UPDATED;
}

// Unprojects a screen-space point (mouse_x, mouse_y, in pixels, origin top-left) through the
// camera into world space and returns the normalized direction from the camera's eye through
// that point - the standard mouse-picking ray. Writes into caller-supplied `out_direction` so
// it can be reused every call (e.g. straight into phy_world_raycast) without allocating.
WASM_EXPORT void tra_get_mouse_ray_direction(tra_camera_node* cam, number* out_direction, number mouse_x, number mouse_y, number width, number height) {
    number ndc[3];
    ndc[0] = (mouse_x / width) * 2.0f - 1.0f;
    ndc[1] = -(mouse_y / height) * 2.0f + 1.0f;
    ndc[2] = 1.0f;

    number view_point[3];
    v3_transform_mat4(view_point, ndc, cam->inverse_projection_matrix);

    number world_point[3];
    v3_transform_mat4(world_point, view_point, cam->view_matrix);

    v3_sub(out_direction, world_point, TN_WPOS(cam->node));
    v3_normalize(out_direction, out_direction);
}

WASM_EXPORT void tra_camera_update_aspect(tra_camera_node* cam, number aspect) {
    cam->aspect = aspect;

    TN_STATE(cam->node) |= TRA_CAM_PROJECTION;
}

// --- FRUSTUM CULLING ---
WASM_EXPORT void tra_extract_frustum0(tra_camera_node* cam) {
    number* m = cam->view_projection_matrix;
    number* p = cam->frustum_planes;

    p[0] = m[3] + m[0]; p[1] = m[7] + m[4]; p[2] = m[11] + m[8]; p[3] = m[15] + m[12];
    p[4] = m[3] - m[0]; p[5] = m[7] - m[4]; p[6] = m[11] - m[8]; p[7] = m[15] - m[12];
    p[8] = m[3] + m[1]; p[9] = m[7] + m[5]; p[10] = m[11] + m[9]; p[11] = m[15] + m[13];
    p[12] = m[3] - m[1]; p[13] = m[7] - m[5]; p[14] = m[11] - m[9]; p[15] = m[15] - m[13];
    p[16] = m[3] + m[2]; p[17] = m[7] + m[6]; p[18] = m[11] + m[10]; p[19] = m[15] + m[14];
    p[20] = m[3] - m[2]; p[21] = m[7] - m[6]; p[22] = m[11] - m[10]; p[23] = m[15] - m[14];

    for (int i = 0; i < 6; i++) {
        number mag = wsqrt(p[i * 4] * p[i * 4] + p[i * 4 + 1] * p[i * 4 + 1] + p[i * 4 + 2] * p[i * 4 + 2]);
        p[i * 4] /= mag; p[i * 4 + 1] /= mag; p[i * 4 + 2] /= mag; p[i * 4 + 3] /= mag;
    }
}

WASM_EXPORT void tra_extract_frustum(tra_camera_node* cam) {
    number* m = cam->view_projection_matrix;
    number* p = cam->frustum_planes;
   p[0] = m[3] + m[0]; p[1] = m[7] + m[4]; p[2] = m[11] + m[8]; p[3] = m[15] + m[12];
    p[4] = m[3] - m[0]; p[5] = m[7] - m[4]; p[6] = m[11] - m[8]; p[7] = m[15] - m[12];
    p[8] = m[3] + m[1]; p[9] = m[7] + m[5]; p[10] = m[11] + m[9]; p[11] = m[15] + m[13];
    p[12] = m[3] - m[1]; p[13] = m[7] - m[5]; p[14] = m[11] - m[9]; p[15] = m[15] - m[13];
    p[16] = m[3] + m[2]; p[17] = m[7] + m[6]; p[18] = m[11] + m[10]; p[19] = m[15] + m[14];
    p[20] = m[3] - m[2]; p[21] = m[7] - m[6]; p[22] = m[11] - m[10]; p[23] = m[15] - m[14];

    // Normalize and pre-calculate absolute values for the branchless test
    number* abs_p = cam->abs_frustum_planes; // Assuming you added this to tra_camera_node
    for (int i = 0; i < 6; i++) {
        number mag = wsqrt(p[i * 4] * p[i * 4] + p[i * 4 + 1] * p[i * 4 + 1] + p[i * 4 + 2] * p[i * 4 + 2]);
        p[i * 4] /= mag; p[i * 4 + 1] /= mag; p[i * 4 + 2] /= mag; p[i * 4 + 3] /= mag;

        abs_p[i * 3 + 0] = fabsf(p[i * 4]);
        abs_p[i * 3 + 1] = fabsf(p[i * 4 + 1]);
        abs_p[i * 3 + 2] = fabsf(p[i * 4 + 2]);
    }
}

bool test_aabb_frustum_planes(number* planes, number minX, number minY, number minZ, number maxX, number maxY, number maxZ) {
    for (int i = 0; i < 6; i++) {
        number* p = &planes[i * 4];
        number px = p[0] > 0.0f ? maxX : minX;
        number py = p[1] > 0.0f ? maxY : minY;
        number pz = p[2] > 0.0f ? maxZ : minZ;

        if (p[0] * px + p[1] * py + p[2] * pz + p[3] < 0.0f) {
            return false;
        }
    }
    return true;
}


WASM_EXPORT bool test_aabb_frustum(tra_camera_node* cam, number minX, number minY, number minZ, number maxX, number maxY, number maxZ) {
    number* planes=cam->frustum_planes;
    for (int i = 0; i < 6; i++) {
        number* p = &planes[i * 4];
        number px = p[0] > 0.0f ? maxX : minX;
        number py = p[1] > 0.0f ? maxY : minY;
        number pz = p[2] > 0.0f ? maxZ : minZ;

        if (p[0] * px + p[1] * py + p[2] * pz + p[3] < 0.0f) {
            return false;
        }
    }
    return true;
}

// Branchless, unrolled AABB vs Frustum test
inline bool test_aabb_frustum_fast(const number* p, const number* abs_p, number cx, number cy, number cz, number ex, number ey, number ez) {
    // Unrolled Plane 0
    if (p[0]*cx + p[1]*cy + p[2]*cz + p[3] < -(abs_p[0]*ex + abs_p[1]*ey + abs_p[2]*ez)) return false;
    // Unrolled Plane 1
    if (p[4]*cx + p[5]*cy + p[6]*cz + p[7] < -(abs_p[3]*ex + abs_p[4]*ey + abs_p[5]*ez)) return false;
    // Unrolled Plane 2
    if (p[8]*cx + p[9]*cy + p[10]*cz + p[11] < -(abs_p[6]*ex + abs_p[7]*ey + abs_p[8]*ez)) return false;
    // Unrolled Plane 3
    if (p[12]*cx + p[13]*cy + p[14]*cz + p[15] < -(abs_p[9]*ex + abs_p[10]*ey + abs_p[11]*ez)) return false;
    // Unrolled Plane 4
    if (p[16]*cx + p[17]*cy + p[18]*cz + p[19] < -(abs_p[12]*ex + abs_p[13]*ey + abs_p[14]*ez)) return false;
    // Unrolled Plane 5
    if (p[20]*cx + p[21]*cy + p[22]*cz + p[23] < -(abs_p[15]*ex + abs_p[16]*ey + abs_p[17]*ez)) return false;

    return true;
}

WASM_EXPORT tra_camera_node* tra_process_camera(tra_camera_node* cam) {
    int32_t node = cam->node;
    if (TN_STATE(node) & TRA_CAM_PROJECTION) {
        if (cam->type == 1) {
            m4_perspective(cam->projection_matrix, cam->fov, cam->aspect, cam->near, cam->far);
        }
        else {
            m4_ortho(cam->projection_matrix, cam->left, cam->right, cam->bottom, cam->top, cam->near, cam->far);
        }
        m4_inverse(cam->inverse_projection_matrix, cam->projection_matrix);
        TN_STATE(node) |= TRA_CAM_VIEW_PROJECTION;
        cam->camera_bounds[0] = cam->near;
        cam->camera_bounds[1] = cam->far;
        cam->camera_bounds[2] = 2.0f / (wlog(cam->far + cam->near) / 0.6931471805599453f);
    }

    if (TN_STATE(node) & TRA_CAM_VIEW_PROJECTION || TN_STATE(node) & TRA_NEEDS_UPDATE) {
        // Standard View Projection

        if(!(TN_STATE(node) & TRA_CAM_VIEW_UPDATED)){
            m4_from_q_p_s(cam->view_matrix, TN_WROT(node), TN_WPOS(node), TN_WSCALE(node));
        }



        m4_inverse(cam->inverse_view_matrix, cam->view_matrix);
        m4_mult(cam->view_projection_matrix, cam->projection_matrix, cam->inverse_view_matrix);
        m4_inverse(cam->inverse_view_projection_matrix, cam->view_projection_matrix);

        // --- NEW: RELATIVE VIEW PROJECTION ---
        number rel_view[16];
        // 1. Copy the View Matrix (In your engine, inverse_view_matrix acts as the View)
        for (int i = 0; i < 16; i++) {
            rel_view[i] = cam->inverse_view_matrix[i];
        }

        // 2. Strip the camera's translation (zero out X, Y, Z positions)
        rel_view[12] = 0.0f;
        rel_view[13] = 0.0f;
        rel_view[14] = 0.0f;

        // 3. Multiply Projection by the Relative View Matrix
        m4_mult(cam->relative_view_projection_matrix, cam->projection_matrix, rel_view);
    }

    tra_extract_frustum(cam);
    return cam;
}

// --- TOPOLOGICAL SORT (O(N) Rebuild Phase) ---
static void tra_rebuild_sorted_indices() {
    int sorted_count = 0;
    // 1. Clear the sorted flags
    for (int i = 1; i <= tra_capacity; i++) {
        if (!(TN_STATE(i) & TRA_DEAD)) {
            TN_STATE(i) &= ~TRA_SORTED;
        }
    }

    // 2. O(N) Topological generation using an evaluation stack
    for (int i = 1; i <= tra_capacity; i++) {
        if ((TN_STATE(i) & TRA_DEAD) || (TN_STATE(i) & TRA_SORTED)) continue;

        int stack_ptr = 0;
        int32_t curr = i;

        // Traverse UP collecting unsorted parents
        while (curr != -1 && !(TN_STATE(curr) & TRA_SORTED)) {
            if (stack_ptr >= TRA_MAX_STACK_DEPTH) break;
            tra_eval_stack[stack_ptr++] = curr;
            curr = TN_PARENT(curr);
        }

        // Pop DOWN (Parent -> Child), guaranteeing topological order
        while (stack_ptr > 0) {
            int32_t idx = tra_eval_stack[--stack_ptr];
            tra_sorted_indices[sorted_count++] = idx;
            TN_STATE(idx) |= TRA_SORTED;
        }
    }
}


WASM_EXPORT void tra_update_begin(number dt) {

    // 1. Just-in-time Topo-Sort
    if (tra_hierarchy_dirty) {
        tra_rebuild_sorted_indices();
        tra_hierarchy_dirty = false;
    }

    number temp_vec[3];

    // 2. The Hierarchy Math Loop
    for (int i = 0; i < tra_active_count; i++) {
        int32_t node_idx = tra_sorted_indices[i];

        int32_t parent_idx = TN_PARENT(node_idx);
        if (parent_idx >= 0) {
            if (TN_STATE(parent_idx) & TRA_NEEDS_UPDATE) {
                TN_STATE(node_idx) |= TRA_NEEDS_UPDATE;
            }

            if (TN_STATE(node_idx) & TRA_NEEDS_UPDATE) {
                q4_mult(TN_WROT(node_idx), TN_WROT(parent_idx), TN_ROT(node_idx));
                v3_mul(TN_WSCALE(node_idx), TN_SCALE(node_idx), TN_WSCALE(parent_idx));
                v3_mul(temp_vec, TN_POS(node_idx), TN_WSCALE(parent_idx));
                v3_transform_quat(temp_vec, temp_vec, TN_WROT(parent_idx));
                v3_add(TN_WPOS(node_idx), temp_vec, TN_WPOS(parent_idx));
            }
        }
        else {
            if (TN_STATE(node_idx) & TRA_NEEDS_UPDATE) {
                v3_copy(TN_WPOS(node_idx), TN_POS(node_idx));
                v3_copy(TN_WSCALE(node_idx), TN_SCALE(node_idx));
                q4_copy(TN_WROT(node_idx), TN_ROT(node_idx));
            }
        }
        // DO NOT CLEAR TRA_NEEDS_UPDATE HERE ANYMORE!
    }

    // 3. NEW: The Model Matrix Loop
    // Because this array is fully packed and smaller, this is blindingly fast.
    for (int i = 0; i < tra_model_active_count; i++) {
        int32_t mod_idx = tra_model_active_indices[i];
        int32_t node_idx = TM_NODE(mod_idx);

        // Only burn CPU cycles calculating the 4x4 matrix if the transform actually moved!
        if (node_idx != 0 && (TN_STATE(node_idx) & TRA_NEEDS_UPDATE)) {
            m4_from_q_p_s(TM_MAT(mod_idx), TN_WROT(node_idx), TN_WPOS(node_idx), TN_WSCALE(node_idx));
        }
    }
}


WASM_EXPORT void tra_remove_node(int32_t node_to_delete) {
    if (node_to_delete == 0 || (TN_STATE(node_to_delete) & TRA_DEAD)) return;

    // Reparent any children to Root (scanning active nodes is extremely fast)
    for (int i = 0; i < tra_active_count; i++) {
        int32_t curr = tra_sorted_indices[i];
        if (TN_PARENT(curr) == node_to_delete) {
            TN_PARENT(curr) = -1;
            TN_STATE(curr) |= TRA_NEEDS_UPDATE;
        }
    }

    // Push back onto the free list
    TN_STATE(node_to_delete) = TRA_DEAD;
    tra_free_next[node_to_delete] = tra_free_head;
    tra_free_head = node_to_delete;

    tra_active_count--;
    tra_hierarchy_dirty = true;
}

WASM_EXPORT void tra_update_end(number dt) {
    for (int i = 0; i < tra_active_count; i++) {
        TN_STATE(tra_sorted_indices[i]) = 1;
    }
}

//============================

WASM_EXPORT tra_camera_node* tra_create_perspective_camera(number near, number  far, number  aspect, number  fov) {
    tra_camera_node* cam =tra_create_camera_node(tra_create_node());
    tra_set_camera_perspective(cam,near,  far,  aspect,  fov);
    cam->control=tra_create_model(tra_create_node());
    cam->control_distance=30.0f;
    return cam;
}
//tra_set_camera_ortho(tra_camera_node* cam, number near, number  far, number  aspect, number  left, number  right, number  top, number  bottom)

WASM_EXPORT tra_camera_node* tra_create_ortho_camera( number near, number  far, number  aspect, number  left, number  right, number  top, number  bottom) {
    tra_camera_node* cam =tra_create_camera_node(tra_create_node());
    tra_set_camera_ortho(cam,near, far, aspect, left, right, top,  bottom);
    cam->control=tra_create_model(tra_create_node());
    cam->control_distance=30.0f;
    return cam;
}
