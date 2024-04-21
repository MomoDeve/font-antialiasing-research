import * as twgl from 'twgl.js';
import basicFS from './shaders/basic.frag';
import basicVS from './shaders/basic.vert';
import {FontAtlas} from './font-atlas/FontAtlas';
import fontAtlasImage from './res/sample-font.png';
import * as fontAtlasMeta from './res/sample-font.json';
import {Query} from './Query';

class Renderer {
  private animationHandler = -1;
  private basicProgram: twgl.ProgramInfo;
  private fullscreenBuffer: twgl.BufferInfo;
  private onUpdateSubscription: VoidFunction | null = null;

  stats = {
    ft: 0, // time between frame begin and end (frame time)
    dt: 0, // time between frame begin points (delta time)
    fps: 0, // Frames Per Second
    lastTime: 0, // last render timestamp
    renderTime: 0, // time spend rendering (ns)
  };

  props = {
    fontSize: 128,
    text: 'abcdefghijklmopq 1234567890',
  };

  atlas: FontAtlas;

  perfQuery: Query;

  constructor(private canvas: HTMLCanvasElement, private gl: WebGL2RenderingContext) {
    this.render = this.render.bind(this);

    this.basicProgram = twgl.createProgramInfo(gl, [basicVS.sourceCode, basicFS.sourceCode], ['vin_index']);

    // prettier-ignore
    this.fullscreenBuffer = twgl.createBufferInfoFromArrays(gl, {
      vin_index: {numComponents: 1, data: [0, 1, 2, 3, 4, 5]}
    });
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this.atlas = new FontAtlas(gl, fontAtlasImage, fontAtlasMeta);
    this.perfQuery = new Query(gl);
  }

  static initialize(canvas: HTMLCanvasElement): Renderer | null {
    const attributes: WebGLContextAttributes = {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: 'high-performance',
    };
    const gl = canvas.getContext('webgl2', attributes);
    if (gl === null) {
      return null;
    }
    return new Renderer(canvas, gl);
  }

  start(): void {
    this.animationHandler = requestAnimationFrame(this.render);
  }

  stop(): void {
    cancelAnimationFrame(this.animationHandler);
  }

  onUpdate(cb: VoidFunction) {
    this.onUpdateSubscription = cb;
  }

  render(time: number): void {
    const t0 = performance.now();
    const gl = this.gl;
    this.stats.dt = time - this.stats.lastTime;
    this.stats.fps = 1000.0 / this.stats.dt; // approximation from delta time, you can count frames in second instead

    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(this.basicProgram.program);
    twgl.setBuffersAndAttributes(gl, this.basicProgram, this.fullscreenBuffer);

    const w = this.canvas.width;
    const h = this.canvas.height;

    const fontSizeW = this.props.fontSize / w;
    const fontSizeH = this.props.fontSize / h;

    const renderTime = this.perfQuery.poll();
    if (renderTime) {
      this.stats.renderTime = renderTime / 1000000;
    }

    this.perfQuery.start();

    let offset = 0.0;
    for (const char of this.props.text) {
      if (char === ' ') {
        offset += fontSizeW * 0.5;
        continue;
      }

      const glypth = this.atlas.getGlyph(char)!;
      if (!glypth.atlasBounds || !glypth.planeBounds) continue;

      const glypthBounds = [
        glypth.atlasBounds.left / this.atlas.meta.atlas.width,
        glypth.atlasBounds.bottom / this.atlas.meta.atlas.height,
        glypth.atlasBounds.right / this.atlas.meta.atlas.width,
        glypth.atlasBounds.top / this.atlas.meta.atlas.height,
      ];
      const glypthPlane = [
        glypth.planeBounds.left,
        glypth.planeBounds.bottom,
        glypth.planeBounds.right,
        glypth.planeBounds.top,
      ];
      const glypthSize = [fontSizeW, fontSizeH];

      twgl.setUniforms(this.basicProgram, {
        [basicVS.uniforms['u_glypth_size'].variableName]: glypthSize,
        [basicVS.uniforms['u_glypth_offset'].variableName]: [offset, -0.0],
        [basicVS.uniforms['u_glypth_plane'].variableName]: glypthPlane,
        [basicFS.uniforms['u_screen_px_range'].variableName]: this.atlas.meta.atlas.distanceRange,
        [basicFS.uniforms['u_glypth_bounds'].variableName]: glypthBounds,
        [basicFS.uniforms['u_font_atlas'].variableName]: this.atlas.atlasTexture,
      });
      offset += fontSizeW * glypth.advance;

      twgl.drawBufferInfo(gl, this.fullscreenBuffer);
    }

    this.perfQuery.finish();

    this.stats.lastTime = time;
    this.animationHandler = requestAnimationFrame(this.render);
    this.stats.ft = performance.now() - t0;

    if (this.onUpdateSubscription !== null) this.onUpdateSubscription();
  }
}

export {Renderer};
