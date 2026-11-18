import gsap from 'gsap';

const el = document.getElementById('modal');
const card = el.querySelector('.modal-card');
const body = el.querySelector('.modal-body');
let isOpen = false;
export const modalOpen = () => isOpen;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const safeUrl = (u) => (/^https?:\/\//.test(u || '') ? esc(u) : '#');

const repoCard = (r) => `
  <a class="repo" href="${safeUrl(r.url)}" target="_blank" rel="noopener">
    <b>${esc(r.name)}</b>
    <div class="muted">${esc(r.description)}</div>
    <div class="meta"><span class="dot" style="background:${esc(r.color || '#9ca3af')}"></span>${esc(r.language || '—')} · ★ ${r.stars} · ⑂ ${r.forks}</div>
  </a>`;

export const views = {
  monitor: (d) => `<h2>Pinned projects</h2><p class="muted">what I'm proud of</p>${d.pinned.map(repoCard).join('')}`,

  poster: ({ profile: p }) => `
    ${p.avatarUrl ? `<img class="avatar" src="${safeUrl(p.avatarUrl)}" alt="">` : ''}
    <h2>${esc(p.name || p.login)}</h2>
    <p class="muted">@${esc(p.login)}${p.location ? ` · ${esc(p.location)}` : ''}</p>
    <p style="margin-top:10px">${esc(p.bio)}</p>
    <div class="stats"><span><b>${p.followers}</b>followers</span><span><b>${p.following}</b>following</span><span><b>${p.publicRepos}</b>repos</span></div>
    <p><a href="${safeUrl(p.url)}" target="_blank" rel="noopener">GitHub ↗</a>
    ${p.website ? ` · <a href="${safeUrl(/^https?:/.test(p.website) ? p.website : 'https://' + p.website)}" target="_blank" rel="noopener">website ↗</a>` : ''}</p>`,

  calendar: (d) => {
    const days = d.calendar.weeks.flat();
    const best = days.reduce((a, b) => (b.c > (a?.c ?? -1) ? b : a), null);
    let streak = 0, cur = 0;
    for (const x of days) { cur = x.c ? cur + 1 : 0; streak = Math.max(streak, cur); }
    return `<h2>Contributions</h2>
      <div class="stats"><span><b>${d.calendar.total}</b>this year</span><span><b>${streak}</b>day best streak</span>
      ${best ? `<span><b>${best.c}</b>on ${esc(best.d)}</span>` : ''}</div>
      <p class="muted">updated ${esc(new Date(d.fetchedAt).toLocaleDateString())}</p>`;
  },

  book: (d, repo) => `${repoCard(repo)}<p class="muted" style="margin-top:12px">${d.repos.length} repos on the shelf · spine color = language, height = stars</p>`,
};

export function openModal(html) {
  body.innerHTML = html;
  el.classList.add('open'); el.setAttribute('aria-hidden', 'false'); isOpen = true;
  gsap.fromTo(card, { scale: 0.85, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(1.7)' });
}

export function closeModal() {
  gsap.to(card, { scale: 0.85, opacity: 0, duration: 0.2, onComplete: () => {
    el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); isOpen = false;
  } });
}

el.addEventListener('click', (e) => { if (e.target === el || e.target.closest('.modal-close')) closeModal(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape' && isOpen) closeModal(); });
