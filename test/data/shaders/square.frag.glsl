#version 300 es

precision mediump float;

uniform float u_time;

//material for the square
uniform float u_ka, u_kd, u_ks;

//max number of allowed lights
const int MAX_LIGHTS_N = 8;

uniform vec3 u_ambient_color;
uniform float u_ambient_intensity;

uniform vec3 u_light_positions[MAX_LIGHTS_N];
uniform vec3 u_light_colors[MAX_LIGHTS_N];
uniform float u_light_intensities[MAX_LIGHTS_N];
uniform float u_light_specular_exp[MAX_LIGHTS_N];

uniform mat4 u_model;
uniform mat4 u_view;

in vec4 normal;
in vec4 view_pos;
in vec3 light_dirs[MAX_LIGHTS_N];
in vec3 light_half_vects[MAX_LIGHTS_N];

out vec4 outColor;

void main() {
    vec3 color = vec3(0.0);
    float t = u_time / 1000.0;
    
    // color = vec3(abs(sin(t)), cos(t), sin(1. - t * 2.));
    
    vec3 n = normalize(normal.xyz);
    // vec3 view2pos = normalize(-view_pos.xyz / view_pos.w); //from viewer (i.e. camera) to current pos
    // mat4 M = u_view * u_model;
    
    color += u_ka * u_ambient_intensity * u_ambient_color;
    for(int i = 0; i < MAX_LIGHTS_N; i ++ ) {
        
        // vec4 light_pos = (M * vec4(u_light_positions[i], 1.0));
        // vec3 lpos = light_pos[i].xyz / light_pos[i].w;
        // light_pos.xyz /= light_pos.w;
        // color.r = light_pos[i].w != 1.0 ? -1.0 : light_pos[i].w;
        
        vec3 l = normalize(light_dirs[i]);
        vec3 h = normalize(light_half_vects[i]);
        float I = u_light_intensities[i];
        vec3 Lc = u_light_colors[i];
        
        color += (
                u_kd * I*max(0.0, dot(n, l)) * Lc +
                u_ks * I*pow(max(0.0, dot(n, h)), u_light_specular_exp[i]) * Lc
        );
        
    }
    
    // color.r = max(0.0, color.r);
    outColor = vec4(color, 1.0);
}