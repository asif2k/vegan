function engine_worker(engine) {

  console.log("inside engine_worker", engine);

  
  Object.assign(engine, {
    _cameras: new Map(),
    _transforms: new Map()
  });

  const wasm = wasm$("@LINK['stack-size=65536','--export-dynamic', '--max-memory=2130706432']\n#include('engine.cpp')#include('transforms.cpp')#include('worker.cpp')");
    

  
  consts$(
    CMD_DEBUG_CALLS
  )

  wasm().then(function (env) {



    const wa = Object.assign({}, env.wa.exports);

    const wmem = WASM_MEMORY*2;
    wa.init(wmem);
        
    
    wa.init_scratchpad(Math.floor(wmem * (1 / 8)));

    wa.tra_init(1024 * 2, 256 * 2);

    

    env.memory.check();
    wa.env = env;    
    wa.fp32_array = function (size, poi) { return new Float32Array(env.memory.buffer, poi || wa.alloc(size * 4), size); };
    wa.u32_array = function (size, poi) { return new Uint32Array(env.memory.buffer, poi || wa.alloc(size * 4), size); };
    wa.u8_array = function (size, poi) {
      if (Array.isArray(size)) {
        const a = new Uint8Array(env.memory.buffer, poi || wa.alloc(size.length), size.length);
        a.set(size);
        return a;
      }

      return new Uint8Array(env.memory.buffer, poi || wa.alloc(size), size);
    };

    wa.fp32_array_scratch = function (size, poi) { return new Float32Array(env.memory.buffer, poi || wa.scratch_alloc(size), size); };
    wa.u32_array_scratch = function (size, poi) { return new Uint32Array(env.memory.buffer, poi || wa.scratch_alloc(size), size); };



   
    const u32 = wa.u32_array(PAYLOAD_SIZE);
    const f32 = wa.fp32_array(PAYLOAD_SIZE, u32.byteOffset);

    const u32_buff = wa.u32_array(PAYLOAD_SIZE);
    engine.worker_objects = wa.u32_array(1024, wa.worker_objects());
    engine.worker_track = wa.u32_array(1024, wa.worker_track());

    let terrain = {
      data: null,

    };
    engine.wa = wa;

    block$("worker_process")


    let frame_time = 0;
    const debug_calls = [];
    let di = 0, debug_sent = false;        // debug_sent: the last response carried a list of calls (see the end of engine.onmessage)


    (function () {
      consts$(
        DBG_SPHERE,
        DBG_CAPSULE,
        DBG_AXES_LINES,
        DBG_POINT,
        DBG_LINE
      )

      env.debug_calls = debug_calls;

      const u32 = new Uint32Array(env.memory.buffer);
      const f32 = new Float32Array(env.memory.buffer);
      function push_positions(position, rotation, size) {
        position = position / 4;
        rotation = rotation / 4;

        debug_calls[di++] = f32[position++];
        debug_calls[di++] = f32[position++];
        debug_calls[di++] = f32[position++];

        debug_calls[di++] = f32[rotation++];
        debug_calls[di++] = f32[rotation++];
        debug_calls[di++] = f32[rotation++];
        debug_calls[di++] = f32[rotation++];
        debug_calls[di++] = size;
      }
      env.debug_draw_sphere = function (position, rotation, size) {
        debug_calls[di++] = DBG_SPHERE;
        push_positions(position, rotation, size);
      };

      env.debug_draw_capsule = function (position, rotation, radius,height) {
        debug_calls[di++] = DBG_CAPSULE;
        push_positions(position, rotation, radius);
        debug_calls[di++] = height;
      };

      env.debug_draw_axes_lines = function (position, rotation, size) {
        debug_calls[di++] = DBG_AXES_LINES;
        push_positions(position, rotation, size);
      };

      env.debug_draw_point = function (position, r,g,b,size) {
        debug_calls[di++] = DBG_POINT;
        position = position / 4;
        debug_calls[di++] = f32[position++];
        debug_calls[di++] = f32[position++];
        debug_calls[di++] = f32[position++];
        debug_calls[di++] = r;
        debug_calls[di++] = g;
        debug_calls[di++] = b;
        debug_calls[di++] = size;
      };
      env.debug_draw_point2 = function (x,y,z, r, g, b, size) {
        debug_calls[di++] = DBG_POINT;
        debug_calls[di++] = x;
        debug_calls[di++] = y;
        debug_calls[di++] = z;
        debug_calls[di++] = r;
        debug_calls[di++] = g;
        debug_calls[di++] = b;
        debug_calls[di++] = size;
      };

      env.debug_draw_line = function (p1,p2, r, g, b) {
        debug_calls[di++] = DBG_LINE;
        p1 = p1 / 4;
        p2 = p2 / 4;
        debug_calls[di++] = f32[p1++];
        debug_calls[di++] = f32[p1++];
        debug_calls[di++] = f32[p1++];
        debug_calls[di++] = f32[p2++];
        debug_calls[di++] = f32[p2++];
        debug_calls[di++] = f32[p2++];
        debug_calls[di++] = r;
        debug_calls[di++] = g;
        debug_calls[di++] = b;
      };

      // how many words of the calls fit in `room` words, whole calls only (the main thread reads them as a list: a call cut in the middle would be read as the start of the next)
      env.debug_fit = function (room) {
        let n = 0;
        while (n < di) {
          const c = debug_calls[n], len = c == DBG_POINT ? 8 : (c == DBG_AXES_LINES || c == DBG_SPHERE) ? 9 : 10;          // (the words of a call, its id included: point 8, axes and sphere 9, line and capsule 10)
          if (n + len > room) break;
          n += len;
        }
        return n;
      };

    })();

    engine.onmessage = function (m) {

      if (!Array.isArray(m.data)) {
        if (m.data.call) {
          if (engine[m.data.call]) engine[m.data.call](m.data);
          return;
        }

        return;
      }
      const _u32 = new Uint32Array(m.data[0]);
     
      u32_buff.set(_u32);
      let i = 4;
     
      i = wa.worker_payload_response( u32.byteOffset, 4, env.memory.buffer.byteLength, frame_time);
     

      block$("worker_payload_response")

      // the calls go after everything else the response says, into what is left of the payload (a creature crowd's rows can fill most of it): the rest of them is dropped.
      // The main thread keeps the last list it was given and draws it every frame until another comes (a frame of its own may run between two of the worker's): when the drawing STOPS an EMPTY
      // list is sent once, or the shapes of the last frame would stay on the screen for good, where they were
      const n = di > 0 ? env.debug_fit(u32.length - i - 2) : 0;
      if (n > 0 || debug_sent) {
        let j = 0;
        u32[i++] = CMD_DEBUG_CALLS;
        u32[i++] = n;
        while (j < n) {
          f32[i++] = debug_calls[j++];
        }
      }
      debug_sent = n > 0;
      di = 0;
      u32[0] = i;
      _u32.set(u32);
      engine.postMessage(m.data, m.data);
      frame_time = Date.now();
      wa.worker_on_payload( u32_buff.byteOffset);

      block$("worker_on_payload")

      frame_time = Date.now() - frame_time;

    };
    engine.postMessage({});



  });


}
