


// Computes smooth vertex normals from raw arrays
static void geometry_calculate_normals_raw(number* vertices, number* normals, uint32_t* indices, uint32_t vCount, uint32_t iCount) {
  
// 1. Zero out all normals
    for (uint32_t i = 0; i < vCount * 3; i++) {
        normals[i] = 0.0f;
    }

    number vA[3], vB[3], vC[3], cb[3], ab[3], faceNormal[3];

    // 2. Accumulate face normals into vertices
    for (uint32_t i = 0; i < iCount; i += 3) {
        uint32_t iA = indices[i] * 3;
        uint32_t iB = indices[i + 1] * 3;
        uint32_t iC = indices[i + 2] * 3;

        
        v3_set(vA, vertices[iA], vertices[iA + 1], vertices[iA + 2]);
        v3_set(vB, vertices[iB], vertices[iB + 1], vertices[iB + 2]);
        v3_set(vC, vertices[iC], vertices[iC + 1], vertices[iC + 2]);
         //print("rdr_calculate2 %d [%d %d %i] %d",i, iA, iB, iC,iCount);
        v3_sub(cb, vC, vB);
        v3_sub(ab, vA, vB);
        v3_cross(faceNormal, cb, ab);

        normals[iA] += faceNormal[0]; normals[iA + 1] += faceNormal[1]; normals[iA + 2] += faceNormal[2];
        normals[iB] += faceNormal[0]; normals[iB + 1] += faceNormal[1]; normals[iB + 2] += faceNormal[2];
        normals[iC] += faceNormal[0]; normals[iC + 1] += faceNormal[1]; normals[iC + 2] += faceNormal[2];
        
       
    }
    
    // 3. Normalize the accumulated vectors
    for (uint32_t i = 0; i < vCount * 3; i += 3) {
        v3_normalize(&normals[i], &normals[i]);
    }
}

EXTERN void upload_geometry(uint32_t,uint32_t,uint32_t, number*, number*, number*, uint32_t*, uint32_t*);
// Like upload_geometry, but for a 2-bone-blended skinned mesh: pos0/normal0 and
// pos1/normal1 are the SAME vertex expressed in each of its 2 influencing
// bones' own canonical-local-axis frame (not world/bind space - see
// geometry_creature_sdf_body's header comment on why two full copies are
// needed rather than one shared position), paired with bone_indices/
// bone_weights (2 active influences per vertex, packed as .xy) - named without
// the "a_" prefix since a_bone_indices/a_bone_weights are reserved for the
// engine's own generic vec4 skinning attributes (see objects.js).
EXTERN void upload_geometry_skinned(uint32_t,uint32_t,uint32_t, number*, number*, number*, number*, number*, uint32_t*, uint32_t*, number*, number*);

static  uint32_t* geometry_get_wire_indices( uint32_t* data,uint32_t count){
    uint32_t* wire_indices = (uint32_t*)scratch_alloc((count*2) *4);
    int ii=0;
    int a,b,c;
    for(int i=0;i<count;i+=3){
        a = data[i];
		b = data[i + 1];
		c = data[i + 2];
        wire_indices[ii] = a;
		wire_indices[ii + 1] = b;
		wire_indices[ii + 2] = b;
		wire_indices[ii + 3] = c;
		wire_indices[ii + 4] = c;
		wire_indices[ii + 5] = a;
		ii += 6;
    }

    return wire_indices;
}
WASM_EXPORT uint32_t geometry_plane(number width, number height, uint32_t divsX, uint32_t divsY,uint32_t plane) {
    divsX = divsX < 1 ? 1 : divsX;
    divsY = divsY < 1 ? 1 : divsY;

    uint32_t vCount = (divsX + 1) * (divsY + 1);
    uint32_t iCount = divsX * divsY * 6;

    uint32_t uuid=(uint32_t)math_alloc(1);
    // 1. Allocate raw buffers
    uint32_t* indices = (uint32_t*)scratch_alloc(iCount * sizeof(uint32_t));
    number* vertices = (number*)scratch_alloc(vCount * 3 * sizeof(number));
    number* normals = (number*)scratch_alloc(vCount * 3 * sizeof(number));
    number* uvs = (number*)scratch_alloc(vCount * 2 * sizeof(number));

    number width_half = width / 2.0f;
    number height_half = height / 2.0f;
    number segment_width = width / (number)divsX;
    number segment_height = height / (number)divsY;

    uint32_t vi = 0, ii = 0;

    // 2. Generate Vertices & UVs
    for (uint32_t iy = 0; iy <= divsY; iy++) {
        number y = iy * segment_height - height_half;
        for (uint32_t ix = 0; ix <= divsX; ix++) {
            number x = ix * segment_width - width_half;

            if (plane == 1){
                vertices[(vi * 3) + 0] = x;
                vertices[(vi * 3) + 1] = y;
                vertices[(vi * 3) + 2] = 0.0f;            
            }
            else if (plane == 2){
                vertices[(vi * 3) + 0] = x;
                vertices[(vi * 3) + 2] = y;
                vertices[(vi * 3) + 1] = 0.0f;            
            }
            else if (plane == 3){
                vertices[(vi * 3) +2] = x;
                vertices[(vi * 3) + 1] = y;
                vertices[(vi * 3) + 0] = 0.0f;            
            }

            
            uvs[(vi * 2) + 0] = ( (number)ix / (number)divsX);
            uvs[(vi * 2) + 1] = 1.0f - ((number)iy / (number)divsY);
            vi++;
        }
    }

    // 3. Generate Indices
    for (uint32_t iy = 0; iy < divsY; iy++) {
        for (uint32_t ix = 0; ix < divsX; ix++) {
            uint32_t a = ix + (divsX + 1) * iy;
            uint32_t b = ix + (divsX + 1) * (iy + 1);
            uint32_t c = (ix + 1) + (divsX + 1) * (iy + 1);
            uint32_t d = (ix + 1) + (divsX + 1) * iy;

            indices[ii++] = a; indices[ii++] = b; indices[ii++] = d;
            indices[ii++] = b; indices[ii++] = c; indices[ii++] = d;
        }
    }

    // 4. Calculate Normals
    geometry_calculate_normals_raw(vertices, normals, indices, vCount, iCount);
    upload_geometry(uuid, vCount, iCount,vertices, normals,uvs, indices,geometry_get_wire_indices(indices,iCount));




    return uuid;
}


