export const init_data = _init_data;

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
                    //using Promise.all with object literals assigning iterator symbols to them:
                    //https://stackoverflow.com/a/35834780
                    Promise.all(
                        Object.keys(objects_jsons)
                            .map((obj_key) => {
                                let program_shaders = objects_jsons[obj_key].program_info_def.shaders;
                                return obj2map(
                                    Object.assign(
                                        {
                                            vertex: _get_url(program_shaders.vertex.url, 'text'),
                                            fragment: _get_url(program_shaders.fragment.url, 'text')
                                        },
                                        //lighting management
                                        scene_desc.lighting ? _get_promises_as_obj(scene_desc.lighting.shaders) : {},

                                        //in-shaders anti-aliasing management
                                        scene_desc.antialias ? _get_promises_as_obj(scene_desc.antialias.shaders) : {},

                                        //....add more shaders here, e.g.
                                        //other_shaders_needed_obj ? _get_promises_as_obj(other_shaders_needed_obj.shaders) : {},
                                    )
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

                                    shaders.vertex.code = glsl_replace_includes(shaders_code.vertex, shaders_code);
                                    shaders.fragment.code = glsl_replace_includes(shaders_code.fragment, shaders_code);
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
                                    shaders_code[shad_key] = shader_src;
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

/*
 * lighting is managed by hand using multiple sources:
 * 
 * 1. in the scene.json file the description of each lighting shaders, if any, is provided. e.g. 
 * /////........
 * "lighting": {
 *   "shaders": {
 *      "lighting.vert": {
 *        "url": "urloftheshader"
 *      },
 *      "lighting.frag": {
 *        "url": "urloftheshader"
 *      }
 *   }
 * }
 * /////........
 * 
 * 2. in the vertex/fragment shaders for each object a directive like 
 * include "lighting.vert"
 * is expected. The name of the include must match an existent key in the shaders described in scenes.json
 * The glsl_replace_includes function below implements a string substitution for each include.
 * 
 * TODO: move the library shaders and JS functions to a separate library, including the
 * "attributes" and "uniforms" sections in the objects.json (e.g. "square.json" here in the test) descriptions
 * All the dependencies related to a library shader should be self-consistent and 
 * should not be explicitly described in json configs or js code
 */
function _get_promises_as_obj(lighting_obj) {
    return Object.keys(lighting_obj).reduce((o, l_key) => {
        return Object.assign(o, {
            [l_key]: _get_url(lighting_obj[l_key].url, 'text')
        })
    }, {});
}

//we'll use the same approach described here 
//https://stackoverflow.com/a/62630376
function glsl_replace_includes(src, includes_hash) {
    return src.replace(/#include\s+\"(\w+.?-?_?\w+)\"/g, (m, key) => {
        return includes_hash[key];
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