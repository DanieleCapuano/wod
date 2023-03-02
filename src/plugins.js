export const setup_active_plugins = _setup_active_plugins;
export const get_active_plugins = _get_active_plugins;
export const get_plugins_desc = _get_plugins_desc;

function _setup_active_plugins(plugins, config) {
    const { scene_desc } = config;
    Object.keys(plugins).forEach(plugin_type => {
        if (scene_desc[plugin_type]) {
            const //////////////////////////////
                plugin_id = scene_desc[plugin_type].id,
                plugin = plugins[plugin_type][plugin_id];

            plugin && plugin.set_active && plugin.set_active(true, config);
        }
    })
}

function _get_active_plugins(plugins) {
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

function _get_plugins_desc(plugins, plugin_type, scene_desc) {
    let plugin_id = scene_desc[plugin_type].id;
    let plugin = plugins[plugin_type][plugin_id];
    return plugin.get_description_values(scene_desc);
}