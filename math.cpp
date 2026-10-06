// Native WASM Math
extern "C" number wabs(number);

//#define wabs(x) absf(x)

#define wexp(x) exp(x)
#define wlog(x) logf(x)
#define wsin(x) sinf(x)
#define wcos(x) cosf(x)
#define wtan(x) tanf(x)
#define watan2(y, x) atan2f(y, x)
#define wsqrt(x) sqrtf(x)
#define wfloor(x) floorf(x)
#define wacos(x) acosf(x)
#define wmaxf(a, b) fmaxf(a, b)
#define wminf(a, b) fminf(a, b)
#define wpow(b, e) powf(b, e)

#define PI_F 3.14159265358979f
#define TWO_PI_F 6.28318530717959f
#define RC_EPS 1e-8f

#define M_PI_F PI_F

// SHARED MATH REGISTERS (Zero Allocation)
static number v_reg[11][3];
static number m_reg[5][9];
static number q_reg[2][4];
static number b_reg[7];

#define tmpM          m_reg[0]
#define shapeInertia  m_reg[1]
#define localInertia  m_reg[2]
#define tmpM2         m_reg[3]
#define tmat          m_reg[4]

#define tmpV          v_reg[0]
#define V1            v_reg[1]
#define V2            v_reg[2]
#define V3			  v_reg[3]
#define V4			  v_reg[4]

#define sv_tmpP1      v_reg[3]
#define sv_tmpP2      v_reg[4]
#define sv_tmpC1      v_reg[5]
#define sv_tmpC2      v_reg[6]
#define sv_tmplv1     v_reg[7]
#define sv_tmplv2     v_reg[8]
#define sv_tmpav1     v_reg[9]
#define UP			  v_reg[10]



#define sv_vtmp       v_reg[0] 
#define diff          v_reg[0] 
#define sv_tmpav2     v_reg[1] 

#define Q1            q_reg[0]
#define Q2            q_reg[1]
#define tmpB          b_reg

// ----------------------------------------------------------------------------
// [1.0] MATHEMATICS & VECTOR CORE
// ----------------------------------------------------------------------------
static inline void v2_zero(number* v) { v[0] = 0; v[1] = 0; }
static inline void v3_zero(number* v) { v[0] = 0; v[1] = 0; v[2] = 0; }
static inline void v3_set(number* d, number x, number y, number z) { d[0] = x; d[1] = y; d[2] = z; }
static inline void v3_copy(number* d, const number* s) { d[0] = s[0]; d[1] = s[1]; d[2] = s[2]; }
static inline void v3_add(number* d, const number* a, const number* b) { d[0] = a[0] + b[0]; d[1] = a[1] + b[1]; d[2] = a[2] + b[2]; }
static inline void v3_sub(number* d, const number* a, const number* b) { d[0] = a[0] - b[0]; d[1] = a[1] - b[1]; d[2] = a[2] - b[2]; }
static inline void v3_mul(number* d, const number* a, const number* b) { d[0] = a[0] * b[0]; d[1] = a[1] * b[1]; d[2] = a[2] * b[2]; }
static inline void v3_scale(number* d, const number* v, number s) { d[0] = v[0] * s; d[1] = v[1] * s; d[2] = v[2] * s; }
static inline void v3_scale_eq(number* d, number s) { d[0] *= s; d[1] *= s; d[2] *= s; }

static inline void v3_scale_add(number* d, const number* a, number s) { d[0] += a[0] * s; d[1] += a[1] * s; d[2] += a[2] * s; }
static inline void v3_scale_add(number* d, const number* a, const number* b, number s) { d[0] = a[0]+b[0] * s; d[1] = a[1]+b[1] * s; d[2] = a[2]+b[2] * s; }