// Helper function writing directly to raw arrays
static inline void geometry_build_cube_face_raw(number* vertices, number* uvs, uint32_t* indices,
    uint32_t& vi, uint32_t& ii,
    uint32_t u, uint32_t v, uint32_t w,
    number udir, number vdir,
    number width, number height, number depth,
    uint32_t gridX, uint32_t gridY) {

    number segmentWidth = width / (number)gridX;
    number segmentHeight = height / (number)gridY;
    number widthHalf = width / 2.0f;
    number heightHalf = height / 2.0f;
    number depthHalf = depth / 2.0f;
    uint32_t gridX1 = gridX + 1, gridY1 = gridY + 1;
    uint32_t startIndex = vi;

    number vector[3];

    for (uint32_t iy = 0; iy < gridY1; iy++) {
        number py = iy * segmentHeight - heightHalf;
        for (uint32_t ix = 0; ix < gridX1; ix++) {
            number px = ix * segmentWidth - widthHalf;

            vector[u] = px * udir;
            vector[v] = py * vdir;
            vector[w] = depthHalf;

            vertices[(vi * 3) + 0] = vector[0];
            vertices[(vi * 3) + 1] = vector[1];
            vertices[(vi * 3) + 2] = vector[2];

            uvs[(vi * 2) + 0] = (number)ix / (number)gridX;
            uvs[(vi * 2) + 1] = (number)iy / (number)gridY;
            vi++;
        }
    }

    for (uint32_t iy = 0; iy < gridY; iy++) {
        for (uint32_t ix = 0; ix < gridX; ix++) {
            uint32_t a = startIndex + ix + gridX1 * iy;
            uint32_t b = startIndex + ix + gridX1 * (iy + 1);
            uint32_t c = startIndex + (ix + 1) + gridX1 * (iy + 1);
            uint32_t d = startIndex + (ix + 1) + gridX1 * iy;

            indices[ii++] = a; indices[ii++] = b; indices[ii++] = d;
            indices[ii++] = b; indices[ii++] = c; indices[ii++] = d;
        }
    }
}

WASM_EXPORT uint32_t geometry_cube(number width, number height, number depth, uint divs) {
    divs = divs < 1 ? 1 : divs;
    uint32_t vCount = (divs + 1) * (divs + 1) * 6;
    uint32_t iCount = divs * divs * 36;

    // 1. Allocate raw buffers
    uint32_t* indices = (uint32_t*)scratch_alloc(iCount * sizeof(uint32_t));
    number* vertices = (number*)scratch_alloc(vCount * 3 * sizeof(number));
    number* normals = (number*)scratch_alloc(vCount * 3 * sizeof(number));
    number* uvs = (number*)scratch_alloc(vCount * 2 * sizeof(number));

    uint32_t vi = 0, ii = 0;
    uint32_t uuid=(uint32_t)math_alloc(1);
    // 2. Generate Vertices, UVs, and Indices
    geometry_build_cube_face_raw(vertices, uvs, indices, vi, ii, 2, 1, 0, -1.0f, -1.0f, depth, height, width, divs, divs); // px
    geometry_build_cube_face_raw(vertices, uvs, indices, vi, ii, 2, 1, 0, 1.0f, -1.0f, depth, height, -width, divs, divs); // nx
    geometry_build_cube_face_raw(vertices, uvs, indices, vi, ii, 0, 2, 1, 1.0f, 1.0f, width, depth, height, divs, divs); // py
    geometry_build_cube_face_raw(vertices, uvs, indices, vi, ii, 0, 2, 1, 1.0f, -1.0f, width, depth, -height, divs, divs); // ny
    geometry_build_cube_face_raw(vertices, uvs, indices, vi, ii, 0, 1, 2, 1.0f, -1.0f, width, height, depth, divs, divs); // pz
    geometry_build_cube_face_raw(vertices, uvs, indices, vi, ii, 0, 1, 2, -1.0f, -1.0f, width, height, -depth, divs, divs); // nz

    // 3. Calculate Normals
    geometry_calculate_normals_raw(vertices, normals, indices, vCount, iCount);

    upload_geometry(uuid, vCount, iCount,vertices, normals,uvs, indices,geometry_get_wire_indices(indices,iCount));

    return uuid;
}


WASM_EXPORT uint32_t geometry_cube_offset(number width, number height, number depth, uint divs, number offset_x, number offset_y, number offset_z) {
    divs = divs < 1 ? 1 : divs;
    uint32_t vCount = (divs + 1) * (divs + 1) * 6;
    uint32_t iCount = divs * divs * 36;

    uint32_t uuid = (uint32_t)math_alloc(1);
    // 1. Allocate raw buffers
    uint32_t* indices = (uint32_t*)scratch_alloc(iCount * sizeof(uint32_t));
    number* vertices = (number*)scratch_alloc(vCount * 3 * sizeof(number));
    number* normals = (number*)scratch_alloc(vCount * 3 * sizeof(number));
    number* uvs = (number*)scratch_alloc(vCount * 2 * sizeof(number));

    uint32_t vi = 0, ii = 0;

    // 2. Generate Vertices, UVs, and Indices (Centered initially)
    geometry_build_cube_face_raw(vertices, uvs, indices, vi, ii, 2, 1, 0, -1.0f, -1.0f, depth, height, width, divs, divs); // px
    geometry_build_cube_face_raw(vertices, uvs, indices, vi, ii, 2, 1, 0, 1.0f, -1.0f, depth, height, -width, divs, divs); // nx
    geometry_build_cube_face_raw(vertices, uvs, indices, vi, ii, 0, 2, 1, 1.0f, 1.0f, width, depth, height, divs, divs); // py
    geometry_build_cube_face_raw(vertices, uvs, indices, vi, ii, 0, 2, 1, 1.0f, -1.0f, width, depth, -height, divs, divs); // ny
    geometry_build_cube_face_raw(vertices, uvs, indices, vi, ii, 0, 1, 2, 1.0f, -1.0f, width, height, depth, divs, divs); // pz
    geometry_build_cube_face_raw(vertices, uvs, indices, vi, ii, 0, 1, 2, -1.0f, -1.0f, width, height, -depth, divs, divs); // nz

    // 3. Apply the Offsets / Pivot translation
    for (uint32_t i = 0; i < vCount; i++) {
        vertices[i * 3 + 0] += offset_x;
        vertices[i * 3 + 1] += offset_y;
        vertices[i * 3 + 2] += offset_z;
    }

    // 3. Calculate Normals
    geometry_calculate_normals_raw(vertices, normals, indices, vCount, iCount);

    upload_geometry(uuid, vCount, iCount, vertices, normals, uvs, indices, geometry_get_wire_indices(indices, iCount));

    return uuid;
}


