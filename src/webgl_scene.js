import * as square_vert from "../shaders/square.vert.glsl";
import * as square_frag from "../shaders/square.frag.glsl";

import { create_program, init_vao } from "./webgl_utils";

/*********************************************************************
 * this module is responsible for the scene initialization and management
 * from the point of view of webgl
 * so it takes vectors and matrices objects and creates webgl buffers
 * attributes uniforms etc etc to manage the actual webgl program.
 * 
 * utilities are stored into webgl_utils.js
 */

export const init_scene_webgl = _init_scene_webgl;
export const run_program = _run_program;
export const stop_program = _stop_program;


////////////////////////////////////////////////////////////
let program_info = null,
    running = false;

function _init_scene_webgl(gl, program_opts) {
    program_info = {
        attributes: {},
        attributes_desc: [
            {
                name: 'a_position',
                opts: [3, gl.FLOAT, false, 0, 0]
            }
        ],
        uniforms: {},
        uniforms_desc: [
            {
                name: 'u_time',
                opts: ['1f']
            }
        ]
    };

    return Object.assign(program_info, _init_webgl_program(square_vert, square_frag, program_info));
}

function _run_program(objects_info) {
    running = true;
    _do_run(objects_info);
}

function _stop_program() {
    running = false;
}


function _do_run(objects_info, time) {
    if (running) requestAnimationFrame(_do_run.bind(null, objects_info));
    if (time !== undefined) console.info("TIME PASSING BY", time);
    objects_info.objects_to_draw.forEach((obj) => {
        //runs the actual webgl program to draw the object
    });
}

function _init_webgl_program(vert, frag, program_info) {
    program_info.program = create_program(vert, frag);
    return init_vao(gl, program_info);
}