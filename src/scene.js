import glm from "glm-js";
import * as T from './transforms';
import { default as plugins } from 'wplug';

import { auto_animation, listen_to_keys, get_params } from "./interactions";
import { print_debug } from "./debug";

import { draw_objects, init_scene_webgl } from "./webgl_scene";
import { get_plugins_desc, setup_active_plugins, get_active_plugins } from "./plugins";

/*********************************************************************
 * this module is responsible for the scene initialization
 * for what concerns the objects and scene structures and math operations
 * it creates vectors and matrices to be passed to the webgl_scene
 */
const DEBUG = {
    print_coords: false,
    print: false,
    interactions: false,
    animation: true
};

export const init_scene = _init_scene;
export const run_scene = _run;
export const stop_scene = _stop;


let ////////////////////////////////////////
    canvas,
    gl,
    program_running = false,
    objects_descriptions = [],
    scene_description = {},
    objects_info = [];

function _init_scene(in_canvas, desc) {
    canvas = in_canvas;
    if (!canvas || !desc) return;

    const { scene_desc, objects_desc } = desc;

    gl = canvas.getContext('webgl2');

    objects_descriptions = objects_desc;
    scene_description = scene_desc;

    setup_active_plugins(plugins, desc);
    objects_info = _init_scene_struct(objects_descriptions, scene_description);

    DEBUG.interactions && listen_to_keys();
    DEBUG.animation && auto_animation();

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
    const { objects, Mlookat } = _compute_modelview(objects_info.objects_to_draw, scene_description);

    Object.assign(objects_info, {
        objects_to_draw: objects,
        view_matrix: Mlookat,
        resolution: [canvas.width, canvas.height]
    });

    draw_objects(gl, objects_info, time || 0);
}

function _stop() {
    program_running = false;
}


function _init_scene_struct(objs_list, scene_desc) {
    let { objects, Mlookat, lighting } = Object.assign(
        _compute_modelview(
            _compute_objects_coords(
                objs_list,
                scene_desc
            ),
            scene_desc),
        // _compute_ligthing(scene_desc)
        Object.keys(scene_desc).reduce((plugs_o, desc_key) => Object.assign(
            plugs_o,
            plugins[desc_key] ? get_plugins_desc(plugins, desc_key, scene_desc) : {}
        ), {})
    );

    const OI = {
        objects_to_draw: objects,
        scene_desc,
        projection_matrix: T.perspective(90, canvas.width / canvas.height, .1, 99),
        view_matrix: Mlookat,
        resolution: [canvas.width, canvas.height],
        lighting
    }

    DEBUG.print_coords && print_debug(OI, canvas);

    return OI;
}

function _compute_objects_coords(objects, scene_desc) {
    return objects.map((obj_def) => {
        return Object.assign(obj_def, {
            ////////////////////
            //Coordinates and normals put in a single Float32Array
            coords: _compute_coords_and_normals(obj_def),

            ////////////////////
            //model transform computed multiplying up all the transformations in the object description file
            model_matrix: _compute_model_matrix(obj_def.id, scene_desc)
        })
    });
}

function _compute_coords_and_normals(obj_def) {
    const { coords_dim, coordinates_def } = obj_def;

    //IF we're using 3D and there's some attribute defined to contain "normals" (is_normals: true) then:
    //
    //for each coord (which has x,y,z) we'll have "coords_dim" values more (i.e. 1 normal vec coords)
    //EXAMPLE 
    //coords_dim = 3 
    //coords = [p1x, p1y, p1z, p2x, p2y, p2z] (two points)
    //out = [
    //    p1x, p1y, p1z, norm_p1_x, norm_p1_y, norm_p1_z, 
    //    p2x, p2y, p2z, norm_p2_x, norm_p2_y, norm_p2_z
    //]
    const { attributes } = obj_def.program_info_def.shaders_data,
        has_normals = coords_dim === 3 && Object.keys(attributes).find(attr_key => attributes[attr_key].is_normals) !== undefined,
        fa_len = coords_dim * (has_normals ? 2 : 1);


    let data = coordinates_def
        .reduce((o, coord_buf, i, coords_a) => {
            if (i > 0 && i % coords_dim === 0) {
                o.normal = null;
            }

            let icurr = i * (coords_dim * (has_normals ? 2 : 1)),
                n = has_normals ? (o.normal || _normal(coords_a.slice(i, i + coords_dim))) : null,
                k = 0,
                j = icurr;

            for (j = icurr; j < icurr + coords_dim; j++) {
                o.ab[j] = coord_buf[k];
                k++;
            }

            if (n) {
                o.ab[j] = n[0];
                o.ab[j + 1] = n[1];
                o.ab[j + 2] = n[2];

                o.normal = n;
            }

            return o;
        }, {
            ab: new Float32Array(coordinates_def.length * fa_len),
            normal: null
        });

    return data.ab;
}

function _normal(triangle_vertices) {
    let a = glm.vec3(triangle_vertices[0]),
        b = glm.vec3(triangle_vertices[1]),
        c = glm.vec3(triangle_vertices[2]);

    return glm.cross(b.sub(a), c.sub(a));
}


//this is put in a separate function because it's computed at each animation frame
function _compute_modelview(objects, scene_desc) {
    const { model_rot_x, model_rot_y } = get_params();
    const C = scene_desc.camera;
    let C_pos = glm.vec3(1),
        Mlookat = glm.mat4(1);

    let M_r = T.rotate_axis(glm.vec3(1, 0, 0), model_rot_x).mul(
        T.rotate_axis(glm.vec3(0, 1, 0), model_rot_y)
    );

    // C_pos = M_r.mul(glm.vec4(C.position.concat(1)));
    // let C_up = M_r.mul(glm.vec4(C.up.concat(0)));
    C_pos = glm.vec4(C.position.concat(1.));
    let C_up = glm.vec4(C.up.concat(0.));

    Mlookat = T.lookAt(C_pos.xyz, glm.vec3(C.center), glm.vec3(C_up.x, C_up.y, C_up.z));

    objects.forEach((obj_def) => {
        obj_def.model_matrix = M_r.mul(_compute_model_matrix(obj_def.id, scene_desc));
        obj_def.model_view_matrix = Mlookat.mul(obj_def.model_matrix);
    });

    return {
        objects,
        Mlookat
    };
}

function _compute_model_matrix(obj_id, scene_desc) {
    return Object.keys(scene_desc)
        .filter((scene_desc_key) => scene_desc_key === obj_id)
        .map((scene_desc_key) => scene_desc[scene_desc_key].transforms || [])
        .flat()
        .reduce((M, transform_desc, i, arr) => {
            let transform_fn = T[transform_desc.type] || (() => glm.mat4(1));
            let M_ret = M.mul(transform_fn(glm.vec3(transform_desc.amount)));

            return M_ret;

        }, glm.mat4(1))
}