// Same as geometry_cube_offset, but each axis gets its own division count
// instead of a single divs shared by all faces. Each face pairs the two
// divisions matching the axes it spans (e.g. the +/-X faces span Z and Y).
WASM_EXPORT uint32_t geometry_cube_offset_divs(number width, number height, number depth, uint divsX, uint divsY, uint divsZ, number offset_x, number offset_y, number offset_z) {
    divsX = divsX < 1 ? 1 : divsX;
    divsY = divsY < 1 ? 1 : divsY;
    divsZ = divsZ < 1 ? 1 : divsZ;

    uint32_t vCount = (divsZ + 1) * (divsY + 1) * 2 + (divsX + 1) * (divsZ + 1) * 2 + (divsX + 1) * (divsY + 1) * 2;
    uint32_t iCount = divsZ * divsY * 36 + divsX * divsZ * 36 + divsX * divsY * 36;

    uint32_t uuid = (uint32_t)math_alloc(1);
    // 1. Allocate raw buffers
    uint32_t* indices = (uint32_t*)scratch_alloc(iCount * sizeof(uint32_t));
    number* vertices = (number*)scratch_alloc(vCount * 3 * sizeof(number));
    number* normals = (number*)scratch_alloc(vCount * 3 * sizeof(number));
    number* uvs = (number*)scratch_alloc(vCount * 2 * sizeof(number));

    uint32_t vi = 0, ii = 0;

    // 2. Generate Vertices, UVs, and Indices (Centered initially)
    geometry_build_cube_face_raw(vertices, uvs, indices, vi, ii, 2, 1, 0, -1.0f, -1.0f, depth, height, width, divsZ, divsY); // px
    geometry_build_cube_face_raw(vertices, uvs, indices, vi, ii, 2, 1, 0, 1.0f, -1.0f, depth, height, -width, divsZ, divsY); // nx
    geometry_build_cube_face_raw(vertices, uvs, indices, vi, ii, 0, 2, 1, 1.0f, 1.0f, width, depth, height, divsX, divsZ); // py
    geometry_build_cube_face_raw(vertices, uvs, indices, vi, ii, 0, 2, 1, 1.0f, -1.0f, width, depth, -height, divsX, divsZ); // ny
    geometry_build_cube_face_raw(vertices, uvs, indices, vi, ii, 0, 1, 2, 1.0f, -1.0f, width, height, depth, divsX, divsY); // pz
    geometry_build_cube_face_raw(vertices, uvs, indices, vi, ii, 0, 1, 2, -1.0f, -1.0f, width, height, -depth, divsX, divsY); // nz

    // 3. Apply the Offsets / Pivot translation
    for (uint32_t i = 0; i < vCount; i++) {
        vertices[i * 3 + 0] += offset_x;
        vertices[i * 3 + 1] += offset_y;
        vertices[i * 3 + 2] += offset_z;
    }

    // 4. Calculate Normals
    geometry_calculate_normals_raw(vertices, normals, indices, vCount, iCount);

    upload_geometry(uuid, vCount, iCount, vertices, normals, uvs, indices, geometry_get_wire_indices(indices, iCount));

    return uuid;
}


// Builds one face of a "cube-sphere" (quadrilateralized sphere): a flat grid in
// [-1,1] local face space, tangent-warped (px = tan(px * pi/4)) before being
// normalized onto the unit sphere. The warp is what keeps quads roughly equal
// size across a face - a naive normalize-only cube->sphere projection bunches
// quads tightly near the cube's corners and stretches them near face centers.
// u/v/w select which of the 3 output axes the face's local x/y/depth map to
// (same convention as geometry_build_cube_face_raw), udir/vdir flip winding to
// keep triangles front-facing outward, wdir is the fixed +1/-1 side of the w axis.
static inline void geometry_build_cube_sphere_face_raw(number* vertices, number* normals, number* uvs, uint32_t* indices,
    uint32_t& vi, uint32_t& ii,
    uint32_t u, uint32_t v, uint32_t w,
    number udir, number vdir, number wdir,
    number radius, uint32_t gridX, uint32_t gridY) {

    uint32_t gridX1 = gridX + 1, gridY1 = gridY + 1;
    uint32_t startIndex = vi;
    number vector[3];

    for (uint32_t iy = 0; iy < gridY1; iy++) {
        number py = ((number)iy / (number)gridY) * 2.0f - 1.0f; // -1..1 across the face
        for (uint32_t ix = 0; ix < gridX1; ix++) {
            number px = ((number)ix / (number)gridX) * 2.0f - 1.0f; // -1..1 across the face

            number wx = wtan(px * (M_PI_F / 4.0f));
            number wy = wtan(py * (M_PI_F / 4.0f));

            vector[u] = wx * udir;
            vector[v] = wy * vdir;
            vector[w] = wdir;

            v3_normalize(vector, vector);

            vertices[(vi * 3) + 0] = vector[0] * radius;
            vertices[(vi * 3) + 1] = vector[1] * radius;
            vertices[(vi * 3) + 2] = vector[2] * radius;

            // Exact analytic normal - no need for face-normal accumulation, a
            // point on a sphere's normal is just its direction from the center.
            normals[(vi * 3) + 0] = vector[0];
            normals[(vi * 3) + 1] = vector[1];
            normals[(vi * 3) + 2] = vector[2];

            uvs[(vi * 2) + 0] = (number)ix / (number)gridX;
            uvs[(vi * 2) + 1] = (number)iy / (number)gridY;
            vi++;
        }
    }

    for (uint32_t iy = 0; iy < gridY; iy++) {
        for (uint32_t ix = 0; ix < gridX; ix++) {
            uint32_t a = startIndex + ix + gridX1 * iy;
            uint32_t b = startIndex + ix + gridX1 * (iy + 1);
            uint32_t c = startIndex + (ix + 1) + gridX1 * (iy + 1);
            uint32_t d = startIndex + (ix + 1) + gridX1 * iy;

            indices[ii++] = a; indices[ii++] = b; indices[ii++] = d;
            indices[ii++] = b; indices[ii++] = c; indices[ii++] = d;
        }
    }
}

