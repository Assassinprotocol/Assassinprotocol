// ============================================================================
// Assassin Protocol — Sovereign Quant Profile Card Generator
// Produces a deterministic, animated pure vector SVG (SMIL) profile card
// ============================================================================

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createKnightSimulation } from "./knight_simulation.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ----------------------------------------------------------------------------
// 1. Simulation Setup & Frame Baking
// ----------------------------------------------------------------------------
const sim = createKnightSimulation({ width: 475, height: 516, charWidth: 7, charHeight: 12 });

const BUCKETS = [" ", ".", ":-", "=+", "*%", "#", "@"];
const LEVELS = [0.06, 0.18, 0.32, 0.48, 0.64, 0.80];
const GRASS_CHARS = ["|", "/", "\\", "'", ",", ".", "+", "x", "X", "%", "&"];

function quantizeColor(pr, pg, pb, isKnight, isRed, L) {
  if (isRed) {
    if (L > 0.60) return "#cf161c"; // Peak wave crimson highlight
    if (L > 0.38) return "#a81318"; // Rich blood red cloth body
    return "#6e0d11";               // Deep wine shadow fold
  }
  if (isKnight) {
    if (L > 0.78) return "#ffffff"; // Specular white armor glint
    if (L > 0.45) return "#c9d1d9"; // Polished silver plate steel
    if (L > 0.22) return "#8b949e"; // Shadowed steel
    return "#545d68";               // Crease & joint shadow
  }
  if (pr > 120 && pg > 100 && pb < 90) return "#d4af37"; // Golden straw grass tip
  if (pg > 110) return "#3fb950"; // Bright lush grass blade
  if (pg > 70) return "#2ea043";  // Medium green blade
  if (pg > 40) return "#238636";  // Deep forest blade
  return "#1b4728";               // Distant horizon grass
}

function getFrameXml(t) {
  sim.scene(t);
  const lines = [];

  for (let r = 0; r < sim.ROWS; r++) {
    let lineXml = "";
    let curSpan = null;
    let pendingSpaces = "";

    for (let c = 0; c < sim.COLS; c++) {
      const i = r * sim.COLS + c;
      const L = sim.lum[i];

      if (L <= 0.04 && sim.glyph[i] < 0) {
        pendingSpaces += " ";
        continue;
      }

      let ch = " ";
      if (sim.glyph[i] >= 0) {
        ch = GRASS_CHARS[sim.glyph[i]] || ".";
      } else {
        let level = 0;
        while (level < LEVELS.length && L >= LEVELS[level]) level++;
        if (level === 0) {
          pendingSpaces += " ";
          continue;
        }
        const b = BUCKETS[level];
        ch = b[sim.hash3(r, c, 1) % b.length] || " ";
      }

      if (ch === "<") ch = "&lt;";
      else if (ch === ">") ch = "&gt;";
      else if (ch === "&") ch = "&amp;";
      else if (ch === "\"") ch = "&quot;";

      const k = (sim.isKnight[i] ? 0.9 : 0.6 + 0.45 * L);
      const j = i * 3;
      const pr = sim.rgb[j] * k * 255;
      const pg = sim.rgb[j + 1] * k * 255;
      const pb = sim.rgb[j + 2] * k * 255;
      const isRed = pr > pg * 1.5 && pr > pb * 1.5;
      const color = quantizeColor(pr, pg, pb, sim.isKnight[i], isRed, L);

      if (pendingSpaces.length > 0) {
        if (curSpan) {
          lineXml += `<tspan fill="${curSpan.color}">${curSpan.text}</tspan>`;
          curSpan = null;
        }
        lineXml += pendingSpaces;
        pendingSpaces = "";
      }

      if (curSpan && curSpan.color === color) {
        curSpan.text += ch;
      } else {
        if (curSpan) {
          lineXml += `<tspan fill="${curSpan.color}">${curSpan.text}</tspan>`;
        }
        curSpan = { color, text: ch };
      }
    }

    if (curSpan) {
      lineXml += `<tspan fill="${curSpan.color}">${curSpan.text}</tspan>`;
    }

    if (lineXml.length > 0) {
      lines.push(`<text x="0" y="${(r + 1) * sim.CH}" xml:space="preserve">${lineXml}</text>`);
    }
  }
  return lines.join("\n");
}