static inline number v3_dot(const number* a, const number* b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
static inline number v3_len_sq(const number* v) { return v[0] * v[0] + v[1] * v[1] + v[2] * v[2]; }
static inline number v3_len(const number* a) { return wsqrt(a[0] * a[0] + a[1] * a[1] + a[2] * a[2]); }

static inline void v3_normalize(number* d, const number* v) {
    number l = v3_len(v);
    if (l > 0.00001f) {
        number il = 1.0f / l;
        d[0] = v[0] * il;
        d[1] = v[1] * il;
        d[2] = v[2] * il;
    }
    else {
        v3_zero(d);
    }
}
static inline void v3_cross(number* d, const number* a, const number* b) {
    number x = a[1] * b[2] - a[2] * b[1];
    number y = a[2] * b[0] - a[0] * b[2];
    number z = a[0] * b[1] - a[1] * b[0];
    d[0] = x; d[1] = y; d[2] = z;
}

// Transforms a point (not a direction) by a column-major mat4, including the
// perspective divide - use this to unproject NDC/clip-space coordinates through
// an inverse projection or view matrix (e.g. mouse-ray picking).
static inline void v3_transform_mat4(number* d, const number* v, const number* m) {
    number x = v[0], y = v[1], z = v[2];
    number w = m[3] * x + m[7] * y + m[11] * z + m[15];
    w = (w != 0.0f) ? 1.0f / w : 1.0f;
    d[0] = (m[0] * x + m[4] * y + m[8] * z + m[12]) * w;
    d[1] = (m[1] * x + m[5] * y + m[9] * z + m[13]) * w;
    d[2] = (m[2] * x + m[6] * y + m[10] * z + m[14]) * w;
}






static inline void m3_zero(number* m) { for (int i = 0; i < 9; ++i) m[i] = 0; }
static inline void m3_ident(number* m) { m3_zero(m); m[0] = 1; m[4] = 1; m[8] = 1; }
static inline void m3_copy(number* d, const number* m) { for (int i = 0; i < 9; ++i) d[i] = m[i]; }
static inline void m3_add(number* d, const number* a, const number* b) { for (int i = 0; i < 9; ++i) d[i] = a[i] + b[i]; }
static inline void m3_mult(number* d, const number* a, const number* b) {
    number t[9];
    t[0] = a[0] * b[0] + a[1] * b[3] + a[2] * b[6];
    t[1] = a[0] * b[1] + a[1] * b[4] + a[2] * b[7];
    t[2] = a[0] * b[2] + a[1] * b[5] + a[2] * b[8];
    t[3] = a[3] * b[0] + a[4] * b[3] + a[5] * b[6];
    t[4] = a[3] * b[1] + a[4] * b[4] + a[5] * b[7];
    t[5] = a[3] * b[2] + a[4] * b[5] + a[5] * b[8];
    t[6] = a[6] * b[0] + a[7] * b[3] + a[8] * b[6];
    t[7] = a[6] * b[1] + a[7] * b[4] + a[8] * b[7];
    t[8] = a[6] * b[2] + a[7] * b[5] + a[8] * b[8];
    m3_copy(d, t);
}
static inline void m3_mult_tp(number* d, const number* a, const number* t) {
    number tmp[9];
    tmp[0] = a[0] * t[0] + a[1] * t[1] + a[2] * t[2];
    tmp[1] = a[0] * t[3] + a[1] * t[4] + a[2] * t[5];
    tmp[2] = a[0] * t[6] + a[1] * t[7] + a[2] * t[8];
    tmp[3] = a[3] * t[0] + a[4] * t[1] + a[5] * t[2];
    tmp[4] = a[3] * t[3] + a[4] * t[4] + a[5] * t[5];
    tmp[5] = a[3] * t[6] + a[4] * t[7] + a[5] * t[8];
    tmp[6] = a[6] * t[0] + a[7] * t[1] + a[8] * t[2];
    tmp[7] = a[6] * t[3] + a[7] * t[4] + a[8] * t[5];
    tmp[8] = a[6] * t[6] + a[7] * t[7] + a[8] * t[8];
    m3_copy(d, tmp);
}
static inline void v3_m3_mult(number* d, const number* a, const number* m) {
    number x = m[0] * a[0] + m[3] * a[1] + m[6] * a[2];
    number y = m[1] * a[0] + m[4] * a[1] + m[7] * a[2];
    number z = m[2] * a[0] + m[5] * a[1] + m[8] * a[2];
    d[0] = x; d[1] = y; d[2] = z;
}
static inline void v3_m3_mult_tp(number* d, const number* a, const number* m) {
    number x = m[0] * a[0] + m[1] * a[1] + m[2] * a[2];
    number y = m[3] * a[0] + m[4] * a[1] + m[5] * a[2];
    number z = m[6] * a[0] + m[7] * a[1] + m[8] * a[2];
    d[0] = x; d[1] = y; d[2] = z;
}
static inline void m3_inverse(number* d, const number* m) {
    number det = m[0] * (m[4] * m[8] - m[7] * m[5]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
    if (det == 0.0f) {
        m3_copy(d, m); return;
    }
    number invdet = 1.0f / det; number t[9];
    t[0] = (m[4] * m[8] - m[7] * m[5]) * invdet;
    t[1] = (m[2] * m[7] - m[1] * m[8]) * invdet;
    t[2] = (m[1] * m[5] - m[2] * m[4]) * invdet;
    t[3] = (m[5] * m[6] - m[3] * m[8]) * invdet;
    t[4] = (m[0] * m[8] - m[2] * m[6]) * invdet;
    t[5] = (m[3] * m[2] - m[0] * m[5]) * invdet;
    t[6] = (m[3] * m[7] - m[6] * m[4]) * invdet;
    t[7] = (m[6] * m[1] - m[0] * m[7]) * invdet;
    t[8] = (m[0] * m[4] - m[3] * m[1]) * invdet;
    m3_copy(d, t);
}
static inline void q4_ident(number* q) { q[0] = 0; q[1] = 0; q[2] = 0; q[3] = 1; }
static inline void q4_copy(number* d, const number* s) { d[0] = s[0]; d[1] = s[1]; d[2] = s[2]; d[3] = s[3]; }
static inline void q4_set(number* d, number x, number y, number z, number w) { d[0] = x; d[1] = y; d[2] = z; d[3] = w; }
static inline void q4_normalize(number* d, const number* q) {
    number len = q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3];
    if (len > 0.0f) {
        len = 1.0f / wsqrt(len);
    }
    d[0] = q[0] * len;
    d[1] = q[1] * len;
    d[2] = q[2] * len;
    d[3] = q[3] * len;
}
static inline void m3_from_q4(number* m, const number* q) {
    number xx = q[0] * (q[0] + q[0]);
    number xy = q[0] * (q[1] + q[1]);
    number xz = q[0] * (q[2] + q[2]);
    number yy = q[1] * (q[1] + q[1]);
    number yz = q[1] * (q[2] + q[2]);
    number zz = q[2] * (q[2] + q[2]);
    number wx = q[3] * (q[0] + q[0]);
    number wy = q[3] * (q[1] + q[1]);
    number wz = q[3] * (q[2] + q[2]);
    m[0] = 1.0f - (yy + zz);
    m[1] = xy - wz; m[2] = xz + wy;
    m[3] = xy + wz; m[4] = 1.0f - (xx + zz);
    m[5] = yz - wx; m[6] = xz - wy;
    m[7] = yz + wx; m[8] = 1.0f - (xx + yy);
}
static inline void q4_from_m3(number* out, const number* m) {
    const float trace = m[0] + m[4] + m[8];
    if (trace > 0.0f) {
        const float root = 0.5f / wsqrt(trace + 1.0f);
        out[0] = (m[5] - m[7]) * root;
        out[1] = (m[6] - m[2]) * root;
        out[2] = (m[1] - m[3]) * root;
        out[3] = 0.25f / root;
    }
    else {
        const int XX = (m[8] > (m[4] > m[0] ? m[4] : m[0])) ? 2 : (m[4] > m[0] ? 1 : 0);
        const int YY = (XX + 1) % 3;
        const int ZZ = (XX + 2) % 3;

        const int d = XX * 3 + XX;
        const int dy = YY * 3 + YY;
        const int dz = ZZ * 3 + ZZ;

        const float root = 0.5f / wsqrt(m[d] - m[dy] - m[dz] + 1.0f);
        out[XX] = 0.25f / root;
        out[3] = (m[YY * 3 + ZZ] - m[ZZ * 3 + YY]) * root;
        out[YY] = (m[YY * 3 + XX] + m[XX * 3 + YY]) * root;
        out[ZZ] = (m[ZZ * 3 + XX] + m[XX * 3 + ZZ]) * root;
    }
}

static inline void q4_from_m4(number* out, const number* m) {
    const number trace = m[0] + m[5] + m[10];

    if (trace > 0.0f) {
        const number root = 0.5f / wsqrt(trace + 1.0f);
        out[0] = (m[6] - m[9]) * root;
        out[1] = (m[8] - m[2]) * root;
        out[2] = (m[1] - m[4]) * root;
        out[3] = 0.25f / root;
    }
    else {
        const int XX = (m[10] > (m[5] > m[0] ? m[5] : m[0])) ? 2 : (m[5] > m[0] ? 1 : 0);
        const int YY = (XX + 1) % 3;
        const int ZZ = (XX + 2) % 3;

        const int d = XX * 4 + XX;
        const int dy = YY * 4 + YY;
        const int dz = ZZ * 4 + ZZ;

        const number root = 0.5f / wsqrt(m[d] - m[dy] - m[dz] + 1.0f);
        out[XX] = 0.25f / root;
        out[3] = (m[YY * 4 + ZZ] - m[ZZ * 4 + YY]) * root;
        out[YY] = (m[YY * 4 + XX] + m[XX * 4 + YY]) * root;
        out[ZZ] = (m[ZZ * 4 + XX] + m[XX * 4 + ZZ]) * root;
    }
}

static inline void q4_from_euler(number* d, number x, number y, number z) {
    number qX = wsin(x * 0.5f);
    number qY = wsin(y * 0.5f);
    number qZ = wsin(z * 0.5f);
    number dqX = wcos(x * 0.5f);
    number dqY = wcos(y * 0.5f);
    number dqZ = wcos(z * 0.5f);
    d[0] = qX * dqY * dqZ - dqX * qY * qZ;
    d[1] = dqX * qY * dqZ + qX * dqY * qZ;
    d[2] = dqX * dqY * qZ - qX * qY * dqZ;
    d[3] = dqX * dqY * dqZ + qX * qY * qZ;
    q4_normalize(d, d);
}

static inline void q4_mult(number* d, const number* a, const number* b) {
    d[0] = a[0] * b[3] + a[3] * b[0] + a[1] * b[2] - a[2] * b[1];
    d[1] = a[1] * b[3] + a[3] * b[1] + a[2] * b[0] - a[0] * b[2];
    d[2] = a[2] * b[3] + a[3] * b[2] + a[0] * b[1] - a[1] * b[0];
    d[3] = a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2];
}
static inline void aabb_set(number* m, number minX, number minY, number minZ, number maxX, number maxY, number maxZ) {
    m[0] = minX; m[1] = minY; m[2] = minZ; m[3] = maxX; m[4] = maxY; m[5] = maxZ;
}

