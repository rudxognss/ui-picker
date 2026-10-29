// Writes skills/ui-vocab/preview.html: the 25 animated previews as one self-contained page for terminals where the pane
// cannot open on its own. Open with a hash: preview.html#q=card-layout,bento-grid;tabs,accordion&lang=ko&title=빵집
// Run: bun scripts/build-preview-html.ts [--check]
import { readFileSync, writeFileSync } from 'node:fs'
import { PNG_INDEX, PNG_UNIQUE, SLOTS } from '../hooks/previews/png-frames'
import { TERMS } from '../hooks/terms'

const DIR = decodeURIComponent(new URL('../skills/ui-vocab/', import.meta.url).pathname)
const OUT = DIR + 'preview.html'
/** Frames go in two sibling scripts so every file stays under 256 KiB. */
const FRAME_FILES = ['preview-frames-a.js', 'preview-frames-b.js']

const terms = Object.fromEntries(
  Object.entries(TERMS).map(([id, t]) => [
    id,
    { en: t.en, ko: t.ko, when: t.when, caption: t.caption, chips: { en: t.params.map(p => `${p.en} ${p.def}${p.unit ?? ''}`), ko: t.params.map(p => `${p.ko} ${p.def}${p.unit ?? ''}`) } },
  ]),
)

const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>ui-picker previews</title>
<style>
  body { margin: 0; background: #1b1d2b; color: #e6e8f2; font: 15px/1.5 system-ui, sans-serif; }
  main { max-width: 1040px; margin: 0 auto; padding: 28px 20px 60px; }
  h1 { font-size: 20px; margin: 0 0 4px; } .sub { color: #9aa3c0; margin: 0 0 24px; }
  section { margin: 0 0 36px; } h2 { font-size: 16px; color: #9aa3c0; margin: 0 0 12px; font-weight: 500; }
  .row { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
  figure { margin: 0; background: #23263a; border-radius: 12px; overflow: hidden; border: 1px solid #343854; }
  figure img { display: block; width: 100%; aspect-ratio: 3/2; image-rendering: pixelated; background: #1b1d2b; }
  figcaption { padding: 12px 14px 14px; }
  .key { display: inline-block; min-width: 26px; text-align: center; background: #2563eb; color: #fff; border-radius: 6px; font-weight: 700; margin-right: 8px; padding: 0 6px; }
  .name { font-weight: 700; } .rec { color: #f59e0b; font-size: 12px; margin-left: 6px; }
  .cap { margin: 6px 0 0; } .when, .chips { margin: 4px 0 0; color: #9aa3c0; font-size: 13px; }
  .hint { position: fixed; left: 0; right: 0; bottom: 0; background: #111322; border-top: 1px solid #343854; padding: 12px 20px; text-align: center; color: #c7cce0; }
  .hint b { color: #fff; }
</style></head><body><main>
<h1 id="title">ui-picker</h1><p class="sub" id="sub"></p><div id="qs"></div></main>
<div class="hint" id="hint"></div>
<script src="preview-frames-a.js"></script><script src="preview-frames-b.js"></script>
<script>
const SLOTS = ${SLOTS};
const FRAMES = [...window.UIP_FRAMES_A, ...window.UIP_FRAMES_B];
const INDEX = ${JSON.stringify(PNG_INDEX)};
const TERMS = ${JSON.stringify(terms)};
const S = {
  en: { q: 'Question {i} of {n}', pick: 'Pick a pattern for this area', rec: 'recommended', hint: 'Type the number in Claude Code. <b>/ui-picker</b> opens this in the terminal.', none: 'No question in the address. Example: preview.html#q=card-layout,bento-grid&lang=en' },
  ko: { q: '질문 {i}/{n}', pick: '이 영역의 패턴을 고르세요', rec: '추천', hint: 'Claude Code에 번호를 입력하세요. <b>/ui-picker</b>를 치면 터미널 패널에서도 열립니다.', none: '주소에 질문이 없습니다. 예: preview.html#q=card-layout,bento-grid&lang=ko' },
};
const params = new URLSearchParams(location.hash.slice(1));
const lang = params.get('lang') === 'ko' ? 'ko' : 'en';
const labels = (() => { try { return JSON.parse(params.get('labels') || '{}') } catch { return {} } })();
const str = (k) => (labels.ui && labels.ui[k]) || S[lang][k];
const tx = (id, f) => (labels.terms && labels.terms[id] && labels.terms[id][f]) || (f === 'name' ? TERMS[id][lang] : TERMS[id][f][lang]);
const title = params.get('title') || 'ui-picker';
document.getElementById('title').textContent = title;
document.title = title + ' · ui-picker';
document.getElementById('hint').innerHTML = str('hint');
const qs = (params.get('q') || '').split(';').map(s => s.split(',').map(x => x.trim()).filter(x => INDEX[x])).filter(a => a.length);
const root = document.getElementById('qs');
if (!qs.length) document.getElementById('sub').textContent = S[lang].none;
const imgs = [];
qs.forEach((ids, qi) => {
  const sec = document.createElement('section');
  sec.innerHTML = '<h2>' + str('q').replace('{i}', qi + 1).replace('{n}', qs.length) + ' · ' + str('pick') + '</h2><div class="row"></div>';
  const row = sec.querySelector('.row');
  ids.forEach((id, i) => {
    const fig = document.createElement('figure');
    const img = document.createElement('img'); img.alt = tx(id, 'name'); imgs.push({ img, id });
    fig.appendChild(img);
    const cap = document.createElement('figcaption');
    cap.innerHTML = '<span class="key">' + (i + 1) + '</span><span class="name"></span>' + (i === 0 ? '<span class="rec">· ' + str('rec') + '</span>' : '') +
      '<p class="cap"></p><p class="when"></p><p class="chips"></p>';
    cap.querySelector('.name').textContent = tx(id, 'name');
    cap.querySelector('.cap').textContent = tx(id, 'caption');
    cap.querySelector('.when').textContent = tx(id, 'when');
    cap.querySelector('.chips').textContent = TERMS[id].chips[lang].join(' · ');
    fig.appendChild(cap); row.appendChild(fig);
  });
  root.appendChild(sec);
});
let slot = 0;
const draw = () => { for (const { img, id } of imgs) img.src = 'data:image/png;base64,' + FRAMES[INDEX[id][slot]]; slot = (slot + 1) % SLOTS; };
draw(); setInterval(draw, 100);
addEventListener('hashchange', () => location.reload());
</script></body></html>
`
const half = Math.ceil(PNG_UNIQUE.length / 2)
const frameFiles: [string, string][] = [
  [DIR + FRAME_FILES[0], 'window.UIP_FRAMES_A=' + JSON.stringify(PNG_UNIQUE.slice(0, half)) + '\n'],
  [DIR + FRAME_FILES[1], 'window.UIP_FRAMES_B=' + JSON.stringify(PNG_UNIQUE.slice(half)) + '\n'],
]
const outputs: [string, string][] = [[OUT, html], ...frameFiles]
for (const [f, m] of outputs) if (m.length > 256 * 1024) { console.error(f + ': ' + m.length + ' B > 256 KiB'); process.exit(1) }
if (process.argv.includes('--check')) {
  for (const [f, m] of outputs) {
    const cur = (() => { try { return readFileSync(f, 'utf8') } catch { return '' } })()
    if (cur !== m) { console.error(f + ' is stale: run bun scripts/build-preview-html.ts'); process.exit(1) }
  }
  console.log('preview.html and its frame scripts are up to date')
} else {
  for (const [f, m] of outputs) writeFileSync(f, m)
  console.log('wrote ' + outputs.map(([f, m]) => `${f.slice(DIR.length)} (${Math.round(m.length / 1024)} KB)`).join(', '))
}
