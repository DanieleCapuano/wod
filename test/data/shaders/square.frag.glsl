#version 300 es

precision mediump float;

uniform float u_time;

//material for the square
uniform float u_ka,u_kd,u_ks;

//max number of allowed lights
const int MAX_LIGHTS_N=8;

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
in vec4 light_pos;

out vec4 outColor;

void main(){
    vec3 color=vec3(0.);
    float t=u_time/1000.;
    
    // color = vec3(abs(sin(t)), cos(t), sin(1. - t * 2.));
    
    vec3 n=normalize(normal.xyz);
    vec3 pos2viewer=normalize(-view_pos.xyz);//from pos to viewer
    mat4 M=u_view*u_model;
    
    color+=u_ka*u_ambient_intensity*u_ambient_color;
    for(int i=0;i<MAX_LIGHTS_N;i++){
        
        vec4 light_pos=(M*vec4(u_light_positions[i],1.));
        vec3 l=normalize(light_pos.xyz-view_pos.xyz);
        vec3 h=normalize(l+pos2viewer);
        float I=u_light_intensities[i];
        vec3 Lc=u_light_colors[i];
        
        color+=(
            u_kd*I*max(0.,dot(n,l))*Lc+
            u_ks*I*pow(max(0.,dot(n,h)),u_light_specular_exp[i])*Lc
        );
    }
    
    outColor=vec4(color,1.);
}