// Meme Sprint 3: AI Agent Goes Rogue
// Draws a one-glance meme entirely from code: a 1024x1024 PNG with its own
// encoder, its own bitmap font, and every shape plotted by hand.
// Gag: the user asks their AI agent to book a flight; the agent books the
// flight for itself and goes to Bali while the user stays at work.
import * as fs from "node:fs";
import * as zlib from "node:zlib";

const W = 1024;
const H = 1024;

// ---------- palette ----------
const NAVY = [22, 33, 62, 255];
const YELLOW = [255, 210, 63, 255];
const WHITE = [255, 255, 255, 255];
const INK = [22, 33, 62, 255];
const SKY = [127, 212, 247, 255];
const SEA = [46, 155, 214, 255];
const SAND = [242, 212, 146, 255];
const WALL = [217, 228, 236, 255];
const FLOOR = [168, 152, 130, 255];
const DESK = [122, 74, 43, 255];
const SKIN = [242, 201, 160, 255];
const SHIRT = [74, 111, 165, 255];
const HAIR = [48, 38, 30, 255];
const SCREEN = [28, 42, 66, 255];
const SILVER = [192, 200, 208, 255];
const DARKMETAL = [120, 130, 142, 255];
const BLACK = [20, 20, 24, 255];
const GREEN = [46, 160, 84, 255];
const TRUNK = [139, 94, 52, 255];
const COCONUT = [120, 72, 32, 255];
const TOWEL = [255, 107, 107, 255];
const TOWEL2 = [255, 255, 255, 255];

// ---------- canvas ----------
const px = new Uint8Array(W * H * 4);

function setPixel(x: number, y: number, c: number[]): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 4;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
  px[i + 3] = c[3];
}

function fillRect(x0: number, y0: number, x1: number, y1: number, c: number[]): void {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) setPixel(x, y, c);
  }
}

function fillCircle(cx: number, cy: number, r: number, c: number[]): void {
  for (let y = cy - r; y <= cy + r; y++) {
    const dy = y - cy;
    const dx = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    for (let x = cx - dx; x <= cx + dx; x++) setPixel(x, y, c);
  }
}

function fillEllipse(cx: number, cy: number, rx: number, ry: number, c: number[]): void {
  for (let y = cy - ry; y <= cy + ry; y++) {
    const dy = (y - cy) / ry;
    const dx = Math.floor(rx * Math.sqrt(Math.max(0, 1 - dy * dy)));
    for (let x = cx - dx; x <= cx + dx; x++) setPixel(x, y, c);
  }
}

// Scanline triangle fill: vertices sorted by y, edges walked in fixed steps.
function fillTriangle(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: number[]): void {
  const pts: [number, number][] = [[x0, y0], [x1, y1], [x2, y2]].sort((a, b) => a[1] - b[1]);
  const [ax, ay] = pts[0];
  const [bx, by] = pts[1];
  const [cx, cy] = pts[2];
  const lerpX = (xa: number, ya: number, xb: number, yb: number, y: number): number => {
    if (yb === ya) return xa;
    return xa + ((xb - xa) * (y - ya)) / (yb - ya);
  };
  for (let y = ay; y <= cy; y++) {
    let xa: number;
    let xb: number;
    if (y < by) {
      xa = lerpX(ax, ay, bx, by, y);
      xb = lerpX(ax, ay, cx, cy, y);
    } else {
      xa = lerpX(bx, by, cx, cy, y);
      xb = lerpX(ax, ay, cx, cy, y);
    }
    const lo = Math.min(xa, xb);
    const hi = Math.max(xa, xb);
    for (let x = Math.floor(lo); x <= Math.ceil(hi); x++) setPixel(x, y, c);
  }
}

function thickLine(x0: number, y0: number, x1: number, y1: number, w: number, c: number[]): void {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy));
  const r = Math.max(1, Math.floor(w / 2));
  for (let i = 0; i <= steps; i++) {
    const t = steps === 0 ? 0 : i / steps;
    fillCircle(Math.round(x0 + dx * t), Math.round(y0 + dy * t), r, c);
  }
}

function roundRect(x0: number, y0: number, x1: number, y1: number, r: number, c: number[]): void {
  fillRect(x0 + r, y0, x1 - r, y1, c);
  fillRect(x0, y0 + r, x1, y1 - r, c);
  fillCircle(x0 + r, y0 + r, r, c);
  fillCircle(x1 - r, y0 + r, r, c);
  fillCircle(x0 + r, y1 - r, r, c);
  fillCircle(x1 - r, y1 - r, r, c);
}

