// Simple 3D hash function using your native math macros
static number hash_3d(number x, number y, number z, number seed) {
    number dot = x * 12.9898f + y * 78.233f + z * 37.719f + seed * 133.733f;
    number s = wsin(dot) * 43758.5453f;
    return (s - wfloor(s)) * 2.0f - 1.0f;
}


// ----------------------------------------------------------------------------
// [8.0] OPTIMIZED SIMPLEX NOISE (STATELESS)
// ----------------------------------------------------------------------------

// Skewing and unskewing factors
#define F2 0.366025403f // 0.5 * (sqrt(3) - 1)
#define G2 0.211324865f // (3 - sqrt(3)) / 6
#define F3 0.333333333f // 1/3
#define G3 0.166666667f // 1/6

// Fast, stateless integer hash (No memory lookups, perfectly seeded)
static inline uint hash_int(int i, int j, int k, int seed) {
    uint h = (uint)seed + (uint)i * 374761393U + (uint)j * 668265263U + (uint)k * 137U;
    h = (h ^ (h >> 13)) * 1274126177U;
    return h ^ (h >> 16);
}

static inline uint hash_int_2d(int i, int j, int seed) {
    uint h = (uint)seed + (uint)i * 374761393U + (uint)j * 668265263U;
    h = (h ^ (h >> 13)) * 1274126177U;
    return h ^ (h >> 16);
}


// ----------------------------------------------------------------------------
// ARRAY-OPTIMIZED GRADIENT LOOKUPS (Replaces bitwise branching)
// ----------------------------------------------------------------------------

// Pre-calculated gradients mapping directly to your bitwise logic
static const number G3_X[16] = { 1, -1, 1, -1,  1, -1, 1, -1,  0,  0, 0,  0,  1,  0, -1,  0};
static const number G3_Y[16] = { 1,  1,-1, -1,  0,  0, 0,  0,  1, -1, 1, -1,  1,  0, -1,  0};
static const number G3_Z[16] = { 0,  0, 0,  0,  1,  1,-1, -1,  1,  1,-1, -1,  0,  1,  0, -1};

static inline number grad_3d(uint hash, number x, number y, number z) {
    uint h = hash & 15;
    // Fused Multiply-Add is much faster than branching ternaries
    return (G3_X[h] * x) + (G3_Y[h] * y) + (G3_Z[h] * z);
}

static const number G2_X[8] = { 1, -1, 1, -1,  2, -2, 2, -2 };
static const number G2_Y[8] = { 2,  2,-2, -2,  1,  1,-1, -1 };

static inline number grad_2d(uint hash, number x, number y) {
    uint h = hash & 7;
    return (G2_X[h] * x) + (G2_Y[h] * y);
}

// Bitwise gradient selection (Avoids array lookups)
static inline number grad_3d0(uint hash, number x, number y, number z) {
    uint h = hash & 15;
    number u = h < 8 ? x : y;
    number v = h < 4 ? y : (h == 12 || h == 14 ? x : z);
    return ((h & 1) == 0 ? u : -u) + ((h & 2) == 0 ? v : -v);
}

static inline number grad_2d0(uint hash, number x, number y) {
    uint h = hash & 7;
    number u = h < 4 ? x : y;
    number v = h < 4 ? y : x;
    return ((h & 1) ? -u : u) + ((h & 2) ? -2.0f * v : 2.0f * v);
}

// --- 3D Simplex Noise (For Rocks & 3D Objects) ---
WASM_EXPORT number simplex_noise_3d(number x, number y, number z, int seed) {
    number s = (x + y + z) * F3;
    int i = (int)wfloor(x + s);
    int j = (int)wfloor(y + s);
    int k = (int)wfloor(z + s);

    number t = (i + j + k) * G3;
    number X0 = i - t, Y0 = j - t, Z0 = k - t;
    number x0 = x - X0, y0 = y - Y0, z0 = z - Z0;

    int i1, j1, k1, i2, j2, k2;

    if (x0 >= y0) {
        if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
        else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
        else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
    }
    else {
        if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
        else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
        else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    }

    number x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
    number x2 = x0 - i2 + 2.0f * G3, y2 = y0 - j2 + 2.0f * G3, z2 = z0 - k2 + 2.0f * G3;
    number x3 = x0 - 1.0f + 3.0f * G3, y3 = y0 - 1.0f + 3.0f * G3, z3 = z0 - 1.0f + 3.0f * G3;

    number n0, n1, n2, n3;

    number t0 = 0.6f - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 < 0.0f) n0 = 0.0f;
    else { t0 *= t0; n0 = t0 * t0 * grad_3d(hash_int(i, j, k, seed), x0, y0, z0); }

    number t1 = 0.6f - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 < 0.0f) n1 = 0.0f;
    else { t1 *= t1; n1 = t1 * t1 * grad_3d(hash_int(i + i1, j + j1, k + k1, seed), x1, y1, z1); }

    number t2 = 0.6f - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 < 0.0f) n2 = 0.0f;
    else { t2 *= t2; n2 = t2 * t2 * grad_3d(hash_int(i + i2, j + j2, k + k2, seed), x2, y2, z2); }

    number t3 = 0.6f - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 < 0.0f) n3 = 0.0f;
    else { t3 *= t3; n3 = t3 * t3 * grad_3d(hash_int(i + 1, j + 1, k + 1, seed), x3, y3, z3); }

    return 32.0f * (n0 + n1 + n2 + n3); // Returns smoothly mapped roughly between -1.0 and 1.0
}