const NUM_FRAMES = 16;
const DURATION = 4.8; // Harmonic physics period (P2 = 4.8s)
console.log(`Baking ${NUM_FRAMES} knight frames over ${DURATION}s...`);

const frames = [];
for (let f = 0; f < NUM_FRAMES; f++) {
  const t = f * (DURATION / NUM_FRAMES);
  const xml = getFrameXml(t);
  console.log(`  Frame ${f.toString().padStart(2, " ")} (t=${t.toFixed(2)}s): ${(xml.length / 1024).toFixed(1)} KB`);
  frames.push(xml);
}

// SMIL Discrete KeyTimes: 0.000, 0.063, 0.125, ..., 1.000
const keyTimes = Array.from({ length: NUM_FRAMES + 1 }, (_, k) => (k / NUM_FRAMES).toFixed(3)).join(";");

let animatedFramesXml = "";
for (let f = 0; f < NUM_FRAMES; f++) {
  const opArray = Array(NUM_FRAMES).fill("0");
  opArray[f] = "1";
  const opValues = opArray.join(";") + ";" + opArray[0];

  const dispArray = Array(NUM_FRAMES).fill("none");
  dispArray[f] = "inline";
  const dispValues = dispArray.join(";") + ";" + dispArray[0];

  const initOp = f === 0 ? "1" : "0";
  const initDisp = f === 0 ? "inline" : "none";

  animatedFramesXml += `      <!-- Frame ${f} -->
      <g id="frame_${f}" opacity="${initOp}" display="${initDisp}">
        <animate attributeName="opacity" values="${opValues}" keyTimes="${keyTimes}" dur="${DURATION}s" repeatCount="indefinite" calcMode="discrete"/>
        <animate attributeName="display" values="${dispValues}" keyTimes="${keyTimes}" dur="${DURATION}s" repeatCount="indefinite" calcMode="discrete"/>
${frames[f]}
      </g>\n`;
}

// ----------------------------------------------------------------------------
// 2. Terminal CLI Console Animation
// ----------------------------------------------------------------------------
const promptText = "0xhansen@assassin:~$&#160;";
const fullCmd = "./natus-vincere";

const cmdStates = [];
for (let i = 0; i <= fullCmd.length; i++) {
  cmdStates.push(fullCmd.slice(0, i));
}

const TYPE_DUR = 4.8;
const typeTiming = [];

// 1. Initial rest at empty prompt (0.0s -> 0.3s)
typeTiming.push({ t: 0.0, state: 0 });

// 2. Typing forward (0.3s -> 2.5s)
const tStartType = 0.3;
const tEndType = 2.5;
for (let i = 1; i <= fullCmd.length; i++) {
  const t = tStartType + ((i - 1) / (fullCmd.length - 1)) * (tEndType - tStartType);
  typeTiming.push({ t: Number(t.toFixed(3)), state: i });
}

// 3. Pause reading fully typed command (2.5s -> 3.6s, holds state 15)

// 4. Smooth natural backspacing backward (3.6s -> 4.5s)
const tStartBack = 3.6;
const tEndBack = 4.5;
for (let i = fullCmd.length - 1; i >= 0; i--) {
  const step = fullCmd.length - 1 - i;
  const t = tStartBack + ((step + 1) / fullCmd.length) * (tEndBack - tStartBack);
  typeTiming.push({ t: Number(t.toFixed(3)), state: i });
}

// 5. Clean rest before loop wrap-around (4.5s -> 4.8s)
typeTiming.push({ t: 4.8, state: 0 });

const typeKeyTimes = typeTiming.map(item => (item.t / TYPE_DUR).toFixed(4)).join(";");

