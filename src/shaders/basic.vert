#version 300 es
in float vin_index;

out vec2 vout_uv;

uniform vec2 u_glypth_size;
uniform vec2 u_glypth_offset;
uniform vec4 u_glypth_plane;

void main()
{
  float x = float(((uint(vin_index) + 2u) / 3u) % 2u);
  float y = float(((uint(vin_index) + 1u) / 3u) % 2u);
  vec2 position = vec2(-1.0, 1.0 - 2.0 * u_glypth_size.y) + 2.0 * (vec2(u_glypth_offset.x, -u_glypth_offset.y) + u_glypth_size * vec2(x, y));

  vout_uv = vec2(x, y);
  gl_Position =  vec4(position, 0.0, 1.0);
}