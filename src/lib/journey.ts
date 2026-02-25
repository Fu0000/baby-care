export interface JourneyCard {
  title: string
  subtitle: string
  tasks: string[]
  tone: 'green' | 'orange' | 'purple'
}

export interface KickSafetyNotice {
  level: 'info' | 'warn'
  message: string
}

export function getJourneyCard(
  weeksPregnant: number | null,
  daysUntilDue: number | null,
): JourneyCard {
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
  weeksPregnant: number | null
  todayKicks: number
  goalCount: number
  currentHour: number
  activeKickSession: boolean
}): KickSafetyNotice | null {
  const { weeksPregnant, todayKicks, goalCount, currentHour, activeKickSession } = input
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
