export type BagCategory = 'mom' | 'baby' | 'documents'

export const CATEGORIES: { key: BagCategory; label: string; emoji: string }[] = [
  { key: 'mom', label: '妈妈包', emoji: '👩' },
  { key: 'baby', label: '宝宝包', emoji: '👶' },
  { key: 'documents', label: '证件包', emoji: '📋' },
]

export const PRESET_ITEMS: { category: BagCategory; name: string }[] = [
  // 妈妈包 (12 items)
  { category: 'mom', name: '产褥垫/护理垫' },
  { category: 'mom', name: '产妇卫生巾' },
  { category: 'mom', name: '一次性内裤' },
  { category: 'mom', name: '哺乳内衣' },
  { category: 'mom', name: '月子服/睡衣' },
  { category: 'mom', name: '拖鞋（防滑）' },
  { category: 'mom', name: '吸管杯/保温杯' },
  { category: 'mom', name: '毛巾/洗漱用品' },
  { category: 'mom', name: '充电器/数据线' },
  { category: 'mom', name: '餐具（筷子碗勺）' },
  { category: 'mom', name: '零食/巧克力' },
  { category: 'mom', name: '出院衣服' },
  // 宝宝包 (10 items)
  { category: 'baby', name: '新生儿衣服（2-3套）' },
  { category: 'baby', name: '包被/抱毯' },
  { category: 'baby', name: '纸尿裤（NB码）' },
  { category: 'baby', name: '湿巾' },
  { category: 'baby', name: '婴儿帽子' },
  { category: 'baby', name: '婴儿袜子' },
  { category: 'baby', name: '小方巾/口水巾' },
  { category: 'baby', name: '奶瓶+奶粉（备用）' },
  { category: 'baby', name: '婴儿浴巾' },
  { category: 'baby', name: '脐带护理用品' },
  // 证件包 (8 items)
  { category: 'documents', name: '身份证（夫妻双方）' },
  { category: 'documents', name: '户口本' },
  { category: 'documents', name: '医保卡/生育保险' },
  { category: 'documents', name: '母子健康手册' },
  { category: 'documents', name: '产检病历/B超单' },
  { category: 'documents', name: '准生证/生育登记' },
  { category: 'documents', name: '现金/银行卡' },
  { category: 'documents', name: '手机+充电宝' },
]
