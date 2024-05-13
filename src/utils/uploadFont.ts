import type {FontAtlasMeta} from '../font-atlas/FontAtlasMeta';

type FontData = {fontAtlasMeta: FontAtlasMeta; fontAtlasSrc: string};

function readFontFiles(jsonFile: File, pngFile: File): Promise<FontData | undefined> {
  return new Promise(resolve => {
    const returnWithError = (message: string) => {
      alert(message);
      resolve(undefined);
    };

    const jsonReader = new FileReader();
    const pngReader = new FileReader();

    let fontAtlasMeta: FontAtlasMeta | undefined;
    let fontAtlasSrc = '';

    jsonReader.onload = function (event) {
      try {
        fontAtlasMeta = JSON.parse(event.target!.result as string);
        if (fontAtlasSrc && fontAtlasMeta) resolve({fontAtlasMeta, fontAtlasSrc});
      } catch (e) {
        returnWithError('Failed to parse JSON file');
      }
    };

    pngReader.onload = function (event) {
      fontAtlasSrc = event.target!.result as string;
      if (fontAtlasSrc && fontAtlasMeta) resolve({fontAtlasMeta, fontAtlasSrc});
    };

    jsonReader.onerror = () => returnWithError('Failed to read JSON file');
    pngReader.onerror = () => returnWithError('Failed to read PNG file');

    jsonReader.readAsText(jsonFile);
    pngReader.readAsDataURL(pngFile);
  });
}

export function uploadFont(): Promise<FontData | undefined> {
  return new Promise(resolve => {
    const inputElement = document.createElement('input');
    inputElement.type = 'file';
    inputElement.multiple = true;
    inputElement.accept = '.json,.png';
    inputElement.style.display = 'none';

    inputElement.onchange = () => {
      if (inputElement.files && inputElement.files.length === 2) {
        const files = Array.from(inputElement.files);
        const jsonFile = files.find(file => file.name.endsWith('.json'));
        const pngFile = files.find(file => file.name.endsWith('.png'));

        if (jsonFile && pngFile) {
          readFontFiles(jsonFile, pngFile).then(resolve);
        } else {
          alert('You must select exactly one JSON file and one PNG file.');
          resolve(undefined);
        }
      } else {
        alert('You must select exactly one JSON file and one PNG file.');
        resolve(undefined);
      }
      document.body.removeChild(inputElement);
    };

    document.body.appendChild(inputElement);
    inputElement.click();
  });
}
