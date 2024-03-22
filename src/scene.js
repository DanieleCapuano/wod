import glm from "glm-js";
import * as T from './transforms';
import { isSystemLittleEndian } from 'wbase';

import { auto_animation, listen_to_keys, get_params } from "./interactions";

import { draw_objects, init_scene_webgl, clear_scene_webgl } from "./webgl_scene";
import { get_plugins_model, plugins_add_data_to_buffer, plugins_clear_all, setup_active_plugins } from "./plugins";
import { debug_print_buffer, debug_print_transforms } from "./debug";

/*********************************************************************
 * this module is responsible for the scene initialization
 * for what concerns the objects and scene structures and math operations
 * it creates vectors and matrices to be passed to the webgl_scene
 */
let DEBUG = {
    print_coords: false,
    print: false,
    interactions: false,
    animation: false
};

export const init_scene = _init_scene;
export const run_scene = _run;
export const stop_scene = _stop;

function _init_scene(scene_config) {
    const { canvas } = (scene_config || {});
    if (!canvas || !scene_config) return;

    let gl = scene_config.gl || canvas.getContext('webgl2', {
        desynchronized: true, //hints the user agent to reduce the latency by desynchronizing the canvas paint cycle from the event loop
        powerPreference: 'high-performance'
    });
    scene_config.gl = gl;

    //the "scene_config" object will be augmented 
    //with all the needed data and that's all we'll need!

    //plugins could generate coordinates or change the configuration descriptions
    scene_config = setup_active_plugins(scene_config);

    //computes coordinates, normals and whatever
    scene_config = _init_scene_struct(scene_config);

    DEBUG = scene_config.DEBUG || DEBUG;
    DEBUG.interactions && listen_to_keys();
    DEBUG.animation && auto_animation();
    DEBUG.print_coords && debug_print_transforms(scene_config);

    return init_scene_webgl(scene_config);  //this will return the scene_config with enriched data for each object in objects_to_draw
}

function _init_scene_struct(scene_config) {
    const { canvas, objects_desc } = scene_config,
        { OP, M_ortho, M_persp } = T.perspective(90, canvas.width / canvas.height, .1, 99);
    return [
        _compute_modelview,
        _compute_objects_coords,
        get_plugins_model
    ].reduce(
        (d, fn) => Object.assign(d, fn(d)),
        Object.assign(scene_config, {
            objects_to_draw: objects_desc.slice(0), //this copy will be enriched with computed stuff
            M_ortho, M_persp,
            projection_matrix: OP,
            resolution: [canvas.width, canvas.height]
        })
    );
}

function _compute_objects_coords(scene_config) {
    // const { scene_desc, objects_desc } = scene_config;
    const { objects_to_draw } = scene_config;
    return {
        objects_to_draw: objects_to_draw.map((obj_def) => {
            return Object.assign(obj_def, {
                ////////////////////
                //Coordinates and normals put in a single Float32Array
                coords: _compute_coords_and_normals(obj_def),

                ////////////////////
                //model transform computed multiplying up all the transformations in the object description file
                // model_matrix: _compute_model_matrix(obj_def.id, scene_desc)
            })
        })
    };
}


//this is put in a separate function because it's computed at each animation frame
function _compute_modelview(scene_config) {
    const {
        scene_desc,
        objects_to_draw,
        M_ortho,
        M_persp,
        canvas
    } = scene_config;
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

        if (!obj_def.coordinates_def && obj_def.screen_coordinates) {
            obj_def.coordinates_def = T.get_model_coords_from_screen_coords(
                {
                    M_ortho, M_persp,
                    M_view: view_matrix
                },
                obj_def.screen_coordinates,
                obj_def,
                canvas
            );
            if (obj_def.should_remap_resolution) {
                const //////////////
                    mins_maxs = (compare_fn, mins, coord) => {
                        return mins.map((m, i) => Math.abs(compare_fn(m, coord[i])));
                    },
                    mins_xy = obj_def.screen_coordinates.reduce(mins_maxs.bind(null, Math.min), [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER]),
                    maxs_xy = obj_def.screen_coordinates.reduce(mins_maxs.bind(null, Math.max), [Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER])

                Object.assign(obj_def, {
                    should_remap_resolution: 1,
                    mmin_resolution: mins_xy,
                    mmax_resolution: maxs_xy
                });
            }
        }
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
            let o = objs[objs_keys[i]],
                tr = o.transforms;

            if (o.matrixTransform) {
                M = glm.mat4(o.matrixTransform);
            }
            else {
                for (let j = 0; j < tr.length; j++) {
                    let transform_desc = tr[j],
                        transform_fn = T[transform_desc.type] || (() => glm.mat4(1));
                    M = M.mul(transform_fn(glm.vec3(transform_desc.amount)));
                }
            }
        }
    }
    return M;
}


