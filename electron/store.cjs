'use strict';

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ensureStarterAssets } = require('./starter-assets.cjs');

const VIDEO_EXTS = new Set(['.mp4', '.webm', '.mov', '.m4v', '.ogg']);
const ANIM_IMG_EXTS = new Set(['.gif']);
const STATIC_IMG_EXTS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.avif', '.bmp', '.svg']);

function resolveBundledAssetsDir() {
  const devDir = path.resolve(__dirname, '..', 'assets');
  if (fs.existsSync(devDir)) return devDir;
  if (process.resourcesPath) {
    const resDir = path.join(process.resourcesPath, 'assets');
    if (fs.existsSync(resDir)) return resDir;
    const unpackedDir = path.join(process.resourcesPath, 'app.asar.unpacked', 'assets');
    if (fs.existsSync(unpackedDir)) return unpackedDir;
  }
  return devDir;
}

const BUNDLED_VIDEO_META = [
  {
    id: 'vid-abi-toads-lily',
    file: 'vid_abi_toads_lily.mp4',
    name: 'Abi Toads on a Lily Pad',
    concept: '4K Live • Hồ sen xanh mướt & chú cóc thư giãn cực chill',
    collection: 'chill',
    resBadge: '4K UHD',
    fpsBadge: '60 FPS',
    accent: '#34d399',
    secondary: '#38bdf8',
    overlayRgb: '6, 18, 16',
  },
  {
    id: 'vid-butterfly-starlight',
    file: 'vid_butterfly_starlight.mp4',
    name: 'Butterfly Girl Starlight Gaze',
    concept: '4K Live • Thiếu nữ ánh sao & cánh bướm xanh huyền ảo',
    collection: 'anime',
    resBadge: '4K UHD',
    fpsBadge: '60 FPS',
    accent: '#38bdf8',
    secondary: '#c084fc',
    overlayRgb: '10, 12, 24',
  },
  {
    id: 'vid-crystal-eyes',
    file: 'vid_crystal_eyes.mp4',
    name: 'Crystal Galaxy Eyes',
    concept: '4K Live • Cận cảnh đôi mắt pha lê phản chiếu dải ngân hà',
    collection: 'anime',
    resBadge: '4K UHD',
    fpsBadge: '60 FPS',
    accent: '#f472b6',
    secondary: '#38bdf8',
    overlayRgb: '14, 10, 24',
  },
  {
    id: 'vid-yt-acheron-void',
    file: 'yt_acheron_void_hd.mp4',
    name: 'Acheron Cyber Noir',
    concept: 'FHD Live • Honkai Star Rail phong cách Cyber tím huyền bí',
    collection: 'cyber',
    resBadge: 'FHD',
    fpsBadge: '60 FPS',
    accent: '#a855f7',
    secondary: '#f43f5e',
    overlayRgb: '10, 6, 20',
  },
  {
    id: 'vid-blue-kimono-girl',
    file: 'vid_blue_kimono_girl.mp4',
    name: 'Cô Gái Thanh Lịch Trong Kimono',
    concept: '4K Live • Cổ phong Nhật Bản thanh lịch & dịu mắt',
    collection: 'chill',
    resBadge: '4K UHD',
    fpsBadge: '60 FPS',
    accent: '#60a5fa',
    secondary: '#c084fc',
    overlayRgb: '8, 12, 24',
  },
  {
    id: 'vid-yt-kimono-sakura',
    file: 'yt_kimono_sakura_hd.mp4',
    name: 'Thiếu Nữ Kimono Hoa Anh Đào',
    concept: 'FHD Live • Đền thờ hoa anh đào & chú mèo tam thể rơi cánh hoa',
    collection: 'chill',
    resBadge: 'FHD',
    fpsBadge: '60 FPS',
    accent: '#f472b6',
    secondary: '#fbbf24',
    overlayRgb: '14, 9, 20',
  },
  {
    id: 'vid-yt-sword-girl',
    file: 'yt_sword_girl_2k.mp4',
    name: 'Nữ Kiếm Sĩ Mực Đêm',
    concept: '2K Live • Thủy mặc cổ trang & nữ kiếm sĩ khí chất',
    collection: 'anime',
    resBadge: '2K QHD',
    fpsBadge: '60 FPS',
    accent: '#06b6d4',
    secondary: '#a855f7',
    overlayRgb: '7, 10, 22',
  },
  {
    id: 'vid-yt-samurai-sunset',
    file: 'yt_samurai_sunset_2k.mp4',
    name: 'Hoàng Hôn Trên Đồng Cỏ',
    concept: '2K Live • Kiếm khách trong ánh chiều tà điện ảnh',
    collection: 'fantasy',
    resBadge: '2K QHD',
    fpsBadge: '60 FPS',
    accent: '#f59e0b',
    secondary: '#f43f5e',
    overlayRgb: '18, 10, 14',
  },
  {
    id: 'vid-siesta-room',
    file: 'vid_siesta_room.mp4',
    name: 'Siesta Nghỉ Ngơi Trong Phòng',
    concept: 'FHD Live • Tantei wa Mou Shindeiru tông ấm sang trọng',
    collection: 'anime',
    resBadge: 'FHD',
    fpsBadge: '60 FPS',
    accent: '#fb7185',
    secondary: '#c084fc',
    overlayRgb: '16, 8, 18',
  },
  {
    id: 'vid-ocean-piano-wlop',
    file: 'vid_ocean_piano_wlop.mp4',
    name: 'The Ocean Piano of WLOP',
    concept: '2K Live • Biển sao đàn piano kiệt tác nghệ thuật WLOP',
    collection: 'fantasy',
    resBadge: '2K QHD',
    fpsBadge: '60 FPS',
    accent: '#38bdf8',
    secondary: '#818cf8',
    overlayRgb: '6, 12, 26',
  },
  {
    id: 'vid-meadow-clouds',
    file: 'vid_meadow_clouds.mp4',
    name: 'Meadow Mountain Clouds',
    concept: '4K Live • Thảo nguyên xanh & mây trời trong vắt thư giãn',
    collection: 'chill',
    resBadge: '4K UHD',
    fpsBadge: '60 FPS',
    accent: '#34d399',
    secondary: '#60a5fa',
    overlayRgb: '7, 14, 22',
  },
  {
    id: 'vid-nikke-sakura-summer',
    file: 'vid_nikke_sakura_summer.mp4',
    name: 'NIKKE Sakura Bloom in Summer',
    concept: '2K Live • Sakura mùa hạ rực rỡ từ Goddess of Victory: NIKKE',
    collection: 'anime',
    resBadge: '2K QHD',
    fpsBadge: '60 FPS',
    accent: '#f43f5e',
    secondary: '#fbbf24',
    overlayRgb: '18, 8, 16',
  },
  {
    id: 'vid-yt-raiden-moon',
    file: 'yt_raiden_moon_2k.mp4',
    name: 'Nguyệt Kiếm Raiden',
    concept: '2K Live • Ánh trăng tím & kiếm quang huyền ảo',
    collection: 'anime',
    resBadge: '2K QHD',
    fpsBadge: '60 FPS',
    accent: '#c084fc',
    secondary: '#f472b6',
    overlayRgb: '12, 7, 24',
  },
  {
    id: 'vid-yt-gojo-void',
    file: 'yt_gojo_void_hd.mp4',
    name: 'Gojo Satoru Hư Thức Tử',
    concept: 'FHD Live • Jujutsu Kaisen hào quang tím Vô Hạ Hạn cực ngầu',
    collection: 'anime',
    resBadge: 'FHD',
    fpsBadge: '60 FPS',
    accent: '#a855f7',
    secondary: '#60a5fa',
    overlayRgb: '11, 7, 24',
  },
  {
    id: 'vid-yt-raiden-lightning',
    file: 'yt_raiden_lightning_2k.mp4',
    name: 'Raiden Shogun Lôi Thần',
    concept: '2K Live • Nữ kiếm sĩ lôi điện tím sắc nét',
    collection: 'anime',
    resBadge: '2K QHD',
    fpsBadge: '60 FPS',
    accent: '#a855f7',
    secondary: '#38bdf8',
    overlayRgb: '10, 7, 24',
  },
  {
    id: 'vid-yt-azure-blade',
    file: 'yt_azure_blade_2k.mp4',
    name: 'Azure Blade Lam Quang',
    concept: '2K Live • Nữ chiến binh thanh kiếm xanh rực sáng',
    collection: 'anime',
    resBadge: '2K QHD',
    fpsBadge: '60 FPS',
    accent: '#38bdf8',
    secondary: '#818cf8',
    overlayRgb: '6, 12, 26',
  },
  {
    id: 'vid-yt-butterfly-eyes',
    file: 'yt_butterfly_eyes_hd.mp4',
    name: 'Ánh Mắt Tinh Vân Pha Lê',
    concept: 'FHD Live • Cận cảnh đôi mắt ngân hà pha lê cực hút hồn',
    collection: 'anime',
    resBadge: 'FHD',
    fpsBadge: '60 FPS',
    accent: '#e879f9',
    secondary: '#38bdf8',
    overlayRgb: '12, 8, 22',
  },
  {
    id: 'vid-yt-purple-butterfly',
    file: 'yt_purple_butterfly_hd.mp4',
    name: 'Bướm Ánh Sao Mắt Tím',
    concept: 'FHD Live • Thiếu nữ anime cùng bướm phát sáng huyền ảo',
    collection: 'anime',
    resBadge: 'FHD',
    fpsBadge: '60 FPS',
    accent: '#c084fc',
    secondary: '#60a5fa',
    overlayRgb: '11, 8, 24',
  },
  {
    id: 'vid-yt-frieren-stars',
    file: 'yt_frieren_stars_hd.mp4',
    name: 'Frieren Đêm Sao Băng',
    concept: 'FHD Live • Bầu trời sao đêm cực chill & dịu mắt từ Frieren',
    collection: 'chill',
    resBadge: 'FHD',
    fpsBadge: '60 FPS',
    accent: '#60a5fa',
    secondary: '#c084fc',
    overlayRgb: '7, 11, 24',
  },
  {
    id: 'vid-yt-shinkai-rain',
    file: 'yt_shinkai_rain_hd.mp4',
    name: 'Mưa Đêm Tokyo Makoto Shinkai',
    concept: 'FHD Live • Phong cảnh mưa đêm Nhật Bản thơ mộng',
    collection: 'chill',
    resBadge: 'FHD',
    fpsBadge: '60 FPS',
    accent: '#38bdf8',
    secondary: '#818cf8',
    overlayRgb: '6, 12, 24',
  },
  {
    id: 'vid-yt-solo-monarch',
    file: 'yt_solo_monarch_hd.mp4',
    name: 'Sung Jin-Woo Shadow Monarch',
    concept: 'FHD Live • Solo Leveling khí chất Hoàng Đế Bóng Tối',
    collection: 'anime',
    resBadge: 'FHD',
    fpsBadge: '60 FPS',
    accent: '#6366f1',
    secondary: '#38bdf8',
    overlayRgb: '7, 8, 22',
  },
  {
    id: 'vid-yt-wlop-fireflies',
    file: 'yt_wlop_fireflies_2k.mp4',
    name: 'Công Chúa Đom Đóm WLOP',
    concept: '2K Live • Nghệ thuật WLOP & hiệu ứng đom đóm',
    collection: 'fantasy',
    resBadge: '2K QHD',
    fpsBadge: '60 FPS',
    accent: '#34d399',
    secondary: '#fbbf24',
    overlayRgb: '6, 14, 18',
  },
  {
    id: 'vid-yt-rengoku-fire',
    file: 'yt_rengoku_fire_2k.mp4',
    name: 'Rengoku Viêm Trụ Hỏa Long',
    concept: '2K Live • Demon Slayer ngọn lửa rực cháy điện ảnh',
    collection: 'anime',
    resBadge: '2K QHD',
    fpsBadge: '60 FPS',
    accent: '#f97316',
    secondary: '#fbbf24',
    overlayRgb: '20, 9, 8',
  },
  {
    id: 'vid-yt-lucy-neon',
    file: 'yt_lucy_neon_2k.mp4',
    name: 'Lucy Cyberpunk Neon',
    concept: '2K Live • Cyberpunk Edgerunners mưa neon',
    collection: 'cyber',
    resBadge: '2K QHD',
    fpsBadge: '60 FPS',
    accent: '#ec4899',
    secondary: '#38bdf8',
    overlayRgb: '8, 9, 24',
  },
  {
    id: 'vid-yt-cyber-moto',
    file: 'yt_cyber_moto_2k.mp4',
    name: 'Nữ Chiến Binh Moto Neon',
    concept: '2K Live • Moto phát sáng trên quỹ đạo Cyberpunk',
    collection: 'cyber',
    resBadge: '2K QHD',
    fpsBadge: '60 FPS',
    accent: '#e879f9',
    secondary: '#38bdf8',
    overlayRgb: '7, 10, 24',
  },
  {
    id: 'vid-yt-interstellar-hole',
    file: 'yt_interstellar_hole_hd.mp4',
    name: 'Hố Đen Thiên Hà Gargantua',
    concept: 'FHD Live • Vũ trụ Interstellar đĩa bồi tụ ánh kim',
    collection: 'cyber',
    resBadge: 'FHD',
    fpsBadge: '60 FPS',
    accent: '#f59e0b',
    secondary: '#38bdf8',
    overlayRgb: '10, 9, 14',
  },
  {
    id: 'vid-yt-sakura-winter',
    file: 'yt_sakura_winter_2k.mp4',
    name: 'Phố Hoa Anh Đào Tuyết Rơi',
    concept: '2K Live • Đường hoa anh đào & tuyết rơi lãng mạn',
    collection: 'chill',
    resBadge: '2K QHD',
    fpsBadge: '60 FPS',
    accent: '#f472b6',
    secondary: '#c084fc',
    overlayRgb: '14, 8, 24',
  },
  {
    id: 'vid-cyber-neon-muse',
    file: 'cyber_neon_muse_live.mp4',
    name: 'Cyberpunk Neon Muse',
    concept: 'FHD Live • Ánh đèn neon tím & xanh cyan',
    collection: 'cyber',
    resBadge: 'FHD',
    fpsBadge: '60 FPS',
    accent: '#a855f7',
    secondary: '#38bdf8',
    overlayRgb: '7, 9, 22',
  },
  {
    id: 'vid-sakura-shrine',
    file: 'sakura_shrine_live.mp4',
    name: 'Đêm Hoa Anh Đào Trăng Rằm',
    concept: 'FHD Live • Cánh hoa anh đào rơi trên hồ Torii',
    collection: 'chill',
    accent: '#f472b6',
    secondary: '#c084fc',
    overlayRgb: '14, 8, 24',
  },
];

