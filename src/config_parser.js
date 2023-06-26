export const init_data = _init_data;

import { plugins } from 'wplug';
import { plugins_config_into_shaders_data, set_plugins_requires_into_config } from './plugins';
import { default as base_object_config } from './base_config.json';

function _init_data(data) {
    return new Promise((res, err) => {
        data = data || {};
        if (!data.objects_desc_url || !data.scene_desc_url) return err();
        Promise.all([
            _get_url(data.objects_desc_url),
            _get_url(data.scene_desc_url)
        ]).then((json_files) => {
            let objects = json_files[0],
                scene_desc = json_files[1],
                objects_keys = Object.keys(objects);

            //this will read pugins' requires and and add them into the scene_desc config
            scene_desc = set_plugins_requires_into_config(scene_desc);

            Promise.all(objects_keys
                .map((obj_key) => _get_url(objects[obj_key]))
            )
                .then((objects_jsons) => {
                    objects_jsons.forEach((oj, i) => {
                        oj.id = objects_keys[i];

                        oj.program_info_def = oj.program_info_def || {};
                        oj.program_info_def.shaders_data = Object.assign(oj.program_info_def.shaders_data || {}, JSON.parse(JSON.stringify(base_object_config)));
                        oj.program_info_def.shaders_data = plugins_config_into_shaders_data(oj.program_info_def.shaders_data);   //loads the plugins config in the "uniforms" and "attributes" fields of program_info structure being built
                    });

                    _get_shaders_files(objects_jsons)
                        .then((shaders_code_arr_of_objs) => {
                            let _n_objects = objects_jsons.length;
                            const _loops_end = () => {
                                res({
                                    scene_desc,
                                    objects_desc: objects_jsons
                                });
                            };

                            objects_jsons.forEach((o, i) => {
                                const ///////////////////
                                    _after_loop = (shaders_code) => {
                                        const ////////////////////////////
                                            { program_info_def } = o,
                                            { shaders } = program_info_def;

                                        shaders_code.vertex = glsl_includes_for_active_plugins(scene_desc, shaders_code.vertex, 'vert', plugins);
                                        shaders.vertex.code = glsl_replace_includes(shaders_code.vertex, plugins);

                                        shaders_code.fragment = glsl_includes_for_active_plugins(scene_desc, shaders_code.fragment, 'frag', plugins);
                                        shaders.fragment.code = glsl_replace_includes(shaders_code.fragment, plugins);

                                        if (--_n_objects === 0) _loops_end();
                                    },
                                    shaders_code_map = shaders_code_arr_of_objs[i],
                                    shaders_code = {},
                                    map_keys = shaders_code_map.keys(),
                                    map_entries = shaders_code_map.entries();


                                let map_n = shaders_code_map.size,
                                    shader_key;
                                while ((shader_key = map_keys.next()).done === false) {
                                    const entry_then = ((shad_key, shader_src) => {
                                        shaders_code[shad_key] = shader_src || "";
                                        if (--map_n === 0) _after_loop(shaders_code);
                                    }).bind(null, shader_key.value);

                                    //this still contains a promise to be evaluated
                                    map_entries.next().value[1].then(entry_then);
                                }
                            });

                        });
                })
        });
    });
}

function _get_shaders_files(objects_jsons) {
    return Promise.all(
        Object.keys(objects_jsons)
            .map((obj_key) => {
                let program_shaders = objects_jsons[obj_key].program_info_def.shaders;
                return obj2map(
                    Object.assign({
                        vertex: _get_url(program_shaders.vertex.url, 'text'),
                        fragment: _get_url(program_shaders.fragment.url, 'text')
                    })
                );
            })
    )
}

//we'll use the same approach described here 
//https://stackoverflow.com/a/62630376
//AND 
//we'll use a plugin-based approach using the wplug library
//
//in wplug we've plugins belonging to "types" (e.g. lighting, antialiasing, ...) and specific "ids" (e.g. "blinn_phong")
//in each object's shader, when a plugin must be included, we can write a line like
//include "lighting.blinn_phong.vert"
//
//as you can see we have a plugin_type.plugin_id.shader_type pattern:
//so we can take the specific shader from the plugin and plug it into our current shader. Cool!
//
//TODO maybe a easier way to manage that would be to replace the line "main(...)" with a new line where the plugin code is pasted
//in this way we'll remove the requirement of having the include line matching the plugins structure
const INCLUDE_REGEXP = /#include\s+\"(\w+).?-?_?(\w+).?-?_?(\w+)\"/g;
function glsl_replace_includes(src, plugins) {
    return src.replace(INCLUDE_REGEXP, (m, plugin_type, plugin_id, shader_type) => {
        return plugins[plugin_type][plugin_id].shaders[shader_type];
    });
}

//this function inserts a string like '#include "plugin_type.plugin_id.shader_type"' in a shader source if it's needed
//that's because needed plugins code can be requested either directly from scene config or implicitly from plugins requires
//so the user is not directly aware of them but their code must be inserted as well
function glsl_includes_for_active_plugins(scene_desc, src, src_type, plugins) {
    return Object.keys(scene_desc)
        .reduce((str, plugin_type) => {
            let ret_str = str;
            if (plugins[plugin_type]) {
                //is a plugin type
                scene_desc[plugin_type] = Array.isArray(scene_desc[plugin_type]) ? scene_desc[plugin_type] : [scene_desc[plugin_type]];
                scene_desc[plugin_type].forEach((plugin_with_type) => {
                    let plugin_id = plugin_with_type.id,
                        INCLUDE_SEP_TOKEN = '.?-?_?',
                        NEEDED_INCLUDE_REGEXP = '#include\\s+\\"' + plugin_type + INCLUDE_SEP_TOKEN + plugin_id + INCLUDE_SEP_TOKEN + src_type + '\\"',
                        NEEDED_INCLUDE_STR = '#include "' + plugin_type + '.' + plugin_id + '.' + src_type + '"',
                        SPLIT_TOKEN = "void main() {";

                    if (!str.match(new RegExp(NEEDED_INCLUDE_REGEXP, "g"))) {
                        //there isn't our needed include directive in shader: we'll generate it
                        let any_includes = str.match(INCLUDE_REGEXP);
                        if (any_includes) {
                            //if there are other includes we'll put our new include before them
                            SPLIT_TOKEN = any_includes[0];
                        }

                        let sp_str = str.split(SPLIT_TOKEN);
                        ret_str = sp_str[0] + '\n' + NEEDED_INCLUDE_STR + '\n' + SPLIT_TOKEN + '\n' + sp_str[1];
                    }
                });
            }

            return ret_str;
        }, src);
}

function _get_url(url, type) {
    return fetch(url).then(o => o[type || 'json']());
}

//for Promise.all we need an iterable object. We'll use a Map
function obj2map(o) {
    let m = new Map();
    Object.keys(o).forEach(o_key => {
        m.set(o_key, o[o_key]);
    });
    return m;
}