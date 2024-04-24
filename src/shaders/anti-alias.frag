#version 300 es
precision mediump float;

in vec2 vout_uv;
out vec4 fout_color;

uniform float u_screen_px_range;
uniform vec4 u_glypth_bounds;
uniform vec2 u_inv_screen_size;

uniform sampler2D u_font_atlas;

const vec3 color = vec3(0.0, 0.0, 0.0);

float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
}

float sampleSDF(vec2 uv) {
    vec2 texCoord = mix(u_glypth_bounds.xy, u_glypth_bounds.zw, uv);
    vec3 msd = texture(u_font_atlas, texCoord).rgb;
    float sd = median(msd.r, msd.g, msd.b);
    return step(0.5, sd);
}

void main()
{
  vec2 offset = vec2( u_inv_screen_size.x, 0);
  vec2 uvL = vout_uv - offset;
  vec2 uvR = vout_uv + offset;

  float sdL = sampleSDF(uvL);
  float sdR = sampleSDF(uvR);

  vec3 opacity = vec3(sdL, mix(sdL, sdR, 0.5), sdR);
  
  fout_color = vec4(vec3(1.0) - opacity, max(sdL, sdR));
}