static inline void m4_from_q_p_s(number* m, number* q, number* p, number* s) {
    number a05 = q[0] + q[0];
    number a06 = q[1] + q[1];
    number a07 = q[2] + q[2];

    m[0] = (1.0f - (q[1] * a06) - (q[2] * a07)) * s[0];
    m[1] = ((q[1] * a05) + (q[3] * a07)) * s[0];
    m[2] = ((q[2] * a05) - (q[3] * a06)) * s[0];
    m[3] = 0.0f;

    m[4] = ((q[1] * a05) - (q[3] * a07)) * s[1];
    m[5] = (1.0f - (q[0] * a05) - (q[2] * a07)) * s[1];
    m[6] = ((q[2] * a06) + (q[3] * a05)) * s[1];
    m[7] = 0.0f;

    m[8] = ((q[2] * a05) + (q[3] * a06)) * s[2];
    m[9] = ((q[2] * a06) - (q[3] * a05)) * s[2];
    m[10] = (1.0f - (q[0] * a05) - (q[1] * a06)) * s[2];
    m[11] = 0.0f;

    m[12] = p[0];
    m[13] = p[1];
    m[14] = p[2];
    m[15] = 1.0f;

}

static inline void v3_transform_quat(number* out, const number* v, const number* q) {
    number a00 = q[3] * v[0] + q[1] * v[2] - q[2] * v[1];
    number a01 = q[3] * v[1] + q[2] * v[0] - q[0] * v[2];
    number a02 = q[3] * v[2] + q[0] * v[1] - q[1] * v[0];
    number a03 = -q[0] * v[0] - q[1] * v[1] - q[2] * v[2];
    out[0] = a00 * q[3] + a03 * (-q[0]) + a01 * (-q[2]) - a02 * (-q[1]);
    out[1] = a01 * q[3] + a03 * (-q[1]) + a02 * (-q[0]) - a00 * (-q[2]);
    out[2] = a02 * q[3] + a03 * (-q[2]) + a00 * (-q[1]) - a01 * (-q[0]);
}