/////////////////////////////////////////////////////
// RUNNING
/////////////////////////////////////////////////////

function _run(scene_config) {
    scene_config.scene_running = true;
    _do_run(scene_config);
}

function _do_run(scene_config, time) {
    const { canvas, gl, scene_running } = scene_config;

    if (scene_running && !gl.isContextLost()) {
        draw_objects(Object.assign(
            scene_config,
            { resolution: [canvas.width, canvas.height] },
            _compute_modelview(scene_config),
        ), time || 0);
        scene_config.rafId = requestAnimationFrame(_do_run.bind(null, scene_config));
    }
    else {
        scene_config.rafId !== null && cancelAnimationFrame(scene_config.rafId);
        scene_config.rafId = null;
        return;
    }
}


function _stop(scene_config, dont_clear) {
    scene_config.scene_running = false;
    scene_config.rafId !== null && cancelAnimationFrame(scene_config.rafId);
    scene_config.rafId = null;

    return (dont_clear === true) ?
        scene_config :
        //call plugins' cleanup function
        plugins_clear_all(
            //clear objects' program, structures and data
            clear_scene_webgl(scene_config)
        );
}


function _compute_coords_and_normals(obj_def) {
    const { coords_dim, coordinates_def, indices } = obj_def;

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
        stride = attributes.a_position.opts.stride;

    //see https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/vertexAttribPointer#examples
    //for the general approach used here about interleaving attributes and keeping the data types as minimal as possible
    //NOTE: indices management is not taken from that reference
    const buffer_to_fill = new ArrayBuffer(stride * coordinates_def.length),
        data_view = new DataView(buffer_to_fill),
        littleEndian = isSystemLittleEndian(),
        indices_to_process = indices || Array.from((new Array(coordinates_def.length)).keys()), //if no indices are provided we'll use a fake indices array with the indices in the coordinates_def array
        processed_vertices = [];

    let data = indices_to_process
        .reduce((o, vertex_index_to_process, i, indices_a) => {
            if (i > 0 && i % coords_dim === 0) {
                //we keep a "normal" reference to compute the normal vector just once for each triangle
                //if we're within this block then we're at the beginning of a new triangle,
                //so let's clear the reference to "normal"
                o.normal = null;
            }
            const n = has_normals ? (o.normal || _normal(coordinates_def, indices_a, i, coords_dim)) : null;
            o.normal = n;

            //we'll add just a single data block to the vbo for each vertex
            //(even though it could occur several times in the indices array of course!)
            if (processed_vertices.indexOf(vertex_index_to_process) === -1) {
                const coord_buf = coordinates_def[vertex_index_to_process];
                processed_vertices.push(vertex_index_to_process);

                let icurr = vertex_index_to_process * stride,
                    k = 0,
                    j = icurr;

                //1. fill the buffer with **vertex coordinates**
                for (j = icurr; j < icurr + coords_dim * Float32Array.BYTES_PER_ELEMENT; j += Float32Array.BYTES_PER_ELEMENT) {
                    o.ab.setFloat32(j, coord_buf[k], littleEndian);
                    k++;
                }

                //2. fill the buffer with **normal vectors**
                if (n) {
                    icurr = j;
                    k = 0;
                    for (j = icurr; j < icurr + 3 * Int8Array.BYTES_PER_ELEMENT; j += Int8Array.BYTES_PER_ELEMENT) {
                        o.ab.setInt8(j, n[k] * 0x7f);
                        k++;
                    }
                    //fourth element just for data alignment (32 bit block for each normal)
                    o.ab.setInt8(j, 0);
                    j += Int8Array.BYTES_PER_ELEMENT;
                }

                //3. let each plugin to add data to the buffer (e.g. **texcoords** or whatever)
                plugins_add_data_to_buffer({
                    coordinate_index: vertex_index_to_process,
                    current_bytes_pos: j,
                    buffer: o.ab,
                    obj_def,
                    littleEndian
                });
                // DEBUG.print_coords && debug_print_buffer(o.ab, stride, i, littleEndian);
            }

            return o;
        }, {
            ab: data_view,
            normal: null
        });

    return data.ab;
}

function _normal(vertices, indices, i, coords_dim) {
    let triangle_vertices = [];
    if (indices) {
        for (let j = 0; j < coords_dim; j++) {
            triangle_vertices[j] = vertices[indices[i + j]];
        }
    }
    else {
        triangle_vertices = vertices.slice(i, i + coords_dim);
    }

    let a = glm.vec3(triangle_vertices[0]),
        b = glm.vec3(triangle_vertices[1]),
        c = glm.vec3(triangle_vertices[2]);

    return glm.cross(b.sub(a), c.sub(a));
}