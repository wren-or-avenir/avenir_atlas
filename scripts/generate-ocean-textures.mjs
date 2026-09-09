import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import jpeg from 'jpeg-js';
import { PNG } from 'pngjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = join(ROOT, 'docs/design/reference/ocean');
const OUT_DIR = join(ROOT, 'public/textures/ocean/day');
const OUT_PATH = join(OUT_DIR, 'albedo.png');

const WORK = 512;
const FINAL = 1024;
const SOURCES = ['ocean_day_09.jpg'];
const MEAN_TOLERANCE = 0.005;

function luminance(r, g, b) {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function resize(img, w, h, target) {
  const out = new Float32Array(target * target * 3);
  const sx = w / target;
  const sy = h / target;
  const sxr = Math.max(1, Math.floor(sx));
  const syr = Math.max(1, Math.floor(sy));
  for (let y = 0; y < target; y++) {
    for (let x = 0; x < target; x++) {
      let r = 0;
      let g = 0;
      let b = 0;
      let n = 0;
      for (let j = 0; j < syr; j++) {
        const py = Math.min(h - 1, Math.floor((y + 0.5) * sy) + j);
        for (let i = 0; i < sxr; i++) {
          const px = Math.min(w - 1, Math.floor((x + 0.5) * sx) + i);
          const idx = (py * w + px) * 4;
          r += img[idx];
          g += img[idx + 1];
          b += img[idx + 2];
          n++;
        }
      }
      const o = (y * target + x) * 3;
      out[o] = r / n / 255;
      out[o + 1] = g / n / 255;
      out[o + 2] = b / n / 255;
    }
  }
  return out;
}

function boxBlur(src, size, radius) {
  const out = new Float32Array(src.length);
  const tmp = new Float32Array(src.length);
  const n = radius * 2 + 1;
  for (let c = 0; c < 3; c++) {
    for (let y = 0; y < size; y++) {
      let acc = 0;
      for (let x = -radius; x <= radius; x++) {
        const xx = Math.min(size - 1, Math.max(0, x));
        acc += src[(y * size + xx) * 3 + c];
      }
      for (let x = 0; x < size; x++) {
        tmp[(y * size + x) * 3 + c] = acc / n;
        const drop = Math.min(size - 1, Math.max(0, x - radius));
        const add = Math.min(size - 1, Math.max(0, x + radius + 1));
        acc += src[(y * size + add) * 3 + c] - src[(y * size + drop) * 3 + c];
      }
    }
    for (let x = 0; x < size; x++) {
      let acc = 0;
      for (let y = -radius; y <= radius; y++) {
        const yy = Math.min(size - 1, Math.max(0, y));
        acc += tmp[(yy * size + x) * 3 + c];
      }
      for (let y = 0; y < size; y++) {
        out[(y * size + x) * 3 + c] = acc / n;
        const drop = Math.min(size - 1, Math.max(0, y - radius));
        const add = Math.min(size - 1, Math.max(0, y + radius + 1));
        acc += tmp[(add * size + x) * 3 + c] - tmp[(drop * size + x) * 3 + c];
      }
    }
  }
  return out;
}

function delight(src, blurred, size) {
  const out = new Float32Array(src.length);
  let meanR = 0;
  let meanG = 0;
  let meanB = 0;
  const n = size * size;
  for (let i = 0; i < n; i++) {
    meanR += src[i * 3];
    meanG += src[i * 3 + 1];
    meanB += src[i * 3 + 2];
  }
  meanR /= n;
  meanG /= n;
  meanB /= n;
  for (let i = 0; i < n; i++) {
    const r = src[i * 3];
    const g = src[i * 3 + 1];
    const b = src[i * 3 + 2];
    const l = luminance(r, g, b);
    const highlight = smoothstep(0.55, 0.9, l);
    const shadow = smoothstep(0.14, 0.05, l) * 0.4;
    const t = Math.max(0.25, Math.min(1, highlight + shadow));
    const tr = highlight > shadow ? blurred[i * 3] : meanR;
    const tg = highlight > shadow ? blurred[i * 3 + 1] : meanG;
    const tb = highlight > shadow ? blurred[i * 3 + 2] : meanB;
    out[i * 3] = r + (tr - r) * t;
    out[i * 3 + 1] = g + (tg - g) * t;
    out[i * 3 + 2] = b + (tb - b) * t;
  }
  return out;
}

function makeTileable(src, size) {
  const ramp = new Float32Array(size);
  const half = size / 2;
  for (let i = 0; i < size; i++) {
    const t = i < half ? i / half : (size - 1 - i) / half;
    ramp[i] = t * t * (3 - 2 * t);
  }
  const shiftX = (x, y) => ((y * size + ((x + half) % size)) * 3);
  const shifted = new Float32Array(src.length);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const o = shiftX(x, y);
      const s = shiftX((x + half) % size, y);
      shifted[o] = src[s];
      shifted[o + 1] = src[s + 1];
      shifted[o + 2] = src[s + 2];
    }
  }
  const outX = new Float32Array(src.length);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const o = (y * size + x) * 3;
      const t = ramp[x];
      outX[o] = src[o] + (shifted[o] - src[o]) * t;
      outX[o + 1] = src[o + 1] + (shifted[o + 1] - src[o + 1]) * t;
      outX[o + 2] = src[o + 2] + (shifted[o + 2] - src[o + 2]) * t;
    }
  }
  const outY = new Float32Array(src.length);
  for (let y = 0; y < size; y++) {
    const sy = (y + half) % size;
    for (let x = 0; x < size; x++) {
      const o = (y * size + x) * 3;
      const s = (sy * size + x) * 3;
      const t = ramp[y];
      outY[o] = outX[o] + (outX[s] - outX[o]) * t;
      outY[o + 1] = outX[o + 1] + (outX[s + 1] - outX[o + 1]) * t;
      outY[o + 2] = outX[o + 2] + (outX[s + 2] - outX[o + 2]) * t;
    }
  }
  return outY;
}