// A sphere built by subdividing a cube's 6 faces into an equal-sized grid and
// warping each face onto the unit sphere (see geometry_build_cube_sphere_face_raw).
// Unlike geometry_sphere's lat/long grid, every quad here covers roughly the same
// area and there are no pinched poles - each of the 6 faces is an equal-size
// (divs x divs) grid, useful as a base for per-face picking/extrusion later.
WASM_EXPORT uint32_t geometry_cube_sphere(number radius, uint divs) {
    divs = divs < 1 ? 1 : divs;
    uint32_t vCount = (divs + 1) * (divs + 1) * 6;
    uint32_t iCount = divs * divs * 36;

    uint32_t uuid = (uint32_t)math_alloc(1);
    uint32_t* indices = (uint32_t*)scratch_alloc(iCount * sizeof(uint32_t));
    number* vertices = (number*)scratch_alloc(vCount * 3 * sizeof(number));
    number* normals = (number*)scratch_alloc(vCount * 3 * sizeof(number));
    number* uvs = (number*)scratch_alloc(vCount * 2 * sizeof(number));

    uint32_t vi = 0, ii = 0;

    geometry_build_cube_sphere_face_raw(vertices, normals, uvs, indices, vi, ii, 2, 1, 0, -1.0f, -1.0f,  1.0f, radius, divs, divs); // +x
    geometry_build_cube_sphere_face_raw(vertices, normals, uvs, indices, vi, ii, 2, 1, 0,  1.0f, -1.0f, -1.0f, radius, divs, divs); // -x
    geometry_build_cube_sphere_face_raw(vertices, normals, uvs, indices, vi, ii, 0, 2, 1,  1.0f,  1.0f,  1.0f, radius, divs, divs); // +y
    geometry_build_cube_sphere_face_raw(vertices, normals, uvs, indices, vi, ii, 0, 2, 1,  1.0f, -1.0f, -1.0f, radius, divs, divs); // -y
    geometry_build_cube_sphere_face_raw(vertices, normals, uvs, indices, vi, ii, 0, 1, 2,  1.0f, -1.0f,  1.0f, radius, divs, divs); // +z
    geometry_build_cube_sphere_face_raw(vertices, normals, uvs, indices, vi, ii, 0, 1, 2, -1.0f, -1.0f, -1.0f, radius, divs, divs); // -z

    upload_geometry(uuid, vCount, iCount, vertices, normals, uvs, indices, geometry_get_wire_indices(indices, iCount));

    return uuid;
}


// Shared by both cube-sphere face builders: maps one (px,py) point in a face's
// local [-1,1] space onto the unit sphere and returns its direction (== normal,
// since it's a sphere). See geometry_build_cube_sphere_face_raw for the axis
// convention (u/v/w/udir/vdir/wdir).
static inline void geometry_cube_sphere_point(
    uint32_t u, uint32_t v, uint32_t w,
    number udir, number vdir, number wdir,
    number px, number py,
    number* out_dir) {

    number wx = wtan(px * (M_PI_F / 4.0f));
    number wy = wtan(py * (M_PI_F / 4.0f));

    out_dir[u] = wx * udir;
    out_dir[v] = wy * vdir;
    out_dir[w] = wdir;

    v3_normalize(out_dir, out_dir);
}

static inline void geometry_cube_sphere_emit(number* vertices, number* normals, number* uvs, uint32_t& vi,
    const number* dir, number radius, number u, number v) {

    vertices[(vi * 3) + 0] = dir[0] * radius;
    vertices[(vi * 3) + 1] = dir[1] * radius;
    vertices[(vi * 3) + 2] = dir[2] * radius;

    normals[(vi * 3) + 0] = dir[0];
    normals[(vi * 3) + 1] = dir[1];
    normals[(vi * 3) + 2] = dir[2];

    uvs[(vi * 2) + 0] = u;
    uvs[(vi * 2) + 1] = v;
    vi++;
}

// Same face layout as geometry_build_cube_sphere_face_raw, but every quad gets
// its own 6 unique vertices (2 triangles, no shared corners with neighboring
// quads) instead of an indexed shared grid. That's the point of this variant:
// a quad's 6 vertices can later be pulled out along its normal (extrude) without
// dragging its neighbors' edges with it, which a welded/indexed mesh can't do.
static inline void geometry_build_cube_sphere_face_unindexed_raw(number* vertices, number* normals, number* uvs,
    uint32_t& vi,
    uint32_t u, uint32_t v, uint32_t w,
    number udir, number vdir, number wdir,
    number radius, uint32_t gridX, uint32_t gridY) {

    number a[3], b[3], c[3], d[3];

    for (uint32_t iy = 0; iy < gridY; iy++) {
        number py0 = ((number)iy       / (number)gridY) * 2.0f - 1.0f;
        number py1 = ((number)(iy + 1) / (number)gridY) * 2.0f - 1.0f;
        number v0 = (number)iy       / (number)gridY;
        number v1 = (number)(iy + 1) / (number)gridY;

        for (uint32_t ix = 0; ix < gridX; ix++) {
            number px0 = ((number)ix       / (number)gridX) * 2.0f - 1.0f;
            number px1 = ((number)(ix + 1) / (number)gridX) * 2.0f - 1.0f;
            number u0 = (number)ix       / (number)gridX;
            number u1 = (number)(ix + 1) / (number)gridX;

            // Quad corners, same a/b/c/d layout geometry_build_cube_face_raw's
            // index generation uses: a=(ix,iy) b=(ix,iy+1) c=(ix+1,iy+1) d=(ix+1,iy)
            geometry_cube_sphere_point(u, v, w, udir, vdir, wdir, px0, py0, a);
            geometry_cube_sphere_point(u, v, w, udir, vdir, wdir, px0, py1, b);
            geometry_cube_sphere_point(u, v, w, udir, vdir, wdir, px1, py1, c);
            geometry_cube_sphere_point(u, v, w, udir, vdir, wdir, px1, py0, d);

            // Two triangles: a,b,d and b,c,d (matches the indexed version's winding)
            geometry_cube_sphere_emit(vertices, normals, uvs, vi, a, radius, u0, v0);
            geometry_cube_sphere_emit(vertices, normals, uvs, vi, b, radius, u0, v1);
            geometry_cube_sphere_emit(vertices, normals, uvs, vi, d, radius, u1, v0);

            geometry_cube_sphere_emit(vertices, normals, uvs, vi, b, radius, u0, v1);
            geometry_cube_sphere_emit(vertices, normals, uvs, vi, c, radius, u1, v1);
            geometry_cube_sphere_emit(vertices, normals, uvs, vi, d, radius, u1, v0);
        }
    }
}

// Unindexed twin of geometry_cube_sphere: each of the 6*divs*divs quads gets 6
// standalone vertices with no reuse across quads, so picking/extruding one quad
// never touches its neighbors. Costs more GPU memory per visible triangle than
// the indexed version - fine for the divs counts an editable planet/rock/etc.
// mesh needs, not meant for huge subdivisions.
WASM_EXPORT uint32_t geometry_cube_sphere_unindexed(number radius, uint divs) {
    divs = divs < 1 ? 1 : divs;
    uint32_t vCount = divs * divs * 6 * 6; // 6 faces * divs*divs quads * 6 verts/quad

    uint32_t uuid = (uint32_t)math_alloc(1);
    number* vertices = (number*)scratch_alloc(vCount * 3 * sizeof(number));
    number* normals = (number*)scratch_alloc(vCount * 3 * sizeof(number));
    number* uvs = (number*)scratch_alloc(vCount * 2 * sizeof(number));

    uint32_t vi = 0;

    geometry_build_cube_sphere_face_unindexed_raw(vertices, normals, uvs, vi, 2, 1, 0, -1.0f, -1.0f,  1.0f, radius, divs, divs); // +x
    geometry_build_cube_sphere_face_unindexed_raw(vertices, normals, uvs, vi, 2, 1, 0,  1.0f, -1.0f, -1.0f, radius, divs, divs); // -x
    geometry_build_cube_sphere_face_unindexed_raw(vertices, normals, uvs, vi, 0, 2, 1,  1.0f,  1.0f,  1.0f, radius, divs, divs); // +y
    geometry_build_cube_sphere_face_unindexed_raw(vertices, normals, uvs, vi, 0, 2, 1,  1.0f, -1.0f, -1.0f, radius, divs, divs); // -y
    geometry_build_cube_sphere_face_unindexed_raw(vertices, normals, uvs, vi, 0, 1, 2,  1.0f, -1.0f,  1.0f, radius, divs, divs); // +z
    geometry_build_cube_sphere_face_unindexed_raw(vertices, normals, uvs, vi, 0, 1, 2, -1.0f, -1.0f, -1.0f, radius, divs, divs); // -z

    upload_geometry(uuid, vCount, 0, vertices, normals, uvs, 0, 0);

    return uuid;
}


