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
    
    float f = (st.y - 1.5) * (sin(u_time * 0.0001));
    color = vec3(f);
    
    if (u_on_fbo != 1) {
        color = postp_gaussian_frag(color, st, 500.0, 8.0);
    }
    else {
        vec3 tex = texture(u_tex, st).xyz;
        color = compute_lighting_frag(color) + tex;
    }
    
    outColor = vec4(color, 1.0);
}