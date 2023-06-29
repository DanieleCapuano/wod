#version 300 es

precision highp float;
precision highp int;

//Base-config Uniform Buffer Object
layout (std140) uniform Base_UBO {
    mat4 u_model;
    mat4 u_view;
    mat4 u_projection;
    float u_time;
    vec2 u_resolution;
};

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
        //from geometry.* (e.g. geometry.quad) we expect texcoord to be passed from vertex shader
        color = postp_gaussian_frag(color, texcoord, 500.0, 8.0);
    }
    else {
        vec3 tex = texture(u_tex, texcoord).xyz;
        color = compute_lighting_frag(color) + tex;
    }
    
    // outColor = vec4(vec3(abs(sin(u_time * 0.001)), u_resolution.y, 0.0), 1.0);
    // outColor = vec4(vec3(u_kd, 0.0, 0.0), 1.0);
    outColor = vec4(color, 1.0);
}