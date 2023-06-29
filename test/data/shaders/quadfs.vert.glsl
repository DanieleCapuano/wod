#version 300 es

precision highp float;
precision highp int;

in vec3 a_position;

//Base-config Uniform Buffer Object
layout (std140) uniform Base_UBO {
    mat4 u_model;
    mat4 u_view;
    mat4 u_projection;
    float u_time;
    vec2 u_resolution;
};

#include "lighting.blinn_phong.vert"
#include "antialiasing.fs_derivatives.vert"
#include "geometry.quad.vert"

void main() {
    mat4 M = u_view * u_model;
    compute_lighting_vert(u_view, M);
    geometry_quad_vert();
    
    gl_Position = u_projection * M * vec4(a_position, 1.0);
}