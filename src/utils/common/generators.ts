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
  
  // 起始圈 - 魔法環
  const round1: Round = {
    id: generateId(),
    roundNumber: 1,
    stitches: [
      {
        id: generateId(),
        type: StitchType.MAGIC_RING,
        yarnId: yarns[0].id,
        count: 1
      },
      {
        id: generateId(),
        type: StitchType.SINGLE,
        yarnId: yarns[0].id,
        count: 6
      }
    ],
    stitchGroups: [],
    notes: '魔法環，6短針'
  }
  
  // 第二圈 - 使用短針加針
  const round2: Round = {
    id: generateId(),
    roundNumber: 2,
    stitches: [
      {
        id: generateId(),
        type: StitchType.SINGLE_INCREASE,
        yarnId: yarns[0].id,
        count: 6
      }
    ],
    stitchGroups: [],
    notes: '每針短針加針 (12針)'
  }
  
  // 第三圈 - 混合針法和群組
  const round3: Round = {
    id: generateId(),
    roundNumber: 3,
    stitches: [
      {
        id: generateId(),
        type: StitchType.SINGLE,
        yarnId: yarns[0].id,
        count: 1
      },
      {
        id: generateId(),
        type: StitchType.SINGLE_INCREASE,
        yarnId: yarns[0].id,
        count: 1
      }
    ],
    stitchGroups: [
      {
        id: generateId(),
        name: '加針循環',
        repeatCount: 6,
        stitches: [
          {
            id: generateId(),
            type: StitchType.SINGLE,
            yarnId: yarns[0].id,
            count: 1
          },
          {
            id: generateId(),
            type: StitchType.SINGLE_INCREASE,
            yarnId: yarns[0].id,
            count: 1
          }
        ]
      }
    ],
    notes: '(1短針，1短針加針) × 6 = 18針'
  }
  
  // 第四圈 - 換色並使用不同針法
  const round4: Round = {
    id: generateId(),
    roundNumber: 4,
    stitches: [
      {
        id: generateId(),
        type: StitchType.SINGLE,
        yarnId: yarns[1].id,
        count: 2
      },
      {
        id: generateId(),
        type: StitchType.SINGLE_INCREASE,
        yarnId: yarns[1].id,
        count: 1
      }
    ],
    stitchGroups: [
      {
        id: generateId(),
        name: '三針循環',
        repeatCount: 6,
        stitches: [
          {
            id: generateId(),
            type: StitchType.SINGLE,
            yarnId: yarns[1].id,
            count: 2
          },
          {
            id: generateId(),
            type: StitchType.SINGLE_INCREASE,
            yarnId: yarns[1].id,
            count: 1
          }
        ]
      }
    ],
    notes: '換粉色線，(2短針，1短針加針) × 6 = 24針'
  }
  
  // 第五圈 - 長針和減針
  const round5: Round = {
    id: generateId(),
    roundNumber: 5,
    stitches: [
      {
        id: generateId(),
        type: StitchType.DOUBLE,
        yarnId: yarns[2].id,
        count: 12
      },
      {
        id: generateId(),
        type: StitchType.SINGLE_DECREASE,
        yarnId: yarns[2].id,
        count: 6
      }
    ],
    stitchGroups: [],
    notes: '換藍色線，12長針，6短針減針 = 18針'
  }
  
  // 第六圈 - 複雜群組
  const round6: Round = {
    id: generateId(),
    roundNumber: 6,
    stitches: [],
    stitchGroups: [
      {
        id: generateId(),
        name: '花樣組合',
        repeatCount: 6,
        stitches: [
          {
            id: generateId(),
            type: StitchType.SINGLE,
            yarnId: yarns[2].id,
            count: 1
          },
          {
            id: generateId(),
            type: StitchType.HALF_DOUBLE,
            yarnId: yarns[2].id,
            count: 1
          },
          {
            id: generateId(),
            type: StitchType.DOUBLE,
            yarnId: yarns[2].id,
            count: 1
          }
        ]
      }
    ],
    notes: '(1短針，1中長針，1長針) × 6 = 18針'
  }
  
  return {
    id: generateId(),
    name: '範例彩色杯墊',
    source: 'https://www.youtube.com/watch?v=example',
    pattern: [round1, round2, round3, round4, round5, round6],
    currentRound: 1,
    currentStitch: 0,
    yarns,
    sessions: [],
    createdDate: new Date(),
    lastModified: new Date(),
    isCompleted: false
  }
}