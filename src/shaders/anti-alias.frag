#version 300 es
precision mediump float;

in vec2 vout_uv;
out vec4 fout_color;

uniform float u_smoothness;

uniform sampler2D u_font_atlas;

const vec3 color = vec3(0.0, 0.0, 0.0);

float median(float r, float g, float b) {
    return max(min(r, g), min(max(r, g), b));
}

float sampleSDF(vec2 texcoord, float distance) {
  vec3 msd = texture(u_font_atlas, texcoord).rgb;
  float sd = median(msd.r, msd.g, msd.b) - 0.5;
  float opacity = clamp(sd * distance + 0.5, 0.0, 1.0);
  return opacity;
}

void main()
{
  vec2 dxdy = vec2(dFdx(vout_uv.x), dFdy(vout_uv.y));

  vec2 atlasSize = vec2(textureSize(u_font_atlas, 0));
  vec2 dAtlas = dxdy * atlasSize;
  float pixelDistance = u_smoothness * inversesqrt(dAtlas.x * dAtlas.x + dAtlas.y * dAtlas.y);

  vec2 offset = dxdy * vec2(1.0 / 3.0, 0.0);

  vec3 RGB = vec3(
    sampleSDF(vout_uv - offset, pixelDistance),
    sampleSDF(vout_uv, pixelDistance),
    sampleSDF(vout_uv + offset, pixelDistance)
  );
  float opacity = max(RGB.r, max(RGB.g, RGB.b));

  float prop = 1.0 / 3.0;
  vec3 color = 
    RGB.r * vec3(1.0, prop, 0.0) +
    RGB.g * vec3(prop, 1.0, prop) +
    RGB.b * vec3(0.0, prop, 1.0);
  color = vec3(1.0) - min(color, vec3(1.0));
  
  fout_color = vec4(color, opacity);
}