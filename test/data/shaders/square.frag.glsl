#version 300 es

precision highp float;
precision highp int;

uniform float u_time;
uniform vec2 u_resolution;
out vec4 outColor;

#include "lighting.blinn_phong.frag"
#include "antialiasing.fs_derivatives.frag"
#include "postprocessing.fbo.frag"

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution;
    
    vec3 color = vec3(0.0);
    float t = u_time / 1000.0;
    
    vec3 tex = texture(u_tex, st).xyz;
    if (u_on_fbo == 1) {
        color = (tex + vec3(st.x, st.y, st.x * st.y)) * fract(sin(u_time * 0.005));
    }
    else {
        color = compute_lighting_frag(color) * tex;
    }
    
    outColor = vec4(color, 1.0);
}