let typewriterXml = "";
for (let s = 0; s <= 15; s++) {
  const dispValues = typeTiming.map(item => item.state === s ? "inline" : "none").join(";");
  const initDisp = s === 15 ? "inline" : "none";
  const typedSlice = cmdStates[s];

  typewriterXml += `    <g id="cli_step_${s}" display="${initDisp}">
      <animate attributeName="display" values="${dispValues}" keyTimes="${typeKeyTimes}" dur="${TYPE_DUR}s" repeatCount="indefinite" calcMode="discrete"/>
      <text x="0" y="0"><tspan fill="#e02424" font-weight="700">${promptText}</tspan><tspan fill="#79c0ff" font-weight="600">${typedSlice}</tspan><tspan fill="#79c0ff" class="cursor-blink">▋</tspan></text>
    </g>\n`;
}

const archLogoPath = "M 6 0 L 0 12 L 2.6 12 L 4.4 8.2 L 7.6 8.2 L 9.4 12 L 12 12 Z M 6 3.5 L 4.9 6.8 L 7.1 6.8 Z";

// ----------------------------------------------------------------------------
// 3. Complete Master SVG Assembly (1080 x 590)
// ----------------------------------------------------------------------------
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="590" viewBox="0 0 1080 590" role="img" aria-label="Assassin Protocol — Sovereign Quant Operator">
  <title>Assassin Protocol — 0xhansen Quant Profile</title>
  <defs>
    <style>
      @import url("https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700;800&amp;display=swap");
      
      .mono { font-family: "JetBrains Mono", Consolas, "Liberation Mono", Courier, monospace; }
      .knight-font { font-family: Consolas, "Liberation Mono", "DejaVu Sans Mono", monospace; font-size: 12px; font-weight: 600; }
      text, tspan { white-space: pre; }
      
      @keyframes cursorBlink {
        0%, 49% { opacity: 1; }
        50%, 100% { opacity: 0; }
      }
      .cursor-blink { animation: cursorBlink 0.8s step-end infinite; }
    </style>
    
    <filter id="crimson-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#e02424" flood-opacity="0.35"/>
    </filter>
    <filter id="white-glow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#ffffff" flood-opacity="0.3"/>
    </filter>

    <linearGradient id="dossier-grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0d1117"/>
      <stop offset="100%" stop-color="#0a0e14"/>
    </linearGradient>

    <!-- Global Hairline Scanline Texture -->
    <pattern id="scanlines" width="1080" height="2" patternUnits="userSpaceOnUse">
      <line x1="0" y1="0" x2="1080" y2="0" stroke="#000000" stroke-width="1" opacity="0.12"/>
    </pattern>

    <clipPath id="knight-clip">
      <rect x="0" y="38" width="475" height="516"/>
    </clipPath>
  </defs>

  <!-- Outer HUD Chassis -->
  <rect x="0.5" y="0.5" width="1079" height="589" rx="6" fill="#0d1117" stroke="#21262d" stroke-width="1"/>

  <!-- ==================== TOP HUD HEADER (Y=0..38) ==================== -->
  <rect x="1" y="1" width="1078" height="37" fill="#121820"/>
  <line x1="0" y1="38" x2="1080" y2="38" stroke="#21262d" stroke-width="1"/>

  <!-- Corner Crosshair -->
  <text x="7" y="14" fill="#545d68" font-size="11" font-weight="300" class="mono">+</text>

  <!-- Tactical Protocol Badge [ASSASSIN] -->
  <g transform="translate(18, 9)" class="mono">
    <polygon points="0,0 66,0 70,4 70,20 4,20 0,16" fill="#e02424" filter="url(#crimson-glow)"/>
    <text x="35" y="14" fill="#ffffff" font-size="10" font-weight="700" letter-spacing="1" text-anchor="middle">ASSASSIN</text>
  </g>

  <!-- Header Title -->
  <text x="98" y="23" fill="#8b949e" font-size="11" letter-spacing="0.5" class="mono">0xHANSEN // SOVEREIGN QUANT OPERATOR</text>

  <!-- Live Node Status -->
  <g class="mono" font-size="11" font-weight="600">
    <circle cx="891" cy="19.5" r="3" fill="#3fb950"/>
    <circle cx="891" cy="19.5" r="3" fill="none" stroke="#3fb950" stroke-width="1.5" opacity="0.6">
      <animate attributeName="r" values="3; 7; 3" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.7; 0; 0.7" dur="2s" repeatCount="indefinite"/>
    </circle>
    <text x="903" y="23" fill="#3fb950">NODE: INDONESIA · ACTIVE</text>
  </g>

  <!-- ==================== MAIN BODY (Y=38..554) ==================== -->
  <!-- Left Panel: Dark Obsidian Knight Chamber (44% = 475px) -->
  <rect x="0" y="38" width="475" height="516" fill="#141518"/>
  <line x1="475" y1="38" x2="475" y2="554" stroke="#21262d" stroke-width="1"/>

  <!-- Procedural ASCII Knight Animated SMIL Chamber -->
  <g clip-path="url(#knight-clip)">
    <g transform="translate(0, 38) scale(0.3605)" class="knight-font">
