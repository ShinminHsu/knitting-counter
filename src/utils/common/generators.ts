import { Yarn, Project, Round, StitchType } from '../../types'

// 生成唯一 ID
export function generateId(): string {
  return crypto.randomUUID()
}

// 建立樣本毛線資料
export function createSampleYarns(): Yarn[] {
  return [
    {
      id: generateId(),
      name: '白色棉線',
      brand: '樣本品牌',
      color: { name: '白色', hex: '#FFFFFF' }
    },
    {
      id: generateId(),
      name: '粉色棉線', 
      brand: '樣本品牌',
      color: { name: '粉色', hex: '#FFB3E6' }
    },
    {
      id: generateId(),
      name: '藍色棉線',
      brand: '樣本品牌', 
      color: { name: '藍色', hex: '#87CEEB' }
    }
  ]
}

// 建立樣本專案
export function createSampleProject(): Project {
  const yarns = createSampleYarns()
  
  const round1: Round = {
    id: generateId(),
    roundNumber: 1,
    stitches: [
      {
        id: generateId(),
        type: StitchType.CHAIN,
        yarnId: yarns[0].id,
        count: 4
      },
      {
        id: generateId(),
        type: StitchType.SLIP,
        yarnId: yarns[0].id,
        count: 1
      }
    ],
    stitchGroups: [],
    notes: '起始魔術環'
  }
  
  const round2: Round = {
    id: generateId(),
    roundNumber: 2,
    stitches: [
      {
        id: generateId(),
        type: StitchType.SINGLE,
        yarnId: yarns[0].id,
        count: 8
      }
    ],
    stitchGroups: [],
    notes: '短針增加'
  }
  
  const round3: Round = {
    id: generateId(),
    roundNumber: 3,
    stitches: [
      {
        id: generateId(),
        type: StitchType.SINGLE,
        yarnId: yarns[1].id,
        count: 16
      }
    ],
    stitchGroups: [],
    notes: '換色，繼續增加'
  }
  
  return {
    id: generateId(),
    name: '範例杯墊',
    source: 'https://www.youtube.com/watch?v=example',
    pattern: [round1, round2, round3],
    currentRound: 1,
    currentStitch: 0,
    yarns,
    sessions: [],
    createdDate: new Date(),
    lastModified: new Date(),
    isCompleted: false
  }
}