// Builds one face of a "cube-cylinder": same 6-face cube grid as
// geometry_build_cube_sphere_face_raw, but only the horizontal (x/z) pair of
// each point is warped - axis 1 (y, height) is always left as a plain linear
// -1..1 span, scaled by height/2. Which raw axis w (the face's fixed axis) is
// tells us what kind of face this is:
//   - w == 1 (the +y/-y faces): height is FIXED here, and both grid axes (x,z)
//     are free - so this is a CAP: the flat square face is warped into a
//     filled disc (every interior point spreads across the disc, not just its
//     rim) via the elliptical grid mapping.
//   - w == 0 or 2 (the four side faces): height is one of the free grid axes,
//     and x/z has exactly one axis fixed at +-1 - normalizing that (x,z) pair
//     to unit length (same tangent pre-warp geometry_cube_sphere uses, just
//     in 2D) always lands exactly on the tube's circular cross-section,
//     independent of height.
static inline void geometry_build_cube_cylinder_face_raw(number* vertices, number* uvs, uint32_t* indices,
    uint32_t& vi, uint32_t& ii,
    uint32_t u, uint32_t v, uint32_t w,
    number udir, number vdir, number wdir,
    number radius, number height, uint32_t gridX, uint32_t gridY) {

    uint32_t gridX1 = gridX + 1, gridY1 = gridY + 1;
    uint32_t startIndex = vi;
    number heightHalf = height / 2.0f;
    bool is_cap = (w == 1);
    number vector[3];

    for (uint32_t iy = 0; iy < gridY1; iy++) {
        number py = ((number)iy / (number)gridY) * 2.0f - 1.0f; // -1..1 across the face
        for (uint32_t ix = 0; ix < gridX1; ix++) {
            number px = ((number)ix / (number)gridX) * 2.0f - 1.0f; // -1..1 across the face

            vector[u] = px * udir;
            vector[v] = py * vdir;
            vector[w] = wdir;

            number x = vector[0], z = vector[2];
            number out_x, out_z;

            if (is_cap) {
                // Elliptical grid mapping (square -> disc): fills the whole
                // disc instead of pushing every point out to its rim.
                out_x = x * wsqrt(wmaxf(0.0f, 1.0f - (z * z) * 0.5f));
                out_z = z * wsqrt(wmaxf(0.0f, 1.0f - (x * x) * 0.5f));
            } else {
                number wx = wtan(x * (M_PI_F / 4.0f));
                number wz = wtan(z * (M_PI_F / 4.0f));
                number wlen = wsqrt(wx * wx + wz * wz);
                if (wlen > 0.0001f) { wx /= wlen; wz /= wlen; }
                out_x = wx; out_z = wz;
            }

            vertices[(vi * 3) + 0] = out_x * radius;
            vertices[(vi * 3) + 1] = vector[1] * heightHalf;
            vertices[(vi * 3) + 2] = out_z * radius;

            uvs[(vi * 2) + 0] = (number)ix / (number)gridX;
            uvs[(vi * 2) + 1] = (number)iy / (number)gridY;
            vi++;
        }
    }

    for (uint32_t iy = 0; iy < gridY; iy++) {
        for (uint32_t ix = 0; ix < gridX; ix++) {
            uint32_t a = startIndex + ix + gridX1 * iy;
            uint32_t b = startIndex + ix + gridX1 * (iy + 1);
            uint32_t c = startIndex + (ix + 1) + gridX1 * (iy + 1);
            uint32_t d = startIndex + (ix + 1) + gridX1 * iy;

            indices[ii++] = a; indices[ii++] = b; indices[ii++] = d;
            indices[ii++] = b; indices[ii++] = c; indices[ii++] = d;
        }
    }
}

// A cylinder built the same way geometry_cube_sphere builds a sphere: subdivide
// a cube's 6 faces into an equal-sized grid, but warp only the horizontal
// plane onto a circle (see geometry_build_cube_cylinder_face_raw) instead of
// the full 3D warp-and-normalize a sphere needs. The two +-y faces become flat
// disc caps and the four side faces become the round wall, with a hard
// (unwelded, faceted) rim edge between them - exactly what a real cylinder's
// topology wants. Normals come from face-normal accumulation (like plain
// geometry_cube), not an analytic formula, since caps and wall need different
// normal behavior (flat vs radial) and this gets both for free.
WASM_EXPORT uint32_t geometry_cube_cylinder(number radius, number height, uint divs) {
    divs = divs < 1 ? 1 : divs;
    uint32_t vCount = (divs + 1) * (divs + 1) * 6;
    uint32_t iCount = divs * divs * 36;

    uint32_t uuid = (uint32_t)math_alloc(1);
    uint32_t* indices = (uint32_t*)scratch_alloc(iCount * sizeof(uint32_t));
    number* vertices = (number*)scratch_alloc(vCount * 3 * sizeof(number));
    number* normals = (number*)scratch_alloc(vCount * 3 * sizeof(number));
    number* uvs = (number*)scratch_alloc(vCount * 2 * sizeof(number));

    uint32_t vi = 0, ii = 0;

    geometry_build_cube_cylinder_face_raw(vertices, uvs, indices, vi, ii, 2, 1, 0, -1.0f, -1.0f,  1.0f, radius, height, divs, divs); // +x
    geometry_build_cube_cylinder_face_raw(vertices, uvs, indices, vi, ii, 2, 1, 0,  1.0f, -1.0f, -1.0f, radius, height, divs, divs); // -x
    geometry_build_cube_cylinder_face_raw(vertices, uvs, indices, vi, ii, 0, 2, 1,  1.0f,  1.0f,  1.0f, radius, height, divs, divs); // +y (top cap)
    geometry_build_cube_cylinder_face_raw(vertices, uvs, indices, vi, ii, 0, 2, 1,  1.0f, -1.0f, -1.0f, radius, height, divs, divs); // -y (bottom cap)
    geometry_build_cube_cylinder_face_raw(vertices, uvs, indices, vi, ii, 0, 1, 2,  1.0f, -1.0f,  1.0f, radius, height, divs, divs); // +z
    geometry_build_cube_cylinder_face_raw(vertices, uvs, indices, vi, ii, 0, 1, 2, -1.0f, -1.0f, -1.0f, radius, height, divs, divs); // -z

    geometry_calculate_normals_raw(vertices, normals, indices, vCount, iCount);

    upload_geometry(uuid, vCount, iCount, vertices, normals, uvs, indices, geometry_get_wire_indices(indices, iCount));

    return uuid;
}


