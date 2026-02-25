import type { UserStage } from './settings.ts'

export interface JourneyCard {
  title: string
  subtitle: string
  tasks: string[]
  tone: 'green' | 'orange' | 'purple'
}

export interface DailyRhythmCard {
  title: string
  subtitle: string
  tasks: string[]
  tone: 'blue' | 'green' | 'orange'
}

export interface KickSafetyNotice {
  level: 'info' | 'warn'
  message: string
}

export function getJourneyCard(
  weeksPregnant: number | null,
  daysUntilDue: number | null,
  userStage: UserStage = 'pregnancy_late',
): JourneyCard {
  if (userStage === 'newborn_0_3m') {
    return {
      title: '新生儿前 3 个月重点',
      subtitle: '优先稳定喂养、睡眠与照护分工，减少无效焦虑。',
      tasks: [
        '每天固定 2 个时段复盘喂奶与排便记录',
        '夜间优先低刺激安抚，避免连续强光和噪音',
        '与家人明确轮班与补觉时段，先保证照护者体力',
      ],
      tone: 'green',
    }
  }

  if (userStage === 'newborn_3_12m') {
    return {
      title: '3-12 月发育阶段重点',
      subtitle: '从“被动照护”过渡到“互动引导”，节奏比强度更重要。',
      tasks: [
        '每天安排 2-3 次短时互动（追视、触摸、语言回应）',
        '记录喂养与作息变化，观察是否出现稳定窗口',
        '按月龄逐步提升互动难度，避免过度刺激',
      ],
      tone: 'purple',
    }
  }

  if (weeksPregnant === null || daysUntilDue === null) {
    return {
      title: '建立你的陪伴节奏',
      subtitle: '先完善基础信息，再开始每天 1 次简短记录。',
      tasks: [
        '设置预产期和提醒时段',
        '试用胎动/宫缩/喂奶工具，熟悉记录入口',
        '和家人约定紧急联系人与医院路线',
      ],
      tone: 'green',
    }
  }

  if (daysUntilDue <= 0) {
    return {
      title: '临产准备周',
      subtitle: '关注宫缩节律与就医时机，优先保证休息。',
      tasks: [
        '持续观察宫缩频率，重点关注 5-1-1 规则',
        '确认待产包和证件已放在固定位置',
        '出现明显异常（见红、破水、胎动异常）及时联系医生',
      ],
      tone: 'orange',
    }
  }

  if (weeksPregnant < 13) {
    return {
      title: '早孕阶段重点',
      subtitle: '稳节奏、少焦虑，优先建立规律作息与产检习惯。',
      tasks: [
        '记录每日不适和体感变化，便于产检沟通',
        '保持清淡饮食与补水，减少空腹时段',
        '和家人同步本周产检安排',
      ],
      tone: 'purple',
    }
  }

  if (weeksPregnant < 28) {
    return {
      title: '中孕阶段重点',
      subtitle: '进入稳定期，可开始建立更系统的记录。',
      tasks: [
        '每周整理一次历史记录，观察趋势',
        '逐步准备待产包基础物品',
        '每天留出 10 分钟放松和轻运动',
      ],
      tone: 'green',
    }
  }

  if (weeksPregnant < 37) {
    return {
      title: '晚孕阶段重点',
      subtitle: '以胎动观察和待产准备为主，减少高负荷活动。',
      tasks: [
        '建议固定时间记录胎动，形成可比较节律',
        '完善待产包，确认交通与陪护安排',
        '准备产后喂养计划与夜间分工',
      ],
      tone: 'orange',
    }
  }

  return {
    title: '足月观察重点',
    subtitle: '身体变化会更明显，建议缩短观察间隔。',
    tasks: [
      '白天和晚间各做一次短时胎动观察',
      '宫缩启动后按节律记录，避免遗漏时间点',
      '保持手机电量和联系人畅通',
    ],
    tone: 'orange',
  }
}

export function getKickSafetyNotice(input: {
  userStage?: UserStage
  weeksPregnant: number | null
  todayKicks: number
  goalCount: number
  currentHour: number
  activeKickSession: boolean
}): KickSafetyNotice | null {
  const {
    userStage = 'pregnancy_late',
    weeksPregnant,
    todayKicks,
    goalCount,
    currentHour,
    activeKickSession,
  } = input
  if (userStage !== 'pregnancy_late') return null
  if (weeksPregnant === null || weeksPregnant < 28) return null

  if (activeKickSession) {
    return {
      level: 'info',
      message: '正在记录胎动，建议在相对安静环境继续观察。',
    }
  }

  if (currentHour >= 22 && todayKicks === 0) {
    return {
      level: 'warn',
      message: '今晚尚未记录到胎动，建议尽快侧卧安静观察；若明显异常请及时联系医生。',
    }
  }

  if (currentHour >= 20 && todayKicks < Math.max(3, Math.floor(goalCount * 0.3))) {
    return {
      level: 'warn',
      message: '今日胎动记录偏少，建议补做 1 次专注观察；若持续偏少请咨询医生。',
    }
  }

  return null
}

export function getDailyRhythmCard(stage: UserStage, hour: number): DailyRhythmCard {
  const isNight = hour >= 21 || hour < 7
  if (stage === 'pregnancy_late') {
    if (isNight) {
      return {
        title: '今晚节奏建议',
        subtitle: '夜间优先安静观察与放松，减少高刺激信息。',
        tasks: [
          '侧卧 10-20 分钟做一次胎动观察',
          '将待产证件和手机放在固定可拿位置',
          '若出现明显异常体感，及时联系医生',
        ],
        tone: 'orange',
      }
    }

    return {
      title: '今日照护节奏',
      subtitle: '白天优先补水、轻活动和规律记录。',
      tasks: [
        '固定 1-2 次短时胎动记录，便于趋势对比',
        '准备或复盘待产包清单，补齐短缺物品',
        '安排一段 15 分钟放松呼吸或伸展',
      ],
      tone: 'green',
    }
  }

  if (stage === 'newborn_0_3m') {
    if (isNight) {
      return {
        title: '夜间低打扰策略',
        subtitle: '少开灯、少说话、少切换动作，先稳住宝宝情绪。',
        tasks: [
          '先判断是否饥饿，再喂奶并记录',
          '换尿布后维持低亮度环境，帮助重新入睡',
          '和家人轮值，避免单人连续熬夜',
        ],
        tone: 'blue',
      }
    }

    return {
      title: '白天照护建议',
      subtitle: '记录喂养间隔与体感，逐步建立“可预期节奏”。',
      tasks: [
        '每次喂奶后简短记录时长或奶量',
        '安排 1-2 次短时趴卧/追视互动',
        '照护者在宝宝安稳时优先补水和补觉',
      ],
      tone: 'green',
    }
  }

  return {
    title: '互动成长建议',
    subtitle: '以互动为主线，短时高频比长时高强更有效。',
    tasks: [
      '每天 2 次语言回应互动（唱歌/对话）',
      '结合亲子互动工具做 5-10 分钟游戏',
      '记录情绪高峰时段，避开疲惫窗口安排活动',
    ],
    tone: isNight ? 'blue' : 'green',
  }
}
