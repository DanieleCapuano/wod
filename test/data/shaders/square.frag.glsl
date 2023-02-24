#version 300 es

precision highp float;
precision highp int;

uniform float u_time;
out vec4 outColor;

#include "lighting.frag"

void main() {
    vec3 color = vec3(0.0);
    float t = u_time / 1000.0;
    
    // color = vec3(abs(sin(t)), cos(t), sin(1. - t * 2.));
    color = compute_lighting_frag(color);
    
    outColor = vec4(color, 1.0);
}