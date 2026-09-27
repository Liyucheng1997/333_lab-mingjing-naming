import { Solar } from 'lunar-typescript'

const stemElement = { 甲: '木', 乙: '木', 丙: '火', 丁: '火', 戊: '土', 己: '土', 庚: '金', 辛: '金', 壬: '水', 癸: '水' }
const branchElements = { 子: '水', 丑: '土', 寅: '木', 卯: '木', 辰: '土', 巳: '火', 午: '火', 未: '土', 申: '金', 酉: '金', 戌: '土', 亥: '水' }
const elements = ['木', '火', '土', '金', '水']

export function chartFor({ birthDate, birthTime = '12:00' }) {
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

export function fallbackNames(surname, favorable) {
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
