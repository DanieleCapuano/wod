#version 300 es

precision highp float;

in vec3 a_position;
in vec3 a_normal;

const int MAX_LIGHTS_N = 8;

uniform mat4 u_model;
uniform mat4 u_view;
uniform mat4 u_modelview;
uniform mat4 u_projection;
uniform vec3 u_light_positions[MAX_LIGHTS_N];

out vec4 normal;
out vec4 view_pos;
// out vec4 light_pos[MAX_LIGHTS_N];
out vec3 light_dirs[MAX_LIGHTS_N];
out vec3 light_half_vects[MAX_LIGHTS_N];

void main() {
    mat4 M = u_view * u_model;
    view_pos = M * vec4(a_position, 1.0);
    
    for(int i = 0; i < MAX_LIGHTS_N; i ++ ) {
        //TODO WHY IS THIS HAPPENING?
        // vec4 lpos = u_view * vec4(u_light_positions[i], 1.0);
        vec4 lpos = vec4(u_light_positions[i], 1.0);
        light_dirs[i] = normalize(lpos.xyz - view_pos.xyz);
        
        vec3 pos2eye = vec3(-view_pos.xyz);
        light_half_vects[i] = normalize(pos2eye + light_dirs[i]);
        
    }
    
    mat4 Mti = transpose(inverse(M));
    normal = (Mti * vec4(a_normal, 0.0));
    // normal = u_normal_matrix * vec4(a_normal, 0.0);
    
    gl_Position = u_projection * M * vec4(a_position, 1.0);
}