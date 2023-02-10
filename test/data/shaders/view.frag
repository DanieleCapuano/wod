// Author:
// Title:

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

mat4 frame(vec3 g, vec3 up) {
    vec3 w = normalize(-g);
    vec3 u = normalize(cross(up, w));
    vec3 v = cross(w, u);
    
    return mat4(
        u.x, v.x, w.x, 0.,
        u.y, v.y, w.y, 0.,
        u.z, v.z, w.z, 0.,
        0.,  0.,  0.,  1.
    );
}

mat4 lookup(vec3 eye_pos, vec3 center_pos, vec3 up) {
    mat4 F = frame((center_pos - eye_pos), up);
    return F * mat4(
        1,          0,          0,          0,
        0,          1,          0,          0,
        0,          0,          1,          0,
        -eye_pos.x, -eye_pos.y, -eye_pos.z, 1.
    );
}

//returns value in [0, 1]^3
//it takes z in [-n, -f]
mat4 ortho01(float l, float r, float t, float b, float n, float f) {
    return mat4(
        1. / (r - l),   0,              0,              0,
        0,              1. / (t - b),   0,              0,
        0,              0,              1. / (f - n),   0,
        -l / (r -l),    -b / (t - b),   n / (f - n),    1
    );
}

mat4 persp(float n, float f) {
    return mat4(
        n,  0,  0,      0,
        0,  n,  0,      0,
        0,  0,  n + f,  -1,
        0,  0,  n*f,    0
    );
}

mat4 perspective(float fov, float aspect, float near, float far) {
    mat4 M = mat4(0);
    
    float f_rad = radians(fov) / 2.;
    float tan_f = tan(f_rad);
    float n = abs(near);
    float f = abs(far);
    float t = tan_f * n;
    float b = -t;
    float r = aspect * t;
    float l = -r;
    
    mat4 M_ortho = ortho01(l, r, t, b, n, f);
    mat4 M_persp = persp(n, f);
    
    return M_ortho * M_persp;
    // return M_persp;
}

void main() {
    vec2 st = gl_FragCoord.xy/u_resolution.xy;	//st in [0, 1]^2
    // st.x *= u_resolution.x/u_resolution.y;
    vec2 res = u_resolution;
    
    vec3 cam = vec3(0., 0., 5.);
    vec3 center = vec3(0., 0., 0.);
    vec3 up = vec3(0, 1, 0);
    mat4 MV = lookup(cam, center, up);
    mat4 MP = perspective(45., res.x / res.y, cam.z, 1000.);
    
    vec4 p = vec4(0, 0, -1., 1);
    vec4 pt = (MP * MV) * p;
    pt.xyz /= pt.w;
    
    float d = distance(st, pt.xy);
    float smt_off = .7 / (pt.w);
    d = 1. - smoothstep(smt_off, smt_off+(smt_off*.04), d);

    vec3 color = vec3(d * st.x, d * st.y, d * abs(sin(u_time)));

    

    gl_FragColor = vec4(color,1.0);
}