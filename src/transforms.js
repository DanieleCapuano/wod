import glm from 'glm-js';

export const rotate_axis = _rotate_axis;
export const rotate = _rotate;
export const translate = _translate;
export const scale = _scale;
export const create_reference_frame = _create_reference_frame;
export const lookAt = _lookAt;
export const perspective = _perspective;

//////////////////////////////////////////////////////////
//Functions implementation

function _lookAt(eye_pos, eye_center, eye_up) {
    let gaze = eye_center.sub(eye_pos).mul(-1),
        frame = create_reference_frame(gaze, eye_up),
        minus_eye_pos = eye_pos.mul(-1),
        translate_mat = _translate(minus_eye_pos);

    return frame.mul(translate_mat);
}

function _rotate_axis(invec, axis, degrees) {
    //rodriguez, NON quaterion stuff
    let P = invec,
        A = axis,
        ID = glm.mat4(1),
        theta = glm.radians(degrees),
        cos_theta = Math.cos(theta),
        sin_theta = Math.sin(theta),
        one_minus_cos_theta = 1 - cos_theta;

    return (
        ID.mul(P.mul(cos_theta)).add(
            glm.mat4(
                0, A.z, -A.y, 0,
                -A.z, 0, A.x, 0,
                A.y, -A.x, 0, 0,
                0, 0, 0, 1
            ).mul(P.mul(sin_theta)).add(
                glm.mat4(
                    A.x * A.x, A.x * A.y, A.x * A.z, 0,
                    A.x * A.y, A.y * A.y, A.y * A.z, 0,
                    A.x * A.z, A.y * A.z, A.z * A.x, 1
                ).mul(P.mul(one_minus_cos_theta))
            )
        )
    );
}

function _rotate(amount_vec3, invec) {
    const
        rad = glm.radians,
        tx = rad(amount_vec3.x),
        ty = rad(amount_vec3.y),
        tz = rad(amount_vec3.z),
        sin = Math.sin,
        cos = Math.cos;

    const
        r_x = tx === 0 ? glm.mat4(1) : glm.mat4(
            1, 0, 0, 0,
            0, cos(tx), sin(tx), 0,
            0, 0, -sin(tx), cos(tx),
            0, 0, 0, 1
        ),
        r_y = ty === 0 ? glm.mat4(1) : glm.mat4(
            cos(ty), 0, -sin(ty), 0,
            0, 1, 0, 0,
            sin(ty), 0, cos(ty), 1,
            0, 0, 0, 1
        ),
        r_z = tz === 0 ? glm.mat4(1) : glm.mat4(
            cos(tz), sin(tz), 0, 0,
            -sin(tz), cos(tz), 0, 0,
            0, 0, 1, 0,
            0, 0, 0, 1
        );
    let M = r_x.mul(r_y).mul(r_z);

    return invec ? M.mul(invec) : M;
}

function _translate(amount_vec3, invec) {
    let translate_mat = glm.mat4(
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        amount_vec3.x, amount_vec3.y, amount_vec3.z, 1
    );

    return invec ? translate_mat.mul(invec) : translate_mat;
}

function _scale(amount_vec3, invec) {
    let s_mat = glm.mat4(
        amount_vec3.x, 0, 0, 0,
        0, amount_vec3.y, 0, 0,
        0, 0, amount_vec3.z, 0,
        0, 0, 0, 1
    );

    return invec ? s_mat.mul(invec) : s_mat;
}

function _create_reference_frame(eye_dir, up_vec) {
    const ////////////
        w = glm.normalize(eye_dir),
        u = glm.normalize(glm.cross(up_vec, w)),
        v = glm.cross(w, u);

    return glm.mat4(
        u.x, v.x, w.x, 0,
        u.y, v.y, w.y, 0,
        u.z, v.z, w.z, 0,
        0, 0, 0, 1
    );
}

/* 
   We want the output of the MVP transform to be into the "viewving volume", which is generally defined
   as [-1, 1]^3. But if you check the actual output from the perspective projection they're not within [-1, 1].

   BUT see https://www.khronos.org/opengl/wiki/Vertex_Post-Processing

   The viewing volume for a vertex is defined by (with vertex point defined as [P_x, P_y, P_z, P_w]):
   -P_w <= P_x <= P_w
   -P_w <= P_y <= P_w
   -P_w <= P_z <= P_w

   All P_x, P_y and P_z coords will be divided by P_w in the perspective divide stage, so the actual
   range before the viewport transform will be [-1, 1]^3
*/
function _perspective(fov_y, aspect_ratio, near, far) {
    const ////////////////// 
        half_theta = glm.radians(fov_y) / 2,
        tan_fov = Math.tan(half_theta),
        n = Math.abs(near),
        f = Math.abs(far),
        t = tan_fov * n,                //t = "top". This works because sin(half_theta) = t / hyp and cos(half_theta) = n / hyp ==> tan(half_theta) = (t / hyp) / (n / hyp) = t / n
        b = -t,                         //b = "bottom"
        r = aspect_ratio * t,           //aspect_ratio = w / h and we can see that (w / h = r / t) ==> because pixels are assumed to be squared
        l = -r;

    return glm.mat4(
        (2 * n) / (r - l), 0, 0, 0,
        0, (2 * n) / (t - b), 0, 0,
        (l + r) / (r - l), (b + t) / (t - b), (f + n) / (n - f), -1,
        0, 0, (2 * f * n) / (n - f), 0
    );
}