import * as twgl from 'twgl.js';
import basicFS from './shaders/basic.frag';
import smoothBasicFS from './shaders/smooth-basic.frag';
import antiAliasFS from './shaders/anti-alias.frag';
import basicVS from './shaders/basic.vert';
import {FontAtlas} from './font-atlas/FontAtlas';
import fontAtlasImage from './res/sample-font.png';
import * as fontAtlasMeta from './res/sample-font.json';
import {Query} from './Query';
// eslint-disable-next-line node/no-unpublished-import
import type {GlslShader} from 'webpack-glsl-minify';

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
    renderTime: 0, // time spend rendering (ms)
    renderTimes: [] as number[],
  };

  props = {
    smoothness: 8.0,
    text: 'The quick brown fox jumps over the lazy dog. 1234567890',
    program: RenderProgram.Basic,
  };

  private atlas: FontAtlas;

  private perfQuery: Query;

  constructor(readonly canvas: HTMLCanvasElement, private gl: WebGL2RenderingContext) {
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
      preserveDrawingBuffer: true,
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

  private calculateStatistics(renderTimes: number[]) {
    const sum = renderTimes.reduce((a, b) => a + b, 0);
    const average = sum / renderTimes.length;
    const sortedTimes = [...renderTimes].sort((a, b) => a - b);
    const min = sortedTimes[0];
    const max = sortedTimes[sortedTimes.length - 1];
    const median =
      sortedTimes.length % 2 === 0
        ? (sortedTimes[sortedTimes.length / 2 - 1] + sortedTimes[sortedTimes.length / 2]) / 2
        : sortedTimes[Math.floor(sortedTimes.length / 2)];
    const stdDeviation = Math.sqrt(
      renderTimes.map(time => Math.pow(time - average, 2)).reduce((a, b) => a + b, 0) / renderTimes.length
    );
    return {average, min, max, median, stdDeviation};
  }

  getPerformanceReport(): string {
    const stats = this.calculateStatistics(this.stats.renderTimes);
    return `Performance Report:
Average Time: ${stats.average.toFixed(3)} ms
Minimum Time: ${stats.min.toFixed(3)} ms
Maximum Time: ${stats.max.toFixed(3)} ms
Median Time: ${stats.median.toFixed(3)} ms
Standard Deviation: ${stats.stdDeviation.toFixed(3)} ms
`;
  }

  private renderGlyph(
    char: string,
    program: twgl.ProgramInfo,
    shaderVS: GlslShader,
    shaderFS: GlslShader,
    fontSize: number,
    xOffset: number,
    yOffset: number
  ): number {
    const fontSizeW = fontSize / this.canvas.width;
    const fontSizeH = fontSize / this.canvas.height;

    if (char === ' ') {
      xOffset += fontSizeW * 0.5;
      return xOffset;
    }

    const glypth = this.atlas.getGlyph(char)!;
    if (!glypth.atlasBounds || !glypth.planeBounds) return xOffset;

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
      [shaderVS.uniforms['u_glypth_size'].variableName]: glypthSize,
      [shaderVS.uniforms['u_glypth_offset'].variableName]: [xOffset, -yOffset],
      [shaderVS.uniforms['u_glypth_plane'].variableName]: glypthPlane,
      [shaderVS.uniforms['u_glypth_bounds'].variableName]: glypthBounds,
      [shaderFS.uniforms['u_smoothness'].variableName]: this.props.smoothness,
      [shaderFS.uniforms['u_font_atlas'].variableName]: this.atlas.atlasTexture,
    });
    xOffset += fontSizeW * glypth.advance;

    twgl.drawBufferInfo(this.gl, this.fullscreenBuffer);
    return xOffset;
  }

  private renderText(
    text: string,
    program: twgl.ProgramInfo,
    shaderVS: GlslShader,
    shaderFS: GlslShader,
    fontSize: number,
    xOffset: number,
    yOffset: number
  ): number {
    for (const glyph of text) {
      xOffset = this.renderGlyph(glyph, program, shaderVS, shaderFS, fontSize, xOffset, yOffset);
    }
    return xOffset;
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
      const renderTimeMs = renderTime / 1000000;
      this.stats.renderTime = renderTimeMs;
      this.stats.renderTimes.push(renderTimeMs);
      if (this.stats.renderTimes.length > 60) {
        this.stats.renderTimes.shift(); // remove the oldest measurement to maintain a fixed size
      }
    }

    this.perfQuery.start();

    const ptToPx = (x: number) => x * (4.0 / 3.0);
    const fontSizes = [12, 18, 36, 48, 60, 72, 84, 96];
    const baseOffset = {x: 0 / this.canvas.width, y: 5 / this.canvas.height};

    let yOffset = baseOffset.y;
    for (const fontSize of fontSizes) {
      let xOffset = baseOffset.x;
      const fontSizePx = ptToPx(fontSize);

      const markFontSize = ptToPx(12);
      const markYOffset = yOffset + (fontSizePx - markFontSize) / this.canvas.height;
      xOffset = this.renderText(`${fontSize} `, program, basicVS, shaderFS, markFontSize, xOffset, markYOffset);

      xOffset = this.renderText(this.props.text, program, basicVS, shaderFS, fontSizePx, xOffset, yOffset);
      yOffset += (fontSizePx / this.canvas.height) * 1.38;
    }

    this.perfQuery.finish();

    this.stats.lastTime = time;
    this.animationHandler = requestAnimationFrame(this.render);
    this.stats.ft = performance.now() - t0;

    if (this.onUpdateSubscription !== null) this.onUpdateSubscription();
  }
}

export {Renderer};
