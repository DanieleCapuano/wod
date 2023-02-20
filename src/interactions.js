
export const listen_to_keys = _listen_to_keys;
export const auto_animation = _auto_animation;
export const get_params = _get_params;

const rot_amount = 1;
let camera_rot_x = 0, camera_rot_y = 0,
    model_rot_x = 0, model_rot_y = 0;

function _listen_to_keys() {
    document.addEventListener('keydown', (e) => {
        switch (e.key) {
            case "Down": // IE/Edge specific value
            case "ArrowDown":
                camera_rot_x -= rot_amount;
                break;
            case "Up": // IE/Edge specific value
            case "ArrowUp":
                camera_rot_x += rot_amount;
                break;
            case "Left": // IE/Edge specific value
            case "ArrowLeft":
                camera_rot_y += rot_amount;
                break;
            case "Right": // IE/Edge specific value
            case "ArrowRight":
                camera_rot_y -= rot_amount;
                break;
        }
        DEBUG.print && console.info("ROT", camera_rot_x, camera_rot_y);
    });
}

function _auto_animation() {
    // camera_rot_y += rot_amount * .4;
    // camera_rot_x += rot_amount * .2;
    model_rot_y += rot_amount * .4;
    model_rot_x += rot_amount * .2;
    
    requestAnimationFrame(_auto_animation);
}

function _get_params() {
    return {
        camera_rot_x, camera_rot_y,
        model_rot_x, model_rot_y
    }
}