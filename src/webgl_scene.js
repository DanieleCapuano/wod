import * as square_vert from "../shaders/square.vert.glsl";
import * as square_frag from "../shaders/square.frag.glsl";

import { buffer_data, create_program, init_vao, set_uniforms } from "./webgl_utils";

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
let programs_info = null,
    running = false;

function _init_scene_webgl(gl, objects_info) {
    programs_info = objects_info.objects_to_draw.reduce((prog_info, oi) => {
        const pi = _init_webgl_program(gl, square_vert, square_frag, {
            attributes: {
                a_position: {
                    name: 'a_position',
                    opts: [3, gl.FLOAT, false, 0, 0]
                }
            },
            uniforms: {
                u_time: {
                    name: 'u_time',
                    opts: {
                        fn: '1f'
                    }
                },
                u_modelview: {
                    name: 'u_modelview',
                    opts: {
                        fn: 'Matrix4fv'
                    }
                },
                u_projection: {
                    name: 'u_projection',
                    opts: {
                        fn: 'Matrix4fv'
                    }
                }
            }
        });
        Object.keys(pi.attributes).forEach((attr_name) => {
            buffer_data(gl, {
                [attr_name]: oi.coords
            }, pi);
        });

        return Object.assign(prog_info, {
            [oi.id]: Object.assign({}, oi, {
                program_info: pi
            })
        });
    }, {});
}

function _run_program(gl, objects_info) {
    running = true;
    _do_run(gl, objects_info);
}

function _stop_program() {
    running = false;
}


function _do_run(gl, objects_info, time) {
    if (running) requestAnimationFrame(_do_run.bind(null, gl, objects_info));

    // gl.clearColor(0, 0, 0, 1);
    // gl.clear(gl.COLOR_BUFFER_BIT);
    // gl.enable(gl.DEPTH_TEST);
    // gl.enable(gl.CULL_FACE);
    // gl.cullFace(gl.FRONT_AND_BACK);
    // gl.disable(gl.CULL_FACE);

    objects_info.objects_to_draw.forEach((obj) => {
        const prog_info = programs_info[obj.id],
            { program, vao } = prog_info.program_info;

        gl.useProgram(program);
        gl.bindVertexArray(vao);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

        set_uniforms(gl, {
            u_time: time || 0,
            u_modelview: obj.model_view_matrix.elements,
            u_projection: objects_info.projection_matrix.elements
        }, prog_info);

        //VERY IMPORTANT: the third argument represents the NUMBER OF POINTS to draw, NOT the number of objects (e.g. "triangles")
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    });
}

function _init_webgl_program(gl, vert, frag, program_info) {
    program_info.program = create_program(gl, vert, frag);
    return init_vao(gl, program_info);
}