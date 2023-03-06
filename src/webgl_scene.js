import { create_program, fill_position_buffer, generate_attributes_from_config, init_vao, setup_indices, set_uniforms } from "wbase";
import { plugins_config_into_shaders_data, plugins_drawloop_callback } from "./plugins";

/*********************************************************************
 * this module is responsible for the scene initialization and management
 * from the point of view of webgl
 * so it takes vectors and matrices objects and creates webgl buffers
 * attributes uniforms etc etc to manage the actual webgl program.
 * 
 * utilities are stored into webgl_utils.js
 */

export const init_scene_webgl = _init_scene_webgl;
export const draw_objects = _draw_objects;


////////////////////////////////////////////////////////////
/*
 * we have the following data structure
   scene_config: {
    objects_to_draw: [
        {id: obj1, object_program: {program_info: {...}, ...}},
        ...
        {id: objn, object_program: {program_info: {...}, ...}}
    ]
   }
*/
function _init_scene_webgl(scene_config) {
    const { gl, objects_to_draw, } = scene_config;
    objects_to_draw.forEach((obj_config) => {
        const //////////
            { program_info_def, coords_dim, coords, indices } = obj_config,
            { vertex, fragment } = program_info_def.shaders,
            { shaders_data } = program_info_def;

        let ///////////////////////////////////////////
            program_info = fill_position_buffer(
                gl,
                _init_webgl_program(
                    gl,
                    vertex.code,
                    fragment.code,
                    generate_attributes_from_config(
                        gl,
                        plugins_config_into_shaders_data(shaders_data),   //loads the plugins config in the "uniforms" and "attributes" fields of program_info structure being built
                        coords_dim
                    )
                ),
                coords
            ),
            index_buffer = indices ? setup_indices(gl, indices) : null;

        Object.assign(obj_config, {
            object_program: {
                program_info,
                index_buffer
            }
        });
    });

    return scene_config;
}

function _init_webgl_program(gl, vert, frag, program_info) {
    program_info.program = create_program(gl, vert, frag);
    return Object.assign(
        program_info,
        init_vao(gl, program_info)
    );
}


function _draw_objects(scene_config, time) {
    const { gl } = scene_config;
    const { view_matrix, projection_matrix, resolution } = scene_config;

    scene_config.draw_loop_callback && scene_config.draw_loop_callback(scene_config, time);
    scene_config.objects_to_draw.forEach((obj_config) => {
        const
            { number_of_points, primitive, object_program, draw_loop_callback } = obj_config,
            { program_info, index_buffer } = object_program,
            { program, vao } = program_info;

        gl.useProgram(program);
        gl.bindVertexArray(vao);

        draw_loop_callback && draw_loop_callback(scene_config, obj_config, time);
        plugins_drawloop_callback(obj_config, scene_config);

        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.enable(gl.DEPTH_TEST);

        set_uniforms(gl, {
            u_time: time || 0,
            u_model: obj_config.model_matrix.elements,
            u_view: view_matrix.elements,
            u_projection: projection_matrix.elements,
            u_resolution: resolution
        }, object_program);

        if (index_buffer) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index_buffer);
            gl.drawElements(gl[primitive], number_of_points, gl.UNSIGNED_SHORT, 0);
        }
        else {
            gl.drawArrays(gl[primitive], 0, number_of_points);
        }
    });
}