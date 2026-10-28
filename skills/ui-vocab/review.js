/* ui-picker review overlay. Drop-in for an HTML draft: click any part of the page, write what to change, copy the
   result into Claude Code. Remove the <script> tag before shipping. No dependencies. */
;(() => {
  const KEY = 'ui-picker-review:' + location.pathname
  const notes = JSON.parse(localStorage.getItem(KEY) || '[]')
  let on = true
  let hovered = null

  const css = document.createElement('style')
  css.textContent = `
    .upr-hover { outline: 2px dashed #2563eb !important; outline-offset: 2px; cursor: crosshair !important; }
    .upr-noted { outline: 2px solid #f59e0b !important; outline-offset: 2px; }
    #upr-panel { position: fixed; right: 16px; bottom: 16px; width: 340px; max-height: 70vh; display: flex; flex-direction: column;
      background: #111; color: #eee; font: 13px/1.4 system-ui, sans-serif; border-radius: 12px; box-shadow: 0 8px 30px rgba(0,0,0,.4); z-index: 2147483647; }
    #upr-panel header { display: flex; align-items: center; gap: 8px; padding: 10px 12px; border-bottom: 1px solid #333; }
    #upr-panel header b { flex: 1; }
    #upr-panel button { background: #2563eb; color: #fff; border: 0; border-radius: 8px; padding: 6px 10px; font: inherit; cursor: pointer; }
    #upr-panel button.ghost { background: #333; }
    #upr-list { overflow: auto; padding: 8px 12px; display: flex; flex-direction: column; gap: 6px; }
    #upr-list div { display: flex; gap: 6px; align-items: baseline; }
    #upr-list span { flex: 1; } #upr-list i { color: #9ca3af; font-style: normal; }
    #upr-list button { padding: 2px 6px; }
    #upr-out { margin: 0 12px 12px; width: calc(100% - 24px); height: 90px; background: #000; color: #a7f3d0; border: 1px solid #333; border-radius: 8px; font: 12px/1.4 ui-monospace, monospace; padding: 8px; resize: none; }
    #upr-pop { position: absolute; z-index: 2147483647; background: #111; color: #eee; padding: 10px; border-radius: 10px; box-shadow: 0 8px 30px rgba(0,0,0,.4); width: 280px; font: 13px system-ui, sans-serif; }
    #upr-pop small { color: #9ca3af; display: block; margin-bottom: 6px; }
    #upr-pop textarea { width: 100%; height: 64px; font: inherit; border-radius: 8px; border: 1px solid #333; background: #000; color: #eee; padding: 6px; box-sizing: border-box; }
    #upr-pop .row { display: flex; gap: 6px; justify-content: flex-end; margin-top: 6px; }
    #upr-pop button { background: #2563eb; color: #fff; border: 0; border-radius: 8px; padding: 5px 10px; font: inherit; cursor: pointer; }
    #upr-pop button.ghost { background: #333; }`
  document.head.appendChild(css)

  /** The plan row an element belongs to: its nearest data-area, else the nearest heading text, else the tag. */
  const areaOf = el => {
    const tagged = el.closest('[data-area]')
    if (tagged) return tagged.dataset.area
    const sec = el.closest('section, header, footer, nav, main, article, aside') || el
    const h = sec.querySelector('h1, h2, h3')
    if (h) return h.textContent.trim().slice(0, 40)
    const cls = typeof sec.className === 'string' && sec.className.trim().split(/\s+/)[0]
    return sec.tagName.toLowerCase() + (sec.id ? '#' + sec.id : cls ? '.' + cls : '')
  }
  /** What exactly was clicked, when it is smaller than the row. */
  const partOf = el => {
    const tagged = el.closest('[data-area]')
    if (tagged === el || !tagged) return ''
    const name = el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/)[0] : '')
    const text = (el.textContent || '').trim().replace(/\s+/g, ' ').replace(/^(.{0,30}\S)\s.*$/s, '$1').slice(0, 40)
    return text ? `${name} "${text}"` : name
  }

  const message = () => ['ui-picker: change', ...notes.map(n => `- ${n.area}: "${n.text}"${n.part ? ` · ${n.part}` : ''}`)].join('\n')

  const panel = document.createElement('aside')
  panel.id = 'upr-panel'
  panel.innerHTML = `<header><b>Review</b><button class="ghost" id="upr-toggle">Pause</button><button id="upr-copy">Copy for Claude</button></header>
    <div id="upr-list"></div><textarea id="upr-out" readonly aria-label="Message for Claude Code"></textarea>`
  document.body.appendChild(panel)
  const list = panel.querySelector('#upr-list')
  const out = panel.querySelector('#upr-out')

  const render = () => {
    localStorage.setItem(KEY, JSON.stringify(notes))
    list.innerHTML = notes.length ? '' : '<div><i>Click any part of the page and say what to change.</i></div>'
    notes.forEach((n, i) => {
      const row = document.createElement('div')
      row.innerHTML = `<span><b>${n.area}</b>${n.part ? ` <i>· ${n.part}</i>` : ''}<br>${n.text}</span><button class="ghost" data-i="${i}">×</button>`
      list.appendChild(row)
    })
    out.value = notes.length ? message() : ''
    document.querySelectorAll('.upr-noted').forEach(e => e.classList.remove('upr-noted'))
    notes.forEach(n => n.el && n.el.isConnected && n.el.classList.add('upr-noted'))
  }
  list.addEventListener('click', e => {
    const b = e.target.closest('button[data-i]')
    if (b) { notes.splice(Number(b.dataset.i), 1); render() }
  })
  panel.querySelector('#upr-toggle').addEventListener('click', e => {
    on = !on
    e.target.textContent = on ? 'Pause' : 'Resume'
  })
  panel.querySelector('#upr-copy').addEventListener('click', async e => {
    const text = message()
    try { await navigator.clipboard.writeText(text); e.target.textContent = 'Copied' }
    catch { out.focus(); out.select(); e.target.textContent = 'Select & copy' }
    setTimeout(() => (e.target.textContent = 'Copy for Claude'), 1500)
  })

  let pop = null
  const closePop = () => { if (pop) pop.remove(); pop = null }
  const openPop = (el, x, y) => {
    closePop()
    const area = areaOf(el), part = partOf(el)
    pop = document.createElement('div')
    pop.id = 'upr-pop'
    pop.style.left = Math.min(x, innerWidth - 300) + scrollX + 'px'
    pop.style.top = y + scrollY + 8 + 'px'
    pop.innerHTML = `<small>${area}${part ? ' · ' + part : ''}</small><textarea placeholder="What should change here?"></textarea>
      <div class="row"><button class="ghost" data-act="cancel">Cancel</button><button data-act="add">Add</button></div>`
    document.body.appendChild(pop)
    const ta = pop.querySelector('textarea')
    ta.focus()
    const add = () => { const text = ta.value.trim(); if (text) notes.push({ area, part, text, el }); closePop(); render() }
    pop.addEventListener('click', e => { const act = e.target.dataset.act; if (act === 'add') add(); if (act === 'cancel') closePop() })
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); add() } if (e.key === 'Escape') closePop() })
  }

  const inside = e => e.target.closest('#upr-panel, #upr-pop')
  document.addEventListener('mouseover', e => {
    if (!on || inside(e)) return
    if (hovered) hovered.classList.remove('upr-hover')
    hovered = e.target
    hovered.classList.add('upr-hover')
  })
  document.addEventListener('mouseout', () => { if (hovered) hovered.classList.remove('upr-hover'); hovered = null })
  document.addEventListener('click', e => {
    if (!on || inside(e)) return
    e.preventDefault(); e.stopPropagation()
    openPop(e.target, e.clientX, e.clientY)
  }, true)
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closePop() })

  render()
})()
