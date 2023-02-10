import glm from "glm-js";
import * as T from './transforms';

import { draw_objects, init_scene_webgl, run_program, stop_program } from "./webgl_scene";

/*********************************************************************
 * this module is responsible for the scene initialization
 * for what concerns the objects and scene structures and math operations
 * it creates vectors and matrices to be passed to the webgl_scene
 */
const DEBUG = false;

export const init_scene = _init_scene;
export const run_scene = _run;
export const stop_scene = _stop;


let ////////////////////////////////////////
    canvas,
    gl,
    program_running = false,
    objects_descriptions = [],
    scene_description = {},
    rot_amount = 1,
    camera_rot_x = 0,
    camera_rot_y = 0,
    objects_info = [];

function _init_scene(in_canvas, desc) {
    canvas = in_canvas;
    if (!canvas || !desc) return;

    const { scene_desc, objects_desc } = desc;

    gl = canvas.getContext('webgl2');

    objects_descriptions = objects_desc;
    scene_description = scene_desc;
    objects_info = _init_scene_struct(objects_descriptions, scene_description);

    DEBUG && _listen_to_keys();

    return {
        webgl_scene: init_scene_webgl(gl, objects_info),
        objects_info
    };
}

function _run() {
    program_running = true;
    _do_run();
}

function _do_run(time) {
    if (program_running) requestAnimationFrame(_do_run);
    objects_info.objects_to_draw = _compute_modelview(objects_info.objects_to_draw, scene_description);
    draw_objects(gl, objects_info, time || 0);
}

function _stop() {
    program_running = false;
}

function _listen_to_keys() {
    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            case "Down": // IE/Edge specific value
            case "ArrowDown":
                camera_rot_x -= rot_amount;
                break;
            case "Up": // IE/Edge specific value
            case "ArrowUp":
                camera_rot_x += rot_amount;
                break;
            case "Left": // IE/Edge specific value
            case "ArrowLeft":
                camera_rot_y += rot_amount;
                break;
            case "Right": // IE/Edge specific value
            case "ArrowRight":
                camera_rot_y -= rot_amount;
                break;
        }
        DEBUG && console.info("ROT", camera_rot_x, camera_rot_y);
    });
}


function _init_scene_struct(objects, scene_desc) {
    let obj_list = _compute_modelview(_compute_objects_coords(objects, scene_desc), scene_desc);

    const OI = {
        objects_to_draw: obj_list,
        projection_matrix: T.perspective(90, canvas.width / canvas.height, .1, 99)
    }

    DEBUG && _print_debug(OI);

    return OI;
}

function _compute_objects_coords(objects, scene_desc) {
    return objects.map((obj_def) => {
        return Object.assign(obj_def, {
            ////////////////////
            //Coordinates and normals put in a single Float32Array
            coords_and_normals: _compute_coords_and_normals(obj_def),

            ////////////////////
            //model transform computed multiplying up all the transformations in the object description file
            model_matrix: Object.keys(scene_desc)
                .filter((scene_desc_key) => scene_desc_key === obj_def.id)
                .map((scene_desc_key) => scene_desc[scene_desc_key].transforms || [])
                .flat()
                .reduce((M, transform_desc, i, arr) => {
                    let transform_fn = T[transform_desc.type] || (() => glm.mat4(1));
                    let M_ret = M.mul(transform_fn(glm.vec3(transform_desc.amount)));

                    return M_ret;

                }, glm.mat4(1))
        })
    });
}

function _compute_coords_and_normals(obj_def) {
    const { coords_dim, coordinates_def } = obj_def;

    //IF we're using 3D
    //for each coord (which has x,y,z) we'll have "coords_dim" values more (i.e. 1 normal vec coords)
    //EXAMPLE 
    //coords_dim = 3 
    //coords = [p1x, p1y, p1z, p2x, p2y, p2z] (two points)
    //out = [
    //    p1x, p1y, p1z, norm_p1_x, norm_p1_y, norm_p1_z, 
    //    p2x, p2y, p2z, norm_p2_x, norm_p2_y, norm_p2_z
    //]
    const is_3d = coords_dim === 3,
          fa_len = coords_dim * (is_3d ? 2 : 1);
          

    return coordinates_def
        .reduce((ab, coord_buf, i) => {
            let icurr = i * (coords_dim * (is_3d ? 2 : 1)),
                n = is_3d ? _normal(coordinates_def, i) : null,
                k = 0,
                j = icurr;

            for (j = icurr; j < icurr + coords_dim; j++) {
                ab[j] = coord_buf[k];
                k++;
            }

            if (n) {
                ab[j] = n[0];
                ab[j + 1] = n[1];
                ab[j + 2] = n[2];
            }

            return ab;
        }, new Float32Array(coordinates_def.length * fa_len))
}