// --- 2D Simplex Noise (For Terrain Heightmaps) ---
WASM_EXPORT number simplex_noise_2d(number x, number y, int seed) {
    number s = (x + y) * F2;
    int i = (int)wfloor(x + s);
    int j = (int)wfloor(y + s);

    number t = (i + j) * G2;
    number X0 = i - t;
    number Y0 = j - t;
    number x0 = x - X0;
    number y0 = y - Y0;

    int i1, j1;
    if (x0 > y0) { i1 = 1; j1 = 0; }
    else { i1 = 0; j1 = 1; }

    number x1 = x0 - i1 + G2;
    number y1 = y0 - j1 + G2;
    number x2 = x0 - 1.0f + 2.0f * G2;
    number y2 = y0 - 1.0f + 2.0f * G2;

    number n0, n1, n2;

    number t0 = 0.5f - x0 * x0 - y0 * y0;
    if (t0 < 0.0f) n0 = 0.0f;
    else { t0 *= t0; n0 = t0 * t0 * grad_2d(hash_int_2d(i, j, seed), x0, y0); }

    number t1 = 0.5f - x1 * x1 - y1 * y1;
    if (t1 < 0.0f) n1 = 0.0f;
    else { t1 *= t1; n1 = t1 * t1 * grad_2d(hash_int_2d(i + i1, j + j1, seed), x1, y1); }

    number t2 = 0.5f - x2 * x2 - y2 * y2;
    if (t2 < 0.0f) n2 = 0.0f;
    else { t2 *= t2; n2 = t2 * t2 * grad_2d(hash_int_2d(i + 1, j + 1, seed), x2, y2); }

    return 70.0f * (n0 + n1 + n2);
}



// ----------------------------------------------------------------------------
// [8.1] FRACTIONAL BROWNIAN MOTION (FBM) GENERATORS
// ----------------------------------------------------------------------------

// 1. Standard fBm (Classic organic noise)
WASM_EXPORT number fbm_standard_3d(number x, number y, number z, int seed, int octaves, number lacunarity, number persistence) {
    number total = 0.0f;
    number frequency = 1.0f;
    number amplitude = 1.0f;
    number maxValue = 0.0f;  // Used for normalizing result to -1.0 to 1.0

    for (int i = 0; i < octaves; i++) {
        total += simplex_noise_3d(x * frequency, y * frequency, z * frequency, seed + i) * amplitude;

        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
    }
    return total / maxValue;
}

// 2. Ridged Multi-Fractal (Sharp peaks, mountains, crystals, cracks)
WASM_EXPORT number fbm_ridged_3d(number x, number y, number z, int seed, int octaves, number lacunarity, number persistence) {
    number total = 0.0f;
    number frequency = 1.0f;
    number amplitude = 1.0f;
    number weight = 1.0f; // Weight allows sharp ridges to "propagate" detail downward

    for (int i = 0; i < octaves; i++) {
        // Get base noise (-1 to 1)
        number n = simplex_noise_3d(x * frequency, y * frequency, z * frequency, seed + i);

        // Make sharp ridges (0 at peaks, 1 at valleys), then invert it so peaks are 1
        n = 1.0f - wabs(n);
        n *= n; // Square it to sharpen the ridge

        // Multiply by previous weight so deep valleys get smoother, peaks get rougher
        n *= weight;
        weight = wmaxf(0.0f, wminf(1.0f, n * 2.0f));

        total += n * amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
    }

    // Remap roughly back to -1.0 to 1.0 for displacement consistency
    return (total * 2.0f) - 1.0f;
}

