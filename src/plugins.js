import { plugins } from 'wplug';

export const setup_active_plugins = _setup_active_plugins;
export const get_active_plugins_as_object = _get_active_plugins_o;
export const get_active_plugins_as_array = _get_active_plugins_a;
export const get_plugins_model = _get_plugins_model;
export const plugins_config_into_shaders_data = _plugins_config_into_shaders_data;
export const plugins_drawloop_callback = _plugins_drawloop_callback;

function _setup_active_plugins(config) {
    const { scene_desc, objects_desc } = config;
    return Object.keys(plugins).reduce((c, plugin_type) => {
        //a plugin could be requested by either the scene description or by single objects
        let requested_by_object = objects_desc.filter(o => o[plugin_type] !== undefined);
        if (scene_desc[plugin_type] || requested_by_object.length) {
            return requested_by_object.concat(scene_desc).reduce((c_within, o) => {
                const //////////////////////////////
                    plugin_id = (o[plugin_type] || {}).id,
                    plugin = plugin_id ? plugins[plugin_type][plugin_id] : null;

                return Object.assign(
                    c_within,
                    (plugin || { set_active: (b, o) => o }).set_active(true, c_within)  //set_active will return the config
                );
            }, c)
        }
        return c;
    }, config);
}

function _get_active_plugins_o() {
    return Object.keys(plugins)
        .reduce((active_plugins, plugin_type) => {
            return Object.assign(active_plugins, {
                [plugin_type]: Object.keys(plugins[plugin_type])
                    .filter(plugin_id => plugins[plugin_type][plugin_id].get_active())
                    .reduce((plugs_o, plugin_id) => Object.assign(plugs_o, {
                        [plugin_id]: plugins[plugin_type][plugin_id]
                    }), {})
            });
        }, {});
}


function _get_active_plugins_a() {
    return Object.keys(plugins)
        .flatMap(plug_type => {
            return Object.keys(plugins[plug_type])
                .filter(plug_id => plugins[plug_type][plug_id].get_active())
                .map(plug_id => plugins[plug_type][plug_id]);
        });
}

function _get_plugins_model(desc) {
    return _get_active_plugins_a(plugins)
        .reduce(
            (o, plugin) => Object.assign(o, plugin.get_model(desc)),
            {}
        );
}

function _plugins_config_into_shaders_data(shaders_data) {
    return get_active_plugins_as_array(plugins).reduce((shad_data, plugin) => {
        const { config } = plugin;
        return Object.assign(shad_data, {
            attributes: Object.assign({}, shad_data.attributes || {}, config.attributes || {}),
            uniforms: Object.assign({}, shad_data.uniforms || {}, config.uniforms || {})
        });
    }, shaders_data);
}

function _plugins_drawloop_callback(obj_config, scene_config) {
    get_active_plugins_as_array(plugins).forEach(plugin => {
        plugin.draw_loop_callback && plugin.draw_loop_callback(obj_config, scene_config);
    });
}