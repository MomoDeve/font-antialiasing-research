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

  vec2 glyphPlane = mix(u_glypth_plane.xy, u_glypth_plane.zw, vec2(x, y));
  vec2 glyphOrigin = vec2(-1.0, 1.0 - 2.0 * u_glypth_size.y);
  vec2 position = glyphOrigin + 2.0 * (u_glypth_offset + u_glypth_size * glyphPlane);

  vout_uv = vec2(x, y);
  gl_Position =  vec4(position, 0.0, 1.0);
}