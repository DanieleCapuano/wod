import glm from "glm-js";

import * as square_mod from "../data/square.json";
import * as scene_mod from "../data/scene.json";
import * as T from './transforms';

import { init_scene_webgl, run_program, stop_program } from "./webgl_scene";

/*********************************************************************
 * this module is responsible for the scene initialization
 * for what concerns the objects and scene structures and math operations
 * it creates vectors and matrices to be passed to the webgl_scene
 */

export const init_scene = _init_scene;
export const run_scene = _run;
export const stop_scene = _stop;


let ////////////////////////////////////////
    canvas,
    gl,
    objects_info = [];

const square_desc = square_mod.default || square_mod;    //1 square object
const scene_desc = scene_mod.default || scene_mod;       //contains camera position, fov, etc

function _init_scene(in_canvas) {
    canvas = in_canvas;
    if (!canvas) return;

    gl = canvas.getContext('webgl2');
    console.info("Context and input data");
    console.info(gl, square_desc, scene_desc);

    let input_objects = [square_desc];
    objects_info = _init_scene_struct(input_objects, scene);
    console.info("SCENE DATA", objects_info);

    init_scene_webgl(canvas, gl);
}

function _run() {
    console.info("RUNNING START");
    run_program(objects_info);
}

function _stop() {
    console.info("STOP RUNNING");
    stop_program();
}


function _init_scene_struct(objects, scene_desc) {
    let obj_list = _init_objects(objects, scene_desc);

    return {
        objects_to_draw: obj_list,
        projection_matrix: T.perspective(45, canvas.width / canvas.height, 1, 150)
    }
}

function _init_objects(objects, scene_desc) {
    const C = scene_desc.camera,
          Mlookup = T.lookUp(glm.vec3(C.position), glm.vec3(C.up));

    return objects.map((obj_def) => {
        return {
            coords: obj_def.coordinates.map((coords_array) => {
                let coords = glm.vec3(coords_array);
                return glm.vec4(coords, 1.);
            }),
            model_view: Mlookup.mul(Object.keys(scene_desc)
                .filter(scene_desc_key => scene_desc_key === obj_def.id)
                .map(scene_desc_key => scene_desc[scene_desc_key].transforms || [])
                .reduce((M, transform_desc) => {
                    let //////////////////////////////////////
                        transform_fn = T[transform_desc.type] || (() => glm.mat4(1)),
                        ret_M = M;

                    return ret_M.mul(transform_fn(null, transform_desc.amount));

                }, glm.mat4(1)))
        }
    });
}