const BUNDLED_WALLPAPER_META = [
  {
    id: 'art-cyber-neon-muse',
    file: 'cyber_neon_muse.webp',
    name: 'Cyberpunk Neon Muse',
    concept: 'Hình nền Anime Cyberpunk 2K • Sắc tím & xanh điện quang',
    collection: 'cyber',
    accent: '#a855f7',
    secondary: '#06b6d4',
    overlayRgb: '7, 8, 22',
  },
  {
    id: 'art-emerald-spirit',
    file: 'emerald_spirit_sanctuary.webp',
    name: 'Đền Thần Rừng Ngọc',
    concept: 'Hình nền Fantasy 2K • Rừng linh khí dịu mắt khi code lâu',
    collection: 'fantasy',
    accent: '#10b981',
    secondary: '#22d3ee',
    overlayRgb: '4, 16, 18',
  },
  {
    id: 'art-golden-samurai',
    file: 'golden_samurai_sunset.webp',
    name: 'Kiếm Khách Trên Đỉnh Mây',
    concept: 'Hình nền Kiếm Hiệp Hoàng Hôn 2K • Tông cam vàng ấm áp',
    collection: 'fantasy',
    accent: '#f59e0b',
    secondary: '#fb7185',
    overlayRgb: '18, 10, 14',
  },
  {
    id: 'art-sakura-shrine',
    file: 'sakura_shrine_night.webp',
    name: 'Cổng Torii Anh Đào Đêm',
    concept: 'Hình nền Nhật Bản Đêm Trăng 2K • Hồng phấn & tím sâu',
    collection: 'chill',
    accent: '#f472b6',
    secondary: '#c084fc',
    overlayRgb: '14, 7, 24',
  },
  {
    id: 'art-moonlight-valkyrie',
    file: 'moonlight_valkyrie.webp',
    name: 'Pháp Sư Trăng Khuyết',
    concept: 'Hình nền Dark Fantasy WLOP Style • Ánh trăng xanh lam',
    collection: 'fantasy',
    accent: '#38bdf8',
    secondary: '#a855f7',
    overlayRgb: '6, 10, 26',
  },
  {
    id: 'art-tokyo-cyber',
    file: 'tokyo_midnight_cyber.webp',
    name: 'Phố Đêm Tokyo Neon',
    concept: 'Hình nền Cyberpunk 2K • Mưa đêm phản chiếu neon sắc nét',
    collection: 'cyber',
    accent: '#06b6d4',
    secondary: '#ec4899',
    overlayRgb: '6, 9, 24',
  },
  {
    id: 'art-celestial-citadel',
    file: 'starlit_celestial_citadel.webp',
    name: 'Thiên Cung Ngân Hà',
    concept: 'Hình nền Vũ Trụ Hoàng Kim 2K • Thành cổ giữa tinh vân',
    collection: 'fantasy',
    accent: '#fbbf24',
    secondary: '#818cf8',
    overlayRgb: '8, 10, 24',
  },
  {
    id: 'art-pastel-daybreak',
    file: 'pastel_daybreak_clouds.webp',
    name: 'Bình Minh Mây Pastel',
    concept: 'Hình nền Makoto Shinkai Style • Tươi sáng & trong trẻo',
    collection: 'chill',
    accent: '#38bdf8',
    secondary: '#f472b6',
    overlayRgb: '12, 18, 34',
  },
];