static inline void q4_from_axis_angle(number* out, const number* axis, number rad) {
    number half_angle = rad * 0.5f;
    number s = wsin(half_angle);
    out[0] = s * axis[0];
    out[1] = s * axis[1];
    out[2] = s * axis[2];
    out[3] = wcos(half_angle);
}

static inline void look_at_axis(number* x_axis, number* y_axis, number* z_axis, number* eye, number* target, number* up) {

    v3_sub(z_axis, eye, target);

    if (v3_len_sq(z_axis) == 0.0f) {
        // eye and target are in the same position
        z_axis[2] = 1.0f;
    }

    v3_normalize(z_axis, z_axis);
    v3_cross(x_axis, up, z_axis);

    if (v3_len_sq(x_axis) == 0.0f) {
        // up and z are parallel
        if (wabs(up[2]) == 1.0f) {
            z_axis[0] += 0.0001f;
        }
        else {
            z_axis[2] += 0.0001f;
        }
        v3_normalize(z_axis, z_axis);
        v3_cross(x_axis, up, z_axis);
    }
    v3_normalize(x_axis, x_axis);
    v3_cross(y_axis, z_axis, x_axis);
}



static inline void m3_look_at(number* out, number* eye, number* target, number* up) {

    look_at_axis(V1, V2, V3, eye, target, up);

    out[0] = V1[0];
    out[1] = V1[1];
    out[2] = V1[2];

    out[3] = V2[0];
    out[4] = V2[1];
    out[5] = V2[2];

    out[6] = V3[0];
    out[7] = V3[1];
    out[8] = V3[2];

}

