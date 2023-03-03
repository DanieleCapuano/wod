export const init_data = _init_data;
import { plugins } from 'wplug';

function _init_data(data) {
    return new Promise((res, err) => {
        data = data || {};
        if (!data.objects_desc_url || !data.scene_desc_url) return err();
        Promise.all([
            _get_url(data.objects_desc_url),
            _get_url(data.scene_desc_url)
        ]).then((json_files) => {
            let objects = json_files[0],
                scene_desc = json_files[1];

            Promise.all(Object.keys(objects)
                .map((obj_key) => _get_url(objects[obj_key]))
            )
                .then((objects_jsons) => {
                    Promise.all(
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
                    ).then((shaders_code_arr_of_objs) => {
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

                                    shaders.vertex.code = glsl_replace_includes(scene_desc, shaders_code.vertex, plugins);
                                    shaders.fragment.code = glsl_replace_includes(scene_desc, shaders_code.fragment, plugins);
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

//we'll use the same approach described here 
//https://stackoverflow.com/a/62630376
//AND 
//we'll use a plugin-based approach using the wplug library
//
//in wplug we've plugins belonging to "types" (e.g. lighting, antialias, ...) and specific "ids" (e.g. "blinn_phong")
//in each object's shader, when a plugin must be included, we can write a line like
//include "lighting.vert"
//then the plugin_id is taken from the scene description json (e.g. {"lighting": {"id": "blinn_phong"}})
//so we can take the specific shader from the plugin and plug it into our current shader. Cool!
//
//TODO maybe a easier way to manage that would be to replace the line "main(...)" with a new line where the plugin code is pasted
//in this way we'll remove the requirement of having the include line matching the plugins structure
function glsl_replace_includes(scene_desc, src, plugins) {
    return src.replace(/#include\s+\"(\w+).?-?_?(\w+)\"/g, (m, plugin_type, shader_type) => {
        let plugin_id = scene_desc[plugin_type].id;
        return plugins[plugin_type][plugin_id].shaders[shader_type];
    });
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