const BUNDLED_MASCOT_META = [
  // Cute / Kawaii tier
  {
    id: 'bundled-chibi-kitsune',
    file: 'chibi_cyber_kitsune.png',
    name: 'Chibi Hồ Ly Cyber',
    category: 'cute',
    tag: 'Cute',
  },
  {
    id: 'bundled-chibi-astro-cat',
    file: 'chibi_astro_cat.png',
    name: 'Chibi Mèo Phi Hành Gia',
    category: 'cute',
    tag: 'Cute',
  },
  {
    id: 'bundled-cute-mochi-bunny',
    file: 'mascot_cute_mochi_bunny.png',
    name: 'Thỏ Hồng Mochi Ôm Sao',
    category: 'cute',
    tag: 'Cute',
  },
  {
    id: 'bundled-cute-baby-dragon',
    file: 'mascot_cute_baby_dragon.png',
    name: 'Rồng Sữa Mini Kính Tròn',
    category: 'cute',
    tag: 'Cute',
  },
  {
    id: 'bundled-cute-laffey',
    file: 'mascot_cute_laffey.png',
    name: 'Thỏ Ngủ Gật Laffey',
    category: 'cute',
    tag: 'Cute',
  },
  {
    id: 'bundled-cute-cheshire',
    file: 'mascot_cute_cheshire.png',
    name: 'Mèo Hầu Gái Cheshire',
    category: 'cute',
    tag: 'Cute',
  },
  // Cool / Stylish Anime tier
  {
    id: 'bundled-cool-musashi',
    file: 'mascot_cool_musashi.png',
    name: 'Lôi Thần Hồ Ly Musashi',
    category: 'cool',
    tag: 'Ngầu',
  },
  {
    id: 'bundled-cool-bremerton',
    file: 'mascot_cool_bremerton.png',
    name: 'Nữ Sinh Streetwear Bremerton',
    category: 'cool',
    tag: 'Cá Tính',
  },
  // Bold / Glamorous Waifu tier
  {
    id: 'bundled-bold-cyber-bunny',
    file: 'mascot_bold_cyber_bunny.png',
    name: 'Thỏ Đen Cyber Bunny',
    category: 'bold',
    tag: 'Táo Bạo',
  },
  {
    id: 'bundled-bold-nj-bunny',
    file: 'mascot_bold_nj_bunny.png',
    name: 'Thỏ Neon New Jersey',
    category: 'bold',
    tag: 'Táo Bạo',
  },
  {
    id: 'bundled-bold-taihou-party',
    file: 'mascot_bold_taihou_party.png',
    name: 'Nữ Hoàng Đầm Đỏ Taihou',
    category: 'bold',
    tag: 'Quyến Rũ',
  },
  {
    id: 'bundled-bold-eugen-summer',
    file: 'mascot_bold_eugen_summer.png',
    name: 'Nữ Thần Biển Hè Eugen',
    category: 'bold',
    tag: 'Táo Bạo',
  },
  {
    id: 'bundled-bold-atago-summer',
    file: 'mascot_bold_atago_summer.png',
    name: 'Mỹ Nhân Bãi Biển Atago',
    category: 'bold',
    tag: 'Quyến Rũ',
  },
];

