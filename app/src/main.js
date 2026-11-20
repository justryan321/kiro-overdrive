import { initTour } from './tutorial.js';

const CATEGORIES = [
  { id: 'steering', label: 'Steering', plural: 'Steering' },
  { id: 'skill', label: 'Skill', plural: 'Skills' },
  { id: 'hook', label: 'Hook', plural: 'Hooks' },
  { id: 'memory', label: 'Kit', plural: 'Kits' },
  { id: 'mcp', label: 'MCP Server', plural: 'MCP Servers' },
  { id: 'spec', label: 'Spec Template', plural: 'Spec Templates' },
  { id: 'agent', label: 'Custom Agent', plural: 'Custom Agents' },
];
const catOf = id => CATEGORIES.find(c => c.id === id) || { id: 'other', label: 'Other', plural: 'Other' };
const PURPOSES = [
  { id: 'safety', label: 'Safety', desc: 'Guardrails that stop destructive or risky actions before they happen.' },
  { id: 'style', label: 'Agent Style', desc: 'How the agent works and talks: personalities, teaching mode and role packs.' },
  { id: 'plan', label: 'Plan & build', desc: 'Turn tickets into specs and keep new code consistent from the first line.' },
  { id: 'quality', label: 'Quality & review', desc: 'Catch wrong numbers, stale docs and broken setup before anyone else does.' },
  { id: 'comms', label: 'Team Updates', desc: 'Standups, handoffs, changelogs and paste-ready formats for Jira, Teams and Confluence.' },
  { id: 'onboard', label: 'Onboarding & memory', desc: 'Get new teammates productive fast and keep what the team learns.' },
];
const OTHER_PURPOSE = { id: 'other', label: 'Other', desc: 'Entries that don’t have a purpose yet.' };
const purposeOf = e => PURPOSES.find(p => p.id === e.purpose) || OTHER_PURPOSE;

