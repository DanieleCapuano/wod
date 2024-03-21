import { plugins } from 'wplug';

export const setup_active_plugins = _setup_active_plugins;
export const set_plugins_requires_into_config = _set_plugins_requires_into_config;
export const get_active_plugins_as_object = _get_active_plugins_o;
export const get_active_plugins_as_array = _get_active_plugins_a;
export const get_plugins_model = _get_plugins_model;
export const plugins_config_into_shaders_data = _plugins_config_into_shaders_data;
export const plugins_program_init = _plugins_program_init;
export const plugins_add_data_to_buffer = _plugins_add_data_to_buffer;
export const plugins_drawloop_callback = _plugins_drawloop_callback;
export const plugins_clear_all = _plugins_clear_all;

let _active_plugins = null;

function _set_plugins_requires_into_config(scene_desc) {
    //1. first let's fill scene_desc with generated plugins' configurations got from "requires"
    const _browse_plugins = (plugin_type) => {
        if (plugins[plugin_type]) {
            //the plugin_type key is a plugin's id
            scene_desc[plugin_type] = Array.isArray(scene_desc[plugin_type]) ? scene_desc[plugin_type] : [scene_desc[plugin_type]];
            scene_desc[plugin_type].forEach((plugin_with_type) => {
                let plugin_id = plugin_with_type.id,
                    plugin = plugins[plugin_type][plugin_id],
                    reqs = plugin.requires;

                plugin._active = true;
                plugin._clients = (plugin._clients || 0) + 1;
                if (reqs) {
                    reqs = Array.isArray(reqs) ? reqs : [reqs];
                    reqs.forEach(req_plugin_desc => {
                        //each requires element will be in the form {"plugin_type": {"id": plugin_id, /*other options*/}}
                        Object
                            .keys(req_plugin_desc)
                            .filter(p_key => scene_desc[p_key] === undefined)   //if scene_desc has already a configuration for this plugin we'll skip it
                            .forEach(p_key => {
                                Object.assign(scene_desc,
                                    {
                                        [p_key]: Object.assign(
                                            {},
                                            req_plugin_desc[p_key],
                                            { is_require: true }
                                        )
                                    },
                                    scene_desc[p_key] || {} //if scene_desc already had defined the same plugin config, it wins
                                );

                                //recursive step: we'll set also requires to "_active" this way
                                _browse_plugins(p_key);
                            });
                    });
                }
            })
        }
    };
    Object.keys(scene_desc).forEach(_browse_plugins);

    return scene_desc;
}

//currently plugins must be declared in the scene config, at "scene level" only:
//since each scene has a config object for each object in the scene as well,
//objects could contain options data for specific plugins
//while the plugin's "dependencies" can be declared as scene level in the config file
function _setup_active_plugins(config) {
    const { scene_desc } = config;

    //let's activate each plugin
    return Object.keys(plugins).reduce((c, plugin_type) => {
        if (scene_desc[plugin_type]) {
            scene_desc[plugin_type] = Array.isArray(scene_desc[plugin_type]) ? scene_desc[plugin_type] : [scene_desc[plugin_type]];
            return scene_desc[plugin_type].reduce((cc, plugin_with_type) => {
                let plugin_id = plugin_with_type.id,
                    plugin = plugins[plugin_type][plugin_id];

                let conf = cc;
                _active_plugins = _active_plugins || [];
                if (_active_plugins.indexOf(plugin) === -1) {
                    _active_plugins.push(plugin);
                    conf = plugin.set_active(true, cc);  //set_active will return the config
                }
                return conf;
            }, c);
        }
        return c;
    }, config);
}

function _get_active_plugins_o() {
    return Object.keys(plugins)
        .reduce((active_plugins, plugin_type) => {
            return Object.assign(active_plugins, {
                [plugin_type]: Object.keys(plugins[plugin_type])
                    .filter(plugin_id => plugins[plugin_type][plugin_id].get_active() || plugins[plugin_type][plugin_id]._active)
                    .reduce((plugs_o, plugin_id) => Object.assign(plugs_o, {
                        [plugin_id]: plugins[plugin_type][plugin_id]
                    }), {})
            });
        }, {});
}

function _get_active_plugins_a() {
    return _active_plugins || Object.keys(plugins)
        .flatMap(plug_type => {
            return Object.keys(plugins[plug_type])
                .filter(plug_id => plugins[plug_type][plug_id].get_active() || plugins[plug_type][plug_id]._active)
                .map(plug_id => plugins[plug_type][plug_id]);
        })
        .sort((a, b) => (a.is_require || a.is_base) ? -1 : 1);
}

function _get_plugins_model(desc) {
    return _get_active_plugins_a()
        .reduce(
            (o, plugin) => Object.assign(o, plugin.get_model(desc) || {}),
            {}
        );
}

function _plugins_config_into_shaders_data(shaders_data) {
    return _get_active_plugins_a()
        .reduce((shad_data, plugin) => {
            const { config } = plugin;
            let c = config(shad_data);

            return Object.assign(shad_data, {
                attributes: Object.assign({}, shad_data.attributes || {}, c.attributes || {}),
                uniforms: Object.assign({}, shad_data.uniforms || {}, c.uniforms || {})
            });
        }, shaders_data);
}

function _plugins_program_init(scene_config) {
    return _get_active_plugins_a()
        .reduce(
            (o, plugin) => plugin.program_init ? plugin.program_init(o) : o,
            scene_config
        );
}

function _plugins_add_data_to_buffer(conf_o) {
    return _get_active_plugins_a()
        .reduce(
            (o, plugin) => plugin.add_data_to_buffer ? plugin.add_data_to_buffer(o) : o,
            conf_o
        );
}

function _plugins_drawloop_callback(obj_config, scene_config) {
    return _get_active_plugins_a()
        .reduce((o, plugin) => {
            let p_o = plugin.draw_loop_callback ? plugin.draw_loop_callback(obj_config, scene_config) : {};
            return Object.assign(o, p_o || {});
        }, scene_config);
}

function _plugins_clear_all(scene_config) {
    _get_active_plugins_a()
        .reduce(
            (o, plugin) => {
                if (--plugin._clients <= 0) {
                    plugin._clients = 0;
                    plugin._active = false;
                    plugin.set_active && plugin.set_active(false, o);
                }
                return plugin.cleanup ? plugin.cleanup(o) : o
            },
            scene_config
        );
    _active_plugins = _active_plugins.filter(ap => ap._clients > 0);
    return scene_config;
}