function createDefaultConfig() {
  return {
    configVersion: 10,
    enabled: true,
    unifiedFullWindow: true,
    chatThemeId: 'vid-yt-raiden-moon',
    ideThemeId: 'vid-yt-raiden-moon',
    uiFont: 'be_vietnam',
    textContrastMode: 'crisp',
    chatFontSize: 14,
    syncWindowControls: true,
    appIconStyle: 'glow',
    activityBarStyle: 'colorful_glow',
    tabsChromeStyle: 'floating_pills',
    statusBarStyle: 'glass_pills',
    ideWelcomeStyle: 'luxury_bottom',
    ideWelcomeTitle: 'Antigravity IDE',
    ideWelcomeFont: 'orbitron',
    ideWelcomeFontSize: 26,
    wallpaperBlur: 0,
    uiPanelBlur: 0,
    dimming: 14,
    sidebarOpacity: 0,
    chatBoxOpacity: 0,
    editorOpacity: 22,
    terminalOpacity: 10,
    settingsOpacity: 26,
    borderStyle: 'none',
    textPalette: 'alabaster',
    customTextColor: '#edf2f7',
    customCodeColor: '#bae6fd',
    neonColor: '#818cf8',
    neonSecondary: '#38bdf8',
    neonIntensity: 52,
    videoObjectFit: 'cover',
    videoVolume: 0,
    videoSpeed: 1,
    smartGpuPowerSaving: true,
    playlistEnabled: false,
    playlistIntervalSec: 120,
    playlistTarget: 'both',
    playlistIds: [],
    isLightMode: false,
    applyToChat: true,
    applyToIde: true,
    splitBrowserSafe: true,
    bubbleStyle: 'crystal',
    composerStyle: 'glass',
    welcomeText: '',
    cornerRadius: 14,
    mascotEnabled: true,
    mascotInteractive: true,
    mascotId: 'bundled-bold-cyber-bunny',
    mascotPosition: 'bottom-right',
    mascotSize: 124,
    mascotOpacity: 96,
    mascotTarget: 'both',
    mascotAnim: 'float',
    mascotGlow: true,
    mascotFlip: false,
    mascotQuotes: [
      'Chào Đại Đế! Hôm nay build gì nào? ✨',
      'Fix bug siêu mượt luôn 🔥',
      'Nhớ uống ngụm nước nhé sếp 💧',
      'Giao diện này trong suốt đỉnh quá 💖',
      'Để mình canh bug cho bạn 👀',
      'Đẩy tiến độ thôi nào 🚀',
    ],
    userAvatarId: '',
    agentAvatarId: '',
    avatarSize: 36,
    avatarRadius: 50,
    minimizeToTray: true,
    autoApplyOnChange: true,
    autoStartWindows: true,
  };
}

class StudioStore {
  constructor(userDataDir, mediaServer) {
    this.baseDir = path.join(userDataDir, 'antigravity-studio-data');
    this.starterDir = path.join(this.baseDir, 'starter');
    this.customAssetsDir = path.join(this.baseDir, 'custom-assets');
    this.extraThemesDir = path.join(this.baseDir, 'extra-themes');
    this.configPath = path.join(this.baseDir, 'studio_config.json');
    this.libraryPath = path.join(this.baseDir, 'library.json');
    this.mediaServer = mediaServer;

    fs.mkdirSync(this.baseDir, { recursive: true });
    fs.mkdirSync(this.customAssetsDir, { recursive: true });
    fs.mkdirSync(this.extraThemesDir, { recursive: true });
    const guideFile = path.join(this.extraThemesDir, 'BO_VIDEO_VA_ANH_VAO_DAY.txt');
    if (!fs.existsSync(guideFile)) {
      try {
        fs.writeFileSync(
          guideFile,
          'Thả trực tiếp bất kỳ file video (.mp4, .webm, .mov, .gif) hoặc ảnh (.webp, .png, .jpg) vào thư mục này!\n' +
          'Antigravity Studio sẽ tự động nhận diện và hiển thị trong mục "Thư Mục Mở Rộng".\n' +
          'Bạn cũng có thể đặt thư mục tên "Themes" nằm cùng chỗ với file Antigravity-Studio-Portable.exe để tự nạp gói chủ đề!\n',
          'utf8'
        );
      } catch (_) {}
    }

    this.bundledAssetsDir = resolveBundledAssetsDir();
    this.bundledThemes = this.loadBundledThemes();
    this.bundledMascots = this.loadBundledMascots();
    this.starter = ensureStarterAssets(this.starterDir);
    this.skillThemes = this.loadExistingSkillThemes();
    this.library = this.loadLibrary();
    this.extraFolderThemes = this.loadExtraFolderThemes();
    this.config = this.loadConfig();

    // Migrate older configs to v10 100% Zero-Seam Borderless Crystal Panorama
    if ((this.config.configVersion || 0) < 10) {
      const heroId = this.config.chatThemeId || (this.bundledThemes.some((t) => t.id === 'vid-yt-raiden-moon')
        ? 'vid-yt-raiden-moon'
        : this.bundledThemes[0]?.id);
      this.saveConfig({
        configVersion: 10,
        unifiedFullWindow: true,
        chatThemeId: heroId,
        ideThemeId: heroId,
        uiFont: this.config.uiFont || 'be_vietnam',
        textContrastMode: this.config.textContrastMode || 'crisp',
        chatFontSize: this.config.chatFontSize || 14,
        syncWindowControls: true,
        appIconStyle: this.config.appIconStyle || 'glow',
        activityBarStyle: this.config.activityBarStyle || 'colorful_glow',
        tabsChromeStyle: this.config.tabsChromeStyle || 'floating_pills',
        statusBarStyle: this.config.statusBarStyle || 'glass_pills',
        ideWelcomeStyle: this.config.ideWelcomeStyle || 'luxury_bottom',
        ideWelcomeTitle: this.config.ideWelcomeTitle || 'Antigravity IDE',
        ideWelcomeFont: this.config.ideWelcomeFont || 'orbitron',
        ideWelcomeFontSize: this.config.ideWelcomeFontSize || 26,
        dimming: this.config.dimming ?? 14,
        sidebarOpacity: 0,
        chatBoxOpacity: 0,
        editorOpacity: this.config.editorOpacity ?? 22,
        bubbleStyle: this.config.bubbleStyle || 'crystal',
        composerStyle: this.config.composerStyle || 'glass',
        borderStyle: 'none',
        textPalette: this.config.textPalette || 'alabaster',
        mascotInteractive: true,
        mascotAnim: this.config.mascotAnim || 'float',
        mascotGlow: this.config.mascotGlow !== false,
        mascotFlip: Boolean(this.config.mascotFlip),
        minimizeToTray: true,
        autoStartWindows: true,
      });
    }

    this.brandLogoPath = path.join(this.bundledAssetsDir, 'brand', 'antigravity-logo.png');
    this.syncMediaRegistrations();
  }