function hash2(x, y) {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h >>> 0) / 4294967295;
}

function addMacroNoise(src, size) {
  const out = new Float32Array(src.length);
  const amp = 0.025;
  const f = 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * f;
      const v = (y / size) * f;
      const ui = Math.floor(u);
      const vi = Math.floor(v);
      const uf = u - ui;
      const vf = v - vi;
      const a = hash2(ui, vi);
      const b = hash2(ui + 1, vi);
      const c = hash2(ui, vi + 1);
      const d = hash2(ui + 1, vi + 1);
      const su = uf * uf * (3 - 2 * uf);
      const sv = vf * vf * (3 - 2 * vf);
      const n = (a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv - 0.5) * amp;
      const o = (y * size + x) * 3;
      out[o] = src[o] + n;
      out[o + 1] = src[o + 1] + n;
      out[o + 2] = src[o + 2] + n;
    }
  }
  return out;
}

function upscale(src, from, to) {
  const out = new Float32Array(to * to * 3);
  for (let y = 0; y < to; y++) {
    const fy = ((y + 0.5) * from) / to - 0.5;
    const y0 = Math.min(from - 1, Math.max(0, Math.floor(fy)));
    const y1 = Math.min(from - 1, y0 + 1);
    const ty = fy - y0;
    for (let x = 0; x < to; x++) {
      const fx = ((x + 0.5) * from) / to - 0.5;
      const x0 = Math.min(from - 1, Math.max(0, Math.floor(fx)));
      const x1 = Math.min(from - 1, x0 + 1);
      const tx = fx - x0;
      const o = (y * to + x) * 3;
      for (let c = 0; c < 3; c++) {
        const a = src[(y0 * from + x0) * 3 + c];
        const b = src[(y0 * from + x1) * 3 + c];
        const d = src[(y1 * from + x0) * 3 + c];
        const e = src[(y1 * from + x1) * 3 + c];
        out[o + c] = a + (b - a) * tx + (d - a) * ty + (a - b - d + e) * tx * ty;
      }
    }
  }
  return out;
}

async function main() {
  const sums = new Float32Array(WORK * WORK * 3);
  let loaded = 0;
  for (const name of SOURCES) {
    const path = join(SRC_DIR, name);
    let decoded;
    try {
      decoded = jpeg.decode(await readFile(path));
    } catch {
      console.warn(`[textures] 跳过 ${path}`);
      continue;
    }
    const small = resize(decoded.data, decoded.width, decoded.height, WORK);
    const blurred = boxBlur(small, WORK, 16);
    const albedo = delight(small, blurred, WORK);
    for (let p = 0; p < sums.length; p++) {
      sums[p] += albedo[p];
    }
    loaded++;
  }
  if (loaded === 0) {
    throw new Error('没有成功解码任何参考图');
  }
  console.log(`[textures] 成功解码 ${loaded}/${SOURCES.length} 张参考图`);

  for (let p = 0; p < sums.length; p++) {
    sums[p] /= loaded;
  }

  let tileable = makeTileable(sums, WORK);
  tileable = addMacroNoise(tileable, WORK);
  tileable = makeTileable(tileable, WORK);

  let final = upscale(tileable, WORK, FINAL);
  final = boxBlur(final, FINAL, 3);
  const px = FINAL * FINAL;

  const png = new PNG({ width: FINAL, height: FINAL });
  for (let i = 0; i < px; i++) {
    const o = i * 4;
    png.data[o] = Math.round(Math.min(1, Math.max(0, final[i * 3])) * 255);
    png.data[o + 1] = Math.round(Math.min(1, Math.max(0, final[i * 3 + 1])) * 255);
    png.data[o + 2] = Math.round(Math.min(1, Math.max(0, final[i * 3 + 2])) * 255);
    png.data[o + 3] = 255;
  }

  const means = [0, 0, 0];
  for (let i = 0; i < px; i++) {
    means[0] += png.data[i * 4] / 255;
    means[1] += png.data[i * 4 + 1] / 255;
    means[2] += png.data[i * 4 + 2] / 255;
  }
  means[0] /= px;
  means[1] /= px;
  means[2] /= px;
  for (let c = 0; c < 3; c++) {
    if (means[c] <= 0.01 || means[c] >= 0.99) {
      throw new Error(`反照率均值异常：通道 ${c} 均值 ${means[c].toFixed(4)}`);
    }
  }
  console.log(
    `[textures] PNG 均值 R=${means[0].toFixed(4)} G=${means[1].toFixed(4)} B=${means[2].toFixed(4)}，` +
      `shader 侧除以该值即得精确均值 1（契约由除法保证）`,
  );

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(OUT_PATH, PNG.sync.write(png));
  await writeFile(
    join(OUT_DIR, 'albedo.json'),
    JSON.stringify({ mean: means.map((v) => Number(v.toFixed(6))) }, null, 2),
  );
  console.log(`[textures] 已生成 ${OUT_PATH} 与 albedo.json (${FINAL}x${FINAL})`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
