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

void main()
{
  vec2 texCoord = mix(u_glypth_bounds.xy, u_glypth_bounds.zw, vout_uv);

  vec3 msd = texture(u_font_atlas, texCoord).rgb;
  float sd = median(msd.r, msd.g, msd.b);
  float opacity = sd >= 0.5 ? 1.0 : 0.0;
  fout_color = vec4(color, opacity);
}