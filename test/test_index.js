import "./style/main.scss";
import { init_data, init_scene, run_scene, stop_scene } from "wod";

/*********************************************************************
 * main module, which manages DOM events and interactions and triggers
 * the actual logic from the imported modules
 */

window.addEventListener('load', _onload);

let canvas = null,
    start_btn = null,
    stop_btn = null;
function _onload() {
    canvas = document.querySelector('.canvas');
    start_btn = document.querySelector('.start-btn');
    stop_btn = document.querySelector('.stop-btn');

    if (!canvas) {
        console.warn("No canvas provided");
        return;
    }

    init_data({
        objects_desc_url: "/data/objects_def.json",
        scene_desc_url: "/data/scene.json"
    }).then(scene_config => {
        canvas.setAttribute('width', window.innerWidth);
        canvas.setAttribute('height', window.innerHeight);
        scene_config.canvas = canvas;

        scene_config = init_scene(scene_config);


        run_scene(scene_config);
        //..after a while
        //stop_scene(desc)
    });

}