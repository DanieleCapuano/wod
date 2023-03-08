import { plugins } from 'wplug';

export const setup_active_plugins = _setup_active_plugins;
export const get_active_plugins_as_object = _get_active_plugins_o;
export const get_active_plugins_as_array = _get_active_plugins_a;
export const get_plugins_model = _get_plugins_model;
export const plugins_config_into_shaders_data = _plugins_config_into_shaders_data;
export const plugins_drawloop_callback = _plugins_drawloop_callback;

const _active_plugins = [];

function _setup_active_plugins(config) {
    const { scene_desc } = config;
    return Object.keys(plugins).reduce((c, plugin_type) => {
        //currently plugins must be declared in the scene config, at "scene level" only:
        //since each scene has a config object for each object in the scene as well, 
        //objects could contain options data for specific plugins
        //while the plugin "dependency" can be declared as scene level in the config file
        if (scene_desc[plugin_type]) {
            const //////////////////////////////
                plugin_id = scene_desc[plugin_type].id,
                plugin = plugins[plugin_type][plugin_id];

            _active_plugins.push(plugin);
            return plugin.set_active(true, c);  //set_active will return the config
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
    return _active_plugins || Object.keys(plugins)
        .flatMap(plug_type => {
            return Object.keys(plugins[plug_type])
                .filter(plug_id => plugins[plug_type][plug_id].get_active())
                .map(plug_id => plugins[plug_type][plug_id]);
        });
}

function _get_plugins_model(desc) {
    return _get_active_plugins_a()
        .reduce(
            (o, plugin) => Object.assign(o, plugin.get_model(desc)),
            {}
        );
}

function _plugins_config_into_shaders_data(shaders_data) {
    return _get_active_plugins_a()
        .reduce((shad_data, plugin) => {
            const { config } = plugin;
            let c = config();

            return Object.assign(shad_data, {
                attributes: Object.assign({}, shad_data.attributes || {}, c.attributes || {}),
                uniforms: Object.assign({}, shad_data.uniforms || {}, c.uniforms || {})
            });
        }, shaders_data);
}

function _plugins_drawloop_callback(obj_config, scene_config) {
    return _get_active_plugins_a()
        .reduce((o, plugin) => {
            let p_o = plugin.draw_loop_callback ? plugin.draw_loop_callback(obj_config, scene_config) : { uniforms: {} };
            return Object.assign(
                o,
                {
                    uniforms: Object.assign(o.uniforms, ((p_o || {}).uniforms || {}))
                }
            );
        }, { uniforms: {} });
}