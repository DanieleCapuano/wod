import { init_scene, run_scene, stop_scene } from "./scene";
import { init_data } from "./data";
import * as Transforms from "./transforms";
import * as WebGLUtils from './webgl_utils';

/**
 * od : Objects Drawer: a simple drawer with WebGL 2
 */

// export const od = {
//     init_data, init_scene, run_scene, stop_scene
// };
export {
    init_data,
    init_scene,
    run_scene,
    stop_scene,
    Transforms,
    WebGLUtils
};

export default {
    init_data,
    init_scene,
    run_scene,
    stop_scene,
    Transforms,
    WebGLUtils
};