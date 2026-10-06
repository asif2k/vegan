
static number time, time_delta;
// objects: js id -> internal id.  body_ref / shape_ref: the way back, internal id -> js id (separate: a body and a shape can have the same internal id)
static uint32_t objects[4096 * 4], body_ref[4096 * 4], shape_ref[4096 * 4], frame_id = 0, track[4096 * 8], ti = 0, data_response[16384], di = 0;


WASM_EXPORT uint32_t* worker_objects() {
	return objects;
}

WASM_EXPORT uint32_t* worker_track() {
	return track;
}

WASM_EXPORT int worker_on_payload(uint32_t* u32) {
	number* f32 = (number*)u32;
	int i = 4, id, tp;
	int cmd_count = u32[0];

	tra_camera_node* cam;
	int32_t tra;
	number a, b, c, d, e, f, g;
	number* w;

	uint32_t i0, i1, i2;
	number f0, f1, f2, f3, f4, f5, f6, f7;


	uint32_t cmd;
	while (i < cmd_count) {
		cmd = u32[i++];
		switch (cmd) {

		

		case CMD_ONFRAME:
			time = f32[i++];
			time_delta = f32[i++];
			frame_id = u32[i++];
			global_camera_position[0] = f32[i++];
			global_camera_position[1] = f32[i++];
			global_camera_position[2] = f32[i++];
			global_camera_position[3] = f32[i++];


			break;

		case CMD_TRA_CREATE:
			id = u32[i++];
			tra = tra_create_node();
			objects[id] = (uint32_t)tra;
			track[ti++] = CMD_TRA_CREATE;
			track[ti++] = id;
			break;

		case CMD_TRA_MODEL_CREATE:
			id = u32[i++];
			tra = tra_create_model(0);
			objects[id] = (uint32_t)tra;
			track[ti++] = CMD_TRA_MODEL_CREATE;
			track[ti++] = id;
			break;

		case CMD_TRA_MODEL_SET_EULAR:
			tra = (int32_t)objects[u32[i++]];
			a = f32[i++]; b = f32[i++]; c = f32[i++];
			tra_set_eular(TM_NODE(tra), a, b, c);
			break;

		case CMD_TRA_MODEL_ADD_POSITON:
			tra = (int32_t)objects[u32[i++]];
			a = f32[i++]; b = f32[i++]; c = f32[i++];
			tra_add_position(TM_NODE(tra), a, b, c);
			break;

		case CMD_TRA_MODEL_SET_POSITON:
			tra = (int32_t)objects[u32[i++]];
			a = f32[i++]; b = f32[i++]; c = f32[i++];
			tra_set_position(TM_NODE(tra), a, b, c);
			break;

		case CMD_TRA_MODEL_SET_ROTATION:
			tra = (int32_t)objects[u32[i++]];
			a = f32[i++]; b = f32[i++]; c = f32[i++]; d = f32[i++];
			tra_set_rotation(TM_NODE(tra), a, b, c, d);

			break;

		
		case CMD_TRA_CAMERA_CREATE:
			id = u32[i++];
			tra = (int32_t)objects[u32[i++]];
			cam = tra_create_camera_node(tra);
			if (u32[i++] == 1) {
				tra_set_camera_perspective(cam, f32[i + 0], f32[i + 1], f32[i + 2], f32[i + 3]);
				i += 4;
			}
			else {
				tra_set_camera_ortho(cam, f32[i + 0], f32[i + 1], f32[i + 2], f32[i + 3], f32[i + 4], f32[i + 5], f32[i + 6]);
				i += 7;
			}
			objects[id] = (uint32_t)cam;
			track[ti++] = CMD_TRA_CAMERA_CREATE;
			track[ti++] = id;
			break;

		case CMD_TRA_CAMERA_SET_PERSPECTIVE:
			cam = (tra_camera_node*)objects[u32[i++]];
			tra_set_camera_perspective(cam, f32[i + 0], f32[i + 1], f32[i + 2], f32[i + 3]);
			i += 4;

			break;

		case CMD_TRA_CAMERA_UPDATE_ASPECT:
			cam = (tra_camera_node*)objects[u32[i++]];
			tra_camera_update_aspect(cam, f32[i++]);
			break;

		case CMD_TRA_CAMERA_LOOK_AT:
			cam = (tra_camera_node*)objects[u32[i++]];
			tra = (int32_t)objects[u32[i++]];
			a = f32[i++]; b = f32[i++]; c = f32[i++]; d = f32[i++];
			tra_camera_look_at(cam, TM_NODE(tra), a, b, c, d);


			break;

		case CMD_TRA_CAMERA_UPDATE_MOUSE_RAY:
			cam = (tra_camera_node*)objects[u32[i++]];
			a = f32[i++]; b = f32[i++]; c = f32[i++]; d = f32[i++];
			tra_get_mouse_ray_direction(cam, cam->mouse_ray, a, b, c, d);
			break;
		
		}

	}


	tra_update_begin(time_delta);
	int j = 0;
	while (j < ti) {
		tp = track[j++];
		id = track[j++];
		if (tp == CMD_TRA_CAMERA_CREATE) {
			cam = (tra_camera_node*)objects[id];
			tra_process_camera(cam);
		}
	}

	
	tra_update_end(time_delta);



	return i;
}



