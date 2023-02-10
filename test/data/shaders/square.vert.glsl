#version 300 es

precision mediump float;

in vec3 a_position;
in vec3 a_normal;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_projection;

out vec4 normal;
out vec4 view_pos;

void main() {
    mat4 M = u_view * u_model;
    view_pos = M * vec4(a_position, 1.);

    mat4 Mti = transpose(inverse(M));
    normal = Mti * vec4(a_normal, 0.);

    gl_Position = u_projection * view_pos;
}