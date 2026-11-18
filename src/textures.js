import * as THREE from 'three';

// All textures are drawn on a 2D canvas, then used as a CanvasTexture.
// Keep canvases large (1024+) so text stays crisp on small meshes.

let maxAniso = 8;
export const setMaxAnisotropy = (n) => (maxAniso = n);

function makeCanvas(w, h) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return { canvas, ctx, tex };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function wrap(ctx, text, x, y, maxW, lineH, maxLines) {
  const words = (text || '').split(/\s+/);
  let line = '', lines = 0;
  for (let i = 0; i < words.length; i++) {
    const test = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(test).width > maxW && line) {
      if (++lines === maxLines) { ctx.fillText(line.replace(/.{0,2}$/, '…'), x, y); return; }
      ctx.fillText(line, x, y); y += lineH; line = words[i];
    } else line = test;
  }
  if (line) ctx.fillText(line, x, y);
}

const FONT = 'ui-rounded, Nunito, system-ui, sans-serif';

/** Monitor: pinned repos as cards (2 x 3 grid). 16:9 */
export function screenTexture(data) {
  const W = 1600, H = 900;
  const { ctx, tex } = makeCanvas(W, H);
  ctx.fillStyle = '#1e1b2e'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#a5b4fc'; ctx.font = `bold 52px ${FONT}`;
  ctx.fillText(`~/${data.profile.login} — pinned`, 60, 95);

  const cols = 2, gap = 30, cw = (W - 120 - gap) / cols, ch = 220;
  data.pinned.slice(0, 6).forEach((r, i) => {
    const x = 60 + (i % cols) * (cw + gap), y = 140 + Math.floor(i / cols) * (ch + 24);
    ctx.fillStyle = '#2a2640'; roundRect(ctx, x, y, cw, ch, 22); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = `bold 40px ${FONT}`; ctx.fillText(r.name, x + 28, y + 60, cw - 56);
    ctx.fillStyle = '#c7c3d9'; ctx.font = `28px ${FONT}`; wrap(ctx, r.description, x + 28, y + 108, cw - 56, 36, 2);
    ctx.fillStyle = r.color || '#888'; ctx.beginPath(); ctx.arc(x + 40, y + ch - 36, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c7c3d9'; ctx.font = `26px ${FONT}`;
    ctx.fillText(`${r.language || '—'}    ★ ${r.stars}    ⑂ ${r.forks}`, x + 62, y + ch - 27);
  });
  return tex;
}

/** Wall calendar: contribution heatmap. ~4.4:1 */
export function heatmapTexture(data) {
  const W = 2048, H = 470;
  const { ctx, tex } = makeCanvas(W, H);
  ctx.fillStyle = '#fffaf5'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#3b2f2a'; ctx.font = `bold 56px ${FONT}`;
  const weeks = data.calendar.weeks;
  ctx.fillText(weeks.length ? `${data.calendar.total} contributions this year` : 'contribution graph needs a GITHUB_TOKEN', 50, 80);

  const levels = ['#ebe3da', '#c6e48b', '#7bc96f', '#239a3b', '#196127'];
  const max = Math.max(1, ...weeks.flat().map((d) => d.c));
  const cell = Math.min((W - 100) / Math.max(weeks.length, 53), (H - 130) / 7), pad = cell * 0.15;
  weeks.forEach((w, wi) => w.forEach((d, di) => {
    const lvl = d.c === 0 ? 0 : Math.min(4, 1 + Math.floor((d.c / max) * 3.999));
    ctx.fillStyle = levels[lvl];
    roundRect(ctx, 50 + wi * cell, 110 + di * cell, cell - pad, cell - pad, 6); ctx.fill();
  }));
  return tex;
}

/** Poster: avatar, name, bio, stats. 3:4 */
export function posterTexture(data) {
  const W = 900, H = 1200, p = data.profile;
  const { ctx, tex } = makeCanvas(W, H);
  const draw = (img) => {
    ctx.fillStyle = '#fde2c8'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#f9c99d'; ctx.beginPath(); ctx.arc(W / 2, 360, 250, 0, Math.PI * 2); ctx.fill();
    if (img) {
      ctx.save(); ctx.beginPath(); ctx.arc(W / 2, 360, 220, 0, Math.PI * 2); ctx.clip();
      ctx.drawImage(img, W / 2 - 220, 140, 440, 440); ctx.restore();
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = '#3b2f2a'; ctx.font = `bold 78px ${FONT}`; ctx.fillText(p.name || p.login, W / 2, 720, W - 80);
    ctx.font = `44px ${FONT}`; ctx.fillStyle = '#8a6d5c'; ctx.fillText(`@${p.login}`, W / 2, 785);
    ctx.font = `36px ${FONT}`; ctx.fillStyle = '#5a4840'; wrap(ctx, p.bio, W / 2, 870, W - 120, 48, 3);
    ctx.font = `bold 40px ${FONT}`; ctx.fillStyle = '#3b2f2a';
    ctx.fillText(`${p.followers} followers · ${p.publicRepos} repos`, W / 2, 1110);
    ctx.textAlign = 'left';
    tex.needsUpdate = true;
  };
  draw(null);
  if (p.avatarUrl) {
    const img = new Image();
    img.crossOrigin = 'anonymous'; // avatars.githubusercontent.com sends CORS headers
    img.onload = () => draw(img);
    img.src = p.avatarUrl;
  }
  return tex;
}
