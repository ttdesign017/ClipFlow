const fs = require('fs');
const zlib = require('zlib');

// 创建一个简单的 256x256 PNG 文件（蓝色渐变背景 + 白色文字样式的剪贴板图标）
function createPNG() {
  const width = 256;
  const height = 256;
  
  // 创建 RGBA 数据
  const data = Buffer.alloc(width * height * 4);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // 蓝色渐变背景
      data[idx] = 59; // R
      data[idx + 1] = 130; // G
      data[idx + 2] = 246; // B
      data[idx + 3] = 255; // A
    }
  }
  
  // 添加一个简单的白色剪贴板图标（简化版）
  const centerX = width / 2;
  const centerY = height / 2;
  const size = 60;
  
  for (let y = centerY - size; y < centerY + size; y++) {
    for (let x = centerX - size * 0.7; x < centerX + size * 0.7; x++) {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
        data[idx] = 255; // R
        data[idx + 1] = 255; // G
        data[idx + 2] = 255; // B
        data[idx + 3] = 255; // A
      }
    }
  }
  
  // PNG 文件头
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type (RGBA)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  
  const ihdr = createChunk('IHDR', ihdrData);
  
  // IDAT chunk (压缩的图像数据)
  const rawData = Buffer.alloc(width * height * 4 + height);
  for (let y = 0; y < height; y++) {
    rawData[y * (width * 4 + 1)] = 0; // filter byte
    data.copy(rawData, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  }
  
  const compressedData = zlib.deflateSync(rawData);
  const idat = createChunk('IDAT', compressedData);
  
  // IEND chunk
  const iend = createChunk('IEND', Buffer.alloc(0));
  
  // 组合 PNG 文件
  const png = Buffer.concat([signature, ihdr, idat, iend]);
  
  return png;
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  
  const typeBuffer = Buffer.from(type);
  
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = zlib.crc32(crcData);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc >>> 0, 0);
  
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

const png = createPNG();
fs.writeFileSync('app-icon.png', png);
console.log('Created app-icon.png');
