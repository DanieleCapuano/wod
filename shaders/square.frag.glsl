#version 300 es

precision mediump float;

uniform float u_time;
uniform mat4 u_modelview;
uniform mat4 u_projection;

out vec4 outColor;

void main() {
    vec3 color = vec3(0.);
    // color = vec3(abs(sin(u_time)));

    outColor = vec4(color,1.0);
}