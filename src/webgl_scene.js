import { buffer_data, create_program, init_vao, setup_indices, set_uniforms } from "./webgl_utils";

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
let programs_info = null;

function _init_scene_webgl(gl, objects_info) {
    programs_info = objects_info.objects_to_draw.reduce((prog_info, oi) => {
        const //////////
            { program_info_def, coords_dim } = oi,
            { vertex, fragment } = program_info_def.shaders,
            { shaders_data } = program_info_def;

        let pi = _init_webgl_program(gl, vertex.code, fragment.code, Object.assign(shaders_data, {
            attributes: Object.keys(shaders_data.attributes).reduce((a_obj, attr_key) => {
                let ////////////////
                    attr_def = shaders_data.attributes[attr_key],
                    opts = attr_def.opts;

                attr_def.opts = [
                    opts.size || coords_dim,         //size
                    gl[opts.data_type],  //type
                    opts.normalized,     //normalized
                    opts.stride,         //stride
                    opts.offset          //offset
                ];
                return Object.assign(a_obj, {
                    [attr_key]: attr_def
                });
            }, {})
        }));

        Object.keys(pi.attributes)
            .filter(attr_key => pi.attributes[attr_key].is_position)
            .forEach((attr_name) => {
                buffer_data(gl, {
                    [attr_name]: oi.coords  //it contains normals as well
                }, pi);
            });

        let index_buffer = oi.indices ? setup_indices(gl, oi.indices) : null;

        return Object.assign(prog_info, {
            [oi.id]: Object.assign({}, oi, {
                program_info: pi,
                index_buffer,
                object_to_draw_ref: oi
            }),
            gl
        });
    }, {});

    return programs_info;
}


function _draw_objects(gl, objects_info, time) {
    objects_info.run_callback && objects_info.run_callback(gl, objects_info, time);

    const { lighting, view_matrix, projection_matrix } = objects_info;
    objects_info.objects_to_draw.forEach((obj) => {
        const prog_info = programs_info[obj.id],
            { number_of_points, primitive, program_info } = prog_info,
            { program, vao } = program_info;

        prog_info.run_callback && prog_info.run_callback(gl, obj, programs_info, time);

        gl.useProgram(program);
        gl.bindVertexArray(vao);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.enable(gl.DEPTH_TEST);

        set_uniforms(gl, {
            u_time: time || 0,
            u_model: obj.model_matrix.elements,
            u_view: view_matrix.elements,
            u_projection: projection_matrix.elements,
            u_ka: obj.material.ka,
            u_kd: obj.material.kd,
            u_ks: obj.material.ks,
            u_ambient_color: lighting.ambient.color,
            u_ambient_intensity: lighting.ambient.intensity,
            u_light_positions: lighting.light_positions,
            u_light_colors: lighting.light_colors,
            u_light_intensities: lighting.light_intensities,
            u_light_specular_exp: lighting.light_specular_exp
        }, prog_info);

        if (prog_info.index_buffer) {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, prog_info.index_buffer);
            gl.drawElements(gl[primitive], number_of_points, gl.UNSIGNED_SHORT, 0);
        }
        else {
            gl.drawArrays(gl[primitive], 0, number_of_points);
        }
    });
}

function _init_webgl_program(gl, vert, frag, program_info) {
    program_info.program = create_program(gl, vert, frag);
    return init_vao(gl, program_info);
}