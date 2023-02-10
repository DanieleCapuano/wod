#version 300 es

precision mediump float;

in vec3 a_position;
in vec3 a_normal;

uniform mat4 u_modelview;
uniform mat4 u_projection;

out vec4 normal;

void main() {
    mat4 M = u_projection * u_modelview;
    gl_Position = M * vec4(a_position, 1.);

    mat4 Mti = transpose(inverse(M));
    normal = Mti * vec4(a_normal, 0.);
}