// 3. Billow / Turbulence (Puffy, bubbly, cloud-like, pumice stone)
WASM_EXPORT number fbm_billow_3d(number x, number y, number z, int seed, int octaves, number lacunarity, number persistence) {
    number total = 0.0f;
    number frequency = 1.0f;
    number amplitude = 1.0f;
    number maxValue = 0.0f;

    for (int i = 0; i < octaves; i++) {
        // Absolute value creates a "bouncing" wave instead of smooth hills
        number n = wabs(simplex_noise_3d(x * frequency, y * frequency, z * frequency, seed + i));

        total += n * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
    }

    // Remap from [0, 1] to [-1, 1]
    return ((total / maxValue) * 2.0f) - 1.0f;
}

// 4. Domain Warping 2D (For swirly/marbled terrain and fluid logic)
// This evaluates fBm twice to calculate a coordinate offset, then samples a final time.
WASM_EXPORT number fbm_warp_2d(number x, number y, int seed, int octaves, number warp_strength) {
    // Generate an offset vector using two different seed offsets
    number qx = fbm_standard_3d(x, y, 0.0f, seed + 100, octaves, 2.0f, 0.5f);
    number qy = fbm_standard_3d(x, y, 0.0f, seed + 200, octaves, 2.0f, 0.5f);

    // Add the offset back into the original coordinates
    number rx = x + warp_strength * qx;
    number ry = y + warp_strength * qy;

    // Sample the final noise using the warped coordinates
    return fbm_standard_3d(rx, ry, 0.0f, seed, octaves, 2.0f, 0.5f);
}





// 1. Standard fBm (Classic organic noise)
WASM_EXPORT number fbm_standard_2d(number x, number y, int seed, int octaves, number lacunarity, number persistence) {
    number total = 0.0f;
    number frequency = 1.0f;
    number amplitude = 1.0f;
    number maxValue = 0.0f;  // Used for normalizing result to -1.0 to 1.0

    for (int i = 0; i < octaves; i++) {
        total += simplex_noise_2d(x * frequency, y * frequency, seed + i) * amplitude;

        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
    }
    return total / maxValue;
}

// 2. Ridged Multi-Fractal (Sharp peaks, mountains, crystals, cracks)
WASM_EXPORT number fbm_ridged_2d(number x, number y, int seed, int octaves, number lacunarity, number persistence) {
    number total = 0.0f;
    number frequency = 1.0f;
    number amplitude = 1.0f;
    number weight = 1.0f; // Weight allows sharp ridges to "propagate" detail downward

    for (int i = 0; i < octaves; i++) {
        // Get base noise (-1 to 1)
        number n = simplex_noise_2d(x * frequency, y * frequency, seed + i);

        // Make sharp ridges (0 at peaks, 1 at valleys), then invert it so peaks are 1
        n = 1.0f - wabs(n);
        n *= n; // Square it to sharpen the ridge

        // Multiply by previous weight so deep valleys get smoother, peaks get rougher
        n *= weight;
        weight = wmaxf(0.0f, wminf(1.0f, n * 2.0f));

        total += n * amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
    }

    // Remap roughly back to -1.0 to 1.0 for displacement consistency
    return (total * 2.0f) - 1.0f;
}

// 3. Billow / Turbulence (Puffy, bubbly, cloud-like, pumice stone)
WASM_EXPORT number fbm_billow_2d(number x, number y,  int seed, int octaves, number lacunarity, number persistence) {
    number total = 0.0f;
    number frequency = 1.0f;
    number amplitude = 1.0f;
    number maxValue = 0.0f;

    for (int i = 0; i < octaves; i++) {
        // Absolute value creates a "bouncing" wave instead of smooth hills
        number n = wabs(simplex_noise_2d(x * frequency, y * frequency, seed + i));

        total += n * amplitude;
        maxValue += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
    }

    // Remap from [0, 1] to [-1, 1]
    return ((total / maxValue) * 2.0f) - 1.0f;
}


// ----------------------------------------------------------------------------
// [8.2] DERIVATIVE (ANALYTICAL) NOISE & SHAPE TYPES
// ----------------------------------------------------------------------------

// Corresponds to the shader's noise_type()
static inline number noise_type(number dx, number dy, int type) {
    number d2 = dx * dx + dy * dy;
    switch (type) {
        case 0: return 1.0f;
        case 1: return 1.0f / (1.0f + d2);
        case 2: return 1.0f - wabs(1.0f / (1.0f + d2));
        case 3: {
            // pow(d2, 8.0) optimized
            number d2_2 = d2 * d2;
            number d2_4 = d2_2 * d2_2;
            number d2_8 = d2_4 * d2_4;
            return 1.0f / (1.0f + d2_8); 
        }
        case 4: return 1.0f / (1.0f + wsqrt(d2));
        case 5: return wexp(-d2);
        case 6: return wexp(-2.0f * d2 * d2); // exp(-2.0 * pow(d2, 2.0))
        default: return 1.0f;
    }
}

