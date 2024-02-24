import * as twgl from 'twgl.js';
import type {FontAtlasMeta, GlythMeta} from './FontAtlasMeta';

export class FontAtlas {
  readonly atlasTexture: WebGLTexture;

  readonly meta: FontAtlasMeta;

  constructor(gl: WebGLRenderingContext, url: string, json: FontAtlasMeta) {
    this.meta = json;
    this.atlasTexture = twgl.createTexture(gl, {
      level: 0,
      internalFormat: gl.RGB,
    });
    twgl.loadTextureFromUrl(gl, this.atlasTexture, {src: url, flipY: 1});
  }

  getGlyph(character: string): GlythMeta | undefined {
    const unicode = character.codePointAt(0);
    return this.meta.glyphs.find(glypth => glypth.unicode === unicode);
  }
}
