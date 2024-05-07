export function downloadImage(canvas: HTMLCanvasElement, filetype: string, filename: string): void {
  const imageURL = canvas.toDataURL(filetype);

  const downloadLink = document.createElement('a');
  downloadLink.href = imageURL;
  downloadLink.download = filename;

  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}