function _normal(coords, i) {
    let ip1 = i + 1,
        a = ip1 === coords.length ? coords[i] : coords[ip1],
        b = ip1 === coords.length ? coords[i - 1] : coords[i];

    return glm.cross(glm.vec3(a), glm.vec3(b));
}

//this is put in a separate function because it's computed at each animation frame
function _compute_modelview(objects, scene_desc) {
    const C = scene_desc.camera;
    let C_pos = glm.vec3(1),
        C_up = glm.vec3(C.up),
        Mlookat = glm.mat4(1);

    let M_r = T.rotate_axis(glm.vec3(1, 0, 0), camera_rot_x).mul(
        T.rotate_axis(glm.vec3(0, 1, 0), camera_rot_y)
    );

    C_pos = M_r.mul(glm.vec4(C.position.concat(1)));
    C_up = T.rotate_axis(glm.vec3(1, 0, 0), camera_rot_x, C_up);
    Mlookat = T.lookAt(C_pos.xyz, glm.vec3(C.center), C_up);

    objects.forEach((obj_def) => obj_def.model_view_matrix = Mlookat.mul(obj_def.model_matrix));
    return objects;
}

//this prints the final results of the graphics pipeline computation, i.e. what arrives to the fragment shader
function _print_debug(OI) {
    OI.objects_to_draw.forEach((obj) => {
        console.info("M MODELVIEW", obj.model_view_matrix.elements);
        console.info("M PROJECTION", OI.projection_matrix.elements);
        let ////////////////////////////////
            model_view_matrix = obj.model_view_matrix,
            projection_matrix = OI.projection_matrix,
            mvp = OI.projection_matrix.mul(
                obj.model_view_matrix
            );
        console.info("M MVP", mvp.elements);

        let //////////////////////////////////
            a = [],
            coords = obj.coords_and_normals,
            j = 0,
            f32a = new Float32Array(coords.length * (obj.coords_dim + 1)); //obj.coords_dim + 1 because we're sending homogeneous coordinates to the GPU

        for (let i = 0; i < coords.length; i += obj.coords_dim) {
            console.info("IT", i, coords[i], coords[i + 1], coords[i + 2]);
            let ////////////////////////////////
                transf_vec_mv = model_view_matrix.mul(
                    glm.vec4(coords[i], coords[i + 1], coords[i + 2], 1.)
                ),
                transf_vec_pj = projection_matrix.mul(transf_vec_mv),
                tr_elems = transf_vec_pj.elements;

            console.info("TRANSFORMED COORDS MODELVIEW", transf_vec_mv.elements);
            console.info("TRANSFORMED COORDS PROJ", transf_vec_pj.elements);

            f32a[j] = tr_elems[0];
            f32a[j + 1] = tr_elems[1];
            f32a[j + 2] = tr_elems[2];
            f32a[j + 3] = tr_elems[3];

            a.push(glm.vec4(
                tr_elems[0] / tr_elems[3],
                tr_elems[1] / tr_elems[3],
                tr_elems[2] / tr_elems[3],
                1.
            ));

            j += 4;
        }
        let vl = 0,
            vr = canvas.width,
            vt = canvas.height,
            vb = 0,
            viewport_mat = glm.mat4(
                (vr - vl) / 2, 0, 0, 0,
                0, (vt - vb) / 2, 0, 0,
                0, 0, 1 / 2, 0,
                (vr + vl) / 2, (vt + vb) / 2, 1 / 2, 1
            );
        a = a.map(vec => viewport_mat.mul(vec));
        console.info("TRANSFORMED ARRS", f32a, a.map(vec => vec.elements).flat());
    });
}