/*
0 1 2
3 4 5
6 7 8

0  1  2 3
4  5  6 7
8  9  10 11
12 13 14 15

*/
static inline void m4_look_at(number* out, number* eye, number* target, number* up) {

    look_at_axis(V1, V2, V3, eye, target, up);

    out[0] = V1[0];
    out[1] = V1[1];
    out[2] = V1[2];


    out[4] = V2[0];
    out[5] = V2[1];
    out[6] = V2[2];



    out[8] = V3[0];
    out[9] = V3[1];
    out[10] = V3[2];



    out[12] = eye[0];
    out[13] = eye[1];
    out[14] = eye[2];

    out[3] = 0.0f;
    out[7] = 0.0f;
    out[11] = 0.0f;
    out[15] = 1.0f;

    /*
        v3_sub(V1, target, eye);
        v3_normalize(V1,V1);
        v3_cross(V2,V1, up);
        v3_normalize(V2, V2);

        v3_cross(V3,V2, V1);

        d[0] = V2[0];
        d[4] = V2[1];
        d[8] = V2[2];
        d[12] = -v3_dot(V2, eye);
        d[1] = V3[0];
        d[5] = V3[1];
        d[9] = V3[2];
        d[13] = -v3_dot(V3, eye);
        d[2] = -V1[0];
        d[6] = -V1[1];
        d[10] = -V1[2];
        d[14] = v3_dot(V1, eye);
        d[3] = 0.0f;
        d[7] = 0.0f;
        d[11] = 0.0f;
        d[15] = 1.0f;

        //d[12] = eye[0];
        //d[13] = eye[1];
        //d[15] = eye[2];

        */








}


