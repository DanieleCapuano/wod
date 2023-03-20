import { init_scene, run_scene, stop_scene } from "./scene";
import { init_data } from "./config_parser";
import * as Transforms from "./transforms";
import * as Interactions from "./interactions";

/**
 * wod : WebGL2 Objects Drawer: a simple drawer with WebGL 2
 */

export {
    init_data,
    init_scene,
    run_scene,
    stop_scene,
    Transforms,
    Interactions
};

export default {
    init_data,
    init_scene,
    run_scene,
    stop_scene,
    Transforms,
    Interactions
};