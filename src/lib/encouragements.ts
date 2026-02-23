const messages: string[] = [
  '太棒了！👏',
  '宝宝很活跃！',
  '继续加油！💪',
  '很好很好！',
  '宝宝在动呢！',
  '记录成功！✨',
  '真厉害！',
  '又一次！🎉',
  '宝宝说你好！',
  '棒棒的！⭐',
]

let lastIndex = -1

export function getEncouragement(): string {
  let index: number
  do {
    index = Math.floor(Math.random() * messages.length)
  } while (index === lastIndex)
  lastIndex = index
  return messages[index]
}
