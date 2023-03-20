import glm from "glm-js";
import * as T from './transforms';

import { auto_animation, listen_to_keys, get_params } from "./interactions";

import { draw_objects, init_scene_webgl } from "./webgl_scene";
import { get_plugins_model, plugins_clear_all, setup_active_plugins } from "./plugins";

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
    program_running = false;

function _init_scene(scene_config) {
    const { canvas } = (scene_config || {});
    if (!canvas || !scene_config) return;

    let gl = scene_config.gl || canvas.getContext('webgl2', {
        // desynchronized: true, //hints the user agent to reduce the latency by desynchronizing the canvas paint cycle from the event loop
        // powerPreference: 'high-performance'
    });
    scene_config.gl = gl;

    //the "scene_config" object will be augmented 
    //with all the needed data and that's all we'll need!

    //plugins could generate coordinates or change the configuration descriptions
    scene_config = setup_active_plugins(scene_config);

    //computes coordinates, normals and whatever
    scene_config = _init_scene_struct(scene_config);

    DEBUG.interactions && listen_to_keys();
    DEBUG.animation && auto_animation();

    return init_scene_webgl(scene_config);  //this will return the scene_config with enriched data for each object in objects_to_draw
}

function _init_scene_struct(scene_config) {
    const { canvas } = scene_config;
    return [
        _compute_objects_coords,
        _compute_modelview,
        get_plugins_model
    ].reduce(
        (d, fn) => Object.assign(d, fn(d)),
        Object.assign(scene_config, {
            projection_matrix: T.perspective(90, canvas.width / canvas.height, .1, 99),
            resolution: [canvas.width, canvas.height]
        })
    );
}

function _compute_objects_coords(scene_config) {
    const { scene_desc, objects_desc } = scene_config;
    return {
        objects_to_draw: objects_desc.map((obj_def) => {
            return Object.assign(obj_def, {
                ////////////////////
                //Coordinates and normals put in a single Float32Array
                coords: _compute_coords_and_normals(obj_def),

                ////////////////////
                //model transform computed multiplying up all the transformations in the object description file
                model_matrix: _compute_model_matrix(obj_def.id, scene_desc)
            })
        })
    };
}


//this is put in a separate function because it's computed at each animation frame
function _compute_modelview(scene_config) {
    const { scene_desc, objects_to_draw } = scene_config;
    const C = scene_desc.camera;
    let C_pos = glm.vec3(1),
        view_matrix = glm.mat4(1),
        M_r = scene_config.get_modelview_transform ? scene_config.get_modelview_transform(scene_config) : glm.mat4(1);

    //TODO: allow also the camera transforms to be updated from client
    C_pos = glm.vec4(C.position.concat(1.));
    let C_up = glm.vec4(C.up.concat(0.));
    view_matrix = T.lookAt(C_pos.xyz, glm.vec3(C.center), glm.vec3(C_up.x, C_up.y, C_up.z));

    for (let i = 0; i < objects_to_draw.length; i++) {
        let obj_def = objects_to_draw[i];
        let M_r_obj = M_r.mul(obj_def.get_modelview_transform ? obj_def.get_modelview_transform(obj_def, scene_config) : glm.mat4(1));
        obj_def.model_matrix = M_r_obj.mul(_compute_model_matrix(obj_def.id, scene_desc));
    }

    return {
        view_matrix
    };
}

function _compute_model_matrix(obj_id, scene_desc) {
    let objs = scene_desc.objects,
        objs_keys = Object.keys(objs),
        M = glm.mat4(1);
    for (let i = 0; i < objs_keys.length; i++) {
        if (objs_keys[i] === obj_id) {
            let tr = objs[objs_keys[i]].transforms;
            for (let j = 0; j < tr.length; j++) {
                let transform_desc = tr[j],
                    transform_fn = T[transform_desc.type] || (() => glm.mat4(1));
                M = M.mul(transform_fn(glm.vec3(transform_desc.amount)));
            }
        }
    }
    return M;
}


/////////////////////////////////////////////////////
// RUNNING
/////////////////////////////////////////////////////

function _run(scene_config) {
    program_running = true;
    _do_run(scene_config);
}

let rafId = null;
function _do_run(scene_config, time) {
    const { canvas, gl } = scene_config;

    draw_objects(Object.assign(
        scene_config,
        _compute_modelview(scene_config),
        { resolution: [canvas.width, canvas.height] }
    ), time || 0);

    if (program_running && !gl.isContextLost()) {
        rafId = requestAnimationFrame(_do_run.bind(null, scene_config));
    }
    else {
        rafId !== null && cancelAnimationFrame(rafId);
        rafId = null;
        return;
    }
}


function _stop(scene_config) {
    program_running = false;

    //call plugins' cleanup function
    return plugins_clear_all(scene_config);
}



//MAYBE the following two functions could be put in a separate plugin (?)
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