import * as twgl from 'twgl.js';
import type {FontAtlasMeta} from './FontAtlasMeta';

export class FontAtlas {
  atlasTexture: WebGLTexture;

  meta: FontAtlasMeta;

  constructor(gl: WebGLRenderingContext, url: string, json: FontAtlasMeta) {
    this.meta = json;
    this.atlasTexture = twgl.createTexture(gl, {
      level: 0,
      internalFormat: gl.RGB,
    });
    twgl.loadTextureFromUrl(gl, this.atlasTexture, {src: url});
  }
}
