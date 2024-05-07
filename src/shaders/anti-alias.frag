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
  float sd = median(msd.r, msd.g, msd.b) - 0.65;
  float opacity = clamp(sd * distance + 0.5, 0.0, 1.0);
  return opacity;
}

void main()
{
  vec2 dxdy = vec2(dFdx(vout_uv.x), dFdy(vout_uv.y));

  vec2 atlasSize = vec2(textureSize(u_font_atlas, 0));
  vec2 dAtlas = dxdy * atlasSize;
  float pixelDistance = u_smoothness * inversesqrt(dAtlas.x * dAtlas.x + dAtlas.y * dAtlas.y);

  vec2 xOffset = vec2(dxdy.x / 3.0, 0.0);
  vec2 yOffset = vec2(0.0, dxdy.y / 2.0);

  vec4 samples = vec4(
    sampleSDF(vout_uv - xOffset, pixelDistance),
    sampleSDF(vout_uv + xOffset, pixelDistance),
    sampleSDF(vout_uv - yOffset, pixelDistance),
    sampleSDF(vout_uv + yOffset, pixelDistance)
  );
  float opacity = max(max(samples[0], samples[1]), max(samples[2], samples[3]));

  const float p1 = 1.0 / 3.0;
  const float p2 = 2.0 / 3.0;
  vec2 mixed = mix(samples.xz, samples.yw, vec2(0.5));
  vec3 RGB = vec3(samples.x, mixed.x, samples.y) + vec3(mixed.y);
  vec3 color = 
    RGB.r * vec3(1.0,  p1, 0.0) +
    RGB.g * vec3( p2, 1.0,  p2) +
    RGB.b * vec3(0.0,  p1, 1.0);

  color = color / max(color.r, max(color.g, color.b));
  fout_color = vec4(vec3(1.0) - color, opacity);
}