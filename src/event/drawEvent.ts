import { generatorCard, generatorCustomCard } from '../utils/index.js'
import RootPath  from 'app-root-path'
import type { Ireply } from '../service/talker.js'
import fs from 'fs'
import path from 'path'
import { log, Room } from 'wechaty'
import { getDeckContent } from './deckEvent.js'


/**
 * 指令参数为空 默认回复
 */
const DRAW_TIPS = '抽牌：\n'
  + '.draw 牌堆名称\t\n'
  + '.drawh 牌堆名称 //暗抽，参数h后必须留空格\n\n'
  + '*牌堆名称优先调用牌堆实例，如未设置则从同名公共牌堆生成临时实例\n'
  + '*抽到的牌不放回，牌堆抽空后无法继续\n'
  + '*查看已安装牌堆，可.help 全牌堆列表或.help 扩展牌堆'

// 内置牌堆
let cardMap:{ [index: string]: any } = {}
// 用户牌堆
let userCardMap:{ [index: string]: any } = {}

/**
 * 获取牌堆文件
 */

async function loadDeck (cardPath: string, isUser: boolean = false): Promise<object | any> {
  const cradFile = fs.readdirSync(cardPath)
  if (!cradFile || !cradFile.length) return {}
  let finalContent = {}
  for (let i = 0; i < cradFile.length; i++) {
    const file = cradFile[i] || ''
    const filePath = path.join(cardPath, file)
    const content = await import(filePath)
    finalContent = Object.assign({}, finalContent, content.default)
  }
  if (isUser) {
    log.info(`${new Date()}\n
读取用户目录${cardPath}中的${cradFile.length}个文件, 共${Object.keys(finalContent).filter(item => {
      return !item.startsWith('_')
    }).length}个条目\n
扩展配置读取完毕√`)
  } else {
    log.info(`${new Date()}\n
读取系统内置目录${cardPath}中的${cradFile.length}个文件, 共${Object.keys(finalContent).filter(item => {
      return !item.startsWith('_')
    }).length}个条目\n
扩展配置读取完毕√`)
  }
  return finalContent
}

/**
 * 初始化加载牌堆
 */
export async function initCard (): Promise<{} | any> {
  try {
    const cardPath = path.join(__dirname, '../cards')
    cardMap = await loadDeck(cardPath, false)
    const userCardPath = path.join(RootPath.path, '/PublicDeck')
    console.log('userCardPath', userCardPath)
    if (fs.existsSync(userCardPath)) {
      userCardMap = await loadDeck(userCardPath, true)
    }
  } catch (e) {
    log.error('加载牌堆失败', e)
  }
}

/**
 * 抽取卡牌
 * @param key
 * @param name
 * @param self
 * @param room
 */
async function getCard ({ key, name, self, room }:{key: any, name: string, self: string, room?: Room}): Promise<Ireply[]> {
  const isRoom = !!room
  const roomName = room ? await room.topic() : ''
  // 默认内置牌组
  const defaultKeys: string[] = Object.keys(cardMap).filter((item:any) => {
    return !item.startsWith('_')
  })
  // 用户牌组
  const userKeys: string[] = Object.keys(userCardMap).filter((item:any) => {
    return !item.startsWith('_')
  })
  const allMap = Object.assign({}, cardMap, userCardMap)
  // 用户实例牌组
  const deckContent: { [index: string]: any } = await getDeckContent({ isRoom, name: isRoom ? roomName : name  })
  log.info('获取用户牌堆实例', deckContent)
  const deckKeys = Object.keys(deckContent).filter((item:any) => {
    return !item.startsWith('_')
  })
  log.info('1111获取用户牌堆实例')

  if (deckKeys.includes(key)) { // 优先实例牌组
    log.info('优先实例牌组')
    return await generatorCustomCard({ allCard: allMap, deckContent: deckContent[key], isRoom, keyword: key,  name,  roomName, self })
  } else if (defaultKeys.includes(key)) { // 其次读取内置牌堆
    log.info('内置牌堆')
    return generatorCard(allMap, key, name, self)
  } else if (userKeys.includes(key)) { // 最后是用户扩展牌堆
    log.info('获取用户扩展牌堆')
    return generatorCard(allMap, key, name, self)
  } else {
    return [{
      content: '不存在此牌堆，请核实牌堆指令，或者使用.help 全牌堆列表或.help 扩展牌堆 来查看已安装牌堆',
      type: 1,
    }]
  }
}

/**
 * 所有的牌堆指令
 */
export function getAllDrawDirective (): string[] {
  const allCard = Object.assign({}, cardMap, userCardMap)
  return Object.keys(allCard).filter((item) => {
    return !item.startsWith('_')
  })
}

/**
 * 所有的牌堆
 */
export function getAllCardMap ():{ [index: string]: any } {
  return Object.assign({}, cardMap, userCardMap)
}

/**
 * 用户自定义扩展的牌堆指令
 */
export function getUserDrawDirective (): string[] {
  return Object.keys(userCardMap).filter((item) => {
    return !item.startsWith('_')
  })
}

/**
 * 派发处理draw指令事件
 * @param msg
 * @param name
 * @param self
 * @param room
 */
export async function drawEventDispatch ({ msg, name, self, room }: {msg: string, name: string, self: string, room?: Room }): Promise<Ireply[]> {
  if (!msg) {
    return [{
      content: DRAW_TIPS,
      type: 1,
    }]
  }
  return await getCard({ key: msg, name,  room,  self  })
}