  loadBundledThemes() {
    const out = [];
    const vidDir = path.join(this.bundledAssetsDir, 'videos');
    const thumbDir = path.join(this.bundledAssetsDir, 'thumbs');
    for (const meta of BUNDLED_VIDEO_META) {
      const fp = path.join(vidDir, meta.file);
      if (fs.existsSync(fp)) {
        const baseName = path.basename(meta.file, path.extname(meta.file));
        const tp = path.join(thumbDir, `${baseName}.jpg`);
        out.push({
          id: meta.id,
          name: meta.name,
          category: 'dynamic',
          mediaType: 'video',
          filePath: fp,
          posterPath: fs.existsSync(tp) ? tp : '',
          fileSize: fs.statSync(fp).size,
          concept: meta.concept,
          collection: meta.collection || 'anime',
          resBadge: meta.resBadge || 'FHD',
          fpsBadge: meta.fpsBadge || '60 FPS',
          accent: meta.accent,
          secondary: meta.secondary,
          overlayRgb: meta.overlayRgb,
          source: 'bundled',
        });
      }
    }
    const wpDir = path.join(this.bundledAssetsDir, 'wallpapers');
    for (const meta of BUNDLED_WALLPAPER_META) {
      const fp = path.join(wpDir, meta.file);
      if (fs.existsSync(fp)) {
        out.push({
          id: meta.id,
          name: meta.name,
          category: 'static',
          mediaType: 'image',
          filePath: fp,
          fileSize: fs.statSync(fp).size,
          concept: meta.concept,
          collection: meta.collection || 'fantasy',
          accent: meta.accent,
          secondary: meta.secondary,
          overlayRgb: meta.overlayRgb,
          source: 'bundled',
        });
      }
    }
    return out;
  }

  getExtraSearchDirs() {
    const dirs = [this.extraThemesDir];
    const portableExe = process.env.PORTABLE_EXECUTABLE_FILE || '';
    const exeDir = portableExe ? path.dirname(portableExe) : path.dirname(process.execPath);
    for (const folderName of ['Themes', 'ExtraThemes', 'VideoThemes']) {
      const candidate = path.join(exeDir, folderName);
      if (fs.existsSync(candidate)) dirs.push(candidate);
    }
    return [...new Set(dirs)];
  }

