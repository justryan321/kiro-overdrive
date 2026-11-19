/* First-visit walkthrough: spotlights parts of the page one at a time. */
const KEY = 'ko-tour-done';
const STEPS = [
  { target: null, title: 'Welcome to Kiro Overdrive', body: 'A quick tour of how to find and install the team’s Kiro steering, skills and hooks. It takes about 30 seconds.' },
  { target: '#packages', title: 'Start with a package', body: 'Not sure what to install? Pick a level. Each package bundles a set of entries and installs them with one command.' },
  { target: '.search', title: 'Search', body: 'Type a name, tag or file name to narrow the list.' },
  { target: '#filters', title: 'Filter by purpose', body: 'Use these buttons to show only Safety, Agent Style, Team Updates and so on.' },
  { target: '.check', title: 'Recommended only', body: 'Tick this to see just the entries we suggest everyone starts with.' },
  { target: '#grid', title: 'Browse the entries', body: 'Entries are grouped by purpose. Click a card to open its details.' },
  { target: '#drawer', title: 'Details panel', body: 'Here you can read what an entry does, then use the Install, Test and File tabs to set it up and check it works.' },
  { target: null, title: 'You’re set', body: 'You can replay this tour any time with the Tour button at the top right.' },
];

let root = null;

function store(set) {
  try { if (set) localStorage.setItem(KEY, '1'); else return localStorage.getItem(KEY); } catch { /* storage blocked */ }
}

export function startTour() {
  if (root) return;
  let i = 0;
  const prevFocus = document.activeElement;

  const spot = document.createElement('div'); spot.className = 'tour-spot';
  const pop = document.createElement('div'); pop.className = 'tour-pop';
  pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-modal', 'true'); pop.setAttribute('aria-labelledby', 'tour-title'); pop.tabIndex = -1;
  const step = document.createElement('div'); step.className = 'tour-step';
  const h = document.createElement('h2'); h.id = 'tour-title';
  const p = document.createElement('p');
  const foot = document.createElement('div'); foot.className = 'tour-foot';
  const skip = btn('Skip tutorial', 'tour-skip');
  const back = btn('Back', 'btn sm');
  const next = btn('Next', 'btn primary sm');
  const nav = document.createElement('div'); nav.className = 'tour-nav'; nav.append(back, next);
  foot.append(skip, nav);
  pop.append(step, h, p, foot);
  root = document.createElement('div'); root.className = 'tour';
  root.append(spot, pop);
  document.body.append(root);

  function btn(text, cls) { const b = document.createElement('button'); b.type = 'button'; b.className = cls; b.textContent = text; return b; }

  function close() {
    store(true);
    window.removeEventListener('resize', place);
    window.removeEventListener('scroll', place, true);
    document.removeEventListener('keydown', onKey, true);
    root.remove(); root = null;
    if (prevFocus && prevFocus.focus) prevFocus.focus();
  }

  function targetEl(s) {
    if (!s.target) return null;
    const n = document.querySelector(s.target);
    return n && !n.hidden && n.getClientRects().length ? n : null;
  }

  function place() {
    const s = STEPS[i]; const t = targetEl(s);
    if (!t) {
      spot.classList.add('none');
      pop.style.top = '50%'; pop.style.left = '50%'; pop.style.transform = 'translate(-50%, -50%)';
      return;
    }
    const r = t.getBoundingClientRect(); const pad = 6;
    spot.classList.remove('none');
    Object.assign(spot.style, { top: r.top - pad + 'px', left: r.left - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
    pop.style.transform = 'none';
    const pw = pop.offsetWidth, ph = pop.offsetHeight, vw = window.innerWidth, vh = window.innerHeight, gap = 14;
    let top = r.bottom + gap;
    if (top + ph > vh - 8) top = r.top - ph - gap;
    if (top < 8) top = Math.min(Math.max(8, r.top + 12), vh - ph - 8); // target is huge: overlay it
    const left = Math.min(Math.max(8, r.left), vw - pw - 8);
    pop.style.top = top + 'px'; pop.style.left = left + 'px';
  }

  function show() {
    const s = STEPS[i]; const t = targetEl(s);
    if (t) t.scrollIntoView({ block: 'center', inline: 'nearest' });
    step.textContent = `Step ${i + 1} of ${STEPS.length}`;
    h.textContent = s.title; p.textContent = s.body;
    back.hidden = i === 0;
    next.textContent = i === STEPS.length - 1 ? 'Done' : i === 0 ? 'Start' : 'Next';
    skip.hidden = i === STEPS.length - 1;
    place();
    next.focus({ preventScroll: true });
  }

  function onKey(ev) {
    if (ev.key === 'Escape') { ev.preventDefault(); close(); }
    else if (ev.key === 'ArrowRight') { ev.preventDefault(); next.click(); }
    else if (ev.key === 'ArrowLeft' && i > 0) { ev.preventDefault(); back.click(); }
    else if (ev.key === 'Tab') { // keep focus inside the dialog
      const f = [...pop.querySelectorAll('button')].filter(b => !b.hidden);
      const first = f[0], last = f[f.length - 1];
      if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
      else if (!pop.contains(document.activeElement)) { ev.preventDefault(); first.focus(); }
    }
  }

  skip.onclick = close;
  back.onclick = () => { if (i > 0) { i--; show(); } };
  next.onclick = () => { if (i >= STEPS.length - 1) close(); else { i++; show(); } };
  window.addEventListener('resize', place);
  window.addEventListener('scroll', place, true);
  document.addEventListener('keydown', onKey, true);
  show();
}

export function initTour() {
  const b = document.getElementById('tour-btn');
  if (b) b.onclick = startTour;
  if (!store()) setTimeout(startTour, 600); // let the first render finish
}
