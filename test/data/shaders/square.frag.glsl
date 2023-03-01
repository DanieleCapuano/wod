#version 300 es

precision highp float;
precision highp int;

uniform float u_time;
uniform vec2 u_resolution;
out vec4 outColor;

#include "lighting.frag"

// ' threshold ' is constant , ' value ' is smoothly varying
float aastep(float threshold , float value) {
    float afwidth = 0.7 * length(vec2(dFdx(value), dFdy(value)));
    // GLSL ' s fwidth ( value ) is abs ( dFdx ( value ) ) + abs ( dFdy ( value ) )
    return smoothstep(threshold - afwidth , threshold + afwidth , value);
}

void main() {
    vec2 st = vec2(gl_FragCoord.xy / u_resolution);
    vec3 color = vec3(0.0);
    float t = u_time / 1000.0;
    
    // color = vec3(abs(sin(t)), cos(t), sin(1. - t * 2.));
    color = compute_lighting_frag(color);
    
    outColor = vec4(color, 1.0);
}