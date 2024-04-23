import {Pane} from 'tweakpane';
import './index.scss';
import {RenderProgram, Renderer} from './Renderer';
const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
console.assert(canvas !== null, "Element with id 'main-canvas' must exists");

const pane = new Pane({title: 'Monitor'});

const renderer = Renderer.initialize(canvas);
if (renderer) {
  renderer.start();

  const glInfo = pane.addFolder({title: 'WebGL Info', expanded: true});
  glInfo.addMonitor(renderer.glInfo, 'renderer');
  glInfo.addMonitor(renderer.glInfo, 'vendor');

  const perf = pane.addFolder({title: 'Performance', expanded: true});
  perf.addMonitor(renderer.stats, 'fps', {label: 'FPS'});
  perf.addMonitor(renderer.stats, 'dt', {label: 'dt'});
  perf.addMonitor(renderer.stats, 'renderTime', {label: 'render (ms)'});

  const props = pane.addFolder({title: 'MSDF text settings', expanded: true});
  props.addInput(renderer.props, 'smoothness', {min: 0, max: 0.5, step: 0.01});
  props.addInput(renderer.props, 'text', {label: 'text'});
  props.addInput(renderer.props, 'program', {
    label: 'program',
    options: [
      {text: 'basic', value: RenderProgram.Basic},
      {text: 'smooth basic', value: RenderProgram.SmoothBasic},
    ],
  });
}

const invalidateCanvasSize = () => {
  canvas.height = canvas.clientHeight;
  canvas.width = canvas.clientWidth;
};
invalidateCanvasSize();
window.addEventListener('resize', invalidateCanvasSize);
