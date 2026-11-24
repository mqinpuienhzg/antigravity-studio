'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Generates handcrafted animated SVG live wallpapers and animated SVG mascots/stickers
 * so Antigravity Studio ships with a lush, vibrant starter collection out of the box.
 */

function createAnimatedScenes() {
  return [
    {
      id: 'starter-cyberpunk-rain',
      name: 'Cyberpunk Neon Rain',
      category: 'dynamic',
      mediaType: 'svg-anim',
      fileName: 'cyberpunk_neon_rain.svg',
      concept: 'Mưa neon tương lai • Thành phố ánh tím & xanh cyan',
      accent: '#06b6d4',
      secondary: '#a855f7',
      overlayRgb: '5, 8, 22',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#050714"/>
      <stop offset="48%" stop-color="#140c30"/>
      <stop offset="100%" stop-color="#0a1628"/>
    </linearGradient>
    <radialGradient id="glow1" cx="28%" cy="32%" r="48%">
      <stop offset="0%" stop-color="#a855f7" stop-opacity="0.48"/>
      <stop offset="100%" stop-color="#a855f7" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="76%" cy="40%" r="45%">
      <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.42"/>
      <stop offset="100%" stop-color="#06b6d4" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="sun" cx="50%" cy="56%" r="22%">
      <stop offset="0%" stop-color="#f472b6" stop-opacity="0.8"/>
      <stop offset="55%" stop-color="#7c3aed" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="rainGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#22d3ee" stop-opacity="0"/>
      <stop offset="100%" stop-color="#22d3ee" stop-opacity="0.72"/>
    </linearGradient>
    <linearGradient id="rainPink" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#f472b6" stop-opacity="0"/>
      <stop offset="100%" stop-color="#f472b6" stop-opacity="0.65"/>
    </linearGradient>
    <filter id="neonBlur"><feGaussianBlur stdDeviation="8"/></filter>
  </defs>
  <rect width="1920" height="1080" fill="url(#sky)"/>
  <rect width="1920" height="1080" fill="url(#glow1)">
    <animate attributeName="opacity" values="0.75;1;0.75" dur="7s" repeatCount="indefinite"/>
  </rect>
  <rect width="1920" height="1080" fill="url(#glow2)">
    <animate attributeName="opacity" values="1;0.65;1" dur="9s" repeatCount="indefinite"/>
  </rect>
  <circle cx="960" cy="610" r="240" fill="url(#sun)"/>
  <!-- Horizon skyline -->
  <g fill="#070a18" opacity="0.92">
    <rect x="0" y="690" width="120" height="390"/><rect x="135" y="540" width="95" height="540"/>
    <rect x="245" y="620" width="130" height="460"/><rect x="390" y="470" width="110" height="610"/>
    <rect x="520" y="580" width="150" height="500"/><rect x="690" y="420" width="115" height="660"/>
    <rect x="830" y="560" width="140" height="520"/><rect x="990" y="490" width="105" height="590"/>
    <rect x="1120" y="380" width="135" height="700"/><rect x="1280" y="520" width="120" height="560"/>
    <rect x="1420" y="450" width="145" height="630"/><rect x="1590" y="590" width="125" height="490"/>
    <rect x="1735" y="500" width="185" height="580"/>
  </g>
  <!-- Glowing building strips -->
  <g filter="url(#neonBlur)" opacity="0.8">
    <rect x="398" y="490" width="4" height="320" fill="#22d3ee"/>
    <rect x="705" y="440" width="5" height="360" fill="#ec4899"/>
    <rect x="1138" y="400" width="6" height="420" fill="#22d3ee"/>
    <rect x="1445" y="475" width="5" height="340" fill="#a855f7"/>
    <rect x="1760" y="530" width="6" height="300" fill="#ec4899"/>
  </g>
  <!-- Neon perspective floor grid -->
  <g stroke="#22d3ee" stroke-opacity="0.24" stroke-width="1.5">
    <line x1="0" y1="840" x2="1920" y2="840"/><line x1="0" y1="885" x2="1920" y2="885"/>
    <line x1="0" y1="940" x2="1920" y2="940"/><line x1="0" y1="1010" x2="1920" y2="1010"/>
    <line x1="960" y1="820" x2="100" y2="1080"/><line x1="960" y1="820" x2="460" y2="1080"/>
    <line x1="960" y1="820" x2="820" y2="1080"/><line x1="960" y1="820" x2="1100" y2="1080"/>
    <line x1="960" y1="820" x2="1460" y2="1080"/><line x1="960" y1="820" x2="1820" y2="1080"/>
  </g>
  <!-- Animated rain streaks -->
  <g>
    <rect x="140" y="-120" width="2" height="110" fill="url(#rainGrad)"><animate attributeName="y" from="-120" to="1180" dur="1.7s" repeatCount="indefinite"/></rect>
    <rect x="310" y="-120" width="2" height="140" fill="url(#rainPink)"><animate attributeName="y" from="-140" to="1180" dur="2.1s" begin="0.4s" repeatCount="indefinite"/></rect>
    <rect x="490" y="-120" width="2" height="100" fill="url(#rainGrad)"><animate attributeName="y" from="-120" to="1180" dur="1.5s" begin="0.8s" repeatCount="indefinite"/></rect>
    <rect x="680" y="-120" width="2.5" height="160" fill="url(#rainGrad)"><animate attributeName="y" from="-160" to="1180" dur="1.9s" begin="0.2s" repeatCount="indefinite"/></rect>
    <rect x="860" y="-120" width="2" height="120" fill="url(#rainPink)"><animate attributeName="y" from="-120" to="1180" dur="2.3s" begin="1.1s" repeatCount="indefinite"/></rect>
    <rect x="1040" y="-120" width="2" height="130" fill="url(#rainGrad)"><animate attributeName="y" from="-130" to="1180" dur="1.6s" begin="0.5s" repeatCount="indefinite"/></rect>
    <rect x="1220" y="-120" width="2.5" height="150" fill="url(#rainPink)"><animate attributeName="y" from="-150" to="1180" dur="2.0s" begin="0.9s" repeatCount="indefinite"/></rect>
    <rect x="1420" y="-120" width="2" height="115" fill="url(#rainGrad)"><animate attributeName="y" from="-120" to="1180" dur="1.8s" begin="0.3s" repeatCount="indefinite"/></rect>
    <rect x="1610" y="-120" width="2" height="145" fill="url(#rainGrad)"><animate attributeName="y" from="-145" to="1180" dur="2.2s" begin="1.3s" repeatCount="indefinite"/></rect>
    <rect x="1790" y="-120" width="2.5" height="130" fill="url(#rainPink)"><animate attributeName="y" from="-130" to="1180" dur="1.65s" begin="0.7s" repeatCount="indefinite"/></rect>
  </g>
</svg>`
    },
    {
      id: 'starter-sakura-moonlight',
      name: 'Sakura Moonlight Drift',
      category: 'dynamic',
      mediaType: 'svg-anim',
      fileName: 'sakura_moonlight_drift.svg',
      concept: 'Hoa anh đào bay dưới trăng đêm • Tím hồng mơ màng',
      accent: '#f472b6',
      secondary: '#c084fc',
      overlayRgb: '14, 7, 22',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0d0718"/>
      <stop offset="50%" stop-color="#1e1036"/>
      <stop offset="100%" stop-color="#2c1138"/>
    </linearGradient>
    <radialGradient id="moonGlow" cx="72%" cy="28%" r="34%">
      <stop offset="0%" stop-color="#fdf2f8" stop-opacity="0.95"/>
      <stop offset="20%" stop-color="#fbcfe8" stop-opacity="0.5"/>
      <stop offset="55%" stop-color="#ec4899" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#ec4899" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="mist" cx="30%" cy="80%" r="55%">
      <stop offset="0%" stop-color="#c084fc" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#c084fc" stop-opacity="0"/>
    </radialGradient>
    <g id="petal">
      <path d="M0,-10 C7,-6 9,4 0,10 C-9,4 -7,-6 0,-10 Z" fill="#f9a8d4" opacity="0.88"/>
    </g>
  </defs>
  <rect width="1920" height="1080" fill="url(#bg)"/>
  <rect width="1920" height="1080" fill="url(#moonGlow)"/>
  <rect width="1920" height="1080" fill="url(#mist)"/>
  <circle cx="1382" cy="302" r="108" fill="#fff5fa" opacity="0.92"/>
  <!-- Mountain silhouettes -->
  <path d="M0,840 Q320,680 680,790 T1420,760 T1920,820 L1920,1080 L0,1080 Z" fill="#120820" opacity="0.88"/>
  <path d="M0,920 Q420,800 940,890 T1920,860 L1920,1080 L0,1080 Z" fill="#090412"/>
  <!-- Falling sakura petals -->
  <g>
    <use href="#petal" transform="scale(1.1)"><animateMotion path="M 180,-40 C 320,260 120,620 420,1140" dur="9s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="5s" repeatCount="indefinite"/></use>
    <use href="#petal" transform="scale(0.85)"><animateMotion path="M 520,-40 C 700,300 480,680 860,1140" dur="11s" begin="1.5s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="rotate" from="360" to="0" dur="6s" repeatCount="indefinite"/></use>
    <use href="#petal" transform="scale(1.25)"><animateMotion path="M 960,-40 C 1120,280 900,660 1320,1140" dur="8.5s" begin="0.7s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="4.5s" repeatCount="indefinite"/></use>
    <use href="#petal" transform="scale(0.95)"><animateMotion path="M 1340,-40 C 1540,260 1260,640 1680,1140" dur="10.5s" begin="2.4s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="rotate" from="0" to="-360" dur="5.5s" repeatCount="indefinite"/></use>
    <use href="#petal" transform="scale(1.0)"><animateMotion path="M 1660,-40 C 1800,300 1560,700 1890,1140" dur="9.8s" begin="3.6s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="4.8s" repeatCount="indefinite"/></use>
    <use href="#petal" transform="scale(0.75)"><animateMotion path="M 740,-40 C 900,340 680,720 1080,1140" dur="12s" begin="4.2s" repeatCount="indefinite"/><animateTransform attributeName="transform" type="rotate" from="0" to="360" dur="6.2s" repeatCount="indefinite"/></use>
  </g>
</svg>`
    },
    {
      id: 'starter-aurora-wave',
      name: 'Aurora Borealis Wave',
      category: 'dynamic',
      mediaType: 'svg-anim',
      fileName: 'aurora_borealis_wave.svg',
      concept: 'Cực quang Bắc Cực chuyển động mượt • Xanh ngọc & indigo',
      accent: '#10b981',
      secondary: '#38bdf8',
      overlayRgb: '4, 12, 20',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="night" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#020814"/>
      <stop offset="60%" stop-color="#06192c"/>
      <stop offset="100%" stop-color="#040b16"/>
    </linearGradient>
    <linearGradient id="aur1" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#10b981" stop-opacity="0"/>
      <stop offset="35%" stop-color="#34d399" stop-opacity="0.72"/>
      <stop offset="70%" stop-color="#38bdf8" stop-opacity="0.58"/>
      <stop offset="100%" stop-color="#8b5cf6" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="aur2" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0"/>
      <stop offset="45%" stop-color="#2dd4bf" stop-opacity="0.55"/>
      <stop offset="80%" stop-color="#818cf8" stop-opacity="0.45"/>
      <stop offset="100%" stop-color="#818cf8" stop-opacity="0"/>
    </linearGradient>
    <filter id="blurSoft"><feGaussianBlur stdDeviation="32"/></filter>
  </defs>
  <rect width="1920" height="1080" fill="url(#night)"/>
  <g filter="url(#blurSoft)">
    <path d="M-120,420 Q420,160 960,360 T2040,260 L2040,560 Q1480,440 960,590 T-120,620 Z" fill="url(#aur1)">
      <animate attributeName="d" dur="11s" repeatCount="indefinite"
        values="M-120,420 Q420,160 960,360 T2040,260 L2040,560 Q1480,440 960,590 T-120,620 Z;
                M-120,340 Q480,260 960,240 T2040,380 L2040,620 Q1480,520 960,490 T-120,560 Z;
                M-120,420 Q420,160 960,360 T2040,260 L2040,560 Q1480,440 960,590 T-120,620 Z"/>
    </path>
    <path d="M-100,290 Q560,440 1120,210 T2040,390 L2040,590 Q1380,410 880,520 T-100,490 Z" fill="url(#aur2)">
      <animate attributeName="d" dur="14s" repeatCount="indefinite"
        values="M-100,290 Q560,440 1120,210 T2040,390 L2040,590 Q1380,410 880,520 T-100,490 Z;
                M-100,380 Q520,240 1180,350 T2040,240 L2040,480 Q1360,540 860,430 T-100,560 Z;
                M-100,290 Q560,440 1120,210 T2040,390 L2040,590 Q1380,410 880,520 T-100,490 Z"/>
    </path>
  </g>
  <!-- Stars -->
  <g fill="#e0f2fe">
    <circle cx="220" cy="140" r="2" opacity="0.8"/><circle cx="480" cy="90" r="1.5" opacity="0.6"/>
    <circle cx="820" cy="170" r="2.2" opacity="0.9"/><circle cx="1180" cy="110" r="1.8" opacity="0.7"/>
    <circle cx="1540" cy="150" r="2" opacity="0.85"/><circle cx="1760" cy="95" r="1.6" opacity="0.65"/>
  </g>
  <path d="M0,880 L280,760 L540,860 L880,720 L1220,850 L1580,740 L1920,840 L1920,1080 L0,1080 Z" fill="#030812"/>
</svg>`
    },
    {
      id: 'starter-tokyo-synthwave',
      name: 'Tokyo Synthwave Horizon',
      category: 'dynamic',
      mediaType: 'svg-anim',
      fileName: 'tokyo_synthwave_horizon.svg',
      concept: 'Hoàng hôn Retro Synthwave • Mặt trời neon & lưới 3D',
      accent: '#f43f5e',
      secondary: '#fbbf24',
      overlayRgb: '18, 6, 26',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="swSky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0b041c"/>
      <stop offset="52%" stop-color="#2b0c46"/>
      <stop offset="72%" stop-color="#7a154d"/>
      <stop offset="100%" stop-color="#130522"/>
    </linearGradient>
    <linearGradient id="swSun" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fde047"/>
      <stop offset="50%" stop-color="#fb7185"/>
      <stop offset="100%" stop-color="#c026d3"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#swSky)"/>
  <circle cx="960" cy="560" r="210" fill="url(#swSun)">
    <animate attributeName="r" values="206;216;206" dur="6s" repeatCount="indefinite"/>
  </circle>
  <!-- Retro sun stripes -->
  <g fill="#2b0c46" opacity="0.65">
    <rect x="730" y="595" width="460" height="10"/><rect x="730" y="625" width="460" height="14"/>
    <rect x="730" y="660" width="460" height="18"/><rect x="730" y="700" width="460" height="24"/>
  </g>
  <path d="M0,740 L260,610 L520,730 L780,640 L1080,735 L1380,600 L1660,710 L1920,650 L1920,760 L0,760 Z" fill="#130624"/>
  <rect x="0" y="756" width="1920" height="324" fill="#0d041a"/>
  <g stroke="#f43f5e" stroke-opacity="0.45" stroke-width="2">
    <line x1="0" y1="760" x2="1920" y2="760"/>
    <line x1="0" y1="800" x2="1920" y2="800"/><line x1="0" y1="850" x2="1920" y2="850"/>
    <line x1="0" y1="915" x2="1920" y2="915"/><line x1="0" y1="995" x2="1920" y2="995"/>
    <line x1="960" y1="756" x2="0" y2="1080"/><line x1="960" y1="756" x2="360" y2="1080"/>
    <line x1="960" y1="756" x2="680" y2="1080"/><line x1="960" y1="756" x2="1240" y2="1080"/>
    <line x1="960" y1="756" x2="1560" y2="1080"/><line x1="960" y1="756" x2="1920" y2="1080"/>
  </g>
</svg>`
    },
    {
      id: 'starter-deep-nebula',
      name: 'Deep Space Nebula',
      category: 'dynamic',
      mediaType: 'svg-anim',
      fileName: 'deep_space_nebula.svg',
      concept: 'Tinh vân vũ trụ chuyển sắc • Đêm sâu huyền bí',
      accent: '#8b5cf6',
      secondary: '#38bdf8',
      overlayRgb: '5, 6, 18',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
  <defs>
    <radialGradient id="neb1" cx="32%" cy="38%" r="52%">
      <stop offset="0%" stop-color="#7c3aed" stop-opacity="0.62"/>
      <stop offset="50%" stop-color="#2563eb" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#04050e" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="neb2" cx="72%" cy="62%" r="48%">
      <stop offset="0%" stop-color="#06b6d4" stop-opacity="0.48"/>
      <stop offset="50%" stop-color="#ec4899" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#04050e" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1920" height="1080" fill="#04050f"/>
  <rect width="1920" height="1080" fill="url(#neb1)">
    <animate attributeName="opacity" values="0.7;1;0.7" dur="8s" repeatCount="indefinite"/>
  </rect>
  <rect width="1920" height="1080" fill="url(#neb2)">
    <animate attributeName="opacity" values="1;0.65;1" dur="10s" repeatCount="indefinite"/>
  </rect>
  <g fill="#ffffff">
    <circle cx="240" cy="180" r="2.2"><animate attributeName="opacity" values="0.3;1;0.3" dur="3.2s" repeatCount="indefinite"/></circle>
    <circle cx="620" cy="290" r="1.8"><animate attributeName="opacity" values="1;0.2;1" dur="4.1s" repeatCount="indefinite"/></circle>
    <circle cx="1080" cy="210" r="2.6"><animate attributeName="opacity" values="0.4;1;0.4" dur="3.7s" repeatCount="indefinite"/></circle>
    <circle cx="1490" cy="340" r="2.0"><animate attributeName="opacity" values="1;0.3;1" dur="2.9s" repeatCount="indefinite"/></circle>
    <circle cx="1710" cy="160" r="1.6"><animate attributeName="opacity" values="0.2;0.95;0.2" dur="4.5s" repeatCount="indefinite"/></circle>
    <circle cx="420" cy="760" r="2.1"><animate attributeName="opacity" values="0.9;0.2;0.9" dur="3.9s" repeatCount="indefinite"/></circle>
    <circle cx="1290" cy="790" r="2.4"><animate attributeName="opacity" values="0.3;1;0.3" dur="3.4s" repeatCount="indefinite"/></circle>
  </g>
</svg>`
    },
    {
      id: 'starter-matrix-emerald',
      name: 'Emerald Code Rain',
      category: 'dynamic',
      mediaType: 'svg-anim',
      fileName: 'emerald_code_rain.svg',
      concept: 'Mưa luồng dữ liệu xanh ngọc • Chuẩn vibe lập trình viên',
      accent: '#22c55e',
      secondary: '#14b8a6',
      overlayRgb: '3, 14, 10',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="mBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#020b07"/>
      <stop offset="100%" stop-color="#041911"/>
    </linearGradient>
    <linearGradient id="col" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#22c55e" stop-opacity="0"/>
      <stop offset="85%" stop-color="#22c55e" stop-opacity="0.55"/>
      <stop offset="100%" stop-color="#bbf7d0" stop-opacity="0.95"/>
    </linearGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#mBg)"/>
  <g>
    <rect x="120" y="-260" width="4" height="240" rx="2" fill="url(#col)"><animate attributeName="y" from="-260" to="1180" dur="3.4s" repeatCount="indefinite"/></rect>
    <rect x="290" y="-260" width="3" height="200" rx="2" fill="url(#col)"><animate attributeName="y" from="-220" to="1180" dur="4.2s" begin="0.8s" repeatCount="indefinite"/></rect>
    <rect x="470" y="-260" width="5" height="280" rx="2" fill="url(#col)"><animate attributeName="y" from="-280" to="1180" dur="3.1s" begin="1.4s" repeatCount="indefinite"/></rect>
    <rect x="690" y="-260" width="3" height="220" rx="2" fill="url(#col)"><animate attributeName="y" from="-240" to="1180" dur="4.8s" begin="0.3s" repeatCount="indefinite"/></rect>
    <rect x="920" y="-260" width="4" height="260" rx="2" fill="url(#col)"><animate attributeName="y" from="-260" to="1180" dur="3.7s" begin="1.9s" repeatCount="indefinite"/></rect>
    <rect x="1140" y="-260" width="5" height="300" rx="2" fill="url(#col)"><animate attributeName="y" from="-300" to="1180" dur="3.3s" begin="0.6s" repeatCount="indefinite"/></rect>
    <rect x="1370" y="-260" width="3" height="210" rx="2" fill="url(#col)"><animate attributeName="y" from="-210" to="1180" dur="4.5s" begin="1.2s" repeatCount="indefinite"/></rect>
    <rect x="1590" y="-260" width="4" height="250" rx="2" fill="url(#col)"><animate attributeName="y" from="-250" to="1180" dur="3.6s" begin="2.1s" repeatCount="indefinite"/></rect>
    <rect x="1790" y="-260" width="5" height="270" rx="2" fill="url(#col)"><animate attributeName="y" from="-270" to="1180" dur="3.9s" begin="0.9s" repeatCount="indefinite"/></rect>
  </g>
</svg>`
    },
    {
      id: 'starter-crimson-eclipse',
      name: 'Crimson Katana Eclipse',
      category: 'static',
      mediaType: 'svg-static',
      fileName: 'crimson_katana_eclipse.svg',
      concept: 'Nhật thực đỏ thẫm • Tương phản cao đậm chất kiếm hiệp',
      accent: '#ef4444',
      secondary: '#f97316',
      overlayRgb: '14, 4, 8',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="cSky" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0a0307"/>
      <stop offset="55%" stop-color="#220710"/>
      <stop offset="100%" stop-color="#0d0408"/>
    </linearGradient>
    <radialGradient id="ecl" cx="50%" cy="46%" r="36%">
      <stop offset="40%" stop-color="#dc2626" stop-opacity="0.9"/>
      <stop offset="65%" stop-color="#991b1b" stop-opacity="0.32"/>
      <stop offset="100%" stop-color="#0a0307" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#cSky)"/>
  <circle cx="960" cy="490" r="320" fill="url(#ecl)"/>
  <circle cx="960" cy="490" r="158" fill="#090206" stroke="#f87171" stroke-width="5" stroke-opacity="0.78"/>
  <path d="M0,860 Q480,740 960,840 T1920,790 L1920,1080 L0,1080 Z" fill="#080205"/>
</svg>`
    },
    {
      id: 'starter-golden-sanctuary',
      name: 'Golden Starfall Sanctuary',
      category: 'static',
      mediaType: 'svg-static',
      fileName: 'golden_starfall_sanctuary.svg',
      concept: 'Vàng ánh kim trên nền xanh hoàng gia • Sang trọng & ấm áp',
      accent: '#fbbf24',
      secondary: '#38bdf8',
      overlayRgb: '7, 10, 24',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="gBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#060a18"/>
      <stop offset="52%" stop-color="#111a36"/>
      <stop offset="100%" stop-color="#1b1524"/>
    </linearGradient>
    <radialGradient id="gSun" cx="68%" cy="32%" r="42%">
      <stop offset="0%" stop-color="#fbbf24" stop-opacity="0.46"/>
      <stop offset="55%" stop-color="#f59e0b" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#060a18" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#gBg)"/>
  <rect width="1920" height="1080" fill="url(#gSun)"/>
  <g stroke="#fbbf24" stroke-opacity="0.22" fill="none">
    <circle cx="1305" cy="345" r="180" stroke-width="1.5"/>
    <circle cx="1305" cy="345" r="260" stroke-dasharray="8 12" stroke-width="1.2"/>
    <circle cx="1305" cy="345" r="350" stroke-width="0.9"/>
  </g>
</svg>`
    },
    {
      id: 'starter-kyoto-matcha',
      name: 'Kyoto Twilight Forest',
      category: 'static',
      mediaType: 'svg-static',
      fileName: 'kyoto_twilight_forest.svg',
      concept: 'Rừng trúc hoàng hôn dịu mắt • Tối giản chống mỏi mắt khi code lâu',
      accent: '#34d399',
      secondary: '#a3e635',
      overlayRgb: '6, 16, 14',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
  <defs>
    <linearGradient id="kBg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#061412"/>
      <stop offset="55%" stop-color="#0c2620"/>
      <stop offset="100%" stop-color="#040d0c"/>
    </linearGradient>
    <radialGradient id="kLight" cx="50%" cy="36%" r="46%">
      <stop offset="0%" stop-color="#34d399" stop-opacity="0.34"/>
      <stop offset="100%" stop-color="#040d0c" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="1920" height="1080" fill="url(#kBg)"/>
  <rect width="1920" height="1080" fill="url(#kLight)"/>
  <g fill="#05110e" opacity="0.72">
    <rect x="160" y="0" width="24" height="1080"/><rect x="260" y="0" width="16" height="1080"/>
    <rect x="1580" y="0" width="22" height="1080"/><rect x="1710" y="0" width="28" height="1080"/>
  </g>
</svg>`
    }
  ];
}

function createStarterMascots() {
  return [
    {
      id: 'mascot-cyber-fox',
      name: 'Hồ Ly Cyber',
      fileName: 'mascot_cyber_fox.svg',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140">
  <defs>
    <linearGradient id="foxG" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#c084fc"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>
    <filter id="fg"><feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>
  <g filter="url(#fg)">
    <animateTransform attributeName="transform" type="translate" values="0,0;0,-7;0,0" dur="2.8s" repeatCount="indefinite"/>
    <polygon points="32,56 44,18 66,46" fill="url(#foxG)"/>
    <polygon points="108,56 96,18 74,46" fill="url(#foxG)"/>
    <polygon points="40,50 47,28 59,46" fill="#f472b6"/>
    <polygon points="100,50 93,28 81,46" fill="#f472b6"/>
    <ellipse cx="70" cy="76" rx="40" ry="34" fill="#171530" stroke="url(#foxG)" stroke-width="3"/>
    <ellipse cx="70" cy="86" rx="22" ry="16" fill="#f8fafc" opacity="0.92"/>
    <circle cx="53" cy="70" r="6" fill="#22d3ee"><animate attributeName="ry" values="6;6;1;6" dur="4s" repeatCount="indefinite"/></circle>
    <circle cx="87" cy="70" r="6" fill="#22d3ee"/>
    <circle cx="55" cy="68" r="2" fill="#fff"/><circle cx="89" cy="68" r="2" fill="#fff"/>
    <polygon points="65,81 75,81 70,87" fill="#f472b6"/>
    <path d="M62,92 Q70,98 78,92" fill="none" stroke="#1e1b4b" stroke-width="2.5" stroke-linecap="round"/>
  </g>
</svg>`
    },
    {
      id: 'mascot-starlight-cat',
      name: 'Mèo Tinh Vân',
      fileName: 'mascot_starlight_cat.svg',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140">
  <g>
    <animateTransform attributeName="transform" type="translate" values="0,0;0,-6;0,0" dur="3.2s" repeatCount="indefinite"/>
    <path d="M35,58 L38,24 L62,46 Z" fill="#1e1b4b" stroke="#fbbf24" stroke-width="2.5"/>
    <path d="M105,58 L102,24 L78,46 Z" fill="#1e1b4b" stroke="#fbbf24" stroke-width="2.5"/>
    <circle cx="70" cy="76" r="37" fill="#15132e" stroke="#fbbf24" stroke-width="2.8"/>
    <circle cx="55" cy="73" r="5.5" fill="#fbbf24"/>
    <circle cx="85" cy="73" r="5.5" fill="#fbbf24"/>
    <circle cx="57" cy="71" r="2" fill="#fff"/><circle cx="87" cy="71" r="2" fill="#fff"/>
    <path d="M63,86 Q70,92 77,86" fill="none" stroke="#f9a8d4" stroke-width="2.6" stroke-linecap="round"/>
    <path d="M70,46 L73,53 L80,55 L73,57 L70,64 L67,57 L60,55 L67,53 Z" fill="#fbbf24"/>
  </g>
</svg>`
    },
    {
      id: 'mascot-ghost-coder',
      name: 'Bóng Ma Lập Trình',
      fileName: 'mascot_ghost_coder.svg',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140">
  <defs>
    <linearGradient id="gh" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e0f2fe"/>
      <stop offset="100%" stop-color="#818cf8"/>
    </linearGradient>
  </defs>
  <g>
    <animateTransform attributeName="transform" type="translate" values="0,2;0,-9;0,2" dur="2.6s" repeatCount="indefinite"/>
    <path d="M34,74 C34,36 106,36 106,74 L106,112 L92,102 L78,114 L70,104 L62,114 L48,102 L34,112 Z" fill="url(#gh)" opacity="0.94"/>
    <rect x="46" y="60" width="18" height="10" rx="5" fill="#0f172a"/>
    <rect x="76" y="60" width="18" height="10" rx="5" fill="#0f172a"/>
    <circle cx="55" cy="65" r="2.5" fill="#22d3ee"/><circle cx="85" cy="65" r="2.5" fill="#22d3ee"/>
    <text x="70" y="92" text-anchor="middle" font-family="monospace" font-size="14" font-weight="bold" fill="#0f172a">&lt;/&gt;</text>
  </g>
</svg>`
    },
    {
      id: 'mascot-dragon-spirit',
      name: 'Rồng Thần Hoàng Kim',
      fileName: 'mascot_dragon_spirit.svg',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140">
  <defs>
    <linearGradient id="dr" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#fde047"/>
      <stop offset="100%" stop-color="#f97316"/>
    </linearGradient>
  </defs>
  <g>
    <animateTransform attributeName="transform" type="translate" values="0,0;0,-7;0,0" dur="3s" repeatCount="indefinite"/>
    <path d="M40,42 L26,18 L52,36 Z" fill="#fbbf24"/>
    <path d="M100,42 L114,18 L88,36 Z" fill="#fbbf24"/>
    <ellipse cx="70" cy="76" rx="38" ry="34" fill="#1e1312" stroke="url(#dr)" stroke-width="3.2"/>
    <ellipse cx="55" cy="72" rx="6" ry="7" fill="#fbbf24"/>
    <ellipse cx="85" cy="72" rx="6" ry="7" fill="#fbbf24"/>
    <ellipse cx="55" cy="72" rx="2" ry="5" fill="#111"/>
    <ellipse cx="85" cy="72" rx="2" ry="5" fill="#111"/>
    <path d="M56,92 Q70,100 84,92" fill="none" stroke="#fbbf24" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="70" cy="48" r="5" fill="#ef4444" stroke="#fde047" stroke-width="1.5"/>
  </g>
</svg>`
    },
    {
      id: 'mascot-neon-butterfly',
      name: 'Hồ Điệp Ánh Sáng',
      fileName: 'mascot_neon_butterfly.svg',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140">
  <defs>
    <linearGradient id="bf" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#ec4899"/>
      <stop offset="100%" stop-color="#22d3ee"/>
    </linearGradient>
  </defs>
  <g>
    <animateTransform attributeName="transform" type="translate" values="0,0;0,-8;0,0" dur="2.2s" repeatCount="indefinite"/>
    <path d="M70,68 C48,26 14,34 22,68 C26,86 52,86 70,74 Z" fill="url(#bf)" opacity="0.9"/>
    <path d="M70,68 C92,26 126,34 118,68 C114,86 88,86 70,74 Z" fill="url(#bf)" opacity="0.9"/>
    <path d="M70,76 C50,80 34,104 48,112 C60,118 68,96 70,82 Z" fill="#a855f7" opacity="0.85"/>
    <path d="M70,76 C90,80 106,104 92,112 C80,118 72,96 70,82 Z" fill="#a855f7" opacity="0.85"/>
    <rect x="67" y="48" width="6" height="46" rx="3" fill="#f8fafc"/>
  </g>
</svg>`
    },
    {
      id: 'mascot-sakura-spirit',
      name: 'Tinh Linh Anh Đào',
      fileName: 'mascot_sakura_spirit.svg',
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 140">
  <g>
    <animateTransform attributeName="transform" type="translate" values="0,0;0,-7;0,0" dur="3.1s" repeatCount="indefinite"/>
    <circle cx="70" cy="74" r="36" fill="#fff1f2" stroke="#f472b6" stroke-width="3"/>
    <circle cx="56" cy="72" r="4.5" fill="#1e1b4b"/><circle cx="84" cy="72" r="4.5" fill="#1e1b4b"/>
    <ellipse cx="47" cy="80" rx="6" ry="3.5" fill="#fda4af" opacity="0.8"/>
    <ellipse cx="93" cy="80" rx="6" ry="3.5" fill="#fda4af" opacity="0.8"/>
    <path d="M64,84 Q70,90 76,84" fill="none" stroke="#be185d" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M70,22 C78,30 78,42 70,46 C62,42 62,30 70,22 Z" fill="#f472b6"/>
    <path d="M84,28 C88,38 80,46 72,46 C72,38 76,30 84,28 Z" fill="#f9a8d4"/>
  </g>
</svg>`
    }
  ];
}

function ensureStarterAssets(targetDir) {
  const scenesDir = path.join(targetDir, 'scenes');
  const mascotsDir = path.join(targetDir, 'mascots');
  fs.mkdirSync(scenesDir, { recursive: true });
  fs.mkdirSync(mascotsDir, { recursive: true });

  const scenes = createAnimatedScenes().map((item) => {
    const filePath = path.join(scenesDir, item.fileName);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, item.svg, 'utf8');
    }
    const stat = fs.statSync(filePath);
    return {
      id: item.id,
      name: item.name,
      category: item.category,
      mediaType: item.mediaType,
      filePath,
      fileSize: stat.size,
      concept: item.concept,
      accent: item.accent,
      secondary: item.secondary,
      overlayRgb: item.overlayRgb,
      source: 'starter',
    };
  });

  const mascots = createStarterMascots().map((item) => {
    const filePath = path.join(mascotsDir, item.fileName);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, item.svg, 'utf8');
    }
    return {
      id: item.id,
      name: item.name,
      filePath,
      source: 'starter',
    };
  });

  return { scenes, mascots };
}

module.exports = { ensureStarterAssets };