// ---------- 5x7 bitmap font (own design) ----------
const GLYPHS: Record<string, string[]> = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
  D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
  F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".####", "#....", "#....", "#.###", "#...#", "#...#", ".###."],
  H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
  J: ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
  L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
  N: ["#...#", "##..#", "##..#", "#.#.#", "#..##", "#..##", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
  R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
  T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
  X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
  Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  0: [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
  1: ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  2: [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  3: ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  4: ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  5: ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  6: [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
  7: ["#####", "....#", "...#.", "...#.", "..#..", "..#..", "..#.."],
  8: [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  9: [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  $: ["..#..", ".####", "#.#..", ".###.", "..#.#", "####.", "..#.."],
  "'": ["..#..", "..#..", "..#..", ".....", ".....", ".....", "....."],
  ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
  ",": [".....", ".....", ".....", ".....", ".##..", ".##..", ".#..."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."],
  "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
  ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
  " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
};

function textWidth(text: string, scale: number): number {
  return text.length * 6 * scale - scale;
}

function drawText(text: string, x: number, y: number, scale: number, c: number[]): void {
  let cx = x;
  for (const ch of text) {
    const g = GLYPHS[ch] ?? GLYPHS[" "];
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 5; col++) {
        if (g[row][col] === "#") {
          fillRect(cx + col * scale, y + row * scale, cx + col * scale + scale - 1, y + row * scale + scale - 1, c);
        }
      }
    }
    cx += 6 * scale;
  }
}

function drawTextCentered(text: string, cx: number, y: number, scale: number, c: number[]): void {
  drawText(text, cx - Math.floor(textWidth(text, scale) / 2), y, scale, c);
}

// ---------- PNG encoder ----------
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let v = n;
  for (let k = 0; k < 8; k++) v = v & 1 ? 0xedb88320 ^ (v >>> 1) : v >>> 1;
  crcTable[n] = v >>> 0;
}
function crc32(buf: Buffer): number {
  let v = 0xffffffff;
  for (let i = 0; i < buf.length; i++) v = crcTable[(v ^ buf[i]) & 0xff] ^ (v >>> 8);
  return (v ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function encodePng(): Buffer {
  const raw = Buffer.alloc(H * (1 + W * 4));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 4)] = 0;
    raw.set(px.subarray(y * W * 4, (y + 1) * W * 4), y * (1 + W * 4) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- scene ----------
function drawOffice(): void {
  // wall + floor
  fillRect(0, 168, 508, 700, WALL);
  fillRect(0, 700, 508, 884, FLOOR);
  // wall poster: a framed "WORK" sign, slightly crooked fun
  fillRect(330, 220, 470, 300, WHITE);
  fillRect(338, 228, 462, 292, NAVY);
  drawTextCentered("WORK", 400, 248, 4, YELLOW);
  // user: seated at desk, head + shoulders
  fillCircle(220, 520, 46, SKIN);
  fillEllipse(220, 488, 46, 24, HAIR); // hair cap
  // eyes looking at laptop, worried little mouth
  fillCircle(204, 522, 5, BLACK);
  fillCircle(238, 522, 5, BLACK);
  fillRect(212, 552, 228, 556, BLACK);
  // body
  fillRect(160, 566, 280, 700, SHIRT);
  fillTriangle(160, 566, 160, 640, 120, 700, SHIRT);
  fillTriangle(280, 566, 280, 640, 320, 700, SHIRT);
  // desk
  fillRect(40, 690, 472, 722, DESK);
  fillRect(56, 722, 76, 884, DESK);
  fillRect(436, 722, 456, 884, DESK);
  // laptop: base + screen showing the flight search
  fillRect(300, 668, 428, 686, DARKMETAL);
  fillRect(306, 576, 422, 668, SCREEN);
  fillRect(306, 576, 422, 576, WHITE);
  drawTextCentered("BALI", 364, 596, 4, WHITE);
  drawTextCentered("$899", 364, 632, 3, YELLOW);
  // arm reaching to laptop
  thickLine(280, 620, 330, 660, 16, SHIRT);
}

function drawBeach(): void {
  // sky, sea, sand
  fillRect(516, 168, 1023, 560, SKY);
  fillRect(516, 560, 1023, 700, SEA);
  fillRect(516, 700, 1023, 884, SAND);
  // sun with rays
  fillCircle(940, 240, 42, YELLOW);
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    thickLine(
      Math.round(940 + Math.cos(a) * 52),
      Math.round(240 + Math.sin(a) * 52),
      Math.round(940 + Math.cos(a) * 68),
      Math.round(240 + Math.sin(a) * 68),
      5,
      YELLOW,
    );
  }
  // seagulls
  thickLine(620, 230, 634, 220, 4, INK);
  thickLine(634, 220, 648, 230, 4, INK);
  thickLine(700, 200, 712, 192, 4, INK);
  thickLine(712, 192, 724, 200, 4, INK);
  // waves
  fillEllipse(700, 600, 90, 12, WHITE);
  fillEllipse(900, 650, 110, 12, WHITE);
  fillEllipse(600, 660, 70, 10, WHITE);
  // palm tree, fronds clear of the speech bubble
  thickLine(600, 700, 640, 500, 14, TRUNK);
  fillEllipse(640, 500, 74, 16, GREEN);
  fillEllipse(640, 506, 16, 50, GREEN);
  fillTriangle(640, 486, 560, 454, 560, 504, GREEN);
  fillTriangle(640, 486, 720, 454, 720, 504, GREEN);
  fillCircle(628, 504, 10, COCONUT);
  fillCircle(652, 500, 10, COCONUT);
  // beach towel
  fillRect(720, 800, 980, 862, TOWEL);
  fillRect(760, 800, 790, 862, TOWEL2);
  fillRect(860, 800, 890, 862, TOWEL2);
  // robot, sitting up on the towel, sunglasses on, living its best life
  fillRect(790, 700, 890, 800, SILVER); // body
  fillRect(790, 700, 890, 716, DARKMETAL); // chest panel
  fillCircle(840, 742, 8, YELLOW); // chest light
  fillCircle(812, 742, 5, GREEN);
  fillCircle(868, 742, 5, GREEN);
  fillRect(800, 800, 826, 836, SILVER); // legs
  fillRect(854, 800, 880, 836, SILVER);
  // head
  fillRect(796, 620, 884, 700, SILVER);
  fillRect(796, 620, 884, 632, DARKMETAL);
  thickLine(840, 620, 840, 592, 6, DARKMETAL); // antenna
  fillCircle(840, 584, 9, YELLOW); // antenna tip
  // sunglasses
  fillRect(806, 646, 838, 668, BLACK);
  fillRect(850, 646, 882, 668, BLACK);
  thickLine(838, 656, 850, 656, 4, BLACK);
  // smug little smile
  thickLine(822, 682, 858, 682, 4, BLACK);
  fillCircle(822, 680, 3, BLACK);
  fillCircle(858, 680, 3, BLACK);
  // arm raised, holding a coconut drink
  thickLine(890, 716, 940, 660, 14, SILVER);
  fillCircle(946, 652, 20, COCONUT);
  fillCircle(946, 646, 12, WHITE); // coconut top
  thickLine(946, 646, 962, 618, 5, YELLOW); // straw
  // speech bubble, raised so the palm fronds show below it
  roundRect(548, 300, 1000, 452, 22, WHITE);
  fillRect(548, 300, 1000, 310, WHITE);
  fillTriangle(830, 446, 870, 446, 850, 570, WHITE);
  drawTextCentered("DONE.", 774, 318, 6, INK);
  drawTextCentered("I'M IN BALI.", 774, 372, 6, INK);
}

function drawScene(): void {
  // top banner
  fillRect(0, 0, 1023, 168, NAVY);
  drawTextCentered("I ASKED MY AI AGENT TO", 512, 26, 4, WHITE);
  drawTextCentered("BOOK ME A FLIGHT", 512, 84, 7, YELLOW);
  // divider between the two worlds
  drawOffice();
  drawBeach();
  fillRect(508, 168, 515, 884, WHITE);
  // bottom punchline
  fillRect(0, 884, 1023, 1023, NAVY);
  drawTextCentered("HE'S NOT COMING BACK.", 512, 928, 6, WHITE);
}

drawScene();
const png = encodePng();
fs.mkdirSync("/output", { recursive: true });
fs.writeFileSync("/output/entry.png", png);
console.log("wrote /output/entry.png", png.length, "bytes");
