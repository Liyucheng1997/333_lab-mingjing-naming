import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowRight, CalendarDays, Check, ChevronDown, CircleUserRound, Download, Image, Languages, LoaderCircle, RefreshCw, Sparkles, WandSparkles } from 'lucide-react'
import './styles.css'

const elementColors = { 木: '#4e7c5c', 火: '#b84c37', 土: '#ad7b43', 金: '#9a8352', 水: '#3f7284' }
const styles = [
  { id: '行云行书', en: 'Flowing Script', mark: '行', desc: '灵动 · 洒脱' },
  { id: '雅正楷书', en: 'Regular Script', mark: '楷', desc: '端正 · 温润' },
  { id: '古意篆书', en: 'Seal Script', mark: '篆', desc: '古雅 · 庄重' },
  { id: '极简现代', en: 'Modern Minimal', mark: '简', desc: '克制 · 当代' },
]

function App() {
  const [form, setForm] = useState({ surname: '林', gender: '不限', birthDate: '1995-08-18', birthTime: '09:30', city: '杭州', preferences: '清雅、明朗、有书卷气', ai: true })
  const [status, setStatus] = useState({ connected: false, label: '检测中…' })
  const [result, setResult] = useState(null)
  const [activeName, setActiveName] = useState(0)
  const [activeStyle, setActiveStyle] = useState('行云行书')
  const [loading, setLoading] = useState(false)
  const [signature, setSignature] = useState(null)
  const [sigLoading, setSigLoading] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => { fetch('/api/status').then(r => r.json()).then(setStatus).catch(() => setStatus({ connected: false, label: '离线模式' })) }, [])

  const selected = result?.names?.[activeName]
  const update = (key) => (e) => setForm(v => ({ ...v, [key]: e.target.value }))

  async function generateNames(e) {
    e?.preventDefault()
    setLoading(true); setNotice(''); setSignature(null)
    try {
      const response = await fetch('/api/names', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setResult(data); setActiveName(0)
      if (data.warning) setNotice(data.warning)
      setTimeout(() => document.querySelector('#results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80)
    } catch (error) { setNotice(error.message) }
    finally { setLoading(false) }
  }

  async function generateSignature() {
    if (!selected) return
    setSigLoading(true); setNotice('')
    try {
      const response = await fetch('/api/signature', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chinese: selected.chinese, english: selected.english, style: activeStyle, color: '朱砂墨' }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error)
      setSignature(`${data.imageUrl}?t=${Date.now()}`)
    } catch (error) { setNotice(`${error.message}。当前仍可预览版式。`) }
    finally { setSigLoading(false) }
  }

  return <div className="site-shell">
    <header className="topbar">
      <a className="brand" href="#top"><span className="brand-seal">明</span><span><b>明境</b><small>MINGJING</small></span></a>
      <nav><a href="#naming">智能起名</a><a href="#results">五行解读</a><a href="#signature">签名设计</a></nav>
      <div className="status"><i className={status.connected ? 'online' : ''} />{status.connected ? 'Codex 本地订阅已连接' : status.label}</div>
    </header>

    <main id="top">
      <section className="hero">
        <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
        <div className="eyebrow"><Sparkles size={14} /> 四柱为骨 · 五行为韵 · 名字为愿</div>
        <h1>从生辰里，<br />找到属于你的<span>名字</span></h1>
        <p>融合传统四柱八字、五行平衡与现代审美，生成中文姓名与气质相契的英文名，再以 AI 为它留下独一无二的笔迹。</p>
        <a className="hero-cta" href="#naming">开启命名之旅 <ArrowRight size={18} /></a>
        <div className="hero-note">传统文化辅助参考 · 不替代人生决策</div>
      </section>

      <section className="naming-section" id="naming">
        <div className="section-heading"><span>01</span><div><p>NAMING PROFILE</p><h2>告诉我们，关于 TA 的故事</h2></div></div>
        <form className="profile-card" onSubmit={generateNames}>
          <div className="form-grid">
            <label><span>姓氏</span><div className="input-wrap"><CircleUserRound size={18}/><input value={form.surname} onChange={update('surname')} maxLength="2" /></div></label>
            <label><span>性别倾向</span><div className="segmented">{['男孩','女孩','不限'].map(x => <button type="button" className={form.gender === x ? 'active' : ''} onClick={() => setForm(v => ({...v, gender: x}))} key={x}>{x}</button>)}</div></label>
            <label><span>出生日期</span><div className="input-wrap"><CalendarDays size={18}/><input type="date" value={form.birthDate} onChange={update('birthDate')} /></div></label>
            <label><span>出生时间</span><div className="input-wrap"><input className="no-icon" type="time" value={form.birthTime} onChange={update('birthTime')} /></div></label>
            <label><span>出生地 <em>用于语境记录</em></span><div className="input-wrap"><input className="no-icon" value={form.city} onChange={update('city')} /><ChevronDown size={16}/></div></label>
            <label><span>名字气质</span><div className="input-wrap"><input className="no-icon" value={form.preferences} onChange={update('preferences')} /></div></label>
          </div>
          <div className="ai-row">
            <div><WandSparkles size={19}/><span><b>Codex 深度命名</b><small>使用本地订阅综合音、形、义给出解释</small></span></div>
            <button type="button" className={`toggle ${form.ai ? 'on' : ''}`} onClick={() => setForm(v => ({...v, ai: !v.ai}))}><span /></button>
          </div>
          <button className="primary" disabled={loading}>{loading ? <><LoaderCircle className="spin" size={19}/> 正在推演四柱与名字…</> : <>生成我的名字 <Sparkles size={18}/></>}</button>
        </form>
      </section>

      {notice && <div className="notice">{notice}</div>}
      {result && <Results result={result} activeName={activeName} setActiveName={(i) => { setActiveName(i); setSignature(null) }} />}

      {result && <section className="signature-section" id="signature">
        <div className="section-heading light"><span>03</span><div><p>AI SIGNATURE STUDIO</p><h2>让名字，成为你的独属印记</h2></div></div>
        <div className="signature-grid">
          <div className="style-picker">
            <p className="picker-title">选择笔触风格</p>
            {styles.map(style => <button className={activeStyle === style.id ? 'selected' : ''} onClick={() => { setActiveStyle(style.id); setSignature(null) }} key={style.id}>
              <span className="style-mark">{style.mark}</span><span><b>{style.id}</b><small>{style.en} · {style.desc}</small></span>{activeStyle === style.id && <Check size={18}/>} 
            </button>)}
            <button className="generate-signature" disabled={sigLoading} onClick={generateSignature}>{sigLoading ? <><LoaderCircle className="spin" size={18}/> Image Gen 创作中…</> : <><WandSparkles size={18}/> 生成高清签名</>}</button>
          </div>
          <div className={`signature-canvas style-${styles.findIndex(s => s.id === activeStyle)}`}>
            {signature ? <img src={signature} alt={`${selected.chinese} 签名设计`} /> : <div className="signature-preview">
              <span className="sig-cn">{selected.chinese}</span><span className="sig-en">{selected.english}</span><i>明境制</i>
            </div>}
            <div className="canvas-tools"><span>{signature ? 'Image Gen 高清成稿' : '实时版式预览'}</span>{signature && <a href={signature} download><Download size={16}/> 下载</a>}<button onClick={generateSignature}><RefreshCw size={15}/></button></div>
          </div>
        </div>
      </section>}
    </main>

    <footer><div className="brand footer-brand"><span className="brand-seal">明</span><span><b>明境</b><small>MINGJING</small></span></div><p>愿每一个名字，都成为一生温柔而坚定的开端。</p><span>© 2026 明境 · AI 辅助传统文化体验</span></footer>
  </div>
}

function Results({ result, activeName, setActiveName }) {
  const { chart, names, source } = result
  const max = Math.max(...Object.values(chart.counts), 1)
  return <section className="results-section" id="results">
    <div className="section-heading"><span>02</span><div><p>ELEMENTAL INSIGHT</p><h2>看见名字背后的五行脉络</h2></div><div className="source-pill">{source === 'codex' ? 'Codex 智能生成' : '本地文化词库'}</div></div>
    <div className="chart-card">
      <div className="pillars"><div className="chart-label"><span>四柱八字</span><small>{chart.lunarDate} · 属{chart.zodiac}</small></div>{chart.pillars.map(p => <div className="pillar" key={p.label}><small>{p.label}</small><b>{p.stem}</b><b>{p.branch}</b></div>)}</div>
      <div className="balance"><div><span>五行能量</span><p>{chart.summary}</p></div><div className="element-bars">{Object.entries(chart.counts).map(([key, value]) => <div key={key}><span>{key}</span><i><em style={{ height: `${Math.max(16, value/max*100)}%`, background: elementColors[key] }}/></i></div>)}</div><div className="favorable"><small>命名建议补益</small><b>{chart.favorable.join(' · ')}</b></div></div>
    </div>
    <div className="names-title"><div><Languages size={19}/><span>中英双名候选</span></div><small>选择一个名字，查看释义与签名设计</small></div>
    <div className="name-grid">{names.map((name, i) => <button className={`name-card ${activeName === i ? 'active' : ''}`} onClick={() => setActiveName(i)} key={`${name.chinese}-${i}`}>
      <div className="score">{name.score}<small>契合度</small></div><span className="cn-name">{name.chinese}</span><span className="pinyin">{name.pinyin}</span><div className="divider"/><span className="en-name">{name.english}</span><p>{name.meaning}</p><div className="name-tags">{name.elements?.map(e => <span style={{ color: elementColors[e], borderColor: `${elementColors[e]}55` }} key={e}>{e}</span>)}</div>{activeName === i && <i className="checked"><Check size={14}/></i>}
    </button>)}</div>
  </section>
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
