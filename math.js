
consts$({
  DEGTORAD: 0.017453292519943295,
  RADTODEG: 57.295779513082323,
  E2PSILON: 0.00001,

})

const math = {};
math.create_float32 = (function (len, creator) {
  creator = creator || function (out) {
    return out;
  }
  let x = 0;
  return function () {
    let out = creator(wa.fp32_array(len));
    if (arguments[0] === undefined) return out;
    if (arguments.length === 1 && arguments[0].length > 0) {
      for (x = 0; x < len; x++) {
        out[x] = arguments[0][x % arguments[0].length];
      }
    }
    else {
      if (arguments.length === 1) {
        for (x = 0; x < len; x++)
          if (x < len) out[x] = arguments[0];
      }
      else {
        for (x = 0; x < arguments.length; x++)
          if (x < len) out[x] = arguments[x];
      }

    }
    return out;
  }
});

const STACK$ = new Float32Array(1024);


math.vec2 = math.create_float32(2);
math.vec3 = math.create_float32(3);
math.vec4 = math.create_float32(4);
math.mat3 = math.create_float32(9, function (out) {
  math_mat3_ident(out)

  return out;
});

(function () {

  math.vec3.normalize_xyz = function (out, xx, yy, zz) {
    let LEN = xx * xx + yy * yy + zz * zz;
    if (LEN > 0.00001) {
      LEN = 1.0 / Math.sqrt(LEN);
    }
    out[0] = xx * LEN;
    out[1] = yy * LEN;
    out[2] = zz * LEN;
  }

  math.vec3.normalize = function (out$, a$) {
    math.vec3.normalize_xyz(out$, a$[0], a$[1], a$[2]);
    return out$;
  };

  math.vec3.sub = function (out, v1, v2) {
    out[0] = v1[0] - v2[0]; out[1] = v1[1] - v2[1]; out[2] = v1[2] - v2[2];
    return out;
  };

  math.vec3.add = function (out$, a$, b$) {
    out$[0] = a$[0] + b$[0];
    out$[1] = a$[1] + b$[1];
    out$[2] = a$[2] + b$[2];
    return out$;
  }
  math.vec3.cross = function (out$, a$, b$) {
    out$[0] = a$[1] * b$[2] - a$[2] * b$[1];
    out$[1] = a$[2] * b$[0] - a$[0] * b$[2];
    out$[2] = a$[0] * b$[1] - a$[1] * b$[0];
    return out$;
  };
  math.vec3.copy = function (a$, b$) {
    a$[0] = b$[0];
    a$[1] = b$[1];
    a$[2] = b$[2];
    return a$;
  };
 
  math.vec3.get_length = function (v$) {
    return (Math.sqrt(v$[0] * v$[0] + v$[1] * v$[1] + v$[2] * v$[2]));
  };

  math.vec3.lerp = function (out$, a$, b$, t$) {
    out$[0] = a$[0] + (b$[0] - a$[0]) * t$;
    out$[1] = a$[1] + (b$[1] - a$[1]) * t$;
    out$[2] = a$[2] + (b$[2] - a$[2]) * t$;
    return out$;
  }

  math.vec3.dot = function (a$, b$) {
    return (a$[0] * b$[0] + a$[1] * b$[1] + a$[2] * b$[2]);
  };

  math.vec3.negate = function (out$, v$) {
    out$[0] = -v$[0];
    out$[1] = -v$[1];
    out$[2] = -v$[2];
    return out$;
  };

  math.vec3.scale = function (out$, v$, s) {
    out$[0] = v$[0] * s;
    out$[1] = v$[1] * s;
    out$[2] = v$[2] * s;
    return out$;
  };

  math.vec4.copy = function (a$, b$) {
    a$[0] = b$[0];
    a$[1] = b$[1];
    a$[2] = b$[2];
    a$[3] = b$[3];
    return a$;
  }
  math.vec3.mult = function (out$, a$, b$) {
    out$[0] = a$[0] * b$[0];
    out$[1] = a$[1] * b$[1];
    out$[2] = a$[2] * b$[2];
    return out$;
  }
  math.vec3.min = function (out, v1, v2) {
    out[0] = Math.min(v1[0], v2[0]); out[1] = Math.min(v1[1], v2[1]); out[2] = Math.min(v1[2], v2[2]);
    return out;
  };

  math.vec3.max = function (out, v1, v2) {
    out[0] = Math.max(v1[0], v2[0]); out[1] = Math.max(v1[1], v2[1]); out[2] = Math.max(v1[2], v2[2]);
    return out;
  };


  math.mat4 = math.create_float32(16, function (out) {
    return math.mat4.identity(out);
  });

  math.mat4.identity = function (out) {
    out.fill(0);
    out[0] = 1; out[5] = 1; out[10] = 1; out[15] = 1;
    return out;
  };

  math.vec3.transform_quat = function (out$, a$, q$) {
    STACK$[90] = q$[3] * a$[0] + q$[1] * a$[2] - q$[2] * a$[1];
    STACK$[91] = q$[3] * a$[1] + q$[2] * a$[0] - q$[0] * a$[2];
    STACK$[92] = q$[3] * a$[2] + q$[0] * a$[1] - q$[1] * a$[0];
    STACK$[93] = -q$[0] * a$[0] - q$[1] * a$[1] - q$[2] * a$[2];

    out$[0] = STACK$[90] * q$[3] + STACK$[93] * -q$[0] + STACK$[91] * -q$[2] - STACK$[92] * -q$[1];
    out$[1] = STACK$[91] * q$[3] + STACK$[93] * -q$[1] + STACK$[92] * -q$[0] - STACK$[90] * -q$[2];
    out$[2] = STACK$[92] * q$[3] + STACK$[93] * -q$[2] + STACK$[90] * -q$[1] - STACK$[91] * -q$[0];
    return out$;
  };

  math.quat = math.create_float32(4, function (out) {
    out[3] = 1;
    return out;
  });

  math.quat.mult = function (out$, a$, b$) {
    out$[0] = a$[0] * b$[3] + a$[3] * b$[0] + a$[1] * b$[2] - a$[2] * b$[1];
    out$[1] = a$[1] * b$[3] + a$[3] * b$[1] + a$[2] * b$[0] - a$[0] * b$[2];
    out$[2] = a$[2] * b$[3] + a$[3] * b$[2] + a$[0] * b$[1] - a$[1] * b$[0];
    out$[3] = a$[3] * b$[3] - a$[0] * b$[0] - a$[1] * b$[1] - a$[2] * b$[2];
    return out$;
  };

  math.quat.axis_angle = function (out$, rad$, axis$) {
    STACK$[143] = rad$ * 0.5;
    STACK$[128] = Math.sin(STACK$[143]);
    out$[0] = STACK$[128] * axis$[0];
    out$[1] = STACK$[128] * axis$[1];
    out$[2] = STACK$[128] * axis$[2];
    out$[3] = Math.cos(STACK$[143]);
    return out$;
  };

  math.quat.from_axis_angle = function (out$, axis$, rad$) {
    STACK$[143] = rad$ * 0.5;
    STACK$[128] = Math.sin(STACK$[143]);
    out$[0] = STACK$[128] * axis$[0];
    out$[1] = STACK$[128] * axis$[1];
    out$[2] = STACK$[128] * axis$[2];
    out$[3] = Math.cos(STACK$[143]);
    return out$;
  };
  math.quat.mult_vec3 = function (out$, v$, q$) {
    STACK$[139] = q$[3] * v$[0] + q$[1] * v$[2] - q$[2] * v$[1];
    STACK$[140] = q$[3] * v$[1] + q$[2] * v$[0] - q$[0] * v$[2];
    STACK$[141] = q$[3] * v$[2] + q$[0] * v$[1] - q$[1] * v$[0];
    STACK$[142] = -q$[0] * v$[0] - q$[1] * v$[1] - q$[2] * v$[2];


    out$[0] = STACK$[139] * q$[3] + STACK$[142] * -q$[0] + STACK$[140] * -q$[2] - STACK$[141] * -q$[1];
    out$[1] = STACK$[140] * q$[3] + STACK$[142] * -q$[1] + STACK$[141] * -q$[0] - STACK$[139] * -q$[2];
    out$[2] = STACK$[141] * q$[3] + STACK$[142] * -q$[2] + STACK$[139] * -q$[1] - STACK$[140] * -q$[0];
    return out$;
  };

  math.quat.nlerp = function (out$, a$, b$, t$) {
    STACK$[128] = a$[0] * b$[0] + a$[1] * b$[1] + a$[2] * b$[2] + a$[3] * b$[3];
    STACK$[151] = 1 - t$;
    if (STACK$[128] < 0) {

      out$[0] = a$[0] * STACK$[151] - b$[0] * t$;
      out$[1] = a$[1] * STACK$[151] - b$[1] * t$;
      out$[2] = a$[2] * STACK$[151] - b$[2] * t$;
      out$[3] = a$[3] * STACK$[151] - b$[3] * t$;

    } else {

      out$[0] = a$[0] * STACK$[151] + b$[0] * t$;
      out$[1] = a$[1] * STACK$[151] + b$[1] * t$;
      out$[2] = a$[2] * STACK$[151] + b$[2] * t$;
      out$[3] = a$[3] * STACK$[151] + b$[3] * t$;
    }

    STACK$[128] = Math.sqrt(out$[0] * out$[0] + out$[1] * out$[1] + out$[2] * out$[2] + out$[3] * out$[3]);

    if (STACK$[128] === 0) {
      out$[0] = 0;
      out$[1] = 0;
      out$[2] = 0;
      out$[3] = 1;
    } else {
      STACK$[128] = 1 / STACK$[128];
      out$[0] *= STACK$[128];
      out$[1] *= STACK$[128];
      out$[2] *= STACK$[128];
      out$[3] *= STACK$[128];
    }
  };


  math.mat4.mult = function (out$, a$, b$) {
    STACK$[90] = a$[0]; STACK$[91] = a$[1]; STACK$[92] = a$[2]; STACK$[93] = a$[3];
    STACK$[97] = a$[4]; STACK$[98] = a$[5]; STACK$[99] = a$[6]; STACK$[100] = a$[7];
    STACK$[103] = a$[8]; STACK$[104] = a$[9]; STACK$[105] = a$[10]; STACK$[106] = a$[11];
    STACK$[107] = a$[12]; STACK$[108] = a$[13]; STACK$[109] = a$[14]; STACK$[110] = a$[15];

    STACK$[111] = b$[0]; STACK$[112] = b$[1]; STACK$[113] = b$[2]; STACK$[114] = b$[3];

    out$[0] = STACK$[111] * STACK$[90] + STACK$[112] * STACK$[97] + STACK$[113] * STACK$[103] + STACK$[114] * STACK$[107];
    out$[1] = STACK$[111] * STACK$[91] + STACK$[112] * STACK$[98] + STACK$[113] * STACK$[104] + STACK$[114] * STACK$[108];
    out$[2] = STACK$[111] * STACK$[92] + STACK$[112] * STACK$[99] + STACK$[113] * STACK$[105] + STACK$[114] * STACK$[109];
    out$[3] = STACK$[111] * STACK$[93] + STACK$[112] * STACK$[100] + STACK$[113] * STACK$[106] + STACK$[114] * STACK$[110];

    STACK$[111] = b$[4]; STACK$[112] = b$[5]; STACK$[113] = b$[6]; STACK$[114] = b$[7];

    out$[4] = STACK$[111] * STACK$[90] + STACK$[112] * STACK$[97] + STACK$[113] * STACK$[103] + STACK$[114] * STACK$[107];
    out$[5] = STACK$[111] * STACK$[91] + STACK$[112] * STACK$[98] + STACK$[113] * STACK$[104] + STACK$[114] * STACK$[108];
    out$[6] = STACK$[111] * STACK$[92] + STACK$[112] * STACK$[99] + STACK$[113] * STACK$[105] + STACK$[114] * STACK$[109];
    out$[7] = STACK$[111] * STACK$[93] + STACK$[112] * STACK$[100] + STACK$[113] * STACK$[106] + STACK$[114] * STACK$[110];

    STACK$[111] = b$[8]; STACK$[112] = b$[9]; STACK$[113] = b$[10]; STACK$[114] = b$[11];

    out$[8] = STACK$[111] * STACK$[90] + STACK$[112] * STACK$[97] + STACK$[113] * STACK$[103] + STACK$[114] * STACK$[107];
    out$[9] = STACK$[111] * STACK$[91] + STACK$[112] * STACK$[98] + STACK$[113] * STACK$[104] + STACK$[114] * STACK$[108];
    out$[10] = STACK$[111] * STACK$[92] + STACK$[112] * STACK$[99] + STACK$[113] * STACK$[105] + STACK$[114] * STACK$[109];
    out$[11] = STACK$[111] * STACK$[93] + STACK$[112] * STACK$[100] + STACK$[113] * STACK$[106] + STACK$[114] * STACK$[110];

    STACK$[111] = b$[12]; STACK$[112] = b$[13]; STACK$[113] = b$[14]; STACK$[114] = b$[15];

    out$[12] = STACK$[111] * STACK$[90] + STACK$[112] * STACK$[97] + STACK$[113] * STACK$[103] + STACK$[114] * STACK$[107];
    out$[13] = STACK$[111] * STACK$[91] + STACK$[112] * STACK$[98] + STACK$[113] * STACK$[104] + STACK$[114] * STACK$[108];
    out$[14] = STACK$[111] * STACK$[92] + STACK$[112] * STACK$[99] + STACK$[113] * STACK$[105] + STACK$[114] * STACK$[109];
    out$[15] = STACK$[111] * STACK$[93] + STACK$[112] * STACK$[100] + STACK$[113] * STACK$[106] + STACK$[114] * STACK$[110];
    return out$;
  };


  const pos$ = [0, 0, 0], scal$ = [1, 1, 1];


  math.mat4.from_quat_pos_scale = function (out$, q$, p$, s$) {
    p$ = p$ || pos$;
    s$ = s$ || scal$;

    STACK$[94] = q$[0] + q$[0];
    STACK$[95] = q$[1] + q$[1];
    STACK$[96] = q$[2] + q$[2];

    out$[0] = (1 - (q$[1] * STACK$[95]) - (q$[2] * STACK$[96])) * s$[0];
    out$[1] = ((q$[1] * STACK$[94]) + (q$[3] * STACK$[96])) * s$[0];
    out$[2] = ((q$[2] * STACK$[94]) - (q$[3] * STACK$[95])) * s$[0];
    out$[3] = 0;

    out$[4] = ((q$[1] * STACK$[94]) - (q$[3] * STACK$[96])) * s$[1];
    out$[5] = (1 - (q$[0] * STACK$[94]) - (q$[2] * STACK$[96])) * s$[1];
    out$[6] = ((q$[2] * STACK$[95]) + (q$[3] * STACK$[94])) * s$[1];
    out$[7] = 0;

    out$[8] = ((q$[2] * STACK$[94]) + (q$[3] * STACK$[95])) * s$[2];
    out$[9] = ((q$[2] * STACK$[95]) - (q$[3] * STACK$[94])) * s$[2];
    out$[10] = (1 - (q$[0] * STACK$[94]) - (q$[1] * STACK$[95])) * s$[2];
    out$[11] = 0;

    out$[12] = p$[0];
    out$[13] = p$[1];
    out$[14] = p$[2];
    out$[15] = 1;
    return out$;
  };

  const v0 = [0, 0, 0];
  math.ray3_intersect_plane = function (out$, origin$, direction$, plane$) {
    var denom = math.vec3.dot(direction$, plane$);
    if (denom !== 0) {
      var t = -(math.vec3.dot(origin$, plane$) + plane$[3]) / denom;
      if (t < 0) {
        out$[0] = Infinity;
        out$[1] = Infinity;
        out$[2] = Infinity;

        return out$;
      }
      math.vec3.scale(v0, direction$, t);
      math.vec3.add(out$, origin$, v0);
      return out$;
    } else if (math.vec3.dot(plane$, origin$) + plane$[3] === 0) {
      math.vec3.copy(out$, origin$);
      return out$;
    } else {
      out$[0] = Infinity;
      out$[1] = Infinity;
      out$[2] = Infinity;
      return out$;
    }
  }

})();

engine.math = math;



math.rnd05 = function (v) {
  return ((Math.random() - 0.5) * v);
};

math.rndi = function (v) {
  return Math.floor(Math.random() * v)
};

math.rnd = function (v) {
  return (Math.random() * v)
};


math.float_mem = function float_mem(size) {
  const proc = { poi: 0 };


  proc.mem = wa.fp32_array(size);
  proc.buffer = proc.mem.buffer;

  proc.bo = proc.mem.byteOffset;
  proc.clear = function () {
    this.poi = 0;

  };

  proc.float32= proc.float_alloc = function (size) {
    this.poi += size;
    return new Float32Array(this.buffer,this.bo+ (this.poi - size) * 4, size);
  };
  
  proc.uint_alloc = function (size) {
    this.poi += size;
    return new Uint32Array(this.buffer, this.bo +(this.poi - size) * 4, size);
  };

  proc.alloc = function (size) {
    this.poi += size;
    return (this.poi - size);
  };

  proc.get_size = function (pointer) {
    return this.poi - pointer;
  };

  proc.get_pointer = function () {
    return this.poi;
  };

  return proc;
}