static inline void q4_from_basis(number* out, const number* x, const number* y, const number* z) {
    number tr = x[0] + y[1] + z[2];
    number S;
    if (tr > 0) {
        S = wsqrt(tr + 1.0f) * 2.0f;
        out[3] = 0.25f * S;
        out[0] = (y[2] - z[1]) / S;
        out[1] = (z[0] - x[2]) / S;
        out[2] = (x[1] - y[0]) / S;
    }
    else if (x[0] > y[1] && x[0] > z[2]) {
        S = wsqrt(1.0f + x[0] - y[1] - z[2]) * 2.0f;
        out[3] = (y[2] - z[1]) / S;
        out[0] = 0.25f * S;
        out[1] = (y[0] + x[1]) / S;
        out[2] = (z[0] + x[2]) / S;
    }
    else if (y[1] > z[2]) {
        S = wsqrt(1.0f + y[1] - x[0] - z[2]) * 2.0f;
        out[3] = (z[0] - x[2]) / S;
        out[0] = (y[0] + x[1]) / S;
        out[1] = 0.25f * S;
        out[2] = (z[1] + y[2]) / S;
    }
    else {
        S = wsqrt(1.0f + z[2] - x[0] - y[1]) * 2.0f;
        out[3] = (x[1] - y[0]) / S;
        out[0] = (z[0] + x[2]) / S;
        out[1] = (z[1] + y[2]) / S;
        out[2] = 0.25f * S;
    }
}



static inline void v3_lerp(number* out, const number* a, const number* b, number t) {
    out[0] = a[0] + (b[0] - a[0]) * t;
    out[1] = a[1] + (b[1] - a[1]) * t;
    out[2] = a[2] + (b[2] - a[2]) * t;
}

static inline number q4_dot(const number* a, const number* b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
}

// Spherical Linear Interpolation for Quaternions
// Essential for smooth posture rotations and procedural foot planting
static inline void q4_slerp(number* out, const number* a, const number* b, number t) {
    number cosHalfTheta = q4_dot(a, b);
    number* b_copy = Q1;
    q4_copy(b_copy, b);

    // If dot product is negative, slerp won't take the shortest path. 
    // Fix by reversing one quaternion.
    if (cosHalfTheta < 0.0f) {
        b_copy[0] = -b_copy[0];
        b_copy[1] = -b_copy[1];
        b_copy[2] = -b_copy[2];
        b_copy[3] = -b_copy[3];
        cosHalfTheta = -cosHalfTheta;
    }

    // If angle is close to zero, fallback to fast linear interpolation (Nlerp)
    // to avoid division by zero in the wsin() calls below.
    if (cosHalfTheta >= 1.0f - 0.001f) {
        out[0] = a[0] + t * (b_copy[0] - a[0]);
        out[1] = a[1] + t * (b_copy[1] - a[1]);
        out[2] = a[2] + t * (b_copy[2] - a[2]);
        out[3] = a[3] + t * (b_copy[3] - a[3]);
        q4_normalize(out, out);
        return;
    }

    // Calculate actual spherical interpolation
    number halfTheta = wacos(cosHalfTheta);
    number sinHalfTheta = wsqrt(1.0f - cosHalfTheta * cosHalfTheta);

    number ratioA = wsin((1.0f - t) * halfTheta) / sinHalfTheta;
    number ratioB = wsin(t * halfTheta) / sinHalfTheta;

    out[0] = a[0] * ratioA + b_copy[0] * ratioB;
    out[1] = a[1] * ratioA + b_copy[1] * ratioB;
    out[2] = a[2] * ratioA + b_copy[2] * ratioB;
    out[3] = a[3] * ratioA + b_copy[3] * ratioB;
}