${animatedFramesXml}    </g>
  </g>

  <!-- Right Panel: Quant Dossier (56% = 605px, X=475..1080) -->
  <rect x="476" y="38" width="604" height="516" fill="url(#dossier-grad)"/>

  <!-- ==================== DOSSIER DATA ==================== -->
  
  <!-- 1. Operator Identity Hero (Y = 60..118) -->
  <g transform="translate(503, 60)" class="mono">
    <!-- Title: 0xhansen (Assassin Protocol) + Crossed Swords Vector -->
    <text x="0" y="16" font-size="19" font-weight="700" letter-spacing="-0.2"><tspan fill="#e02424" filter="url(#crimson-glow)">0x</tspan><tspan fill="#f0f6fc">hansen</tspan><tspan fill="#8b949e" font-size="13" font-weight="500" dx="8">(Assassin Protocol)</tspan></text>
    <g transform="translate(254, 2)">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#e02424" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" filter="url(#crimson-glow)">
        <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/>
        <line x1="13" y1="19" x2="19" y2="13"/>
        <line x1="16" y1="16" x2="20" y2="20"/>
        <line x1="19" y1="21" x2="21" y2="19"/>
        <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/>
        <line x1="5" y1="14" x2="9" y2="18"/>
        <line x1="7" y1="17" x2="4" y2="20"/>
        <line x1="3" y1="19" x2="5" y2="21"/>
      </svg>
    </g>
    <!-- Tagline (2 lines, line-height 1.45) -->
    <text x="0" y="36" fill="#8b949e" font-size="11">Quant Developer &amp; Low-Level Systems Engineer. Writing deterministic C99 matching</text>
    <text x="0" y="52" fill="#8b949e" font-size="11">engines, RISC-V bytecode, and market microstructure feeds.</text>
  </g>

  <!-- 2. Bento Identity Grid (Y = 156..261) -->
  <g transform="translate(503, 156)" class="mono">
    <!-- Section Header with INLINE Hairline -->
    <text x="0" y="10" fill="#e02424" font-size="10" font-weight="700" letter-spacing="1.2">01 // IDENTITY &amp; CRAFT</text>
    <line x1="165" y1="6.5" x2="495" y2="6.5" stroke="#161b22" stroke-width="1"/>
    <text x="548" y="10" fill="#545d68" font-size="8" font-weight="500" text-anchor="end">[0x01_ID]</text>

    <!-- Bento Grid (gap 6px 12px, box width 268px, box height 40px) -->
    <!-- Box 1: Developer Alias -->
    <g transform="translate(0, 19)">
      <polygon points="0,0 264,0 268,4 268,40 0,40" fill="#121820" stroke="#161b22" stroke-width="1"/>
      <text x="9" y="13" fill="#545d68" font-size="9" font-weight="600" letter-spacing="0.6">DEVELOPER ALIAS</text>
      <text x="9" y="29" fill="#58a6ff" font-size="11" font-weight="500">Assassinprotocol (@M0neyHeistHunt)</text>
    </g>

    <!-- Box 2: Core Focus -->
    <g transform="translate(280, 19)">
      <polygon points="0,0 264,0 268,4 268,40 0,40" fill="#121820" stroke="#161b22" stroke-width="1"/>
      <text x="9" y="13" fill="#545d68" font-size="9" font-weight="600" letter-spacing="0.6">CORE FOCUS</text>
      <text x="9" y="29" fill="#ff7b72" font-size="11" font-weight="500">Monolithic CLOB &amp; Market Telemetry</text>
    </g>

    <!-- Box 3: Location & Timezone -->
    <g transform="translate(0, 65)">
      <polygon points="0,0 264,0 268,4 268,40 0,40" fill="#121820" stroke="#161b22" stroke-width="1"/>
      <text x="9" y="13" fill="#545d68" font-size="9" font-weight="600" letter-spacing="0.6">LOCATION &amp; TIMEZONE</text>
      <text x="9" y="29" fill="#f0f6fc" font-size="11" font-weight="500">Indonesia // UTC+7 (WIB)</text>
    </g>

    <!-- Box 4: Primary Arsenal -->
    <g transform="translate(280, 65)">
      <polygon points="0,0 264,0 268,4 268,40 0,40" fill="#121820" stroke="#161b22" stroke-width="1"/>
      <text x="9" y="13" fill="#545d68" font-size="9" font-weight="600" letter-spacing="0.6">PRIMARY ARSENAL</text>
      <text x="9" y="29" fill="#f0f6fc" font-size="11" font-weight="500">C99 · Python · RISC-V · Q64.64 Math</text>
    </g>
  </g>

  <!-- 3. Signature Repositories (Y = 299..442) -->
  <g transform="translate(503, 299)" class="mono">
    <!-- Section Header with INLINE Hairline -->
    <text x="0" y="10" fill="#e02424" font-size="10" font-weight="700" letter-spacing="1.2">02 // SIGNATURE REPOSITORIES</text>
    <line x1="205" y1="6.5" x2="480" y2="6.5" stroke="#161b22" stroke-width="1"/>
    <text x="548" y="10" fill="#545d68" font-size="8" font-weight="500" text-anchor="end">[0x02_CORE]</text>

    <!-- Repo Card 1: Thru-quant-core (Y = 19..77, height 58px) -->
    <g transform="translate(0, 19)">
      <polygon points="0,0 543,0 549,6 549,58 0,58" fill="#121820" stroke="#161b22" stroke-width="1"/>
      <line x1="1" y1="1" x2="1" y2="57" stroke="#e02424" stroke-width="2"/>
      
      <!-- Repo Name & Badges -->
      <text x="12" y="19" fill="#ffffff" font-size="12" font-weight="700">Thru-quant-core</text>
      <g transform="translate(420, 9)">
        <rect x="0" y="0" width="118" height="15" rx="3" fill="#1c2129"/>
        <text x="59" y="11" fill="#8b949e" font-size="9" font-weight="600" text-anchor="middle">C / Go / TypeScript</text>
      </g>
      
      <!-- Description -->
      <text x="12" y="35" fill="#8b949e" font-size="10">Thru Price Hub: C market-data oracle with Q64.64 math, Go publisher services, and TS</text>
      <text x="12" y="48" fill="#8b949e" font-size="10">SDK. CLOB matching research prototype.</text>
    </g>

    <!-- Repo Card 2: hansen-ai-research-engine (Y = 83..141, height 58px) -->
    <g transform="translate(0, 83)">
      <polygon points="0,0 543,0 549,6 549,58 0,58" fill="#121820" stroke="#161b22" stroke-width="1"/>
      <line x1="1" y1="1" x2="1" y2="57" stroke="#e02424" stroke-width="2"/>
      
      <!-- Repo Name & Badges -->
      <text x="12" y="19" fill="#ffffff" font-size="12" font-weight="700">hansen-ai-research-engine</text>
      <g transform="translate(405, 9)">
        <rect x="0" y="0" width="133" height="15" rx="3" fill="#1c2129"/>
        <text x="66" y="11" fill="#8b949e" font-size="9" font-weight="600" text-anchor="middle">Python / Go / Telemetry</text>
      </g>
      
      <!-- Description -->
      <text x="12" y="35" fill="#8b949e" font-size="10">Market microstructure telemetry, live L2 shadow depth capture, and trade forensic</text>
      <text x="12" y="48" fill="#8b949e" font-size="10">engine.</text>
    </g>
  </g>

  <!-- 4. Direct Comms & Dispatch (Y = 480..535) -->
  <g transform="translate(503, 480)" class="mono">
    <!-- Section Header with INLINE Hairline -->
    <text x="0" y="10" fill="#e02424" font-size="10" font-weight="700" letter-spacing="1.2">03 // DIRECT COMMS &amp; DISPATCH</text>
    <line x1="205" y1="6.5" x2="475" y2="6.5" stroke="#161b22" stroke-width="1"/>
    <text x="548" y="10" fill="#545d68" font-size="8" font-weight="500" text-anchor="end">[0x03_COMM]</text>

    <!-- Comms Pill Box (Y = 19..55, height 36px) -->
    <g transform="translate(0, 19)">
      <polygon points="0,0 544,0 549,5 549,36 0,36" fill="#121820" stroke="#161b22" stroke-width="1"/>
      
      <!-- Discord Handle with Official Discord Logo -->
      <g transform="translate(12, 11)">
        <svg width="15" height="14" viewBox="0 0 24 24">
          <path fill="#5865F2" d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.894.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
        </svg>
        <text x="21" y="11.5" fill="#f0f6fc" font-size="11" font-weight="600">0xhansen</text>
      </g>

      <!-- Center Divider Dot -->
      <circle cx="178" cy="18" r="1.5" fill="#545d68"/>

      <!-- X Handle -->
      <g transform="translate(195, 11)">
        <svg width="14" height="14" viewBox="0 0 24 24">
          <path fill="#f0f6fc" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
        <text x="21" y="11.5" fill="#f0f6fc" font-size="11" font-weight="600">M0neyHeistHunt</text>
      </g>
    </g>
  </g>

  <!-- ==================== HUD FOOTER CONSOLE (Y=554..590) ==================== -->
  <rect x="0" y="554" width="1080" height="36" fill="#080b0f"/>
  <line x1="0" y1="554" x2="1080" y2="554" stroke="#21262d" stroke-width="1"/>

  <!-- CLI Console -->
  <g transform="translate(18, 576)" class="mono" font-size="11" xml:space="preserve">
${typewriterXml}  </g>

  <!-- OS Telemetry -->
  <g class="mono" font-size="11">
    <text x="822" y="576" fill="#545d68">OS:</text>
    <svg x="846" y="565" width="12" height="12" viewBox="0 0 12 12">
      <path fill="#e6edf3" filter="url(#white-glow)" d="${archLogoPath}"/>
    </svg>
    <text x="864" y="576" fill="#ffffff" font-weight="700">ARCH LINUX</text>
    <text x="944" y="576" fill="#58a6ff" font-weight="600">// I USE ARCH BTW</text>
  </g>

  <!-- Global Hairline Scanline Texture Overlay (8% opacity) -->
  <rect x="0" y="0" width="1080" height="590" fill="url(#scanlines)" pointer-events="none"/>
</svg>
`;

const outputPath = path.resolve(__dirname, "../dark_mode.svg");
fs.writeFileSync(outputPath, svg);
console.log(`Successfully generated dark_mode.svg at ${outputPath}! Size: ${(svg.length / 1024).toFixed(1)} KB`);
