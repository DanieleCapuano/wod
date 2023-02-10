#version 300 es

precision mediump float;

uniform float u_time;

in vec4 normal;
in vec4 view_pos;
out vec4 outColor;

void main() {
    vec3 color = vec3(0.);
    float t = u_time / 1000.;
    color = vec3(abs(sin(t)), cos(t), sin(1. - t * 2.));

    vec4 n = normalize(normal);
    
    outColor = vec4(color, 1.);
}