// Builds one face of a "cube-capsule". Side faces are an unchanged straight
// cylindrical wall (see geometry_build_cube_cylinder_face_raw) - constant
// radius, height passed straight through. The +-y faces become hemispherical
// domes instead of flat discs: each point of the same square->disc mapping
// geometry_build_cube_cylinder_face_raw's caps use is lifted along Y by
// sqrt(1 - x^2 - z^2) before scaling by radius - the standard disc->hemisphere
// projection, which lands every lifted point exactly on a sphere of `radius`.
// A disc's rim (x^2+z^2 == 1) always lifts by exactly 0, so the dome's own rim
// lands exactly on the wall's top/bottom edge (radius, y = +-height/2) with a
// matching normal too (both analytic here, unlike cube_cylinder's accumulated
// ones) - the two independently-built pieces meet with no visible seam despite
// sharing no actual vertices, and the dome tip sits at the correct radius
// above/below the wall's end.
static inline void geometry_build_cube_capsule_face_raw(number* vertices, number* normals, number* uvs, uint32_t* indices,
    uint32_t& vi, uint32_t& ii,
    uint32_t u, uint32_t v, uint32_t w,
    number udir, number vdir, number wdir,
    number radius, number height, uint32_t gridX, uint32_t gridY) {

    uint32_t gridX1 = gridX + 1, gridY1 = gridY + 1;
    uint32_t startIndex = vi;
    number heightHalf = height / 2.0f;
    bool is_cap = (w == 1);
    number vector[3];

    for (uint32_t iy = 0; iy < gridY1; iy++) {
        number py = ((number)iy / (number)gridY) * 2.0f - 1.0f; // -1..1 across the face
        for (uint32_t ix = 0; ix < gridX1; ix++) {
            number px = ((number)ix / (number)gridX) * 2.0f - 1.0f; // -1..1 across the face

            vector[u] = px * udir;
            vector[v] = py * vdir;
            vector[w] = wdir;

            number x = vector[0], z = vector[2];
            number out_x, out_y, out_z, n_x, n_y, n_z;

            if (is_cap) {
                number ex = x * wsqrt(wmaxf(0.0f, 1.0f - (z * z) * 0.5f));
                number ez = z * wsqrt(wmaxf(0.0f, 1.0f - (x * x) * 0.5f));
                number ey = wsqrt(wmaxf(0.0f, 1.0f - ex * ex - ez * ez));
                if (vector[1] < 0.0f) ey = -ey; // bottom dome curves downward

                n_x = ex; n_y = ey; n_z = ez; // already unit length - it's a point on the unit sphere
                out_x = ex * radius;
                out_y = ey * radius + vector[1] * heightHalf; // vector[1] is the fixed +-1 face side here
                out_z = ez * radius;
            } else {
                number wx = wtan(x * (M_PI_F / 4.0f));
                number wz = wtan(z * (M_PI_F / 4.0f));
                number wlen = wsqrt(wx * wx + wz * wz);
                if (wlen > 0.0001f) { wx /= wlen; wz /= wlen; }

                n_x = wx; n_y = 0.0f; n_z = wz;
                out_x = wx * radius;
                out_y = vector[1] * heightHalf;
                out_z = wz * radius;
            }

            vertices[(vi * 3) + 0] = out_x;
            vertices[(vi * 3) + 1] = out_y;
            vertices[(vi * 3) + 2] = out_z;

            normals[(vi * 3) + 0] = n_x;
            normals[(vi * 3) + 1] = n_y;
            normals[(vi * 3) + 2] = n_z;

            uvs[(vi * 2) + 0] = (number)ix / (number)gridX;
            uvs[(vi * 2) + 1] = (number)iy / (number)gridY;
            vi++;
        }
    }

    for (uint32_t iy = 0; iy < gridY; iy++) {
        for (uint32_t ix = 0; ix < gridX; ix++) {
            uint32_t a = startIndex + ix + gridX1 * iy;
            uint32_t b = startIndex + ix + gridX1 * (iy + 1);
            uint32_t c = startIndex + (ix + 1) + gridX1 * (iy + 1);
            uint32_t d = startIndex + (ix + 1) + gridX1 * iy;

            indices[ii++] = a; indices[ii++] = b; indices[ii++] = d;
            indices[ii++] = b; indices[ii++] = c; indices[ii++] = d;
        }
    }
}

// A capsule built the same way geometry_cube_cylinder builds a cylinder - same
// 6-face cube grid, same axis wiring - except the +-y faces dome outward
// instead of staying flat (see geometry_build_cube_capsule_face_raw). `height`
// is the straight section's length between the two dome centers (matches
// geometry_capsule's convention) - the capsule's total tip-to-tip length is
// height + 2*radius. Normals are fully analytic (no face-normal accumulation
// needed, unlike geometry_cube_cylinder), since every vertex here already has
// a simple closed-form normal (radial for the wall, sphere-direction for the
// domes).
WASM_EXPORT uint32_t geometry_cube_capsule(number radius, number height, uint divs) {
    divs = divs < 1 ? 1 : divs;
    uint32_t vCount = (divs + 1) * (divs + 1) * 6;
    uint32_t iCount = divs * divs * 36;

    uint32_t uuid = (uint32_t)math_alloc(1);
    uint32_t* indices = (uint32_t*)scratch_alloc(iCount * sizeof(uint32_t));
    number* vertices = (number*)scratch_alloc(vCount * 3 * sizeof(number));
    number* normals = (number*)scratch_alloc(vCount * 3 * sizeof(number));
    number* uvs = (number*)scratch_alloc(vCount * 2 * sizeof(number));

    uint32_t vi = 0, ii = 0;

    geometry_build_cube_capsule_face_raw(vertices, normals, uvs, indices, vi, ii, 2, 1, 0, -1.0f, -1.0f,  1.0f, radius, height, divs, divs); // +x
    geometry_build_cube_capsule_face_raw(vertices, normals, uvs, indices, vi, ii, 2, 1, 0,  1.0f, -1.0f, -1.0f, radius, height, divs, divs); // -x
    geometry_build_cube_capsule_face_raw(vertices, normals, uvs, indices, vi, ii, 0, 2, 1,  1.0f,  1.0f,  1.0f, radius, height, divs, divs); // +y (top dome)
    geometry_build_cube_capsule_face_raw(vertices, normals, uvs, indices, vi, ii, 0, 2, 1,  1.0f, -1.0f, -1.0f, radius, height, divs, divs); // -y (bottom dome)
    geometry_build_cube_capsule_face_raw(vertices, normals, uvs, indices, vi, ii, 0, 1, 2,  1.0f, -1.0f,  1.0f, radius, height, divs, divs); // +z
    geometry_build_cube_capsule_face_raw(vertices, normals, uvs, indices, vi, ii, 0, 1, 2, -1.0f, -1.0f, -1.0f, radius, height, divs, divs); // -z

    upload_geometry(uuid, vCount, iCount, vertices, normals, uvs, indices, geometry_get_wire_indices(indices, iCount));

    return uuid;
}


