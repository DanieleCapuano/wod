#version 300 es

precision highp float;
precision highp int;

uniform float u_time;
uniform vec2 u_resolution;
out vec4 outColor;

#include "lighting.frag"
#include "antialiasing.frag"

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution;
    
    vec3 color = vec3(0.0);
    float t = u_time / 1000.0;
    
    // st = aastep2d(0.2, st * abs(sin(t * 10.0) * 20.0));
    // vec3 c = vec3(abs(st.x * sin(t)), abs(st.y * cos(t)), min(st.x, st.y));
    
    // color = mix(c, compute_lighting_frag(color), sin(t) * 0.5 + 0.5);
    color = compute_lighting_frag(color);
    color = mix(vec3(st.x, st.y, st.x * st.y), color, sin(t) * 0.5 + 0.5);
    
    outColor = vec4(color, 1.0);
}