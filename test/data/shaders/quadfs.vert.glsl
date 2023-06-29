#version 300 es

precision highp float;
precision highp int;

#include "base.model.vert"
#include "lighting.blinn_phong.vert"
#include "antialiasing.fs_derivatives.vert"
#include "geometry.quad.vert"

void main() {
    mat4 M = u_view * u_model;
    compute_lighting_vert(u_view, M);
    geometry_quad_vert();
    
    gl_Position = u_projection * M * vec4(a_position, 1.0);
}