WASM_EXPORT uint32_t geometry_sphere(number rad, uint divsX, uint divsY) {
    divsX = divsX < 3 ? 3 : divsX;
    divsY = divsY < 2 ? 2 : divsY;

    uint32_t vCount = (divsX + 1) * (divsY + 1);
    uint32_t iCount = divsX * divsY * 6;
    uint32_t uuid=(uint32_t)math_alloc(1);
    // 1. Allocate raw buffers
    uint32_t* indices = (uint32_t*)scratch_alloc(iCount * sizeof(uint32_t));
    number* vertices = (number*)scratch_alloc(vCount * 3 * sizeof(number));
    number* normals = (number*)scratch_alloc(vCount * 3 * sizeof(number));
    number* uvs = (number*)scratch_alloc(vCount * 2 * sizeof(number));


   
    uint32_t vi = 0, ii = 0;
    uint32_t* grid = (uint32_t*)scratch_alloc((divsY + 1) * (divsX + 1) * sizeof(uint32_t));



    // 2. Generate Vertices & UVs
    for (uint32_t iy = 0; iy <= divsY; iy++) {
        number v = (number)iy / (number)divsY;
        for (uint32_t ix = 0; ix <= divsX; ix++) {
            number u = (number)ix / (number)divsX;

            vertices[(vi * 3) + 0] = -rad * wcos(u * TWO_PI_F) * wsin(v * M_PI_F);
            vertices[(vi * 3) + 1] = rad * wcos(v * M_PI_F);
            vertices[(vi * 3) + 2] = rad * wsin(u * TWO_PI_F) * wsin(v * M_PI_F);

            uvs[(vi * 2) + 0] = u;
            uvs[(vi * 2) + 1] = 1.0f - v;

            grid[iy * (divsX + 1) + ix] = vi++;
        }
    }

    // 3. Generate Indices
    for (uint32_t iy = 0; iy < divsY; iy++) {
        for (uint32_t ix = 0; ix < divsX; ix++) {
            uint32_t a = grid[iy * (divsX + 1) + (ix + 1)];
            uint32_t b = grid[iy * (divsX + 1) + ix];
            uint32_t c = grid[(iy + 1) * (divsX + 1) + ix];
            uint32_t d = grid[(iy + 1) * (divsX + 1) + (ix + 1)];

            if (iy != 0) { indices[ii++] = a; indices[ii++] = b; indices[ii++] = d; }
            if (iy != divsY - 1) { indices[ii++] = b; indices[ii++] = c; indices[ii++] = d; }
        }
    }
    
    // 3. Calculate Normals
    geometry_calculate_normals_raw(vertices, normals, indices, vCount, iCount);

    upload_geometry(uuid, vCount, iCount,vertices, normals,uvs, indices,geometry_get_wire_indices(indices,iCount));

    return uuid;
}



WASM_EXPORT uint32_t geometry_capsule(number radius, number height, uint radialSegs, uint heightSegs) {
    radialSegs = radialSegs < 3 ? 3 : radialSegs;
    heightSegs = heightSegs < 1 ? 1 : heightSegs;

    uint32_t totalHeightSegs = (heightSegs * 2) + 1;
    uint32_t vCount = (radialSegs + 1) * (totalHeightSegs + 1);
    uint32_t iCount = radialSegs * totalHeightSegs * 6;

    uint32_t* indices = (uint32_t*)scratch_alloc(iCount * sizeof(uint32_t));
    number* vertices = (number*)scratch_alloc(vCount * 3 * sizeof(number));
    number* normals = (number*)scratch_alloc(vCount * 3 * sizeof(number));
    number* uvs = (number*)scratch_alloc(vCount * 2 * sizeof(number));
    uint32_t uuid=(uint32_t)math_alloc(1);


    uint32_t vi = 0, ii = 0;
    uint32_t* grid = (uint32_t*)scratch_alloc((totalHeightSegs + 1) * (radialSegs + 1) * sizeof(uint32_t));

    // 2. Generate Vertices & UVs
    for (uint32_t iy = 0; iy <= totalHeightSegs; iy++) {
        number v = (number)iy / (number)totalHeightSegs;
        number y = 0, sliceRad = 0;

        if (iy <= heightSegs) { // Top Hemisphere
            number theta = ((number)iy / (number)heightSegs) * (M_PI_F / 2.0f);
            y = wcos(theta) * radius + (height / 2.0f);
            sliceRad = wsin(theta) * radius;
        }
        else if (iy > heightSegs && iy <= heightSegs + 1) { // Cylinder Bridge
            y = (iy == heightSegs + 1) ? -height / 2.0f : height / 2.0f;
            sliceRad = radius;
        }
        else { // Bottom Hemisphere
            number theta = ((number)(iy - 1) / (number)heightSegs) * (M_PI_F / 2.0f);
            y = wcos(theta) * radius - (height / 2.0f);
            sliceRad = wsin(theta) * radius;
        }

        for (uint32_t ix = 0; ix <= radialSegs; ix++) {
            number u = (number)ix / (number)radialSegs;
            number angle = u * TWO_PI_F;

            vertices[(vi * 3) + 0] = sliceRad * wsin(angle);
            vertices[(vi * 3) + 1] = y;
            vertices[(vi * 3) + 2] = sliceRad * wcos(angle);

            uvs[(vi * 2) + 0] = u;
            uvs[(vi * 2) + 1] = 1.0f - v;

            grid[iy * (radialSegs + 1) + ix] = vi++;
        }
    }

    // 3. Generate Indices
    for (uint32_t iy = 0; iy < totalHeightSegs; iy++) {
        for (uint32_t ix = 0; ix < radialSegs; ix++) {
            uint32_t a = grid[iy * (radialSegs + 1) + (ix + 1)];
            uint32_t b = grid[iy * (radialSegs + 1) + ix];
            uint32_t c = grid[(iy + 1) * (radialSegs + 1) + ix];
            uint32_t d = grid[(iy + 1) * (radialSegs + 1) + (ix + 1)];

            indices[ii++] = a; indices[ii++] = b; indices[ii++] = d;
            indices[ii++] = b; indices[ii++] = c; indices[ii++] = d;
        }
    }


    // 3. Calculate Normals
    geometry_calculate_normals_raw(vertices, normals, indices, vCount, iCount);

    upload_geometry(uuid, vCount, iCount,vertices, normals,uvs, indices,geometry_get_wire_indices(indices,iCount));

  return uuid;
}





