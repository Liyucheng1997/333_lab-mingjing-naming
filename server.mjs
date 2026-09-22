import express from 'express'
import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdir, readFile, unlink } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { Solar } from 'lunar-typescript'

const execFileAsync = promisify(execFile)
const root = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const port = Number(process.env.PORT || 8787)

app.use(express.json({ limit: '1mb' }))
app.use('/generated', express.static(path.join(root, 'public', 'generated')))

const stemElement = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' }
const branchElements = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' }
const elements = ['木', '火', '土', '金', '水']

function chartFor({ birthDate, birthTime = '12:00' }) {
  const [year, month, day] = birthDate.split('-').map(Number)
  const [hour, minute] = birthTime.split(':').map(Number)
  const lunar = Solar.fromYmdHms(year, month, day, hour, minute, 0).getLunar()
  const pillars = lunar.getBaZi()
  const counts = Object.fromEntries(elements.map((key) => [key, 0]))
  for (const pillar of pillars) {
    counts[stemElement[pillar[0]]] += 1
    counts[branchElements[pillar[1]]] += 1
  }
  const sorted = [...elements].sort((a, b) => counts[a] - counts[b])
  const dayMaster = `${pillars[2][0]}${stemElement[pillars[2][0]]}`
  return {
    pillars: pillars.map((value, i) => ({ label: ['年柱', '月柱', '日柱', '时柱'][i], value, stem: value[0], branch: value[1] })),
    counts,
    favorable: sorted.slice(0, 2),
    dayMaster,
    lunarDate: lunar.toString(),
    zodiac: lunar.getYearShengXiao(),
    summary: `${dayMaster}日主，五行以${sorted[0]}、${sorted[1]}为补益方向。命名宜兼顾字义、音律与整体气象。`,
  }
}

const namePool = {
  木: [
    ['栩宁', 'Xuning', '栩栩如生，宁静坚定', 'xǔ níng'], ['若棠', 'Rowan', '若木春生，海棠明朗', 'ruò táng'], ['景桐', 'Jaden', '景行向上，梧桐清雅', 'jǐng tóng'],
  ],
  火: [
    ['昭宁', 'Ariel', '昭昭明亮，内心安宁', 'zhāo níng'], ['昕言', 'Cyrus', '晨光初起，言而有信', 'xīn yán'], ['煜辰', 'Lucian', '光耀温暖，如辰星明净', 'yù chén'],
  ],
  土: [
    ['安屿', 'Ansel', '安然笃定，屿立有恒', 'ān yǔ'], ['予岑', 'Ethan', '温厚予人，山岑稳重', 'yǔ cén'], ['知远', 'Soren', '知行致远，沉稳开阔', 'zhī yuǎn'],
  ],
  金: [
    ['锦川', 'Jasper', '锦绣前程，川流不息', 'jǐn chuān'], ['钧和', 'Quinn', '持衡守正，温润平和', 'jūn hé'], ['清铎', 'Alden', '清澈自持，声名远扬', 'qīng duó'],
  ],
  水: [
    ['清越', 'River', '清澈通达，超越自我', 'qīng yuè'], ['沐言', 'Milo', '如沐春风，言有温度', 'mù yán'], ['澄一', 'Elio', '澄明纯粹，专一笃行', 'chéng yī'],
  ],
}

function fallbackNames(surname, favorable) {
  const picks = [...namePool[favorable[0]], ...namePool[favorable[1]]]
  return picks.slice(0, 6).map(([given, english, meaning, pinyin], index) => ({
    chinese: `${surname}${given}`,
    givenName: given,
    pinyin: `${surname} · ${pinyin}`,
    english,
    meaning,
    elements: [favorable[index % 2]],
    score: 96 - index * 2,
    rationale: `补益${favorable[index % 2]}行，读音舒展，字形疏密协调。`,
  }))
}

async function runCodex(prompt, timeout = 45000, sandbox = 'read-only') {
  const outputPath = path.join(os.tmpdir(), `mingjing-${crypto.randomUUID()}.txt`)
  try {
    await new Promise((resolve, reject) => {
      const child = spawn('codex', [
        'exec', '--ephemeral', '--skip-git-repo-check', '--sandbox', sandbox,
        '--cd', root, '--output-last-message', outputPath, '-'
      ], { windowsHide: true, shell: process.platform === 'win32' })
      let stderr = ''
      child.stderr.on('data', chunk => { stderr = `${stderr}${chunk}`.slice(-4000) })
      const timer = setTimeout(() => {
        child.kill()
        reject(new Error('Codex request timed out'))
      }, timeout)
      child.on('error', error => { clearTimeout(timer); reject(error) })
      child.on('close', code => {
        clearTimeout(timer)
        code === 0 ? resolve() : reject(new Error(stderr || `Codex exited with ${code}`))
      })
      child.stdin.end(prompt)
    })
    return await readFile(outputPath, 'utf8')
  } finally {
    if (existsSync(outputPath)) await unlink(outputPath).catch(() => {})
  }
}

