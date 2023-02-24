//material for the square
uniform float u_ka, u_kd, u_ks;

//max number of allowed lights
const int MAX_LIGHTS_N = 8;
uniform vec3 u_ambient_color;
uniform float u_ambient_intensity;
uniform int u_nlights;

uniform vec3 u_light_positions[MAX_LIGHTS_N];
uniform vec3 u_light_colors[MAX_LIGHTS_N];
uniform float u_light_intensities[MAX_LIGHTS_N];
uniform float u_light_specular_exp[MAX_LIGHTS_N];

in vec4 normal;
in vec3 light_dirs[MAX_LIGHTS_N];
in vec3 light_half_vects[MAX_LIGHTS_N];

vec3 compute_lighting_frag(vec3 start_color) {
    vec3 color = start_color;
    vec3 n = normalize(normal.xyz);
    
    color += u_ka * u_ambient_color;
    
    for(int i = 0; i < u_nlights; i ++ ) {
        vec3 l = normalize(light_dirs[i]);
        vec3 h = normalize(light_half_vects[i]);
        float I = u_light_intensities[i];
        vec3 Lc = u_light_colors[i];
        
        color += (
            (u_kd * I*max(0.0, dot(n, l)) * Lc) +
            (u_ks * I*pow(max(0.0, dot(n, h)), u_light_specular_exp[i]) * Lc)
        );
    }
    
    return color;
}