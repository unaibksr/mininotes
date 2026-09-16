import fs from 'fs';
import zlib from 'zlib';
import path from 'path';

function createPng(width, height, drawFn) {
  // width x height RGBA buffer
  // Each scanline has 1 filter byte (0) + width * 4 bytes
  const stride = 1 + width * 4;
  const rawData = Buffer.alloc(stride * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * stride;
    rawData[rowOffset] = 0; // None filter
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const [r, g, b, a] = drawFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG chunks
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // IDAT
  const idatChunk = makeChunk('IDAT', deflated);

  // IEND
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crc = crc32(buf.subarray(4, 8 + len));
  buf.writeUInt32BE(crc, 8 + len);
  return buf;
}

// Standard CRC32 table
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Draw icon: Minimalist deep slate/indigo background with a crisp geometric note/pencil logo
function drawNoteIcon(x, y, w, h, isMaskable = false) {
  const nx = x / w;
  const ny = y / h;

  // Background: slate-900 (#0f172a) with subtle blue glow
  const bgR = 15, bgG = 23, bgB = 42;

  // For regular icon, smooth rounded rectangle
  if (!isMaskable) {
    const radius = 0.22;
    // Check distance to rounded corner
    const dx = Math.max(radius - nx, 0, nx - (1 - radius));
    const dy = Math.max(radius - ny, 0, ny - (1 - radius));
    const distSq = dx * dx + dy * dy;
    if (distSq > radius * radius) {
      return [0, 0, 0, 0]; // Transparent outside
    }
  }

  // Center logo: A stylized sleek folded note document and pencil
  // Bounding box from nx: 0.28 to 0.72, ny: 0.24 to 0.76
  const inDoc = (nx >= 0.28 && nx <= 0.72 && ny >= 0.24 && ny <= 0.76);
  // Cut top-right corner for page fold
  const inFold = (nx > 0.58 && ny < 0.38 && (nx - 0.58) + (0.38 - ny) > 0.16);

  if (inDoc && !inFold) {
    // Document background: crisp off-white #f8fafc with subtle gradient
    let docR = 248, docG = 250, docB = 252;
    
    // Draw 3 subtle horizontal text lines inside the doc
    const inLine1 = (nx >= 0.36 && nx <= 0.64 && ny >= 0.44 && ny <= 0.475);
    const inLine2 = (nx >= 0.36 && nx <= 0.56 && ny >= 0.52 && ny <= 0.555);
    const inLine3 = (nx >= 0.36 && nx <= 0.60 && ny >= 0.60 && ny <= 0.635);

    if (inLine1 || inLine2 || inLine3) {
      // Primary blue accent (#3b82f6)
      return [59, 130, 246, 255];
    }

    return [docR, docG, docB, 255];
  }

  // Fold triangle
  if (inDoc && inFold) {
    // Shaded corner flap
    return [203, 213, 225, 255]; // slate-300
  }

  // Pen accent floating at bottom right (nx: 0.62 to 0.76, ny: 0.64 to 0.80)
  const penDist = Math.abs((nx - 0.68) + (ny - 0.72));
  if (nx >= 0.62 && nx <= 0.76 && ny >= 0.64 && ny <= 0.80 && penDist < 0.06) {
    return [99, 102, 241, 255]; // indigo-500
  }

  return [bgR, bgG, bgB, 255];
}

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Generate 192x192
const png192 = createPng(192, 192, (x, y, w, h) => drawNoteIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), png192);

// Generate 512x512
const png512 = createPng(512, 512, (x, y, w, h) => drawNoteIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), png512);

// Generate 512x512 maskable (full bleed background)
const pngMaskable = createPng(512, 512, (x, y, w, h) => drawNoteIcon(x, y, w, h, true));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), pngMaskable);

// Apple touch icon 180x180
const appleTouchIcon = createPng(180, 180, (x, y, w, h) => drawNoteIcon(x, y, w, h, false));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), appleTouchIcon);

console.log('Icons generated successfully in public/');