  loadExtraFolderThemes() {
    const out = [];
    const seen = new Set();
    const walk = (dir, depth) => {
      if (depth > 2 || !fs.existsSync(dir)) return;
      let entries;
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch (_) {
        return;
      }
      for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          if (ent.name.startsWith('.')) continue;
          walk(full, depth + 1);
        } else if (ent.isFile()) {
          const cls = this.classifyFile(full);
          if (!cls) continue;
          const norm = path.resolve(full).toLowerCase();
          if (seen.has(norm)) continue;
          seen.add(norm);
          let size = 0;
          try { size = fs.statSync(full).size; } catch (_) {}
          const id = 'extra-' + crypto.createHash('md5').update(norm).digest('hex').slice(0, 10);
          const cleanName = path.basename(full, path.extname(full)).replace(/[_-]+/g, ' ').trim() || 'Theme Mở Rộng';
          out.push({
            id,
            name: cleanName,
            category: cls.category,
            mediaType: cls.mediaType,
            filePath: full,
            fileSize: size,
            concept: cls.mediaType === 'video' ? 'Video Mở Rộng (Tự Nạp)' : 'Hình Nền Mở Rộng (Tự Nạp)',
            collection: 'extra',
            accent: '#a855f7',
            secondary: '#38bdf8',
            overlayRgb: '8, 10, 22',
            source: 'extra',
          });
        }
      }
    };
    for (const d of this.getExtraSearchDirs()) {
      walk(d, 0);
    }
    return out;
  }

  rescanExtraFolderThemes() {
    this.extraFolderThemes = this.loadExtraFolderThemes();
    this.syncMediaRegistrations();
    return this.extraFolderThemes;
  }

  loadBundledMascots() {
    const out = [];
    const mDir = path.join(this.bundledAssetsDir, 'mascots');
    for (const meta of BUNDLED_MASCOT_META) {
      const fp = path.join(mDir, meta.file);
      if (fs.existsSync(fp)) {
        out.push({
          id: meta.id,
          name: meta.name,
          category: meta.category || 'cute',
          tag: meta.tag || 'Cute',
          filePath: fp,
          source: 'bundled',
        });
      }
    }
    return out;
  }

  loadExistingSkillThemes() {
    const skillRoot = path.join(os.homedir(), '.gemini', 'config', 'skills', 'antigravity-custom-theme');
    const themesJsonPath = path.join(skillRoot, 'themes', 'themes.json');
    if (!fs.existsSync(themesJsonPath)) return [];
    try {
      const raw = JSON.parse(fs.readFileSync(themesJsonPath, 'utf8'));
      const list = [];
      for (const [name, th] of Object.entries(raw)) {
        if (!th || typeof th !== 'object') continue;
        const wpRel = th.wallpaper || '';
        const wpAbs = wpRel ? path.join(skillRoot, 'themes', wpRel) : '';
        const hasFile = wpAbs && fs.existsSync(wpAbs);
        const ext = hasFile ? path.extname(wpAbs).toLowerCase() : '';
        const isAnim = hasFile && (VIDEO_EXTS.has(ext) || ext === '.gif' || wpRel.includes('_anim'));
        const id = 'skill-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const userAvAbs = th.userAvatar ? path.join(skillRoot, 'themes', th.userAvatar) : '';
        const agentAvAbs = th.agentAvatar ? path.join(skillRoot, 'themes', th.agentAvatar) : '';
        list.push({
          id,
          name,
          category: isAnim ? 'dynamic' : 'static',
          mediaType: hasFile ? (VIDEO_EXTS.has(ext) ? 'video' : ext === '.svg' ? (isAnim ? 'svg-anim' : 'svg-static') : 'image') : 'css',
          filePath: hasFile ? wpAbs : '',
          fileSize: hasFile ? fs.statSync(wpAbs).size : 0,
          concept: th.concept || 'Preset từ antigravity-custom-theme',
          accent: th.primary || '#fbbf24',
          secondary: th.secondary || '#38bdf8',
          overlayRgb: th.overlayRgb || '5, 9, 22',
          pureBg: th.pureBg || '',
          userAvatarPath: userAvAbs && fs.existsSync(userAvAbs) ? userAvAbs : '',
          agentAvatarPath: agentAvAbs && fs.existsSync(agentAvAbs) ? agentAvAbs : '',
          welcomeText: th.welcomeText || '',
          source: 'skill',
        });
      }
      return list;
    } catch (_) {
      return [];
    }
  }

  readJsonSafe(filePath) {
    const candidates = [filePath, `${filePath}.bak`];
    for (const p of candidates) {
      try {
        if (!fs.existsSync(p)) continue;
        const raw = fs.readFileSync(p, 'utf8');
        if (!raw || !raw.trim()) continue;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      } catch (_) {}
    }
    return null;
  }

  writeJsonAtomic(filePath, obj) {
    const text = JSON.stringify(obj, null, 2);
    const tmpPath = `${filePath}.tmp`;
    const bakPath = `${filePath}.bak`;
    try {
      if (fs.existsSync(filePath)) {
        const cur = fs.readFileSync(filePath, 'utf8');
        if (cur && cur.trim()) {
          JSON.parse(cur);
          fs.writeFileSync(bakPath, cur, 'utf8');
        }
      }
    } catch (_) {}
    fs.writeFileSync(tmpPath, text, 'utf8');
    try {
      fs.renameSync(tmpPath, filePath);
    } catch (_) {
      fs.writeFileSync(filePath, text, 'utf8');
      try { fs.unlinkSync(tmpPath); } catch (_) {}
    }
  }

  loadLibrary() {
    const parsed = this.readJsonSafe(this.libraryPath);
    if (parsed) {
      return {
        userThemes: Array.isArray(parsed.userThemes) ? parsed.userThemes : [],
        trashThemes: Array.isArray(parsed.trashThemes) ? parsed.trashThemes : [],
        userMascots: Array.isArray(parsed.userMascots) ? parsed.userMascots : [],
        userAvatars: Array.isArray(parsed.userAvatars) ? parsed.userAvatars : [],
        savedCombos: Array.isArray(parsed.savedCombos) ? parsed.savedCombos : [],
        themeHistory: Array.isArray(parsed.themeHistory) ? parsed.themeHistory : [],
      };
    }
    return { userThemes: [], trashThemes: [], userMascots: [], userAvatars: [], savedCombos: [], themeHistory: [] };
  }

  recordThemeHistory(themeId) {
    if (!themeId) return;
    const list = Array.isArray(this.library.themeHistory) ? this.library.themeHistory : [];
    const filtered = list.filter((h) => h && h.themeId !== themeId);
    filtered.unshift({ themeId, usedAt: Date.now() });
    this.library.themeHistory = filtered.slice(0, 24);
    this.saveLibrary();
  }

  saveCombo(name) {
    const cleanName = String(name || '').trim() || `Combo ${new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`;
    const themes = this.getAllThemes();
    const activeTheme = themes.find((t) => t.id === this.config.chatThemeId) || themes[0] || null;
    const combo = {
      id: 'combo-' + crypto.randomBytes(4).toString('hex'),
      name: cleanName,
      savedAt: Date.now(),
      themeId: activeTheme?.id || this.config.chatThemeId,
      themeName: activeTheme?.name || 'Custom',
      snapshot: { ...this.config },
    };
    this.library.savedCombos = [combo, ...(this.library.savedCombos || [])].slice(0, 30);
    this.saveLibrary();
    return combo;
  }

  applyCombo(comboId) {
    const combo = (this.library.savedCombos || []).find((c) => c.id === comboId);
    if (!combo || !combo.snapshot) return null;
    this.saveConfig({ ...combo.snapshot, enabled: true });
    return combo;
  }

  deleteCombo(comboId) {
    const prev = this.library.savedCombos || [];
    const next = prev.filter((c) => c.id !== comboId);
    if (next.length === prev.length) return false;
    this.library.savedCombos = next;
    this.saveLibrary();
    return true;
  }

  saveLibrary() {
    this.writeJsonAtomic(this.libraryPath, this.library);
    this.syncMediaRegistrations();
  }

  loadConfig() {
    const def = createDefaultConfig();
    const parsed = this.readJsonSafe(this.configPath);
    if (parsed) {
      return { ...def, ...parsed };
    }
    return def;
  }

  saveConfig(patch = {}) {
    this.config = { ...this.config, ...patch };
    this.writeJsonAtomic(this.configPath, this.config);
    return this.config;
  }

  resetConfig() {
    this.config = createDefaultConfig();
    this.writeJsonAtomic(this.configPath, this.config);
    return this.config;
  }

  getAllThemes() {
    const merged = [
      ...this.extraFolderThemes.filter((t) => !t.filePath || fs.existsSync(t.filePath)),
      ...this.library.userThemes.filter((t) => !t.filePath || fs.existsSync(t.filePath)),
      ...this.bundledThemes,
      ...this.skillThemes,
      ...this.starter.scenes,
    ];
    return merged.map((t) => ({
      ...t,
      mediaUrl: t.filePath ? this.mediaServer.getUrl(`theme:${t.id}`) : '',
      posterUrl: t.posterPath ? this.mediaServer.getUrl(`thumb:${t.id}`) : '',
      userAvatarUrl: t.userAvatarPath ? this.mediaServer.getUrl(`uav:${t.id}`) : '',
      agentAvatarUrl: t.agentAvatarPath ? this.mediaServer.getUrl(`aav:${t.id}`) : '',
    }));
  }

  getAllMascots() {
    const merged = [
      ...this.library.userMascots.filter((m) => m.filePath && fs.existsSync(m.filePath)),
      ...this.bundledMascots,
      ...this.starter.mascots,
    ];
    return merged.map((m) => ({
      ...m,
      mediaUrl: m.filePath ? this.mediaServer.getUrl(`mascot:${m.id}`) : '',
    }));
  }

  getAllAvatars() {
    const skillAvatars = [];
    for (const t of this.skillThemes) {
      if (t.userAvatarPath) {
        skillAvatars.push({
          id: `skill-uav-${t.id}`,
          name: `${t.name} (User)`,
          filePath: t.userAvatarPath,
          source: 'skill',
        });
      }
      if (t.agentAvatarPath) {
        skillAvatars.push({
          id: `skill-aav-${t.id}`,
          name: `${t.name} (AI)`,
          filePath: t.agentAvatarPath,
          source: 'skill',
        });
      }
    }
    const merged = [
      ...this.library.userAvatars.filter((a) => a.filePath && fs.existsSync(a.filePath)),
      ...skillAvatars,
    ];
    return merged.map((a) => ({
      ...a,
      mediaUrl: a.filePath ? this.mediaServer.getUrl(`avatar:${a.id}`) : '',
    }));
  }

  syncMediaRegistrations() {
    const allThemes = [
      ...this.extraFolderThemes,
      ...this.library.userThemes,
      ...this.bundledThemes,
      ...this.skillThemes,
      ...this.starter.scenes,
    ];
    for (const t of allThemes) {
      if (t.filePath && fs.existsSync(t.filePath)) {
        this.mediaServer.register(`theme:${t.id}`, t.filePath);
      }
      if (t.posterPath && fs.existsSync(t.posterPath)) {
        this.mediaServer.register(`thumb:${t.id}`, t.posterPath);
      }
      if (t.userAvatarPath && fs.existsSync(t.userAvatarPath)) {
        this.mediaServer.register(`uav:${t.id}`, t.userAvatarPath);
      }
      if (t.agentAvatarPath && fs.existsSync(t.agentAvatarPath)) {
        this.mediaServer.register(`aav:${t.id}`, t.agentAvatarPath);
      }
    }
    for (const m of [...this.library.userMascots, ...this.bundledMascots, ...this.starter.mascots]) {
      if (m.filePath && fs.existsSync(m.filePath)) {
        this.mediaServer.register(`mascot:${m.id}`, m.filePath);
      }
    }
    for (const a of this.getAllAvatars()) {
      if (a.filePath && fs.existsSync(a.filePath)) {
        this.mediaServer.register(`avatar:${a.id}`, a.filePath);
      }
    }
    if (this.brandLogoPath && fs.existsSync(this.brandLogoPath)) {
      this.mediaServer.register('brand:appicon', this.brandLogoPath);
    }
  }

  classifyFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    if (VIDEO_EXTS.has(ext)) return { category: 'dynamic', mediaType: 'video' };
    if (ANIM_IMG_EXTS.has(ext)) return { category: 'dynamic', mediaType: 'gif' };
    if (STATIC_IMG_EXTS.has(ext)) return { category: 'static', mediaType: ext === '.svg' ? 'svg-static' : 'image' };
    return null;
  }

  importThemeFiles(filePaths, options = { copyIntoStudio: false }) {
    const added = [];
    const existingPaths = new Set(this.library.userThemes.map((t) => path.resolve(t.filePath || '').toLowerCase()));

    for (const rawPath of filePaths) {
      if (!rawPath || !fs.existsSync(rawPath)) continue;
      const cls = this.classifyFile(rawPath);
      if (!cls) continue;

      let finalPath = path.resolve(rawPath);
      if (existingPaths.has(finalPath.toLowerCase())) continue;

      const stat = fs.statSync(finalPath);
      if (options.minBytes && stat.size < options.minBytes && path.extname(finalPath).toLowerCase() !== '.svg') {
        continue;
      }

      const id = 'user-' + crypto.createHash('md5').update(finalPath + stat.size + Date.now()).digest('hex').slice(0, 10);

      if (options.copyIntoStudio && stat.size < 40 * 1024 * 1024) {
        const safeName = `${id}${path.extname(finalPath).toLowerCase()}`;
        const dest = path.join(this.customAssetsDir, safeName);
        if (!fs.existsSync(dest)) fs.copyFileSync(finalPath, dest);
        finalPath = dest;
      }

      const baseName = options.customTitle || path.basename(rawPath, path.extname(rawPath)).replace(/[_-]+/g, ' ').trim();
      const entry = {
        id,
        name: baseName || 'Custom Theme',
        category: cls.category,
        mediaType: cls.mediaType,
        filePath: finalPath,
        fileSize: stat.size,
        concept: options.customConcept || (cls.mediaType === 'video' ? 'Video Wallpaper (Local)' : 'Hình nền từ máy'),
        accent: this.config.neonColor || '#a855f7',
        secondary: this.config.neonSecondary || '#06b6d4',
        overlayRgb: '6, 9, 20',
        source: 'user',
        addedAt: Date.now(),
      };

      this.library.userThemes.unshift(entry);
      existingPaths.add(finalPath.toLowerCase());
      added.push(entry);
    }

    if (added.length > 0) {
      this.saveLibrary();
    }
    return added;
  }

  scanFolderForThemes(folderPath, maxDepth = 3) {
    const found = [];
    const walk = (dir, depth) => {
      if (depth > maxDepth) return;
      let entries;
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch (_) {
        return;
      }
      for (const ent of entries) {
        const full = path.join(dir, ent.name);
        if (ent.isDirectory()) {
          if (ent.name.startsWith('.') || ent.name === 'node_modules') continue;
          walk(full, depth + 1);
        } else if (ent.isFile()) {
          const lower = ent.name.toLowerCase();
          if (lower === 'preview.jpg' || lower === 'preview.gif' || lower === 'preview.png') continue;
          if (this.classifyFile(full)) found.push(full);
        }
      }
    };
    walk(folderPath, 0);
    return this.importThemeFiles(found, { copyIntoStudio: false, minBytes: 25 * 1024 });
  }

  deleteUserTheme(themeId) {
    const idx = this.library.userThemes.findIndex((t) => t.id === themeId);
    if (idx === -1) return false;
    const [removed] = this.library.userThemes.splice(idx, 1);
    this.library.trashThemes = [{ ...removed, deletedAt: Date.now() }, ...(this.library.trashThemes || [])].slice(0, 50);
    this.config.playlistIds = (this.config.playlistIds || []).filter((id) => id !== themeId);
    this.saveLibrary();
    this.saveConfig({ playlistIds: this.config.playlistIds });
    return true;
  }

  restoreTrashTheme(themeId) {
    const trash = this.library.trashThemes || [];
    const idx = trash.findIndex((t) => t.id === themeId);
    if (idx === -1) return false;
    const [item] = trash.splice(idx, 1);
    delete item.deletedAt;
    this.library.userThemes.unshift(item);
    this.library.trashThemes = trash;
    this.saveLibrary();
    return true;
  }

  deleteTrashForever(themeId) {
    const trash = this.library.trashThemes || [];
    const idx = trash.findIndex((t) => t.id === themeId);
    if (idx === -1) return false;
    trash.splice(idx, 1);
    this.library.trashThemes = trash;
    this.saveLibrary();
    return true;
  }

  emptyTrash() {
    this.library.trashThemes = [];
    this.saveLibrary();
    return true;
  }

  importMascotFile(filePath) {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const ext = path.extname(filePath).toLowerCase();
    if (!STATIC_IMG_EXTS.has(ext) && !ANIM_IMG_EXTS.has(ext) && !VIDEO_EXTS.has(ext)) return null;
    const id = 'umascot-' + crypto.randomBytes(5).toString('hex');
    const dest = path.join(this.customAssetsDir, `${id}${ext}`);
    fs.copyFileSync(filePath, dest);
    const entry = {
      id,
      name: path.basename(filePath, ext).replace(/[_-]+/g, ' ').trim() || 'Sticker',
      filePath: dest,
      source: 'user',
    };
    this.library.userMascots.unshift(entry);
    this.saveLibrary();
    return { ...entry, mediaUrl: this.mediaServer.getUrl(`mascot:${entry.id}`) };
  }

  deleteUserMascot(mascotId) {
    const idx = this.library.userMascots.findIndex((m) => m.id === mascotId);
    if (idx === -1) return false;
    this.library.userMascots.splice(idx, 1);
    this.saveLibrary();
    return true;
  }

  importAvatarFile(filePath, role = 'user') {
    if (!filePath || !fs.existsSync(filePath)) return null;
    const ext = path.extname(filePath).toLowerCase();
    if (!STATIC_IMG_EXTS.has(ext) && !ANIM_IMG_EXTS.has(ext)) return null;
    const id = `uav-${role}-${crypto.randomBytes(4).toString('hex')}`;
    const dest = path.join(this.customAssetsDir, `${id}${ext}`);
    fs.copyFileSync(filePath, dest);
    const entry = {
      id,
      name: path.basename(filePath, ext).replace(/[_-]+/g, ' ').trim() || 'Avatar',
      filePath: dest,
      role,
      source: 'user',
    };
    this.library.userAvatars.unshift(entry);
    this.saveLibrary();
    if (role === 'user') this.saveConfig({ userAvatarId: id });
    if (role === 'agent') this.saveConfig({ agentAvatarId: id });
    return { ...entry, mediaUrl: this.mediaServer.getUrl(`avatar:${entry.id}`) };
  }

  buildRuntimePayloadState() {
    const themes = this.getAllThemes();
    const mascots = this.getAllMascots();
    const avatars = this.getAllAvatars();

    const findTheme = (id) => themes.find((t) => t.id === id) || themes[0] || null;
    const chatTheme = findTheme(this.config.chatThemeId);
    const ideTheme = findTheme(this.config.ideThemeId);
    const mascot = mascots.find((m) => m.id === this.config.mascotId) || mascots[0] || null;
    const userAvatar = avatars.find((a) => a.id === this.config.userAvatarId) || null;
    const agentAvatar = avatars.find((a) => a.id === this.config.agentAvatarId) || null;

    return {
      config: this.config,
      chatTheme,
      ideTheme,
      mascot,
      appLogoUrl: (this.brandLogoPath && fs.existsSync(this.brandLogoPath))
        ? this.mediaServer.getUrl('brand:appicon')
        : '',
      userAvatarUrl: userAvatar ? userAvatar.mediaUrl : (chatTheme?.userAvatarUrl || ''),
      agentAvatarUrl: agentAvatar ? agentAvatar.mediaUrl : (chatTheme?.agentAvatarUrl || ''),
      mediaServerPort: this.mediaServer.port,
      ts: Date.now(),
    };
  }

  getFullStateForUI() {
    const themes = this.getAllThemes();
    const themeMap = new Map(themes.map((t) => [t.id, t]));
    const savedCombos = (this.library.savedCombos || []).map((c) => {
      const th = themeMap.get(c.themeId || c.snapshot?.chatThemeId);
      return {
        ...c,
        mediaUrl: th?.mediaUrl || '',
        posterUrl: th?.posterUrl || '',
        mediaType: th?.mediaType || 'image',
      };
    });
    const themeHistory = (this.library.themeHistory || [])
      .map((h) => {
        const th = themeMap.get(h.themeId);
        return th ? { ...h, theme: th } : null;
      })
      .filter(Boolean);

    const trashThemes = (this.library.trashThemes || []).map((t) => ({
      ...t,
      mediaUrl: t.filePath && fs.existsSync(t.filePath) ? this.mediaServer.getUrl(`theme:${t.id}`) : '',
    }));

    return {
      config: this.config,
      themes,
      trashThemes,
      mascots: this.getAllMascots(),
      avatars: this.getAllAvatars(),
      savedCombos,
      themeHistory,
      appLogoUrl: (this.brandLogoPath && fs.existsSync(this.brandLogoPath))
        ? this.mediaServer.getUrl('brand:appicon')
        : '',
      extraThemesDir: this.extraThemesDir,
      mediaServerPort: this.mediaServer.port,
    };
  }

  exportBackupJson() {
    return JSON.stringify({
      version: '2.0.0',
      exportedAt: new Date().toISOString(),
      config: this.config,
      userThemes: this.library.userThemes,
    }, null, 2);
  }

  importBackupJson(rawText) {
    const parsed = JSON.parse(rawText);
    if (!parsed || typeof parsed !== 'object') throw new Error('JSON không hợp lệ');
    if (parsed.config && typeof parsed.config === 'object') {
      this.saveConfig(parsed.config);
    }
    if (Array.isArray(parsed.userThemes)) {
      const paths = parsed.userThemes.map((t) => t && t.filePath).filter(Boolean);
      if (paths.length) this.importThemeFiles(paths, { copyIntoStudio: false });
    }
    return this.getFullStateForUI();
  }
}

module.exports = { StudioStore, createDefaultConfig };