WASM_EXPORT uint32_t geometry_plane_skirt_unindexed_xz(number width, number height, uint divsX, uint divsY) {
    divsX = divsX < 1 ? 1 : divsX;
    divsY = divsY < 1 ? 1 : divsY;

    // 6 vertices per quad for the main grid
    uint32_t grid_vCount = divsX * divsY * 6;

    // 4 edges * (divs) quads per edge, 6 vertices per skirt quad
    uint32_t skirt_quads  = (divsX * 2) + (divsY * 2);
    uint32_t skirt_vCount = skirt_quads * 6;

    uint32_t vCount = grid_vCount + skirt_vCount;
    uint32_t uuid=(uint32_t)math_alloc(1);
    number* vertices = (number*)scratch_alloc(vCount * 3 * sizeof(number));
    number* normals  = (number*)scratch_alloc(vCount * 3 * sizeof(number));
    number* uvs      = (number*)scratch_alloc(vCount * 2 * sizeof(number));

    number width_half  = width  / 2.0f;
    number height_half = height / 2.0f;
    number segment_width  = width  / (number)divsX;
    number segment_height = height / (number)divsY;

    uint32_t vi = 0;

    // Helper: emit one vertex on the XZ plane (Y = 0 for surface, Y = -1 for skirt drop)
    auto emit = [&](number x, number z, number y, number u, number v) {
        vertices[vi*3+0] = x;
        vertices[vi*3+1] = y;   // Y is up; surface at 0, skirt drops to -1
        vertices[vi*3+2] = z;
        normals[vi*3+0] = 0.0f;
        normals[vi*3+1] = 1.0f; // Normal points up (+Y)
        normals[vi*3+2] = 0.0f;
        uvs[vi*2+0] = u;
        uvs[vi*2+1] = v;
        vi++;
    };

    // 1. Main Grid (XZ plane, triangles wound CCW from above)
    for (uint32_t iz = 0; iz < divsY; iz++) {
        number z1 = iz * segment_height - height_half;
        number z2 = (iz + 1) * segment_height - height_half;
        number v1 = 1.0f - ((number)iz       / (number)divsY);
        number v2 = 1.0f - ((number)(iz + 1) / (number)divsY);

        for (uint32_t ix = 0; ix < divsX; ix++) {
            number x1 = ix * segment_width - width_half;
            number x2 = (ix + 1) * segment_width - width_half;
            number u1 = (number)ix       / (number)divsX;
            number u2 = (number)(ix + 1) / (number)divsX;

            // Triangle 1: (x1,z1), (x1,z2), (x2,z1)
            emit(x1, z1, 0.0f, u1, v1);
            emit(x1, z2, 0.0f, u1, v2);
            emit(x2, z1, 0.0f, u2, v1);

            // Triangle 2: (x1,z2), (x2,z2), (x2,z1)
            emit(x1, z2, 0.0f, u1, v2);
            emit(x2, z2, 0.0f, u2, v2);
            emit(x2, z1, 0.0f, u2, v1);
        }
    }

    //2. Skirt quads 
    // Each skirt quad: two top-edge verts at Y=0, two bottom verts at Y=-1.
    // add_skirt_xz takes the left and right top-edge points of one skirt segment.
    // Winding is CCW when viewed from outside (outward-facing).
    auto add_skirt_xz = [&](number xL, number zL, number uL, number vL,
                             number xR, number zR, number uR, number vR) {
        // Triangle 1: TL, BL, BR
        emit(xL, zL,  0.0f, uL, vL); // Top-Left
        emit(xL, zL, -1.0f, uL, vL); // Bottom-Left  (dropped)
        emit(xR, zR, -1.0f, uR, vR); // Bottom-Right (dropped)
        // Triangle 2: TL, BR, TR
        emit(xL, zL,  0.0f, uL, vL); // Top-Left
        emit(xR, zR, -1.0f, uR, vR); // Bottom-Right (dropped)
        emit(xR, zR,  0.0f, uR, vR); // Top-Right
    };

    // -Z edge (front, iz=0)
    for (uint32_t ix = 0; ix < divsX; ix++) {
        number x1 = ix * segment_width - width_half;
        number x2 = (ix + 1) * segment_width - width_half;
        number u1 = (number)ix       / (number)divsX;
        number u2 = (number)(ix + 1) / (number)divsX;
        // Wind so the outward face points toward -Z
        add_skirt_xz(x2, -height_half, u2, 1.0f, x1, -height_half, u1, 1.0f);
    }

    // +Z edge (back, iz=divsY)
    for (uint32_t ix = 0; ix < divsX; ix++) {
        number x1 = ix * segment_width - width_half;
        number x2 = (ix + 1) * segment_width - width_half;
        number u1 = (number)ix       / (number)divsX;
        number u2 = (number)(ix + 1) / (number)divsX;
        // Wind so the outward face points toward +Z
        add_skirt_xz(x1, height_half, u1, 0.0f, x2, height_half, u2, 0.0f);
    }

    // -X edge (left, ix=0)
    for (uint32_t iz = 0; iz < divsY; iz++) {
        number z1 = iz * segment_height - height_half;
        number z2 = (iz + 1) * segment_height - height_half;
        number v1 = 1.0f - ((number)iz       / (number)divsY);
        number v2 = 1.0f - ((number)(iz + 1) / (number)divsY);
        // Wind so the outward face points toward -X
        add_skirt_xz(-width_half, z1, 0.0f, v1, -width_half, z2, 0.0f, v2);
    }

    // +X edge (right, ix=divsX)
    for (uint32_t iz = 0; iz < divsY; iz++) {
        number z1 = iz * segment_height - height_half;
        number z2 = (iz + 1) * segment_height - height_half;
        number v1 = 1.0f - ((number)iz       / (number)divsY);
        number v2 = 1.0f - ((number)(iz + 1) / (number)divsY);
        // Wind so the outward face points toward +X
        add_skirt_xz(width_half, z2, 1.0f, v2, width_half, z1, 1.0f, v1);
    }


    upload_geometry(uuid, vCount, 0,vertices, normals,uvs, 0,0);

  return uuid;
}
