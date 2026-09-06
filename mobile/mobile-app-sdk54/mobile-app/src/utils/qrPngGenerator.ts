// Pure JS PNG encoder for QR codes in React Native (Zero canvas/DOM/zlib dependencies)
const QRCode = require('qrcode/lib/core/qrcode');

function crc32(buf: Uint8Array): number {
  let table: number[] = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function adler32(buf: Uint8Array): number {
  let a = 1, b = 0;
  for (let i = 0; i < buf.length; i++) {
    a = (a + buf[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

function concatUint8Arrays(arrays: Uint8Array[]): Uint8Array {
  let totalLength = 0;
  for (const arr of arrays) {
    totalLength += arr.length;
  }
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  return result;
}

function uint32ToBytesBE(val: number): Uint8Array {
  return new Uint8Array([
    (val >>> 24) & 0xFF,
    (val >>> 16) & 0xFF,
    (val >>> 8) & 0xFF,
    val & 0xFF,
  ]);
}

function stringToBytes(str: string): Uint8Array {
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) {
    bytes[i] = str.charCodeAt(i);
  }
  return bytes;
}

function makeChunk(type: string, data: Uint8Array): Uint8Array {
  const typeBytes = stringToBytes(type);
  const lenBytes = uint32ToBytesBE(data.length);
  const toCrc = concatUint8Arrays([typeBytes, data]);
  const crcBytes = uint32ToBytesBE(crc32(toCrc));
  return concatUint8Arrays([lenBytes, typeBytes, data, crcBytes]);
}

export function generateQrPngBytes(text: string, scale = 10, margin = 4): Uint8Array {
  const qr = QRCode.create(text, { errorCorrectionLevel: 'M' });
  const modCount = qr.modules.size;
  const imgSize = (modCount + margin * 2) * scale;

  const scanlineLen = 1 + imgSize;
  const rawData = new Uint8Array(scanlineLen * imgSize);

  for (let y = 0; y < imgSize; y++) {
    const offset = y * scanlineLen;
    rawData[offset] = 0; // Filter: None
    const modY = Math.floor(y / scale) - margin;

    for (let x = 0; x < imgSize; x++) {
      const modX = Math.floor(x / scale) - margin;
      let isDark = false;
      if (modX >= 0 && modX < modCount && modY >= 0 && modY < modCount) {
        isDark = qr.modules.get(modY, modX);
      }
      rawData[offset + 1 + x] = isDark ? 0 : 255;
    }
  }

  // Deflate uncompressed blocks (max 65535 bytes per block)
  const maxBlock = 65535;
  const numBlocks = Math.ceil(rawData.length / maxBlock);
  const deflateParts: Uint8Array[] = [];

  // zlib header
  deflateParts.push(new Uint8Array([0x78, 0x01]));

  for (let i = 0; i < numBlocks; i++) {
    const isLast = (i === numBlocks - 1);
    const start = i * maxBlock;
    const end = Math.min(start + maxBlock, rawData.length);
    const len = end - start;
    const nlen = len ^ 0xFFFF;

    const blockHeader = new Uint8Array([
      isLast ? 0x01 : 0x00,
      len & 0xFF,
      (len >>> 8) & 0xFF,
      nlen & 0xFF,
      (nlen >>> 8) & 0xFF,
    ]);

    deflateParts.push(blockHeader);
    deflateParts.push(rawData.subarray(start, end));
  }

  // Adler32
  deflateParts.push(uint32ToBytesBE(adler32(rawData)));

  const idatContent = concatUint8Arrays(deflateParts);

  const chunks: Uint8Array[] = [];
  // PNG Signature
  chunks.push(new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]));

  // IHDR: 13 bytes
  const ihdr = new Uint8Array(13);
  ihdr.set(uint32ToBytesBE(imgSize), 0);
  ihdr.set(uint32ToBytesBE(imgSize), 4);
  ihdr[8] = 8; // 8 bit
  ihdr[9] = 0; // Grayscale
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  chunks.push(makeChunk('IHDR', ihdr));

  // IDAT
  chunks.push(makeChunk('IDAT', idatContent));

  // IEND
  chunks.push(makeChunk('IEND', new Uint8Array(0)));

  return concatUint8Arrays(chunks);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof (globalThis as any).btoa === 'function') {
    return (globalThis as any).btoa(binary);
  }
  return Buffer.from(bytes).toString('base64');
}
