import { create_program, fill_position_buffer, generate_attributes_from_config, init_vao, setup_indices, set_uniforms } from "wbase";
import { plugins_drawloop_callback, plugins_program_init } from "./plugins";

/*********************************************************************
 * this module is responsible for the scene initialization and management
 * from the point of view of webgl
 * so it takes vectors and matrices objects and creates webgl buffers
 * attributes uniforms etc etc to manage the actual webgl program.
 * 
 * utilities are taken from wbase library
 */

export const init_scene_webgl = _init_scene_webgl;
export const draw_objects = _draw_objects;
export const clear_scene_webgl = _clear_scene_webgl;


////////////////////////////////////////////////////////////
/*
 * we have the following data structure
   scene_config: {
    objects_to_draw: [
        {id: obj1, object_program: {program_info: {program: ..., vao: ...}, ...}},
        ...
        {id: objn, object_program: {program_info: {program: ..., vao: ...}, ...}}
    ]
   }
*/
function _init_scene_webgl(scene_config) {
    const { gl, objects_to_draw, } = scene_config;
    objects_to_draw.forEach((obj_config, program_index) => {
        const //////////
            { program_info_def, coords_dim, coords, indices } = obj_config,
            { vertex, fragment } = program_info_def.shaders,
            { shaders_data } = program_info_def;

        //ugly procedural writing but let's keep this as clear as possible
        let program_info = { program_index, programs_number: objects_to_draw.length };
        program_info = generate_attributes_from_config(gl, program_info, shaders_data, coords_dim);
        program_info = _init_webgl_program(gl, program_info, vertex.code, fragment.code);
        program_info = fill_position_buffer(gl, program_info, coords);

        let index_buffer = indices ? setup_indices(gl, indices) : null;

        Object.assign(obj_config, {
            object_program: {
                program_info,
                index_buffer
            }
        });
    });

    //plugins init once programs are ready
    scene_config = plugins_program_init(scene_config);

    //draw_fn possibly used in plugins' callbacks at runtime
    return Object.assign(scene_config, { draw_fn: _draw_call });
}

function _init_webgl_program(gl, program_info, vert, frag) {
    program_info.program = create_program(gl, vert, frag);
    return Object.assign(
        program_info,
        init_vao(gl, program_info)
    );
}


function _draw_objects(scene_config, time) {
    const { gl, start_time } = scene_config;
    const { view_matrix, projection_matrix, resolution } = scene_config;

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);

    scene_config = (scene_config.draw_loop_callback && scene_config.draw_loop_callback(scene_config, time)) || scene_config;
    scene_config.objects_to_draw.forEach((obj_config) => {
        const
            { object_program, draw_loop_callback, afterdraw_loop_callback } = obj_config,
            { program_info } = object_program,
            { program, vao } = program_info;

        gl.useProgram(program);
        gl.bindVertexArray(vao);

        scene_config = (draw_loop_callback && draw_loop_callback(scene_config, obj_config, time)) || scene_config;
        scene_config = plugins_drawloop_callback(obj_config, scene_config);

        set_uniforms(gl, {
            u_time: (start_time || 0) + (time || 0),
            u_model: obj_config.model_matrix.elements,
            u_view: view_matrix.elements,
            u_projection: projection_matrix.elements,
            u_resolution: resolution
        }, object_program);

        _draw_call(obj_config, scene_config);

        scene_config = (afterdraw_loop_callback && afterdraw_loop_callback(scene_config, obj_config, time)) || scene_config;
        scene_config = (scene_config.afterdraw_loop_callback && scene_config.afterdraw_loop_callback(scene_config, time)) || scene_config;

        gl.useProgram(null);
        gl.bindVertexArray(null);
    });
}

function _draw_call(obj_config, scene_config) {
    const ////////////////////////////////////////
        { gl } = scene_config,
        { number_of_points, primitive, object_program } = obj_config,
        { index_buffer } = object_program;

    if (index_buffer) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
        gl.drawElements(gl[primitive], number_of_points, gl.UNSIGNED_SHORT, 0);
    }
    else {
        gl.drawArrays(gl[primitive], 0, number_of_points);
    }
}

function _clear_scene_webgl(scene_config) {
    //TODO
    return scene_config;
}