const store = { get(k, d) { try { return localStorage.getItem(k) || d; } catch { return d; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
const guessOS = /mac|iphone|ipad/i.test((navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || navigator.userAgent) ? 'mac' : 'win';
const state = { os: store.get('ko-os', guessOS), scope: store.get('ko-scope', 'project'), method: store.get('ko-method', 'terminal'), tab: 'overview', entries: [], filter: 'all', q: '', selected: location.hash.slice(1) || null, closed: false, loaded: false };
const $ = id => document.getElementById(id);
const el = (tag, props = {}, kids = []) => { const n = document.createElement(tag); Object.assign(n, props); for (const k of [].concat(kids)) if (k != null && k !== false) n.append(k); return n; };
const svgIcon = d => { const ns = 'http://www.w3.org/2000/svg'; const s = document.createElementNS(ns, 'svg'); s.setAttribute('width', '14'); s.setAttribute('height', '14'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2.2'); s.setAttribute('aria-hidden', 'true'); const p = document.createElementNS(ns, 'path'); p.setAttribute('d', d); s.append(p); return s; };
const isHashName = t => /^#/.test((t || '').trim());
const starIcon = (size = 14) => { const ns = 'http://www.w3.org/2000/svg'; const s = document.createElementNS(ns, 'svg'); s.setAttribute('width', String(size)); s.setAttribute('height', String(size)); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'currentColor'); s.setAttribute('aria-hidden', 'true'); const p = document.createElementNS(ns, 'path'); p.setAttribute('d', 'M12 2.8l2.85 5.78 6.38.93-4.62 4.5 1.09 6.35L12 17.36l-5.7 3 1.09-6.35-4.62-4.5 6.38-.93z'); s.append(p); return s; };
const byRec = (a, b) => (b.recommended ? 1 : 0) - (a.recommended ? 1 : 0);

function toast(text) { const t = $('toast'); t.textContent = text; t.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('show'), 1800); }
async function copyText(text, ok) { try { await navigator.clipboard.writeText(text); toast(ok); } catch { toast('Copy was blocked. Select the text and copy it.'); } }

function visible() {
  const q = state.q.trim().toLowerCase();
  return state.entries.filter(e => (!state.recOnly || e.recommended) && (state.filter === 'all' || purposeOf(e).id === state.filter) &&
    (!q || [purposeOf(e).label, catOf(e.category).label, e.title, e.summary, (e.tags || []).join(' '), e.content, e.path, e.inclusion].join(' ').toLowerCase().includes(q)));
}

/* ---------- header, filters, grid ---------- */
function renderCount() {
  const n = state.entries.length;
  $('count-line').textContent = state.loaded ? `${n} ${n === 1 ? 'entry' : 'entries'}` : '';
}

function renderFilters() {
  const box = $('filters'); box.replaceChildren();
  const base = state.entries.filter(e => !state.recOnly || e.recommended);
  const counts = id => base.filter(e => purposeOf(e).id === id).length;
  const opts = [{ id: 'all', label: 'All', n: base.length }, ...[...PURPOSES, OTHER_PURPOSE].map(p => ({ ...p, n: counts(p.id) })).filter(p => p.n > 0 || state.filter === p.id)];
  opts.forEach(c => {
    const b = el('button', { type: 'button' }, [c.label, el('span', { className: 'n', textContent: String(c.n) })]);
    b.setAttribute('aria-pressed', String(state.filter === c.id));
    b.onclick = () => { state.filter = c.id; render(); };
    box.append(b);
  });
}

function renderGrid() {
  const grid = $('grid'); grid.replaceChildren();
  if (!state.loaded) { grid.append(el('div', { className: 'empty', textContent: 'Loading the directory…' })); return; }
  const items = visible();
  if (!items.length) {
    grid.append(el('div', { className: 'empty', textContent: state.entries.length ? 'Nothing matches that search or filter.' : 'The directory is empty. Add the first entry.' }));
    return;
  }
  const groups = [...PURPOSES, OTHER_PURPOSE].map(p => ({ p, items: items.filter(e => purposeOf(e).id === p.id).sort(byRec) })).filter(g => g.items.length);
  for (const g of groups) {
    const cards = el('div', { className: 'grid' });
    g.items.forEach(e => cards.append(cardFor(e)));
    grid.append(el('section', { className: 'group', ariaLabel: g.p.label }, [
      el('div', { className: 'group-head' }, [el('h2', { textContent: g.p.label }), el('span', { className: 'group-n', textContent: String(g.items.length) })]),
      el('p', { className: 'group-desc', textContent: g.p.desc }),
      cards
    ]));
  }
}

function cardFor(e) {
  const card = el('button', { type: 'button', className: 'card' });
  card.setAttribute('aria-current', String(e.id === state.selected));
  const title = el('span', { className: 'card-title' + (isHashName(e.title) ? ' mono' : ''), textContent: e.title || 'Untitled' });
  const name = el('span', { className: 'card-name' }, [e.recommended ? el('span', { className: 'star', title: 'Recommended' }, [starIcon(15)]) : null, title]);
  if (e.recommended) card.setAttribute('aria-label', (e.title || 'Untitled') + ', recommended');
  card.append(
    el('div', { className: 'card-head' }, [name, el('span', { className: 'card-type', textContent: catOf(e.category).label })]),
    el('p', { textContent: e.summary || '' }),
    (e.tags || []).length ? el('div', { className: 'tags' }, (e.tags || []).slice(0, 3).map(t => el('span', { className: 'tag', textContent: t }))) : null
  );
  card.onclick = () => select(e.id);
  return card;
}

function select(id) {
  state.selected = id; state.closed = false;
  history.replaceState(null, '', '#' + id);
  renderPackages(); renderGrid(); renderDrawer();
  if (window.innerWidth <= 1060) $('drawer').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- drawer ---------- */
function shortInclusion(e) {
  if (isKit(e)) return 'Kit';
  const inc = (e.inclusion || '').toLowerCase();
  if (inc.startsWith('always')) return 'always';
  if (inc.startsWith('manual')) return 'manual';
  if (inc.startsWith('filematch')) return 'fileMatch';
  return (e.inclusion || '').split('·')[0].trim();
}

function renderDrawer() {
  const d = $('drawer'); d.replaceChildren();
  const pk = selectedPkg(); if (pk) { renderPackageDrawer(d, pk); return; }
  let e = state.entries.find(x => x.id === state.selected);
  if (!e && !state.closed && state.loaded && window.innerWidth > 1060) { e = visible()[0]; if (e) state.selected = e.id; }
  if (!e) {
    d.append(el('div', { className: 'placeholder' }, [el('strong', { textContent: state.loaded ? 'Select an entry' : 'Loading…' }), state.loaded ? 'Pick a card to see what it does, how to install it, and how to test it.' : '']));
    return;
  }
  const cat = catOf(e.category);
  const inc = shortInclusion(e);
  const purpose = purposeOf(e);
  const close = el('button', { type: 'button', className: 'icon-btn', title: 'Close' }, [svgIcon('M6 6l12 12M18 6 6 18')]);
  close.setAttribute('aria-label', 'Close details');
  close.onclick = () => { state.selected = null; state.closed = true; history.replaceState(null, '', location.pathname + location.search); renderGrid(); renderDrawer(); };
  d.append(el('div', { className: 'drawer-head' }, [
    el('div', {}, [el('div', { className: 'eyebrow', textContent: purpose.label + ' · ' + cat.label + (inc && inc !== 'Kit' ? ' · ' + inc : '') }), el('h2', { className: isHashName(e.title) ? 'mono' : '', textContent: e.title || 'Untitled' })]),
    close
  ]));
  if (e.recommended) d.append(el('div', {}, [el('span', { className: 'rec-pill' }, [starIcon(12), 'Recommended for everyone'])]));
  if (e.summary) d.append(el('p', { className: 'summary', textContent: e.summary }));

  const actions = el('div', { className: 'actions' });
  if (!isKit(e)) {
    const cf = el('button', { type: 'button', className: 'btn primary sm', textContent: 'Copy file' });
    cf.onclick = () => copyText(e.content || '', 'File copied');
    actions.append(cf);
    if (e.path) { const cp = el('button', { type: 'button', className: 'btn sm', textContent: 'Copy path' }); cp.onclick = () => copyText(e.path, 'Path copied'); actions.append(cp); }
  }
  actions.append(el('span', { className: 'spacer' }));
  d.append(actions);

  const facts = el('dl', { className: 'facts' });
  const fact = (k, v, mono) => v && facts.append(el('div', { className: 'fact' }, [el('dt', { textContent: k }), el('dd', { className: mono ? 'mono' : '', textContent: v })]));
  if (isKit(e)) fact('Contents', kitFiles(e).length + ' files');
  else fact('Install path', e.path, true);
  if (!isKit(e)) fact(e.category === 'hook' ? 'Trigger' : 'Loads', e.inclusion);
  fact('Scope', scopeLabel(e));
  fact('Updated', e.updatedAt ? new Date(e.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '');
  if (facts.childElementCount) d.append(facts);

  const tabs = el('div', { className: 'tabs', role: 'tablist' });
  tabs.setAttribute('aria-label', 'Entry views');
  [['overview', 'Overview'], ['install', 'Install'], ['test', 'Test'], ['file', isKit(e) ? 'Files' : 'File']].forEach(([id, label]) => {
    const t = el('button', { type: 'button', className: 'tab', textContent: label, id: 'tab-' + id });
    t.setAttribute('role', 'tab'); t.setAttribute('aria-selected', String(state.tab === id));
    t.onclick = () => { state.tab = id; renderDrawer(); };
    tabs.append(t);
  });
  d.append(tabs);

  if (state.tab === 'file') d.append(renderFile(e));
  else if (state.tab === 'install') d.append(renderInstall(e));
  else if (state.tab === 'test') d.append(renderTest(e));
  else d.append(renderOverview(e));

  if (e.tags && e.tags.length) {
    d.append(el('div', { className: 'tags' }, e.tags.map(t => { const b = el('button', { type: 'button', className: 'tag', textContent: t, title: 'Show everything tagged ' + t }); b.onclick = () => { $('search').value = t; state.q = t; renderGrid(); }; return b; })));
  }
}

function scopeLabel(e) {
  if (isKit(e)) return 'Repo + your global folder';
  if (/^\s*(~|%USERPROFILE%)/.test(e.path || '') || e.scope === 'global') return 'Personal (all your projects)';
  if (e.category === 'mcp') return 'MCP config';
  return 'This repo (commit it)';
}

function codeBlock(label, text, copyLabel, tall) {
  const copy = el('button', { type: 'button', className: 'copy', textContent: copyLabel || 'Copy' });
  copy.onclick = () => copyText(text, 'Copied');
  return el('div', { className: 'codeblock' + (tall ? ' tall' : '') }, [el('div', { className: 'codeblock-head' }, [el('span', { textContent: label }), copy]), el('pre', { textContent: text })]);
}

function renderFile(e) {
  const box = el('div', { className: 'panel' });
  if (isKit(e)) kitFiles(e).forEach(f => box.append(codeBlock(f.path, f.content, 'Copy')));
  else box.append(codeBlock(fileName(e), e.content || '(no file contents)', 'Copy', true));
  return box;
}

/* ---------- overview ---------- */
function treeFor(path) {
  const pre = el('pre', { className: 'tree' });
  const first = (path || '').split(/\s+or\s+|\s{2,}/)[0].trim();
  if (!first) { pre.append(el('span', { className: 'note', textContent: 'No install path given.' })); return pre; }
  const home = first.startsWith('~') || first.startsWith('%USERPROFILE%');
  const parts = first.replace(/^~[\\/]?|^%USERPROFILE%[\\/]?/, '').split(/[\\/]/).filter(Boolean);
  pre.append(el('span', { className: 'note', textContent: home ? 'your home folder (~)/\n' : 'your-repo/\n' }));
  parts.forEach((p, i) => {
    const last = i === parts.length - 1;
    pre.append('   '.repeat(i) + '└─ ');
    const isFile = last && /\.[a-z0-9]+$/i.test(p);
    pre.append(el('span', { className: last ? 'hit' : '', textContent: p + (isFile ? '' : '/') }));
    pre.append('\n');
  });
  if (home) pre.append(el('span', { className: 'note', textContent: '\nApplies to every project on this machine.' }));
  return pre;
}

function loadInfo(e) {
  if (isKit(e)) return ['bundle', inlineMd(e.inclusion || 'Installs several files together.')];
  const inc = (e.inclusion || '').toLowerCase();
  const name = (e.inclusion || '').match(/#[\w-]+/)?.[0] || (e.path ? '#' + e.path.split(/[\\/]/).pop().replace(/\.md$/, '') : '');
  const code = t => el('code', { textContent: t });
  if (e.category === 'hook') return ['trigger', ['Runs by itself when its trigger fires', e.inclusion ? [' (', code(e.inclusion), ')'] : '', '. File hooks fire on the agent’s edits, not on edits you type yourself.'].flat()];
  if (e.category === 'mcp') return ['tools', ['Once the server is added to ', code('.kiro/settings/mcp.json'), ', its tools are available to the agent.']];
  if (e.category === 'agent') return ['select', ['Pick this agent in Kiro to use its prompt, tools and resources.']];
  if (inc.includes('always')) return ['always', ['Loaded into every Kiro chat automatically.']];
  if (inc.includes('manual')) return ['manual', ['Off until you ask for it. Type ', code(name || '#name'), ' in the chat box or pick it from the ', code('/'), ' menu, and it applies to that conversation.']];
  if (inc.includes('filematch')) return ['fileMatch', ['Loads automatically when you work on files matching its ', code('fileMatchPattern'), '.']];
  if (inc.includes('auto')) return ['auto', ['Loads when your request matches the file’s description.']];
  if (e.category === 'steering') return ['always', ['No inclusion set, so Kiro treats it as ', code('always'), '.']];
  return ['', [e.inclusion || 'See the file for how it’s used.']];
}

function kitTree(e) {
  const pre = el('pre', { className: 'tree' }); const groups = new Map();
  kitFiles(e).forEach(f => { const home = /^~|^%USERPROFILE%/.test(f.path); const p = f.path.replace(/^~[\\/]?|^%USERPROFILE%[\\/]?/, ''); const i = p.lastIndexOf('/');
    const key = (home ? '~/' : 'your-repo/') + p.slice(0, i + 1); if (!groups.has(key)) groups.set(key, { home, files: [] }); groups.get(key).files.push(p.slice(i + 1)); });
  for (const [dir, g] of groups) {
    pre.append(dir, el('span', { className: 'note', textContent: g.home ? '   (every project)\n' : '   (this repo)\n' }));
    g.files.forEach((f, i) => { pre.append(i === g.files.length - 1 ? '   └─ ' : '   ├─ '); pre.append(el('span', { className: 'hit', textContent: f })); pre.append('\n'); });
  }
  return pre;
}

function renderOverview(e) {
  const box = el('div', { className: 'panel' });
  const [badge, words] = loadInfo(e);
  const load = el('div', { className: 'load' });
  if (badge) load.append(el('span', { className: 'badge', textContent: badge }));
  load.append(el('p', {}, words));
  box.append(el('div', { className: 'section' }, [el('div', { className: 'section-title', textContent: 'When Kiro uses it' }), load]));
  box.append(el('div', { className: 'section' }, [el('div', { className: 'section-title', textContent: 'Where it goes' }), el('div', { className: 'box' }, [isKit(e) ? kitTree(e) : treeFor(e.path)])]));

  const prompt = (e.examplePrompt || '').trim();
  if (prompt || e.exampleReply) {
    const ctx = (e.inclusion || '').match(/#[\w-]+/)?.[0];
    const head = el('div', { className: 'chat-head' }, [el('span', { textContent: 'Example in Kiro chat' }), ctx ? el('code', { textContent: ctx }) : el('span', { textContent: 'Illustrative' })]);
    const body = el('div', { className: 'chat-body' });
    const userText = [ctx, prompt].filter(Boolean).join(' ');
    if (userText) body.append(el('div', { className: 'msg-user', textContent: userText }));
    if (e.exampleReply) body.append(el('div', { className: 'msg-agent' }, [el('span', { className: 'avatar', textContent: 'K', ariaHidden: 'true' }), el('pre', { textContent: e.exampleReply })]));
    box.append(el('div', { className: 'section' }, [el('div', { className: 'section-title', textContent: 'What it looks like' }), el('div', { className: 'chat' }, [head, body])]));
  } else if (e.category !== 'guide') {
    box.append(el('div', { className: 'muted-box', textContent: 'No example for this entry yet.' }));
  }
  return box;
}

/* ---------- install ---------- */
function fileName(e) { return (e.path || '').split(/\s+or\s+|\s{2,}/)[0].split(/[\\/]/).pop() || 'the-file.md'; }
function target(e, explicitPath) {
  if (e.category === 'mcp' && !explicitPath) return null;
  let p = (explicitPath || e.path || '').split(/\s+or\s+|\s{2,}/)[0].trim();
  if (!p && e.category === 'steering') p = '.kiro/steering/' + (e.id || 'steering') + '.md';
  if (!p || !/\.[a-z0-9]+$/i.test(p)) return null;
  const homePath = /^~|^%USERPROFILE%/.test(p);
  p = p.replace(/^%USERPROFILE%[\\/]?|^~[\\/]?/, '');
  const global = homePath || e.scope === 'global' || (e.scope !== 'project' && !explicitPath && state.scope === 'global');
  const parts = p.split(/[\\/]/).filter(Boolean);
  const file = parts.pop();
  return { dirParts: parts, file, global };
}
function displayDir(t) {
  const rel = t.dirParts.join(state.os === 'win' ? '\\' : '/');
  if (state.os === 'win') return (t.global ? '%USERPROFILE%\\' : '') + rel + '\\';
  return (t.global ? '~/' : '') + rel + '/';
}
function fileBlock(content, t) {
  const body = (content || '').replace(/\r\n/g, '\n').replace(/\n*$/, '\n');
  if (state.os === 'mac') {
    const dir = (t.global ? '"$HOME/' : '"') + t.dirParts.join('/') + '"';
    let eof = 'KIRO_EOF'; while (body.includes(eof)) eof += '_';
    return [
      `dir=${dir}; f="$dir/${t.file}"`,
      `mkdir -p "$dir" && { [ -f "$f" ] && cp "$f" "$f.bak"; true; }`,
      `cat > "$f" <<'${eof}'`,
      body + eof,
      `echo "Installed: $f"`
    ].join('\n');
  }
  const dir = t.global ? `Join-Path $HOME '${t.dirParts.join('\\')}'` : `'${t.dirParts.join('\\')}'`;
  const safe = body.replace(/^'@/gm, " '@");
  return [
    `$dir = ${dir}; New-Item -ItemType Directory -Force -Path $dir | Out-Null`,
    `$f = Join-Path (Resolve-Path $dir) '${t.file}'; if (Test-Path $f) { Copy-Item $f "$f.bak" -Force }`,
    `$content = @'`,
    safe + `'@`,
    `[IO.File]::WriteAllText($f, $content)  # UTF-8, no BOM, so the front matter stays first`,
    `Write-Host "Installed: $f"`
  ].join('\n');
}
function isKit(e) { return Array.isArray(e && e.files) && e.files.length > 0; }
function kitFiles(e) { return (Array.isArray(e.files) ? e.files : []).filter(f => f && f.path && typeof f.content === 'string'); }
function cmt(text) { return state.os === 'mac' ? ': ' + shq(text) : '# ' + text; }
function shq(x) { return "'" + String(x).replace(/'/g, "'\\''") + "'"; }
function psq(x) { return "'" + String(x).replace(/'/g, "''") + "'"; }
function updateBlock(content, t) {
  const body = (content || '').replace(/\r\n/g, '\n').replace(/\n*$/, '\n');
  if (state.os === 'mac') {
    const dir = (t.global ? '"$HOME/' : '"') + t.dirParts.join('/') + '"';
    let eof = 'KIRO_EOF'; while (body.includes(eof)) eof += '_';
    return [
      `dir=${dir}; f="$dir/${t.file}"`,
      `if [ -e "$f" ]; then echo "Kept (already there): $f"; else`,
      `mkdir -p "$dir"`,
      `cat > "$f" <<'${eof}'`,
      body + eof,
      `echo "Added: $f"; fi`
    ].join('\n');
  }
  const dir = t.global ? `Join-Path $HOME '${t.dirParts.join('\\')}'` : `'${t.dirParts.join('\\')}'`;
  const safe = body.replace(/^'@/gm, " '@");
  return [
    `$dir = ${dir}; New-Item -ItemType Directory -Force -Path $dir | Out-Null`,
    `$f = Join-Path (Resolve-Path $dir) '${t.file}'`,
    `if (Test-Path $f) { Write-Host "Kept (already there): $f" } else {`,
    `$content = @'`,
    safe + `'@`,
    `[IO.File]::WriteAllText($f, $content); Write-Host "Added: $f" }`
  ].join('\n');
}
function patchBlock(p, t) {
  if (state.os === 'mac') {
    const f = (t.global ? '"$HOME/' : '"') + t.dirParts.join('/') + '/' + t.file + '"';
    return [
      `f=${f}; after=${shq(p.after)}; line=${shq(p.line)}`,
      `if grep -qxF -- "$line" "$f"; then echo "Already up to date: ${t.file}";`,
      `elif grep -qxF -- "$after" "$f"; then awk -v a="$after" -v l="$line" '{print} $0==a{print l}' "$f" > "$f.tmp" && mv "$f.tmp" "$f" && echo "Updated: ${t.file} (added 1 line)";`,
      `else echo "Couldn't find the \\"$after\\" heading in ${t.file}. Add this line yourself: $line"; fi`
    ].join('\n');
  }
  const fp = t.global ? `Join-Path $HOME '${t.dirParts.join('\\')}\\${t.file}'` : `'${t.dirParts.join('\\')}\\${t.file}'`;
  return [
    `$f = ${fp}; $after = ${psq(p.after)}; $line = ${psq(p.line)}`,
    `$c = [IO.File]::ReadAllText((Resolve-Path $f)); $nl = if ($c.Contains("\`r\`n")) { "\`r\`n" } else { "\`n" }`,
    `if ($c.Contains($line)) { Write-Host "Already up to date: ${t.file}" }`,
    `elseif ($c.Contains($after + $nl)) { [IO.File]::WriteAllText((Resolve-Path $f), $c.Replace($after + $nl, $after + $nl + $line + $nl)); Write-Host "Updated: ${t.file} (added 1 line)" }`,
    `else { Write-Host "Couldn't find the '$after' heading in ${t.file}. Add this line yourself: $line" }`
  ].join('\n');
}
function buildUpdateCommand(e) {
  const lines = [cmt(`${e.title}: update. Adds missing files only; your existing files are kept as they are.`)];
  kitFiles(e).forEach(f => lines.push('', cmt(f.path), updateBlock(f.content, target(e, f.path))));
  (Array.isArray(e.updatePatches) ? e.updatePatches : []).forEach(p => { if (p && p.path && p.after && p.line) lines.push('', cmt(`add a missing line to ${p.path}`), patchBlock(p, target(e, p.path))); });
  return lines.join('\n');
}
function buildCommand(e, t) {
  if (!isKit(e)) return fileBlock(e.content, t);
  const files = kitFiles(e);
  const needsRepo = files.some(f => !/^~|^%USERPROFILE%/.test(f.path));
  const lines = [cmt(`${e.title}: installs ${files.length} files${needsRepo ? '. Run from your repo’s root folder.' : '.'}`)];
  files.forEach(f => lines.push('', cmt(f.path), fileBlock(f.content, target(e, f.path))));
  return lines.join('\n');
}
function seg(options, value, onPick, label, cls) {
  const s = el('div', { className: 'seg small ' + (cls || '') }); s.setAttribute('role', 'group'); s.setAttribute('aria-label', label);
  options.forEach(([v, text]) => {
    const b = el('button', { type: 'button', textContent: text }); b.setAttribute('aria-pressed', String(v === value));
    b.onclick = () => onPick(v); s.append(b);
  });
  return s;
}
const termKeys = () => [el('kbd', { textContent: 'Ctrl' }), ' + ', el('kbd', { textContent: '`' })];

function renderInstall(e) {
  const box = el('div', { className: 'panel' });
  const kit = isKit(e);
  const fixedScope = kit || e.scope || /^\s*(~|%USERPROFILE%)/.test(e.path || '');
  const t = kit ? {} : target(e);
  const canRun = kit ? true : !!(t && e.content);
  let method = canRun ? state.method : 'manual';
  if (method === 'update' && !kit) method = 'terminal';

  const controls = el('div', { className: 'inst-controls' });
  controls.append(seg([['win', 'Windows'], ['mac', 'Mac']], state.os, v => { state.os = v; store.set('ko-os', v); renderDrawer(); }, 'Operating system', 'dark'));
  if (!fixedScope && e.category !== 'mcp') controls.append(seg([['project', 'This repo'], ['global', 'All my projects']], state.scope, v => { state.scope = v; store.set('ko-scope', v); renderDrawer(); }, 'Install for'));
  if (canRun) controls.append(seg(kit ? [['terminal', 'Install'], ['update', 'Update'], ['manual', 'Manual']] : [['terminal', 'Terminal'], ['manual', 'Manual']], method, v => { state.method = v; store.set('ko-method', v); renderDrawer(); }, 'Install method'));
  box.append(controls);

  const shell = state.os === 'mac' ? 'Terminal (bash / zsh)' : 'PowerShell';
  if (method === 'update') {
    box.append(el('div', { className: 'inst-head' }, [el('h3', { textContent: 'Update an existing install' })]));
    box.append(el('p', { style: 'margin:0;color:var(--muted)', textContent: 'Adds files that are missing and never overwrites yours. Use it if you installed before a file was added.' }));
    box.append(el('ol', { className: 'steps' }, [
      el('li', {}, [el('span', {}, ['Open the repo in Kiro, then open a terminal: ', ...termKeys(), '.'])]),
      el('li', {}, [el('span', {}, ['Paste the command and press ', el('kbd', { textContent: 'Enter' }), '.'])]),
      el('li', {}, [el('span', {}, [el('code', { textContent: 'Added:' }), ' marks new files, ', el('code', { textContent: 'Kept:' }), ' files you already had, ', el('code', { textContent: 'Updated:' }), ' a file that gained one missing line.'])]),
    ]));
    box.append(codeBlock(shell, buildUpdateCommand(e), 'Copy command'));
  } else if (method === 'terminal') {
    const needsRepo = kit ? kitFiles(e).some(f => !/^~|^%USERPROFILE%/.test(f.path)) : !t.global;
    box.append(el('div', { className: 'inst-head' }, [el('h3', { textContent: 'Run in the Kiro terminal' })]));
    box.append(el('ol', { className: 'steps' }, [
      el('li', {}, [el('span', {}, [needsRepo ? 'Open your repo in Kiro, then open a terminal: ' : 'Open any project in Kiro, then open a terminal: ', ...termKeys(), '.'])]),
      el('li', {}, [el('span', {}, ['Paste the command and press ', el('kbd', { textContent: 'Enter' }), '.'])]),
      el('li', {}, [el('span', {}, ['You should see ', el('code', { textContent: 'Installed:' }), ' and the path. A file that was already there is kept as ', el('code', { textContent: '.bak' }), '.'])]),
    ]));
    box.append(codeBlock(shell, buildCommand(e, t), 'Copy command'));
  } else {
    box.append(el('div', { className: 'inst-head' }, [el('h3', { textContent: 'Do it by hand' })]));
    const ol = el('ol', { className: 'steps' });
    if (kit) {
      kitFiles(e).forEach(f => {
        const ft = target(e, f.path);
        const cp = el('button', { type: 'button', className: 'btn sm', textContent: 'Copy' });
        cp.onclick = () => copyText(f.content, 'Copied ' + ft.file);
        ol.append(el('li', {}, [el('span', { className: 'manual-row' }, ['Save ', el('code', { textContent: ft.file }), ' in ', el('code', { textContent: displayDir(ft) }), cp])]));
      });
    } else if (t) {
      ol.append(
        el('li', {}, [el('span', {}, ['Choose ', el('b', { textContent: 'Copy file' }), ' above.'])]),
        el('li', {}, [el('span', {}, ['Create the folder ', el('code', { textContent: displayDir(t) }), t.global ? '' : ' in your repo root', '.'])]),
        el('li', {}, [el('span', {}, ['Save it there as ', el('code', { textContent: t.file }), '.'])]));
    } else if (e.category === 'mcp') {
      const cfg = state.os === 'win' ? '.kiro\\settings\\mcp.json' : '.kiro/settings/mcp.json';
      ol.append(
        el('li', {}, [el('span', {}, ['Choose ', el('b', { textContent: 'Copy file' }), ' above.'])]),
        el('li', {}, [el('span', {}, ['Open ', el('code', { textContent: cfg }), ' (Command Palette → ', el('b', { textContent: 'Kiro: Open MCP Config' }), ').'])]),
        el('li', {}, [el('span', {}, ['Paste the server block inside ', el('code', { textContent: '"mcpServers"' }), ' and save. Keep API keys local; never commit them.'])]));
    } else {
      ol.append(el('li', {}, [el('span', {}, ['Choose ', el('b', { textContent: 'Copy file' }), ' above and save it where the summary says.'])]));
    }
    box.append(ol);
  }

  if (e.installSteps) {
    const lines = e.installSteps.split('\n').map(x => x.trim()).filter(Boolean);
    const req = lines.filter(x => /^required:/i.test(x)).map(x => x.replace(/^required:\s*/i, ''));
    const opt = lines.filter(x => !/^required:/i.test(x));
    if (req.length) box.append(el('div', { className: 'note req' }, [el('h4', { textContent: 'Required after installing' }), el('ul', {}, req.map(x => el('li', {}, inlineMd(x))))]));
    if (opt.length) box.append(el('div', { className: 'note' }, [el('h4', { textContent: 'Good to know' }), el('ul', {}, opt.map(x => el('li', {}, inlineMd(x))))]));
  }
  return box;
}

/* ---------- test ---------- */
function defaultTest(e) {
  const tag = (e.inclusion || '').match(/#[\w-]+/)?.[0];
  switch (e.category) {
    case 'steering': return [
      tag ? `Open a new Kiro chat and type \`${tag}\`. It should show as attached context.` : 'Open a new Kiro chat.',
      'Ask: "Which steering files are you following right now?"',
      'Give it a small real task in your repo and watch how it works.',
      `Pass: the agent names \`${fileName(e).replace(/\.md$/, '')}\` and behaves like the Overview example.`].join('\n');
    case 'hook': return ['Do the thing that triggers the hook (for example, have the agent save a matching file).', 'Watch the Kiro chat or the hook’s run log.', 'Pass: the hook runs once and does what its summary says.'].join('\n');
    case 'mcp': return ['Open a new Kiro chat.', 'Ask: "What tools do you have from this MCP server?"', 'Ask it to run one read-only tool call.', 'Pass: it lists the server’s tools and the call returns real data.'].join('\n');
    default: return ['Open a new Kiro chat and give it a task this entry is meant for.', 'Pass: the result matches the Overview example.'].join('\n');
  }
}
function inlineMd(text) {
  const out = [];
  text.split(/(`[^`]+`|\*\*[^*]+\*\*)/).forEach(s => {
    if (/^`.+`$/.test(s)) out.push(el('code', { textContent: s.slice(1, -1) }));
    else if (/^\*\*.+\*\*$/.test(s)) out.push(el('b', { textContent: s.slice(2, -2) }));
    else if (s) out.push(s);
  });
  return out;
}
function renderTest(e) {
  const box = el('div', { className: 'panel' });
  const text = e.testSteps || defaultTest(e);
  const ol = el('ol', { className: 'steps' }); let pass = null;
  text.split('\n').map(s => s.trim().replace(/^\d+[.)]\s*|^[-*]\s+/, '')).filter(Boolean).forEach(s => {
    if (/^pass:/i.test(s)) pass = el('p', { className: 'pass' }, [el('b', { textContent: 'Pass if ' }), ...inlineMd(s.replace(/^pass:\s*/i, ''))]);
    else ol.append(el('li', {}, [el('span', {}, inlineMd(s))]));
  });
  box.append(el('div', { className: 'inst-head' }, [el('h3', { textContent: 'Test it in Kiro' })]), ol);
  if (pass) box.append(pass);
  if (!e.testSteps) box.append(el('p', { className: 'auto-note', textContent: 'Standard test for this type.' }));
  return box;
}

/* ---------- packages ---------- */
state.packages = [];
state.pkTab = 'items';
state.recOnly = store.get('ko-rec', '0') === '1';
const PKG_PREFIX = 'pkg-';
const pkgById = id => state.packages.find(p => p.id === id);
const selectedPkg = () => (state.selected || '').startsWith(PKG_PREFIX) ? pkgById(state.selected.slice(PKG_PREFIX.length)) : null;

function pkgItems(p, depth = 0) {
  if (!p || depth > 5) return [];
  const parent = p.extends ? pkgById(p.extends) : null;
  const inherited = parent ? pkgItems(parent, depth + 1).map(x => ({ ...x, own: false, from: x.from || parent.name })) : [];
  const own = (Array.isArray(p.items) ? p.items : []).filter(x => x && x.id).map(x => ({ ...x, own: true, from: p.name }));
  const seen = new Set(); const out = [];
  [...inherited, ...own].forEach(x => { if (!seen.has(x.id)) { seen.add(x.id); out.push(x); } });
  return out;
}

function levelBars(level) {
  const box = el('span', { className: 'pk-bars', ariaHidden: 'true' });
  for (let i = 1; i <= 3; i++) box.append(el('i', { className: i <= level ? 'on' : '' }));
  return box;
}

function renderPackages() {
  const box = $('packages'); if (!box) return;
  box.replaceChildren();
  const pkgs = [...state.packages].sort((a, b) => (a.level || 0) - (b.level || 0));
  if (!pkgs.length) { box.hidden = true; return; }
  box.hidden = false;
  box.append(
    el('div', { className: 'pk-head' }, [
      el('h2', { id: 'pk-h', textContent: 'Start with a package' }),
      el('p', { textContent: 'Not sure what to install? Pick your level. Each package lists what to install and why, and installs everything in one command. Each level includes the one before it.' })
    ])
  );
  const grid = el('div', { className: 'pk-grid' });
  pkgs.forEach(p => {
    const items = pkgItems(p).filter(x => state.entries.some(e => e.id === x.id));
    const ownCount = items.filter(x => x.own).length;
    const card = el('button', { type: 'button', className: 'pk-card' });
    card.setAttribute('aria-current', String(state.selected === PKG_PREFIX + p.id));
    const parent = p.extends ? pkgById(p.extends) : null;
    card.append(
      el('div', { className: 'pk-top' }, [levelBars(p.level || 1), el('span', { className: 'pk-count', textContent: `${items.length} ${items.length === 1 ? 'item' : 'items'}` })]),
      el('div', { className: 'pk-name', textContent: p.name || 'Package' }),
      el('p', { className: 'pk-tag', textContent: p.tagline || '' }),
      el('div', { className: 'pk-foot', textContent: parent ? `${parent.name} + ${ownCount} more` : items.slice(0, 4).map(x => (state.entries.find(e => e.id === x.id) || {}).title).filter(Boolean).join(' · ') })
    );
    card.onclick = () => { state.pkTab = 'items'; select(PKG_PREFIX + p.id); };
    grid.append(card);
  });
  box.append(grid);
}

function pkgRow(x, entry) {
  if (!entry) return el('li', { className: 'pk-row missing' }, [el('div', { className: 'pk-row-main' }, [el('span', { className: 'pk-row-title', textContent: x.id }), el('span', { className: 'pk-row-why', textContent: 'No longer in the directory.' })])]);
  const b = el('button', { type: 'button', className: 'pk-row' + (x.own === false ? ' inherited' : '') });
  b.append(
    el('div', { className: 'pk-row-main' }, [
      el('span', { className: 'pk-row-title' + (isHashName(entry.title) ? ' mono' : '') }, [entry.recommended ? el('span', { className: 'star', title: 'Recommended' }, [starIcon(13)]) : null, entry.title || 'Untitled']),
      x.why ? el('span', { className: 'pk-row-why', textContent: x.why }) : null
    ]),
    el('span', { className: 'pk-row-type', textContent: catOf(entry.category).label })
  );
  b.onclick = () => { state.tab = 'overview'; select(entry.id); };
  return el('li', {}, [b]);
}

function buildPackageCommand(p, entries) {
  const lines = [cmt(`${p.name} package: adds every file you don't have yet. Files you already have are kept. Run from your repo's root folder.`)];
  entries.forEach(e => {
    if (isKit(e)) {
      lines.push('', cmt(`${e.title} (${kitFiles(e).length} files)`));
      kitFiles(e).forEach(f => { const t = target(e, f.path); if (t) lines.push(updateBlock(f.content, t)); });
      (Array.isArray(e.updatePatches) ? e.updatePatches : []).forEach(pt => { if (pt && pt.path && pt.after && pt.line) { const t = target(e, pt.path); if (t) lines.push(patchBlock(pt, t)); } });
    } else if (e.content && e.path) {
      const t = target(e, e.path);
      if (t) lines.push('', cmt(e.title), updateBlock(e.content, t));
    }
  });
  return lines.join('\n');
}

function renderPackageDrawer(d, p) {
  const items = pkgItems(p);
  const entries = items.map(x => state.entries.find(e => e.id === x.id)).filter(Boolean);
  const parent = p.extends ? pkgById(p.extends) : null;
  const close = el('button', { type: 'button', className: 'icon-btn', title: 'Close' }, [svgIcon('M6 6l12 12M18 6 6 18')]);
  close.setAttribute('aria-label', 'Close package');
  close.onclick = () => { state.selected = null; state.closed = true; history.replaceState(null, '', location.pathname + location.search); renderPackages(); renderGrid(); renderDrawer(); };
  d.append(el('div', { className: 'drawer-head' }, [
    el('div', {}, [el('div', { className: 'eyebrow', textContent: 'Package · Level ' + (p.level || 1) }), el('h2', { textContent: p.name || 'Package' })]),
    close
  ]));
  if (p.tagline) d.append(el('p', { className: 'summary', textContent: p.tagline }));

  const facts = el('dl', { className: 'facts' });
  const fact = (k, v) => v && facts.append(el('div', { className: 'fact' }, [el('dt', { textContent: k }), el('dd', { textContent: v })]));
  fact('Items', String(entries.length));
  fact('Includes', parent ? `Everything in ${parent.name}, plus ${items.filter(x => x.own).length} more` : 'The core set');
  fact('Who it’s for', p.audience || '');
  fact('Install time', 'About 2 minutes');
  d.append(facts);

  const tabs = el('div', { className: 'tabs', role: 'tablist' });
  tabs.setAttribute('aria-label', 'Package views');
  [['items', 'What’s included'], ['install', 'Install all']].forEach(([id, label]) => {
    const t = el('button', { type: 'button', className: 'tab', textContent: label, id: 'pktab-' + id });
    t.setAttribute('role', 'tab'); t.setAttribute('aria-selected', String(state.pkTab === id));
    t.onclick = () => { state.pkTab = id; renderDrawer(); };
    tabs.append(t);
  });
  d.append(tabs);

  if (state.pkTab === 'install') {
    const box = el('div', { className: 'panel' });
    box.append(el('div', { className: 'inst-controls' }, [seg([['win', 'Windows'], ['mac', 'Mac']], state.os, v => { state.os = v; store.set('ko-os', v); renderDrawer(); }, 'Operating system', 'dark')]));
    box.append(el('div', { className: 'inst-head' }, [el('h3', { textContent: `Install the ${p.name} package` })]));
    box.append(el('ol', { className: 'steps' }, [
      el('li', {}, [el('span', {}, ['Open your repo in Kiro, then open a terminal: ', ...termKeys(), '.'])]),
      el('li', {}, [el('span', {}, ['Paste the command and press ', el('kbd', { textContent: 'Enter' }), '.'])]),
      el('li', {}, [el('span', {}, [el('code', { textContent: 'Added:' }), ' marks each new file. ', el('code', { textContent: 'Kept:' }), ' marks files you already had, which aren’t touched.'])]),
      el('li', {}, [el('span', {}, ['Do the follow-ups below, then type ', el('code', { textContent: '#steering-doctor' }), ' if you have it, to check everything loaded.'])]),
    ]));
    box.append(el('p', { className: 'auto-note', textContent: 'Safe to re-run. Moving up a level later? Run the bigger package’s command: it only adds what’s new.' }));
    box.append(codeBlock(state.os === 'mac' ? 'Terminal (bash / zsh)' : 'PowerShell', buildPackageCommand(p, entries), 'Copy command'));
    const req = [];
    entries.forEach(e => (e.installSteps || '').split('\n').map(s => s.trim()).filter(s => /^required:/i.test(s)).forEach(s => req.push([e.title, s.replace(/^required:\s*/i, '')])));
    if (req.length) box.append(el('div', { className: 'note req' }, [el('h4', { textContent: 'Required after installing' }), el('ul', {}, req.map(([t, s]) => el('li', {}, [el('b', { textContent: t + ': ' }), ...inlineMd(s)])))]));
    d.append(box);
    return;
  }

  const panel = el('div', { className: 'panel' });
  const own = items.filter(x => x.own);
  const inherited = items.filter(x => !x.own);
  panel.append(el('div', { className: 'section' }, [
    el('div', { className: 'section-title', textContent: parent ? `New in ${p.name}` : 'Install these' }),
    el('ul', { className: 'pk-list' }, own.map(x => pkgRow(x, state.entries.find(e => e.id === x.id))))
  ]));
  if (inherited.length) {
    const groups = [];
    inherited.forEach(x => { let g = groups.find(g => g.from === x.from); if (!g) groups.push(g = { from: x.from, list: [] }); g.list.push(x); });
    groups.forEach(g => panel.append(el('div', { className: 'section' }, [
      el('div', { className: 'section-title', textContent: `From ${g.from}` }),
      el('ul', { className: 'pk-list' }, g.list.map(x => pkgRow(x, state.entries.find(e => e.id === x.id))))
    ])));
  }
  const addons = (Array.isArray(p.addons) ? p.addons : []).filter(x => x && x.id && !items.some(i => i.id === x.id));
  if (addons.length) panel.append(el('div', { className: 'section' }, [
    el('div', { className: 'section-title', textContent: 'Also consider' }),
    el('p', { className: 'auto-note', textContent: 'Optional. Not in the install command: add these one at a time from their own page.' }),
    el('ul', { className: 'pk-list' }, addons.map(x => pkgRow({ ...x, own: true }, state.entries.find(e => e.id === x.id))))
  ]));
  const go = el('button', { type: 'button', className: 'btn primary', textContent: `Install all ${entries.length}` });
  go.onclick = () => { state.pkTab = 'install'; renderDrawer(); };
  panel.append(el('div', { className: 'actions' }, [go]));
  d.append(panel);
}

function renderLegend() {
  const l = $('legend'); l.replaceChildren();
  if (!state.entries.some(e => e.recommended)) return;
  l.append(el('span', { className: 'star' }, [starIcon(14)]), 'Recommended: start with these.');
}
function render() { renderPackages(); renderCount(); renderLegend(); renderFilters(); renderGrid(); renderDrawer(); }

$('search').addEventListener('input', ev => { state.q = ev.target.value; renderGrid(); });
$('rec-only').checked = state.recOnly;
$('rec-only').addEventListener('change', ev => { state.recOnly = ev.target.checked; store.set('ko-rec', state.recOnly ? '1' : '0'); if (state.filter !== 'all' && !state.entries.some(e => e.recommended && purposeOf(e).id === state.filter)) state.filter = 'all'; renderFilters(); renderGrid(); });
window.addEventListener('hashchange', () => { state.selected = location.hash.slice(1) || null; state.closed = !state.selected; renderGrid(); renderDrawer(); });

/* ---------- read-only data load ---------- */
async function loadData(banner) {
  try {
    const [entries, packages] = await Promise.all(['/data/entries.json', '/data/packages.json'].map(p => fetch(p).then(r => { if (!r.ok) throw new Error(p); return r.json(); })));
    state.entries = (Array.isArray(entries) ? entries : []).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    state.packages = Array.isArray(packages) ? packages : [];
  } catch {
    banner.textContent = 'Couldn’t load the directory data. Reload the page to try again.';
    banner.hidden = false;
  }
  state.loaded = true; render();
}

/* ---------- data ---------- */
render();
loadData($('banner')).then(initTour);
