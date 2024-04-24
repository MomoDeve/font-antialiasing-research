import * as twgl from 'twgl.js';
import basicFS from './shaders/basic.frag';
import smoothBasicFS from './shaders/smooth-basic.frag';
import antiAliasFS from './shaders/anti-alias.frag';
import basicVS from './shaders/basic.vert';
import {FontAtlas} from './font-atlas/FontAtlas';
import fontAtlasImage from './res/sample-font.png';
import * as fontAtlasMeta from './res/sample-font.json';
import {Query} from './Query';

export enum RenderProgram {
  Basic,
  SmoothBasic,
  AntiAlias,
}

class Renderer {
  private animationHandler = -1;

  private basicProgram: twgl.ProgramInfo;
  private smoothBasicProgram: twgl.ProgramInfo;
  private antiAliasProgram: twgl.ProgramInfo;

  private fullscreenBuffer: twgl.BufferInfo;
  private onUpdateSubscription: VoidFunction | null = null;

  glInfo: {
    renderer: string;
    vendor: string;
  };

  stats = {
    ft: 0, // time between frame begin and end (frame time)
    dt: 0, // time between frame begin points (delta time)
    fps: 0, // Frames Per Second
    lastTime: 0, // last render timestamp
    renderTime: 0, // time spend rendering (ns)
  };

  props = {
    smoothness: 8.0,
    text: 'abcdefghijklmopq 1234567890',
    program: RenderProgram.Basic,
  };

  atlas: FontAtlas;

  perfQuery: Query;

  constructor(private canvas: HTMLCanvasElement, private gl: WebGL2RenderingContext) {
    this.render = this.render.bind(this);

    this.basicProgram = twgl.createProgramInfo(gl, [basicVS.sourceCode, basicFS.sourceCode], ['vin_index']);
    this.smoothBasicProgram = twgl.createProgramInfo(gl, [basicVS.sourceCode, smoothBasicFS.sourceCode], ['vin_index']);
    this.antiAliasProgram = twgl.createProgramInfo(gl, [basicVS.sourceCode, antiAliasFS.sourceCode], ['vin_index']);

    // prettier-ignore
    this.fullscreenBuffer = twgl.createBufferInfoFromArrays(gl, {
      vin_index: {numComponents: 1, data: [0, 1, 2, 3, 4, 5]}
    });
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this.atlas = new FontAtlas(gl, fontAtlasImage, fontAtlasMeta);
    this.perfQuery = new Query(gl);

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');

    this.glInfo = {
      renderer: gl.getParameter(debugInfo?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER),
      vendor: gl.getParameter(debugInfo?.UNMASKED_VENDOR_WEBGL ?? gl.VENDOR),
    };
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

    let program;
    let shaderFS;
    if (this.props.program === RenderProgram.SmoothBasic) {
      program = this.smoothBasicProgram;
      shaderFS = smoothBasicFS;
    } else if (this.props.program === RenderProgram.AntiAlias) {
      program = this.antiAliasProgram;
      shaderFS = antiAliasFS;
    } else {
      program = this.basicProgram;
      shaderFS = basicFS;
    }
    gl.useProgram(program.program);
    twgl.setBuffersAndAttributes(gl, program, this.fullscreenBuffer);

    const renderTime = this.perfQuery.poll();
    if (renderTime) {
      this.stats.renderTime = renderTime / 1000000;
    }

    this.perfQuery.start();

    const fontSizes = [12, 16, 24, 36, 72, 144, 216];
    let verticalOffset = 0;
    for (const fontSize of fontSizes) {
      const fontSizeW = fontSize / this.canvas.width;
      const fontSizeH = fontSize / this.canvas.height;

      let horizontalOffset = 0.0;
      for (const char of this.props.text) {
        if (char === ' ') {
          horizontalOffset += fontSizeW * 0.5;
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

        twgl.setUniforms(program, {
          [basicVS.uniforms['u_glypth_size'].variableName]: glypthSize,
          [basicVS.uniforms['u_glypth_offset'].variableName]: [horizontalOffset, -verticalOffset],
          [basicVS.uniforms['u_glypth_plane'].variableName]: glypthPlane,
          [basicVS.uniforms['u_glypth_bounds'].variableName]: glypthBounds,
          [shaderFS.uniforms['u_smoothness'].variableName]: this.props.smoothness,
          [shaderFS.uniforms['u_font_atlas'].variableName]: this.atlas.atlasTexture,
        });
        horizontalOffset += fontSizeW * glypth.advance;

        twgl.drawBufferInfo(gl, this.fullscreenBuffer);
      }
      verticalOffset += fontSizeH * 2;
    }

    this.perfQuery.finish();

    this.stats.lastTime = time;
    this.animationHandler = requestAnimationFrame(this.render);
    this.stats.ft = performance.now() - t0;

    if (this.onUpdateSubscription !== null) this.onUpdateSubscription();
  }
}

export {Renderer};
