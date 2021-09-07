import { generatorCard } from '../utils'
import { Ireply } from '../service/talker'
import fs from 'fs'
import path from 'path'
import { log } from 'wechaty'

const DRAW_TIPS = '抽牌：\n'
  + '.draw 牌堆名称\t\n'
  + '.drawh 牌堆名称 //暗抽，参数h后必须留空格\n\n'
  + '*牌堆名称优先调用牌堆实例，如未设置则从同名公共牌堆生成临时实例\n'
  + '*抽到的牌不放回，牌堆抽空后无法继续\n'
  + '*查看已安装牌堆，可.help 全牌堆列表或.help 扩展牌堆'

let cardMap:{ [index: string]: any } = {}

/**
 * 获取牌堆文件
 */

async function getDeck (cardPath: string, isUser: boolean = false): Promise<object | any> {
  const cradFile = fs.readdirSync(cardPath)
  if (!cradFile || !cradFile.length) return {}
  let finalContent = {}
  for (let i = 0; i < cradFile.length; i++) {
    const file = cradFile[i]
    const filePath = path.join(cardPath, file)
    const content = await import(filePath)
    finalContent = Object.assign({}, finalContent, content)
  }
  if (isUser) {
    log.info(`${new Date()}\n
读取${cardPath}中的${cradFile.length}个文件, 共${Object.keys(finalContent).filter(item => {
      return !item.startsWith('_')
    }).length}个条目\n
扩展配置读取完毕√`)
  }
  return finalContent
}

export async function initCard (): Promise<{} | any> {
  try {
    const cardPath = path.join(__dirname, '../cards')
    cardMap = await getDeck(cardPath, false)
    const userCardPath = path.join(__dirname, '../../PublicDeck')
    if (fs.existsSync(userCardPath)) {
      const userDeck = await getDeck(userCardPath, true)
      cardMap = Object.assign({}, cardMap, userDeck)
    }
  } catch (e) {
    log.error('写入牌堆失败', e)
  }
}

/**
 * 抽取卡牌
 * @param key
 * @param name
 * @param self
 */
async function getCard (key: any, name: string, self: string): Promise<Ireply[]> {
  const allCard: { [index: string]: any } = cardMap
  const keys: string[] = Object.keys(allCard).filter((item) => {
    return !item.startsWith('_')
  })
  if (keys.includes(key)) {
    return generatorCard(allCard, key, name, self)
  } else {
    return [{
      content: '不存在此牌堆，请核实牌堆指令',
      type: 1,
    }]
  }
}

export async function drawEventDispatch (msg: string, name: string, self: string): Promise<Ireply[]> {
  if (!msg) {
    return [{
      content: DRAW_TIPS,
      type: 1,
    }]
  }
  return await getCard(msg, name, self)
}
//
// getCard('高考', 'elo', 'leo').then(res => {
//   console.log('res', res)
// })
