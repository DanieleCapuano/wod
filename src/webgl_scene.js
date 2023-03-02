import { buffer_data, create_program, init_vao, setup_indices, set_uniforms } from "./webgl_utils";
import { default as plugins } from 'wplug';

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

        let shad_data = _plugins_into_shaders_data(shaders_data, objects_info.scene_desc),
            pi = _init_webgl_program(gl, vertex.code, fragment.code, Object.assign(shad_data, {
                attributes: Object.keys(shad_data.attributes).reduce((a_obj, attr_key) => {
                    let ////////////////
                        attr_def = shad_data.attributes[attr_key],
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

    const { view_matrix, projection_matrix, resolution } = objects_info;
    objects_info.objects_to_draw.forEach((obj) => {
        const prog_info = programs_info[obj.id],
            { number_of_points, primitive, program_info } = prog_info,
            { program, vao } = program_info;

        prog_info.run_callback && prog_info.run_callback(gl, obj, programs_info, time);

        gl.useProgram(program);
        gl.bindVertexArray(vao);
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        gl.enable(gl.DEPTH_TEST);

        set_uniforms(gl, Object.assign({
            u_time: time || 0,
            u_model: obj.model_matrix.elements,
            u_view: view_matrix.elements,
            u_modelview: obj.model_view_matrix.elements,
            u_projection: projection_matrix.elements,
            u_resolution: resolution
        }, _set_uniforms_from_plugins(obj, objects_info)), prog_info);

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

function _plugins_into_shaders_data(shaders_data, scene_desc) {
    return Object.keys(plugins).reduce((shad_data, plugin_type) => {
        let ret = shad_data;
        if (scene_desc[plugin_type]) {
            const plugin_id = scene_desc[plugin_type].id,
                plugin = plugins[plugin_type][plugin_id],
                { config } = plugin;
            Object.assign(ret, {
                attributes: Object.assign({}, ret.attributes || {}, config.attributes || {}),
                uniforms: Object.assign({}, ret.uniforms || {}, config.uniforms || {})
            });
        }
        return ret;
    }, shaders_data);
}

function _set_uniforms_from_plugins(obj, objects_info) {
    const { scene_desc } = objects_info;

    //we could also use the "get_active_plugins" from ./plugins, but in this case it seems more efficient to simply
    //check the plugins directly
    return Object.keys(plugins).reduce((o, plugin_type) => {
        let ret = o;
        if (scene_desc[plugin_type]) {
            let plugin_id = scene_desc[plugin_type].id;
            let plugin = plugins[plugin_type][plugin_id];
            Object.assign(o, plugin.set_uniforms_values(obj, scene_desc));
        }
        return ret;
    }, {});
}