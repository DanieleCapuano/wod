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
    const { gl, objects_to_draw, nested_scene_before, nested_scene_after } = scene_config;
    objects_to_draw.forEach((obj_config, program_index) => {
        const //////////
            { program_info_def, coords_dim, coords, indices } = obj_config,
            { vertex, fragment } = program_info_def.shaders,
            { shaders_data } = program_info_def;

        //ugly procedural writing but let's keep this as clear as possible
        let program_info = { program_index, programs_number: objects_to_draw.length };
        program_info = generate_attributes_from_config(gl, program_info, shaders_data, coords_dim);
        program_info = _compute_ubo_index(program_info, nested_scene_before, nested_scene_after);
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

function _compute_ubo_index(program_info, scene_config_before, scene_config_after) {
    let ubo_index = 0;
    const _browse_scene_config = (sc_cfg, id) => {
        if (!sc_cfg) return id;
        sc_cfg.objects_to_draw.forEach(otd => {
            const ////////////////////////
                { max } = Math,
                { object_program } = otd,
                { program_info } = object_program,
                { ubos } = program_info;

            Object.keys(ubos).forEach(ubo_k => id = max(id, ubos[ubo_k].uboUniqueBind));
        });

        const { nested_scene_before, nested_scene_after } = sc_cfg
        if (nested_scene_before) id = _browse_scene_config(nested_scene_before, id);
        if (nested_scene_after) id = _browse_scene_config(nested_scene_after, id);

        return id;
    };

    let ubo_start_id = [scene_config_before, scene_config_after].reduce((id, sc) => _browse_scene_config(sc, id), ubo_index);
    ubo_start_id = ubo_start_id > 0 ? ubo_start_id + 1 : ubo_start_id;
    return Object.assign(
        program_info,
        { ubo_start_id }
    );
}

function _init_webgl_program(gl, program_info, vert, frag) {
    program_info.program = create_program(gl, vert, frag);
    return Object.assign(
        program_info,
        init_vao(gl, program_info)
    );
}


function _draw_objects(scene_config, time) {
    const { gl, start_time, nested_scene_before, nested_scene_after } = scene_config;
    const { view_matrix, projection_matrix, resolution, prevent_clear, prevent_depth } = scene_config;

    if (nested_scene_before) {
        _draw_objects(nested_scene_before, time);
    }

    if (!prevent_clear) {
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    }
    if (!prevent_depth) {
        gl.enable(gl.DEPTH_TEST);
    }


    let _utime = Math.max(0, (start_time || 0) + (time || 0));
    scene_config = (scene_config.draw_loop_callback && scene_config.draw_loop_callback(scene_config, _utime)) || scene_config;
    scene_config.objects_to_draw.forEach((obj_config) => {
        const
            {
                object_program,
                draw_loop_callback,
                prevent_draw,
                afterdraw_loop_callback,
                should_remap_resolution,
                mmin_resolution,
                mmax_resolution
            } = obj_config,
            { program_info } = object_program,
            { program, vao } = program_info,
            mmin_res = mmin_resolution || [0, 0],
            mmax_res = mmax_resolution || [gl.canvas.width, gl.canvas.height];

        gl.useProgram(program);
        gl.bindVertexArray(vao);
        gl.viewport(
            mmin_res[0] || 0,
            mmin_res[1] || 0,
            mmax_res[0] || gl.canvas.width,
            mmax_res[1] || gl.canvas.height
        );

        set_uniforms(gl, {
            u_time: _utime,
            u_model: obj_config.model_matrix.elements,
            u_view: view_matrix.elements,
            u_projection: projection_matrix.elements,
            u_resolution: resolution,
            u_should_remap_resolution: should_remap_resolution || false,
            u_mmin_resolution: mmin_res,
            u_mmax_resolution: mmax_res
        }, object_program);

        scene_config = (draw_loop_callback && draw_loop_callback(scene_config, obj_config, _utime)) || scene_config;
        scene_config = plugins_drawloop_callback(obj_config, scene_config);

        if (!prevent_draw) {
            _draw_call(obj_config, scene_config);
        }

        scene_config = (afterdraw_loop_callback && afterdraw_loop_callback(scene_config, obj_config, _utime)) || scene_config;
        scene_config = (scene_config.afterdraw_loop_callback && scene_config.afterdraw_loop_callback(scene_config, _utime)) || scene_config;

        gl.useProgram(null);
        gl.bindVertexArray(null);
    });

    scene_config = (scene_config.afterdraw_loop_callback && scene_config.afterdraw_loop_callback(scene_config, time)) || scene_config;

    if (nested_scene_after) {
        _draw_objects(nested_scene_after, time);
    }
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