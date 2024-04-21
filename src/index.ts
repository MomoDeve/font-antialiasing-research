import {Pane} from 'tweakpane';
import './index.scss';
import {Renderer} from './Renderer';
import {NormalizedColorWrapper, VectorWrapper} from './utils/tweakpane';
const canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
console.assert(canvas !== null, "Element with id 'main-canvas' must exists");

const pane = new Pane({title: 'Monitor'});

const renderer = Renderer.initialize(canvas);
if (renderer) {
  renderer.start();

  const perf = pane.addFolder({title: 'Performance', expanded: true});
  perf.addMonitor(renderer.stats, 'ft', {label: 'Frame time', view: 'graph', min: 0, max: 100});
  perf.addMonitor(renderer.stats, 'fps', {label: 'FPS'});
  perf.addMonitor(renderer.stats, 'dt', {label: 'dt'});

  const props = pane.addFolder({title: 'MSDF Text', expanded: true});
  props.addInput(renderer.props, 'fontSize', {label: 'Font size'});
  props.addInput(renderer.props, 'text', {label: 'text'});
}

const invalidateCanvasSize = () => {
  canvas.height = canvas.clientHeight;
  canvas.width = canvas.clientWidth;
};
invalidateCanvasSize();
window.addEventListener('resize', invalidateCanvasSize);