// Normalized Linear Interpolation for Quaternions - cheap approximation used for
// adjacent-keyframe interpolation (small angular delta, called every channel every
// frame, so speed matters more than exactness there). Takes the shortest path (flips
// b when the dot product is negative) before lerping, unlike a naive lerp+normalize.
static inline void q4_nlerp(number* out, const number* a, const number* b, number t) {
    number bx = b[0], by = b[1], bz = b[2], bw = b[3];
    if (q4_dot(a, b) < 0.0f) { bx = -bx; by = -by; bz = -bz; bw = -bw; }
    out[0] = a[0] + (bx - a[0]) * t;
    out[1] = a[1] + (by - a[1]) * t;
    out[2] = a[2] + (bz - a[2]) * t;
    out[3] = a[3] + (bw - a[3]) * t;
    q4_normalize(out, out);
}

static inline void  m4_ident(number* m) {
    m[0] = 1.0f;
    m[1] = 0.0f;
    m[2] = 0.0f;
    m[3] = 0.0f;

    m[4] = 0.0f;
    m[5] = 1.0f;
    m[6] = 0.0f;
    m[7] = 0.0f;

    m[8] = 0.0f;
    m[9] = 0.0f;
    m[10] = 1.0f;
    m[11] = 0.0f;

    m[12] = 0.0f;
    m[13] = 0.0f;
    m[14] = 0.0f;
    m[15] = 1.0f;
}

static inline void m4_frustum(number* d, number left, number right, number bottom, number top, number near, number far) {

    number rl = (right - left),
        tb = (top - bottom),
        fn = (far - near);
    d[0] = (near * 2) / rl;
    d[1] = 0;
    d[2] = 0;
    d[3] = 0;
    d[4] = 0;
    d[5] = (near * 2) / tb;
    d[6] = 0;
    d[7] = 0;
    d[8] = (right + left) / rl;
    d[9] = (top + bottom) / tb;
    d[10] = -(far + near) / fn;
    d[11] = -1;
    d[12] = 0;
    d[13] = 0;
    d[14] = -(far * near * 2) / fn;
    d[15] = 0;
}
static inline void m4_perspective(number* d, number fovy, number aspect, number near, number far) {
    number top = near * wtan(fovy * 0.5), right = top * aspect;
    m4_frustum(d, -right, right, -top, top, near, far);
}
static inline void m4_ortho(number* d, number left, number right, number bottom, number top, number near, number far) {

    number rl = (right - left),
        tb = (top - bottom),
        fn = (far - near);
    d[0] = 2 / rl;
    d[1] = 0;
    d[2] = 0;
    d[3] = 0;
    d[4] = 0;
    d[5] = 2 / tb;
    d[6] = 0;
    d[7] = 0;
    d[8] = 0;
    d[9] = 0;
    d[10] = -2 / fn;
    d[11] = 0;
    d[12] = -(left + right) / rl;
    d[13] = -(top + bottom) / tb;
    d[14] = -(far + near) / fn;
    d[15] = 1;
}

