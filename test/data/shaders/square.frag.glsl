#version 300 es

precision highp float;
precision highp int;

uniform float u_time;
uniform vec2 u_resolution;
out vec4 outColor;

#include "lighting.blinn_phong.frag"
#include "antialiasing.fs_derivatives.frag"
#include "antialiasing.postp_gaussian.frag"

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution;
    
    vec3 color = vec3(0.0);
    
    color = compute_lighting_frag(color);
    
    outColor = vec4(color, 1.0);
}