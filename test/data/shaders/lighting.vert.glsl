//we'll use as inspiration the approach described here 
//https://stackoverflow.com/a/62630376

in vec3 a_normal;

const int MAX_LIGHTS_N = 8;

uniform vec3 u_light_positions[MAX_LIGHTS_N];
uniform int u_nlights;

out vec4 normal;
out vec3 light_dirs[MAX_LIGHTS_N];
out vec3 light_half_vects[MAX_LIGHTS_N];

void compute_lighting_vert(mat4 view_m, mat4 modelview_m) {
    vec4 view_pos = modelview_m * vec4(a_position, 1.0);
    
    for(int i = 0; i < u_nlights; i ++ ) {
        vec4 lpos = view_m * vec4(u_light_positions[i], 1.0);
        light_dirs[i] = normalize(lpos.xyz - view_pos.xyz);
        
        vec3 pos2eye = vec3(-view_pos.xyz);
        light_half_vects[i] = normalize(pos2eye + light_dirs[i]);
    }
    
    mat4 Mti = transpose(inverse(modelview_m));
    normal = (Mti * vec4(a_normal, 0.0));
}