// 2D Perlin noise that returns (Value, dX, dY) just like the GLSL 'noised' function
static inline void perlin_noised_2d(number x, number y, int seed, number& out_v, number& out_dx, number& out_dy) {
    int ix = (int)wfloor(x);
    int iy = (int)wfloor(y);
    number fx = x - (number)ix;
    number fy = y - (number)iy;

    // Smoothstep curves (u) and their derivatives (du)
    number ux = fx * fx * fx * (fx * (fx * 6.0f - 15.0f) + 10.0f);
    number uy = fy * fy * fy * (fy * (fy * 6.0f - 15.0f) + 10.0f);

    number dux = 30.0f * fx * fx * (fx * (fx - 2.0f) + 1.0f);
    number duy = 30.0f * fy * fy * (fy * (fy - 2.0f) + 1.0f);

    // Fast inline lambda to get random normalized gradient vector
    auto get_grad = [](int i, int j, int s, number& gx, number& gy) {
        uint h = hash_int_2d(i, j, s);
        // Map hash to 0 -> 2*PI (8192 precision steps)
        number angle = (number)(h & 8191) * 0.00076699039f; 
        gx = wcos(angle);
        gy = wsin(angle);
    };

    number g00x, g00y, g10x, g10y, g01x, g01y, g11x, g11y;
    get_grad(ix, iy, seed, g00x, g00y);
    get_grad(ix + 1, iy, seed, g10x, g10y);
    get_grad(ix, iy + 1, seed, g01x, g01y);
    get_grad(ix + 1, iy + 1, seed, g11x, g11y);

    number va = g00x * fx + g00y * fy;
    number vb = g10x * (fx - 1.0f) + g10y * fy;
    number vc = g01x * fx + g01y * (fy - 1.0f);
    number vd = g11x * (fx - 1.0f) + g11y * (fy - 1.0f);

    // 1. Calculate Base Height Value
    out_v = va + ux * (vb - va) + uy * (vc - va) + ux * uy * (va - vb - vc + vd);

    // 2. Calculate Analytical Derivatives
    out_dx = g00x + ux * (g10x - g00x) + uy * (g01x - g00x) + ux * uy * (g00x - g10x - g01x + g11x) +
             dux * (uy * (va - vb - vc + vd) + vb - va);
             
    out_dy = g00y + ux * (g10y - g00y) + uy * (g01y - g00y) + ux * uy * (g00y - g10y - g01y + g11y) +
             duy * (ux * (va - vb - vc + vd) + vc - va);
}

// ----------------------------------------------------------------------------
// [8.3] DERIVATIVE FRACTIONAL BROWNIAN MOTION
// ----------------------------------------------------------------------------

// Corresponds to the shader's fbm(vec2 x, int type, int oct, float lacunarity, float persistence, float frequency, float amplitude)
WASM_EXPORT number fbm_derivative_2d(number x, number y, int seed, int type, int octaves, number lacunarity, number persistence, number frequency, number amplitude) {
    number p0x = x * frequency;
    number p0y = y * frequency;

    number a = 0.0f;
    number b = amplitude;
    number dx = 0.0f;
    number dy = 0.0f;

    // Rotation matrix to hide octave alignment (m2 from shader)
    const number m2_00 =  0.8f;
    const number m2_01 = -0.6f;
    const number m2_10 =  0.6f;
    const number m2_11 =  0.8f;

    for (int i = 0; i < octaves; i++) {
        number n_v, n_dx, n_dy;
        
        // Compute noise and its derivatives at the current point
        perlin_noised_2d(p0x, p0y, seed, n_v, n_dx, n_dy);

        // Accumulate derivative (d += n.yz)
        dx += n_dx;
        dy += n_dy;

        // Accumulate height warped by the analytical derivative history
        a += b * n_v * noise_type(dx, dy, type);

        b *= persistence;

        // Rotate and scale the coordinate space for the next octave: p0 = m2 * p0 * lacunarity
        number px_new = (p0x * m2_00 + p0y * m2_01) * lacunarity;
        number py_new = (p0x * m2_10 + p0y * m2_11) * lacunarity;
        p0x = px_new;
        p0y = py_new;
    }
    
    return a;
}