WASM_EXPORT int worker_payload_response(uint32_t* u32, int i, uint32_t mem_size, uint32_t frame_time) {
	number* f32 = (number*)u32;

	u32[i++] = CMD_ONFRAME;
	u32[i++] = frame_id;
	u32[i++] = get_static_memory_size();
	u32[i++] = mem_size;
	u32[i++] = global_memory_pointer() * 4;
	u32[i++] = ti;
	u32[i++] = frame_time;


	uint32_t  id, tp, a, b;
	tra_camera_node* cam;
	int32_t tra;
	int j = 0, k = 0, sz;
	u32[i++] = CMD_UPDATE_FLOAT_VIEWS;
	int temp = i++;
	number* w;
	number v01[3];
	while (j < ti) {
		tp = track[j++];
		id = track[j++];
		if (tp == CMD_TRA_CAMERA_CREATE) {
			cam = (tra_camera_node*)objects[id];
			uint32_t* ref = (uint32_t*)cam;

			for (k = 2; k < 121; k++) {
				u32[i++] = ref[k];
			}
			w = TN_WPOS(cam->node);
			f32[i++] = w[0];
			f32[i++] = w[1];
			f32[i++] = w[2];

			w = cam->mouse_ray;
			f32[i++] = w[0];
			f32[i++] = w[1];
			f32[i++] = w[2];


		}
		else if (tp == CMD_TRA_MODEL_CREATE) {
			tra = (int32_t)objects[id];

			id = TM_NODE(tra);
			w = TN_WPOS(id);
			f32[i++] = w[0];
			f32[i++] = w[1];
			f32[i++] = w[2];

			w = TN_WROT(id);
			f32[i++] = w[0];
			f32[i++] = w[1];
			f32[i++] = w[2];
			f32[i++] = w[3];

			w = TN_WSCALE(id);
			f32[i++] = w[0];
			f32[i++] = w[1];
			f32[i++] = w[2];

			w = TM_MAT(tra);
			for (k = 0; k < 16; k++) {
				f32[i++] = w[k];
			}
		}
	}
	u32[temp] = i - temp;

	if (di > 0) {
		j = 0;
		//print("data response %d", di);
		while (j < di) {
			tp = data_response[j++];
			id = data_response[j++];
			if (tp == CMD_DATA_RESPONSE) {
				u32[i++] = CMD_DATA_RESPONSE;
				u32[i++] = id;
				sz = data_response[j++];
				u32[i++] = sz;
				number* data = (number*)data_response[j++];
				k = 0;
				while (k < sz) {
					f32[i++] = data[k++];
				}
			}			
		}
		di = 0;
	}

	
	scratch_reset();
	return i;
}
