# MSDF Font Antialiasing Research
This is repository for research of ways to anti-alias MSDF fonts rendered on gpu. We also research ways to compress sdf textures to minimize memory footprint and allow more precise font atlas to be stored

## Installation
- `npm install`
- `npm init` (optional)

## Scripts
- `npm run start` for development
- `npm run build` for release build
- `npm run test` for unit tests
- `npm run lint:styles:fix` to fix linting in css
- More in [./package.json](./package.json#L6)

## Credits
- SSIM Comparison: https://medium.com/srm-mic/all-about-structural-similarity-index-ssim-theory-code-in-pytorch-6551b455541e
- VDT Encoding Paper: https://www.researchgate.net/publication/2880206_Distance_Field_Compression
- Compression of SDFs using VDT + LZMA: https://www.lexaloffle.com/bbs/?tid=45300
- MSDF Algorithm: https://github.com/Chlumsky/msdfgen
- WebGL TS Template: https://github.com/Tirondzo/ts-webgl-template
