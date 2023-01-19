// Author:
// Title:

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

mat4 cam(in vec3 g, in vec3 up) {
    vec3 w = -g / length(g);
    vec3 v = normalize(cross(up, w));
    vec3 u = normalize(cross(w, v));

    return mat4(
        vec4(u.x, v.x, w.x, 0), 
        vec4(u.y, v.y, w.y, 0), 
        vec4(u.z, v.z, w.z, 0),
        vec4(0, 0, 0, 1)
    );
}

mat4 lookat(in vec3 center_pos, in vec3 eye_pos, in vec3 up) {
    mat4 C = cam((center_pos - eye_pos), up);
    return C * mat4(
        vec4(1, 0, 0, 0), 
        vec4(0, 1, 0, 0), 
        vec4(0, 0, 1, 0), 
        vec4(-eye_pos, 1)
    );
}

mat4 perspective(float fov, float aspect, float near, float far) {
    float tan_t_2 = tan(radians(fov)/2.);
    float t = tan_t_2 * near;
    float b = -t;
    float n = near;
    float f = far;
    float r = aspect * t;
    float l = -r;
    
    mat4 M_ortho = mat4(
        2. / (r - l),          0,                    0,                   0,
        0,                     2. / (t - b),         0,                   0,
        0,                     0,                    2. / (n - f),        0,
        -(r + l) / (r - l),   -(t + b) / (t - b),    (f + n) / (f - n),   1
    );
    mat4 M_p = mat4(
        n, 0, 0, 0,
        0, n, 0, 0,
        0, 0, n + f, -1.,
        0, 0, n * f, 0
    );
    
    return M_ortho * M_p;
}

void main() {
    vec2 st = gl_FragCoord.xy/u_resolution.xy;
    
    vec3 eye_pos = vec3(0, -0, 1);
    vec3 center = vec3(0);
    vec3 up = vec3(0, 1, 0);
    
    vec3 point = vec3(0, 0, .0);
    mat4 M_v = lookat(center, eye_pos, up);
    mat4 M_p = perspective(30., u_resolution.x / u_resolution.y, 0., 90.);
    mat4 M = M_p * M_v;
    vec4 t_point = M * vec4(point, 1);
    t_point.xyz /= t_point.w;
    
    
    vec3 color = vec3(0.) + distance(vec3(st, 0), t_point.xyz);
    // vec3 color = vec3(t_point.z);

    gl_FragColor = vec4(color,1.0);
}