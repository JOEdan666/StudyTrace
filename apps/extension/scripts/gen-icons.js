import { writeFileSync } from 'fs';
import { deflateSync, crc32 } from 'zlib';

// PNG 签名
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function createPNG(size, color = [59, 130, 246]) { // #3b82f6
  const width = size;
  const height = size;

  // IHDR chunk
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0); // length
  ihdr.write('IHDR', 4);
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  ihdr[16] = 8; // bit depth
  ihdr[17] = 2; // color type (RGB)
  ihdr[18] = 0; // compression
  ihdr[19] = 0; // filter
  ihdr[20] = 0; // interlace

  const ihdrCrc = crc32(ihdr.subarray(4, 21));
  ihdr.writeUInt32BE(ihdrCrc >>> 0, 21);

  // IDAT chunk (raw image data)
  const rawData = Buffer.alloc(height * (1 + width * 3));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // filter type
    for (let x = 0; x < width; x++) {
      rawData[offset++] = color[0];
      rawData[offset++] = color[1];
      rawData[offset++] = color[2];
    }
  }

  const compressed = deflateSync(rawData);

  const idat = Buffer.alloc(compressed.length + 12);
  idat.writeUInt32BE(compressed.length, 0);
  idat.write('IDAT', 4);
  compressed.copy(idat, 8);
  const idatCrc = crc32(Buffer.concat([Buffer.from('IDAT'), compressed]));
  idat.writeUInt32BE(idatCrc >>> 0, compressed.length + 8);

  // IEND chunk
  const iend = Buffer.from([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);

  return Buffer.concat([PNG_SIGNATURE, ihdr, idat, iend]);
}

// 生成三种尺寸的图标
writeFileSync('dist/icon16.png', createPNG(16));
writeFileSync('dist/icon48.png', createPNG(48));
writeFileSync('dist/icon128.png', createPNG(128));

console.log('PNG icons generated');