static inline void m4_mult(number* d, number* a, number* b) {

    number a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33;


    a00 = a[0]; a01 = a[1]; a02 = a[2]; a03 = a[3];
    a10 = a[4]; a11 = a[5]; a12 = a[6]; a13 = a[7];
    a20 = a[8]; a21 = a[9]; a22 = a[10]; a23 = a[11];
    a30 = a[12]; a31 = a[13]; a32 = a[14]; a33 = a[15];

    number b00, b01, b02, b03;


    b00 = b[0]; b01 = b[1]; b02 = b[2]; b03 = b[3];

    d[0] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30;
    d[1] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31;
    d[2] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32;
    d[3] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33;

    b00 = b[4]; b01 = b[5]; b02 = b[6]; b03 = b[7];

    d[4] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30;
    d[5] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31;
    d[6] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32;
    d[7] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33;

    b00 = b[8]; b01 = b[9]; b02 = b[10]; b03 = b[11];

    d[8] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30;
    d[9] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31;
    d[10] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32;
    d[11] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33;

    b00 = b[12]; b01 = b[13]; b02 = b[14]; b03 = b[15];

    d[12] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30;
    d[13] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31;
    d[14] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32;
    d[15] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33;
}

static inline void m4_copy(number* m, number* a) {


    m[0] = a[0];
    m[1] = a[1];
    m[2] = a[2];
    m[3] = a[3];

    m[4] = a[4];
    m[5] = a[5];
    m[6] = a[6];
    m[7] = a[7];

    m[8] = a[8];
    m[9] = a[9];
    m[10] = a[10];
    m[11] = a[11];

    m[12] = a[12];
    m[13] = a[13];
    m[14] = a[14];
    m[15] = a[15];
}

static inline void m4_inverse(number* d, number* m) {


    number a00 = m[0], a01 = m[1], a02 = m[2], a03 = m[3],
        a10 = m[4], a11 = m[5], a12 = m[6], a13 = m[7],
        a20 = m[8], a21 = m[9], a22 = m[10], a23 = m[11],
        a30 = m[12], a31 = m[13], a32 = m[14], a33 = m[15];

    number b00 = a00 * a11 - a01 * a10;
    number b01 = a00 * a12 - a02 * a10;
    number b02 = a00 * a13 - a03 * a10;
    number b03 = a01 * a12 - a02 * a11;
    number b04 = a01 * a13 - a03 * a11;
    number b05 = a02 * a13 - a03 * a12;
    number b06 = a20 * a31 - a21 * a30;
    number b07 = a20 * a32 - a22 * a30;
    number b08 = a20 * a33 - a23 * a30;
    number b09 = a21 * a32 - a22 * a31;
    number b10 = a21 * a33 - a23 * a31;
    number b11 = a22 * a33 - a23 * a32;

    number det = (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06);

    if (det != 0.0f) {
        det = 1.0f / det;

        d[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
        d[1] = (-a01 * b11 + a02 * b10 - a03 * b09) * det;
        d[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
        d[3] = (-a21 * b05 + a22 * b04 - a23 * b03) * det;
        d[4] = (-a10 * b11 + a12 * b08 - a13 * b07) * det;
        d[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
        d[6] = (-a30 * b05 + a32 * b02 - a33 * b01) * det;
        d[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
        d[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
        d[9] = (-a00 * b10 + a01 * b08 - a03 * b06) * det;
        d[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
        d[11] = (-a20 * b04 + a21 * b02 - a23 * b00) * det;
        d[12] = (-a10 * b09 + a11 * b07 - a12 * b06) * det;
        d[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
        d[14] = (-a30 * b03 + a31 * b01 - a32 * b00) * det;
        d[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;

    }
    else {
        m4_copy(d, m);
    }
}





// Law of Cosines Macro
#define law_of_cosines(a, b, c) wacos(wmaxf(-1.0f, wminf(1.0f, ((a) * (a) + (b) * (b) - (c) * (c)) / (2.0f * (a) * (b)))))

#include("noise.cpp")