function parseJson(text) {
  const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
  return JSON.parse(clean)
}

app.get('/api/status', async (_req, res) => {
  try {
    const { stdout } = await execFileAsync('codex', ['--version'], { timeout: 5000, windowsHide: true })
    res.json({ connected: true, label: stdout.trim() })
  } catch {
    res.json({ connected: false, label: '离线算法模式' })
  }
})

app.post('/api/chart', (req, res) => {
  try {
    res.json(chartFor(req.body))
  } catch (error) {
    res.status(400).json({ error: '出生日期或时间格式不正确', detail: error.message })
  }
})

app.post('/api/names', async (req, res) => {
  try {
    const { surname, gender = '不限', preferences = '', ai = true } = req.body
    if (!/^[\u3400-\u9fff]{1,2}$/.test(surname || '')) return res.status(400).json({ error: '请输入 1–2 个汉字姓氏' })
    const chart = chartFor(req.body)
    const offline = fallbackNames(surname, chart.favorable)
    if (!ai) return res.json({ chart, names: offline, source: 'offline' })

    const prompt = `你是一位严谨的现代中文姓名顾问。请基于以下资料给出6个中文姓名与自然的英文名。\n姓氏：${surname}\n性别偏好：${gender}\n四柱：${chart.pillars.map(p => p.value).join(' ')}\n五行计数：${JSON.stringify(chart.counts)}\n建议补益：${chart.favorable.join('、')}\n用户偏好：${preferences || '清雅、现代、不过度生僻'}\n要求：中文名避免生僻字、谐音歧义和网红化；英文名讲求气质或含义呼应，不做机械音译。命理内容仅作传统文化参考。只返回合法 JSON，不要代码块，格式为 {"names":[{"chinese":"全名","givenName":"名","pinyin":"含声调拼音","english":"英文名","meaning":"20字内寓意","elements":["木"],"score":95,"rationale":"30字内理由"}]}`
    try {
      const result = parseJson(await runCodex(prompt))
      const names = Array.isArray(result.names) && result.names.length ? result.names.slice(0, 6) : offline
      res.json({ chart, names, source: 'codex' })
    } catch (error) {
      res.json({ chart, names: offline, source: 'offline', warning: 'Codex 本轮响应超时，已无缝切换至本地文化词库。' })
    }
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/api/signature', async (req, res) => {
  const { chinese, english, style = '行云行书', color = '朱砂墨' } = req.body
  if (!/^[\u3400-\u9fff]{2,4}$/.test(chinese || '') || !/^[a-zA-Z .'-]{2,32}$/.test(english || '')) {
    return res.status(400).json({ error: '姓名格式不正确' })
  }
  const id = crypto.randomUUID().slice(0, 8)
  const filename = `signature-${id}.png`
  const target = path.join(root, 'public', 'generated', filename)
  await mkdir(path.dirname(target), { recursive: true })
  const prompt = `使用 imagegen 技能生成一张高质量中英文签名书法图。准确文字：中文“${chinese}”，英文“${english}”。风格：${style}；墨色：${color}。米白宣纸横幅，主体居中，中文为主、英文为辅，保留自然飞白与落笔力度。不要额外文字、印章内文字、人物、logo或水印。生成后把最终 PNG 复制到绝对路径 ${target}。完成后只回复文件是否已保存。`
  try {
    await runCodex(prompt, 240000, 'workspace-write')
    if (!existsSync(target)) throw new Error('Image Gen 未返回本地文件')
    res.json({ imageUrl: `/generated/${filename}`, source: 'imagegen' })
  } catch (error) {
    res.status(503).json({ error: '本次 Image Gen 未完成，可稍后重试', detail: error.message })
  }
})

if (existsSync(path.join(root, 'dist'))) {
  app.use(express.static(path.join(root, 'dist')))
  app.use((_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')))
}

app.listen(port, () => console.log(`Mingjing API · http://localhost:${port}`))
