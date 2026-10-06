
engine.geometries = (function () {
	const geometries = {};
	geometries.plane = function (width, height, divsX, divsY, plane) {
		return engine._geometries.get(wa.geometry_plane(width, height, divsX, divsY, plane));
	};

	geometries.cube = function (width, height, depth, divs) {
		return engine._geometries.get(wa.geometry_cube(width, height, depth, divs));
	};
	geometries.cube_offset = function (width, height, depth, divs, offset_x, offset_y, offset_z) {
		return engine._geometries.get(wa.geometry_cube_offset(width, height, depth, divs, offset_x, offset_y, offset_z));
	};
	geometries.cube_offset_divs = function (width, height, depth, divsX, divsY, divsZ, offset_x, offset_y, offset_z) {
		return engine._geometries.get(wa.geometry_cube_offset_divs(width, height, depth, divsX, divsY, divsZ, offset_x, offset_y, offset_z));
	};


	geometries.sphere = function (rad, divsX, divsY) {
		return engine._geometries.get(wa.geometry_sphere(rad, divsX, divsY));
	};

	geometries.capsule = function (radius, height, radialSegs, heightSegs) {
		return engine._geometries.get(wa.geometry_capsule(radius, height, radialSegs, heightSegs));
	};

	geometries.plane_skirt_unindexed_xz = function (width, height, divsX, divsY) {
		return engine._geometries.get(wa.geometry_plane_skirt_unindexed_xz(width, height, divsX, divsY));
	};

	geometries.cube_sphere = function (radius, divs) {
		return engine._geometries.get(wa.geometry_cube_sphere(radius, divs));
	};

	geometries.cube_sphere_unindexed = function (radius, divs) {
		return engine._geometries.get(wa.geometry_cube_sphere_unindexed(radius, divs));
	};

	geometries.cube_cylinder = function (radius, height, divs) {
		return engine._geometries.get(wa.geometry_cube_cylinder(radius, height, divs));
	};

	geometries.cube_capsule = function (radius, height, divs) {
		return engine._geometries.get(wa.geometry_cube_capsule(radius, height, divs));
	};


	const amap = {
		"POSITION": "a_position",
		"NORMAL": "a_normal",
		"JOINTS_0": "a_bone_indices",
		"WEIGHTS_0": "a_bone_weights",
		"JOINTS_1": "a_bone_indices2",
		"WEIGHTS_1": "a_bone_weights2",
		"TANGENT": "a_tangent",
		"TEXCOORD_0": "a_uv",
		"TEXCOORD_1": "a_uv2",
		"TEXCOORD_2": "a_uv3",
		"TEXCOORD_3": "a_uv4",
		"_UV0": "a_uv",
		"_UV1": "a_uv2",
		"_UV2": "a_uv3",
		"_UV3": "a_uv4",
		"_UV4": "a_uv5",
		"_UV5": "a_uv6",
		"_UV6": "a_uv7",
		"_UV7": "a_uv8",
		"_UV8": "a_uv9",

		"COLOR": "a_color",
		"Vertex": "a_position",
		"Normal": "a_normal",
		"Bones": "a_bone_indices",
		"Weights": "a_bone_weights",
		"Tangent": "a_tangent",
		"TexCoord0": "a_uv",
		"TexCoord1": "a_uv",
		"TexCoord2": "a_uv",
		"TexCoord3": "a_uv",
		"TexCoord4": "a_uv",
		"TexCoord5": "a_uv",
		"TexCoord6": "a_uv",
		"TexCoord7": "a_uv",
		"TexCoord8": "a_uv",
		"color": "a_color",
		"Color": "a_color",
	};


	geometries.create = function (geo) {

		let attr = geo.attr || geo.attributes;
		if (Array.isArray(attr)) {
			attr = attr.reduce(function (col, a) {
				col[a.name] = a;
				return col;
			}, {});
		}
		const g = { attr: {} };
		let att;

		for (let k in attr) {
			att = attr[k];
			att.name = amap[att.name] ? amap[att.name] : (att.name || k);
			g.attr[att.name] = engine.geometry_set_attr(att, att.data).uuid;


		}
		g.uuid = engine.guid();

		if (geo.indices) {
			g.indices = engine.geometry_set_indices({}, geo.indices);
			g.draw_count = g.indices.data_length;
		}
		else {
			if (g.attr.a_position) {
				att = engine._attributes.get(g.attr.a_position);
				if (att && att.data_length) {
					g.draw_count = att.data_length / att.item_size;

				}
			}
		}

		engine._geometries.set(g.uuid, g);
		return g;

	}


	// JS port of geometry_calculate_normals_raw (geometry.cpp): accumulates
	// per-face cross-product normals into shared vertices then normalizes -
	// used by JS-only geometry builders (e.g. cube_profile) that never touch
	// wasm, so they can't call the wasm-side version.
	engine.geometry_calculate_normals = function (vertices, normals, indices) {
		for (let i = 0; i < normals.length; i++) normals[i] = 0;

		for (let i = 0; i < indices.length; i += 3) {
			const iA = indices[i] * 3, iB = indices[i + 1] * 3, iC = indices[i + 2] * 3;
			const bx = vertices[iB], by = vertices[iB + 1], bz = vertices[iB + 2];
			const cbx = vertices[iC] - bx, cby = vertices[iC + 1] - by, cbz = vertices[iC + 2] - bz;
			const abx = vertices[iA] - bx, aby = vertices[iA + 1] - by, abz = vertices[iA + 2] - bz;

			const nx = cby * abz - cbz * aby;
			const ny = cbz * abx - cbx * abz;
			const nz = cbx * aby - cby * abx;

			normals[iA] += nx; normals[iA + 1] += ny; normals[iA + 2] += nz;
			normals[iB] += nx; normals[iB + 1] += ny; normals[iB + 2] += nz;
			normals[iC] += nx; normals[iC + 1] += ny; normals[iC + 2] += nz;
		}

		for (let i = 0; i < normals.length; i += 3) {
			const x = normals[i], y = normals[i + 1], z = normals[i + 2];
			const len = Math.sqrt(x * x + y * y + z * z) || 1;
			normals[i] = x / len; normals[i + 1] = y / len; normals[i + 2] = z / len;
		}
	};

	engine.geometry_set_attr = function (att, data, data_length) {
		const gl = engine.webgl.gl;
		if (att.uuid == undefined) {
			att.uuid = engine.guid();
			engine._attributes.set(att.uuid, att);
			att.buffer = null;
			att.divisor = att.divisor || 0;
			att.item_size = att.item_size || 3;
			att.buffer_type = att.buffer_type || GL_STATIC_DRAW;
			att.data_type = att.data_type || GL_FLOAT;
			att.stride = att.stride || 0;
			att.offset = att.offset || 0;

		}


		if (data) {
			if (att.buffer == null) {
				att.buffer = gl.createBuffer();
			}

			gl.bindBuffer(GL_ARRAY_BUFFER, att.buffer);
			att.data_length = data_length || data.length;
			//att.data = data;
			gl.bufferData(GL_ARRAY_BUFFER, data, att.buffer_type, 0, att.data_length);

		}
		return att;
	}

	engine.geometry_set_indices = function (indices, data, data_length) {
		const gl = engine.webgl.gl;
		indices = indices || {};

		if (data) {
			indices.buffer_type = indices.buffer_type || GL_DYNAMIC_DRAW;
			if (indices.buffer == null) {
				indices.buffer = gl.createBuffer();
			}
			data_length = data_length || data.length;

			gl.bindBuffer(GL_ELEMENT_ARRAY_BUFFER, indices.buffer);
			gl.bufferData(GL_ELEMENT_ARRAY_BUFFER, data, indices.buffer_type);
			indices.wireframe = indices.wireframe || { buffer: gl.createBuffer(), buffer_type: GL_DYNAMIC_DRAW };

			gl.bindBuffer(GL_ELEMENT_ARRAY_BUFFER, indices.wireframe.buffer);
			const wire_indices = engine.wa.u32_array_scratch(data_length * 2);
			let ii = 0;
			let a, b, c;
			for (let i = 0; i < data_length; i += 3) {
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

			gl.bufferData(GL_ELEMENT_ARRAY_BUFFER, wire_indices, indices.wireframe.buffer_type);
			indices.data_length = data_length;

		}

		return indices;
	};

	engine.create_geometry = function (geo) {
		geo = geo || {};
		geo.uuid = geo.uuid || engine.guid();
		geo.attr = geo.attr || {};
		engine._geometries.set(geo.uuid, geo);
		return geo;
	};
	engine.upload_geometry = env.upload_geometry = function (uuid, v_count, i_count, vertices, normals, uvs, indices, wire_indices) {




		//console.log([uuid, v_count, i_count, vertices, normals, uvs, indices]);
		const gl = engine.webgl.gl;
		const geo = engine.geometries[uuid] || {
			attr: {}
		};
		geo.uuid = uuid;
		engine._geometries.set(uuid, geo);


		geo.attr["a_position"] = engine.geometry_set_attr({}, engine.wa.fp32_array(v_count * 3, vertices)).uuid;
		geo.attr["a_normal"] = engine.geometry_set_attr({}, engine.wa.fp32_array(v_count * 3, normals)).uuid;
		geo.attr["a_uv"] = engine.geometry_set_attr({ item_size: 2 }, engine.wa.fp32_array(v_count * 2, uvs)).uuid;


		geo.draw_count = v_count;
		if (indices > 0) {
			geo.indices = geo.indices || { buffer: gl.createBuffer(), buffer_type: GL_DYNAMIC_DRAW };

			gl.bindBuffer(GL_ELEMENT_ARRAY_BUFFER, geo.indices.buffer);
			gl.bufferData(GL_ELEMENT_ARRAY_BUFFER, engine.wa.u32_array(i_count, indices), geo.indices.buffer_type);

			geo.indices.wireframe = geo.indices.wireframe || { buffer: gl.createBuffer(), buffer_type: GL_DYNAMIC_DRAW };
			geo.indices.data_length = i_count / 3;

			gl.bindBuffer(GL_ELEMENT_ARRAY_BUFFER, geo.indices.wireframe.buffer);
			gl.bufferData(GL_ELEMENT_ARRAY_BUFFER, engine.wa.u32_array(i_count * 2, wire_indices), geo.indices.wireframe.buffer_type);
			geo.draw_count = i_count;
		}




	}



	const kebabize = function (str) { return str.replace(/[A-Z]+(?![a-z])|[A-Z]/g, function ($, ofs) { return (ofs ? "_" : "") + $.toLowerCase() }); }

	function kebabize_object(a, b) {
		for (let k in a) {
			b[kebabize(k)] = a[k];
		}

		return b;
	}



	geometries.parse_gltf = (function () {
		const gltf = {};
		gltf.MODE_POINTS = 0;
		gltf.MODE_LINES = 1;
		gltf.MODE_LINE_LOOP = 2;
		gltf.MODE_LINE_STRIP = 3;
		gltf.MODE_TRIANGLES = 4;
		gltf.MODE_TRIANGLE_STRIP = 5;
		gltf.MODE_TRIANGLE_FAN = 6;

		gltf.TYPE_BYTE = 5120;
		gltf.TYPE_UNSIGNED_BYTE = 5121;
		gltf.TYPE_SHORT = 5122;
		gltf.TYPE_UNSIGNED_SHORT = 5123;
		gltf.TYPE_UNSIGNED_INT = 5125;
		gltf.TYPE_FLOAT = 5126;

		gltf.COMP_SCALAR = 1;
		gltf.COMP_VEC2 = 2;
		gltf.COMP_VEC3 = 3;
		gltf.COMP_VEC4 = 4;
		gltf.COMP_MAT2 = 4;
		gltf.COMP_MAT3 = 9;
		gltf.COMP_MAT4 = 16;
		console.log("gltf", [gltf]);

		function _float(v) {
			return v;
			return parseFloat(v.toFixed(5));
		}

		gltf.prepare_buffer = function (json, idx) {
			var buf = json.buffers[idx];

			if (buf.dView != undefined) return buf;

			if (json.binary) {
				let dv = new DataView(json.binary);
				buf.dView = new DataView(json.binary);
				return buf;
			}

			//Create and Fill DataView with buffer data
			var pos = buf.uri.indexOf("base64,") + 7,
				blob = window.atob(buf.uri.substr(pos)),
				dv = new DataView(new ArrayBuffer(blob.length));
			for (var i = 0; i < blob.length; i++) dv.setUint8(i, blob.charCodeAt(i));
			buf.dView = dv;

			//console.log("buffer len",buf.byteLength,dv.byteLength);
			//var fAry = new Float32Array(blob.length/4);
			//for(var j=0; j < fAry.length; j++) fAry[j] = dv.getFloat32(j*4,true);
			//console.log(fAry);
			return buf;
		}

		gltf.process_accessor = function (json, idx) {

			var a = json.accessors[idx],								//Accessor Alias Ref
				bView = json.bufferViews[a.bufferView],				//bufferView Ref

				buf = gltf.prepare_buffer(json, bView.buffer),					//Buffer Data decodes into a ArrayBuffer/DataView
				bOffset = (a.byteOffset || 0) + (bView.byteOffset || 0),	//Starting point for reading.
				bLen = 0,//a.count,//bView.byteLength,									//Byte Length for this Accessor

				TAry = null,												//Type Array Ref
				DFunc = null;												//DateView Function name

			//Figure out which Type Array we need to save the data in
			switch (a.componentType) {
				case gltf.TYPE_FLOAT: TAry = Float32Array; DFunc = "getFloat32"; break;
				case gltf.TYPE_SHORT: TAry = Int16Array; DFunc = "getInt16"; break;
				case gltf.TYPE_UNSIGNED_SHORT: TAry = Uint16Array; DFunc = "getUint16"; break;
				case gltf.TYPE_UNSIGNED_INT: TAry = Uint32Array; DFunc = "getUint32"; break;
				case gltf.TYPE_UNSIGNED_BYTE: TAry = Uint8Array; DFunc = "getUint8"; break;

				default: console.log("ERROR processAccessor", "componentType unknown", a.componentType); return null; break;
			}

			//When more then one accessor shares a buffer, The BufferView length is the whole section
			//but that won't work, so you need to calc the partition size of that whole chunk of data
			//The math in the spec about stride doesn't seem to work, it goes over bounds, what Im using works.
			//https://github.com/KhronosGroup/glTF/tree/master/specification/2.0#data-alignment
			if (bView.byteStride != undefined) bLen = bView.byteStride * a.count;
			else bLen = a.count * gltf["COMP_" + a.type] * TAry.BYTES_PER_ELEMENT; //elmCnt * compCnt * compByteSize)

			//Pull the data out of the dataView based on the Type.
			var bPer = TAry.BYTES_PER_ELEMENT,	//How many Bytes needed to make a single element
				aLen = bLen / bPer,				//Final Array Length
				ary = new TAry(aLen),			//Final Array
				p = 0;						//Starting position in DataView

			for (var i = 0; i < aLen; i++) {
				p = bOffset + i * bPer;
				ary[i] = buf.dView[DFunc](p, true);
			}

			//console.log(a.type,GLTFLoader["COMP_"+a.type],"offset",bOffset, "bLen",bLen, "aLen", aLen, ary);
			return {
				data: ary, max: a.max, min: a.min,
				data_length: a.count,
				item_size: gltf["COMP_" + a.type]
			};
		}


		gltf.load_skin = function (json, si) {
			var _skin = json.skins[si];
			var skin = { joints: [] };
			var mats = gltf.process_accessor(json, _skin.inverseBindMatrices);
			var j;
			_skin.joints.forEach(function (ji, ii) {

				j = json.nodes[ji];
				if (j.children) {
					j.children.forEach(function (ci) {
						json.nodes[ci].pi = ii;
					});
				}
				skin.joints[ii] = {
					pi: j.pi,
					name: j.name || ("joint" + ii),
					pos: j.translation,
					rot: j.rotation || [0, 0, 0, 1],
					scale: [1, 1, 1],
					bind_pos: new Float32Array(mats.data.buffer, (ii * 16) * 4, 16)
				};
				j = skin.joints[ii];
				for (ii = 0; ii < j.bind_pos.length; ii++) {
					j.bind_pos[ii] = _float(j.bind_pos[ii]);
				}



				j.pos[0] = _float(j.pos[0]);
				j.pos[1] = _float(j.pos[1]);
				j.pos[2] = _float(j.pos[2]);

				j.rot[0] = _float(j.rot[0]);
				j.rot[1] = _float(j.rot[1]);
				j.rot[2] = _float(j.rot[2]);
				j.rot[3] = _float(j.rot[3]);



			});

			skin.joints.forEach(function (j) {
				if (j.pi !== undefined) {
					j.pn = skin.joints[j.pi].name;
				}

			});

			return skin;
		}


		gltf.get_animations = function (json) {
			var animations = [];
			if (!json.animations) return animations;
			var samp, acc, min_time, max_time, ii, di1, di2;
			json.animations.forEach(function (_anim) {
				min_time = Infinity;
				max_time = -Infinity;

				var anim = { name: _anim.name, channels: [] };
				_anim.channels.forEach(function (_chann) {



					samp = _anim.samplers[_chann.sampler];

					acc = gltf.process_accessor(json, samp.output);
					var chann = {
						data: new Float32Array((acc.data.length / acc.compLen) * (acc.compLen + 1)),
						vsize: acc.compLen,
						target: json.nodes[_chann.target.node].name + "!" + (_chann.target.path.replace("translation", "position")),
						time: 0,
						length: 0
					};

					for (ii = 0; ii < acc.count; ii++) {
						di1 = ii * (chann.vsize + 1);
						chann.data[di1++] = -1;
						for (di2 = 0; di2 < chann.vsize; di2++) {
							chann.data[di1++] = acc.data[(ii * chann.vsize) + di2];
						}

					}



					acc = gltf.process_accessor(json, samp.input);

					min_time = Math.min(min_time, acc.min[0]);
					max_time = Math.max(max_time, acc.max[0]);
					chann.length = acc.max[0] - acc.min[0];
					chann.time = acc.min[0];


					for (ii = 0; ii < acc.count; ii++) {
						chann.data[ii * (chann.vsize + 1)] = acc.data[ii];
					}

					anim.channels.push(chann);

				});
				anim.duration = max_time - min_time;
				anim.channels.forEach(function (chann) {

					for (ii = 0; ii < chann.data.length; ii += (chann.vsize + 1)) {
						chann.data[ii] = parseFloat(((chann.data[ii] - chann.time) / chann.length).toFixed(5));
					}

					chann.length = (chann.length - chann.time) / anim.duration;
					chann.time /= anim.duration;

				});
				animations.push(anim);

			});

			return animations;
		};


		gltf.load_mesh = function (json, mi, si) {


			var mesh = { geos: [] };

			json.meshes[mi].primitives.forEach(function (p) {
				var gm = {};
				if (p.attributes.POSITION !== undefined) {
					gm.vertices = gltf.process_accessor(json, p.attributes.POSITION).data;
				}
				if (p.attributes.NORMAL !== undefined) {
					gm.normals = gltf.process_accessor(json, p.attributes.NORMAL).data;
				}
				if (p.attributes.TEXCOORD_0 !== undefined) {
					gm.uvs = gltf.process_accessor(json, p.attributes.TEXCOORD_0).data;
				}
				if (p.attributes.WEIGHTS_0 !== undefined) {
					gm.skin_weights = gltf.process_accessor(json, p.attributes.WEIGHTS_0).data;
				}
				if (p.attributes.JOINTS_0 !== undefined) {
					gm.skin_joints = new Float32Array(gltf.process_accessor(json, p.attributes.JOINTS_0).data);
				}

				if (p.indices !== undefined) {
					gm.indices = Array.prototype.slice.call(gltf.process_accessor(json, p.indices).data);

				}
				if (p.targets) {
					gm.targets = [];
					p.targets.forEach(function (tar) {
						const tt = {}
						var aa = null;
						if (p.attributes.POSITION !== undefined && tar.POSITION) {
							aa = gltf.process_accessor(json, tar.POSITION);
							tt.vertices = aa.data;
							tt.name = aa.name;
						}
						if (p.attributes.NORMAL !== undefined && tar.NORMAL) {
							tt.normals = gltf.process_accessor(json, tar.NORMAL).data;
						}
						gm.targets.push(tt);

					})
				}

				mesh.geos.push(gm);
			});


			if (si !== undefined) {
				mesh.skin = gltf.load_skin(json, si);
			}
			return mesh;
		};


		gltf.get_mesh = function (json, mi) {
			for (var i = 0; i < json.nodes.length; i++) {
				if (json.nodes[i].mesh === mi) {
					var mesh = gltf.load_mesh(json, mi, json.nodes[i].skin);
					mesh.name = json.nodes[i].name;
					return mesh;
				}
			}

		};

		gltf.get_meshes = function (json) {
			console.log(json);
			var meshes = [];
			for (var i = 0; i < json.meshes.length; i++) {
				meshes.push(gltf.get_mesh(json, i));
			}
			return meshes;

		};

		const BINARY_EXTENSION_HEADER_MAGIC = 'glTF';
		const BINARY_EXTENSION_HEADER_LENGTH = 12;
		const BINARY_EXTENSION_CHUNK_TYPES = {
			JSON: 0x4E4F534A,
			BIN: 0x004E4942
		};
		function decode_text(array) {
			if (typeof TextDecoder !== 'undefined') {
				return new TextDecoder().decode(array);
			}

			// Avoid the String.fromCharCode.apply(null, array) shortcut, which
			// throws a "maximum call stack size exceeded" error for large arrays.

			let s = '';
			for (let i = 0, il = array.length; i < il; i++) {
				// Implicitly assumes little-endian.
				s += String.fromCharCode(array[i]);
			}
			try {
				// merges multi-byte utf-8 characters.

				return decodeURIComponent(escape(s));
			} catch (e) {
				// see #16358

				return s;
			}
		}

		const anim_channels_types = {
			"translate": 1,
			"position": 1,
			"translation": 1,
			"scale": 2,
			"weights": 4,
			"rotation": 3,
			"quaternion": 3,

		}
		const anim_channels_types_size = {
			1: 3,
			2: 3,
			3: 4,
			4: 1
		};

		const map_uniforms_textures = {
			"baseColorTexture": "u_base_color_map",
			"normalTexture": "u_normal_map",
			"emissiveTexture": "u_emissive_color_map",
			"occlusionTexture2": "u_alpha_map"
		};
		const map_uniforms_values = {
			"metallicFactor": "u_metallic",
			"roughnessFactor": "u_roughness",
		};


		gltf.binary = function (data) {
			let content = null;
			let body = null;
			const headerView = new DataView(data, 0, BINARY_EXTENSION_HEADER_LENGTH);
			const header = {
				magic: decode_text(new Uint8Array(data.slice(0, 4))),
				version: headerView.getUint32(4, true),
				length: headerView.getUint32(8, true)
			};
			if (header.magic !== BINARY_EXTENSION_HEADER_MAGIC) {

				throw new Error('gltf Unsupported glTF-Binary header.');

			} else if (header.version < 2.0) {

				throw new Error('gltf legacy binary file detected.');

			}

			const chunkContentsLength = header.length - BINARY_EXTENSION_HEADER_LENGTH;
			const chunkView = new DataView(data, BINARY_EXTENSION_HEADER_LENGTH);
			let chunkIndex = 0;
			while (chunkIndex < chunkContentsLength) {

				const chunkLength = chunkView.getUint32(chunkIndex, true);
				chunkIndex += 4;
				const chunkType = chunkView.getUint32(chunkIndex, true);
				chunkIndex += 4;
				if (chunkType === BINARY_EXTENSION_CHUNK_TYPES.JSON) {

					const contentArray = new Uint8Array(data, BINARY_EXTENSION_HEADER_LENGTH + chunkIndex, chunkLength);
					content = decode_text(contentArray);

				} else if (chunkType === BINARY_EXTENSION_CHUNK_TYPES.BIN) {

					const byteOffset = BINARY_EXTENSION_HEADER_LENGTH + chunkIndex;
					body = data.slice(byteOffset, byteOffset + chunkLength);

				}

				// Clients must ignore chunks with unknown types.

				chunkIndex += chunkLength;

			}

			content = JSON.parse(content);
			content.binary = body;
			console.log("content", content);
			gltf.prepare_buffer(content, 0);
			let i = 0, bv;


			if (content.images) {
				let mg;
				for (i = 0; i < content.images.length; i++) {
					mg = content.images[i];
					bv = content.bufferViews[mg.bufferView];

					mg.url = URL.createObjectURL(new Blob([new Uint8Array(body, bv.byteOffset, bv.byteLength)], {
						type: mg.mimeType
					}));
				}
			}

			if (content.textures) {
				content.textures.forEach(tex => {
					//	Object.assign(tex, content.samplers[tex.sampler]);
					tex.sampler = content.samplers[tex.sampler];
					tex.url = content.images[tex.source].url;
				});
			}



			content.nodes.forEach(function (node, i) {
				node.index = i;
				if (node.mesh !== undefined) {
					content.meshes[node.mesh].node = i;
				}
				if (node.children) {
					node.children.forEach(function (ni) {
						content.nodes[ni].parent = i;
					})
				}
			});

			const nodes_seq = [];

			function nodes_seqs(i) {
				const nd = content.nodes[i];
				nd.seq = nodes_seq.length;

				if (nd.parent) {
					nd.parent = content.nodes[nd.parent].seq;
				}
				nodes_seq.push({
					name: nd.name,
					rotation: nd.rotation || [0, 0, 0, 1],
					position: nd.translation || [0, 0, 0],
					scale: nd.scale || [1, 1, 1],
					name: nd.name,
					parent: nd.parent
				});
				if (nd.children) {
					nd.children.forEach(nodes_seqs);
				}
			}
			content.nodes.forEach(function (n, i) {
				if (n.parent == undefined) nodes_seqs(i);
			})

			content.nodes_seq = nodes_seq;
			if (content.skins) {

				content.skins.forEach(skin => {
					const bind_mats = gltf.process_accessor(content, skin.inverseBindMatrices);
					skin.joints = skin.joints.map(function (j, i) {
						const node = content.nodes[j];
						const nd = nodes_seq[node.seq];
						nd.bind_pos = Array.prototype.slice.call(new Float32Array(bind_mats.data.buffer, (i * 16) * 4, 16));
						return node.seq;
					})

				})
			}

			if (content.animations) {
				content.all_animations = [];
				content.animations.forEach(ani => {
					const an = {
						name: ani.name, channels: [],
						first_key_time: 0,
						duration: 0
					};
					let time_min = Infinity, time_max = -Infinity
					ani.channels.forEach(cha => {
						cha.sampler = ani.samplers[cha.sampler];
						cha.sampler.input = gltf.process_accessor(content, cha.sampler.input);
						cha.sampler.output = gltf.process_accessor(content, cha.sampler.output);

						time_min = Math.min(time_min, cha.sampler.input.min[0]);
						time_max = Math.max(time_max, cha.sampler.input.max[0]);


						an.channels.push({
							times: Array.prototype.slice.call(cha.sampler.input.data),
							keys: Array.prototype.slice.call(cha.sampler.output.data),
							target: content.nodes[cha.target.node].seq,
							type: anim_channels_types[cha.target.path],
							size: anim_channels_types_size[anim_channels_types[cha.target.path]]
							//cha:cha,
						});
					});
					an.duration = Math.max(1 / 60, time_max - time_min);
					an.first_key_time = time_min;
					content.all_animations.push(an);


				})
			}


			content.geometries = [];
			if (content.meshes) {
				let mes;
				for (i = 0; i < content.meshes.length; i++) {
					mes = content.meshes[i];


					mes.primitives.forEach(p => {
						let gm = {
							attr: {}
						};
						for (let a in p.attributes) {
							const _a = gltf.process_accessor(content, p.attributes[a]);
							if (amap[a] === undefined) console.log("amap", a, amap[a]);
							if (a == "JOINTS_0") {
								gm.skeleton = content.nodes[mes.node].skin;
								_a.data = new Float32Array(Array.prototype.slice.call(_a.data));
							}
							gm.attr[amap[a]] = engine.geometry_set_attr({
								item_size: _a.item_size,
								stride: _a.stride,
								offset: _a.offset,
								divisor: _a.divisor,
							}, _a.data, _a.data.length);
							if (amap[a] == "a_position") {
								gm.draw_count = _a.data.length / _a.item_size;
							}
						}
						if (p.indices !== undefined) {
							gm.indices = gltf.process_accessor(content, p.indices);
							gm.indices = engine.geometry_set_indices({}, new Uint32Array(Array.prototype.slice.call(gm.indices.data))); //{ data: Array.prototype.slice.call(gm.indices.data), data_length: gm.indices.data.length };
							gm.draw_count = gm.indices.data_length;
						}


						if (p.targets) {
							gm.targets = [];
							p.targets.forEach(function (tar) {
								const tt = {};
								for (let a in tar) {
									tt[amap[a]] = gltf.process_accessor(content, tar[a]);
								}
								gm.targets.push(tt);

							});
						}

						const geo = gm;

						geo.uuid = geo.uuid || engine.guid();
						engine._geometries.set(geo.uuid, geo);

						content.geometries.push(geo);
						content.bounds_sphere = Math.max(content.bounds_sphere, geo.bounds_sphere);
						geo.material = p.material;
						//content.materials[p.material].needs_skin = gm.needs_skin;
						///geo.node = mes.node;
						p.geometry = geo;
					})





				}
			}

			const textures = {};
			const materials = [];
			if (content.materials) {
				function set_mat(mat, def) {
					for (k in def) {
						if (map_uniforms_textures[k]) {
							mat.uniforms[map_uniforms_textures[k]] = content.textures[def[k].index].url;
						}
						else if (map_uniforms_values[k]) {
							mat.uniforms[map_uniforms_values[k]] = def[k];
						}
					}
				}
				content.materials.forEach(function (def, i) {
					const mat = { uniforms: {} }
					set_mat(mat, def);
					if (def.pbrMetallicRoughness) {
						set_mat(mat, def.pbrMetallicRoughness);
					}
					materials[i] = mat;
				});
			}
			if (content.textures) {
				content.textures.forEach(function (tex) {
					textures[tex.url] = kebabize_object(tex.sampler, { url: tex.url });

				});
			}






			return {

				nodes: content.nodes_seq,
				geometries: content.geometries,
				textures: textures,
				materials: materials,
				animations: content.all_animations,
				skeletons: content.skins.map(function (s) {
					return s.joints
				})
			};
			return content;
		}


		return gltf;

	})();



	return geometries;

})();