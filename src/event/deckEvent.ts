import { fuzzyQuery, generatorMod, getWeightElements, mkdirsSync, loadFileContent } from '../utils'
import { Ireply } from '../service/talker'
import fs from 'fs'
import path from 'path'
import { Contact, log, Room } from 'wechaty'
import { getAllCardMap, getAllDrawDirective, getUserDrawDirective } from './drawEvent'
import { chunk } from 'lodash'
import Sampler from 'random-sampler'

/**
 * 指令参数为空 默认回复
 */
const HELP_TIPS = '牌堆实例.deck\n'
  + '该指令可以在群内自设牌堆，使用.draw时，牌堆实例优先级高于同名公共对象\n'
  + '抽牌不会放回直到抽空\n'
  + '每个群的牌堆列表至多保存10个牌堆\n'
  + '.deck set ([牌堆实例名]=)[公共牌堆名] //从公共牌堆创建实例\n'
  + '.deck show //查看牌堆实例列表\n'
  + '.deck show [牌堆名] //查看剩余卡牌\n'
  + '.deck reset [牌堆名] //重置剩余卡牌\n'
  + '.deck clr //清空所有实例\n'
  + '.deck clr [牌堆名]//清空所有实例\n'
  + '.deck new [牌堆名]=[卡面1](...|[卡面n])\t//自定义牌堆\n'
  + '例:\n'
  + '.deck new 俄罗斯轮盘=有弹|无弹|无弹|无弹|无弹|无弹\n'
  + '除show外其他群内操作需要用户信任或管理权限'

// 内置词条文档
let modMap:{ [index: string]: any } = {}
// 用户词条文档
let userModMap:{ [index: string]: any } = {}
// 默认关键词
const defaultKeyEvent = [
  {
    keyword: ['全牌堆列表'],
    method: () => {
      const list = getAllDrawDirective()
      const chunks = chunk(list, 100)
      const replys: Ireply[] = []
      chunks.forEach((item:string[], index) => {
        replys.push({ content: `【第${index + 1}页】:\n ${item.join('|')}`, type: 1 })
      })
      return replys
    },
  },
  {
    keyword: ['扩展牌堆'],
    method: () => {
      const list = getUserDrawDirective()
      const chunks = chunk(list, 100)
      const replys: Ireply[] = []
      chunks.forEach((item:string[], index) => {
        replys.push({ content: `【第${index + 1}页】:\n ${item.join('|')}`, type: 1 })
      })
      return replys
    },
  },
]

/**
 * 加载词条文档
 */
async function loadMod (cardPath: string, isUser: boolean = false): Promise<object | any> {
  const cradFile = fs.readdirSync(cardPath)
  if (!cradFile || !cradFile.length) return {}
  let finalContent = {}
  for (let i = 0; i < cradFile.length; i++) {
    const file = cradFile[i]
    const filePath = path.join(cardPath, file)
    const content = await import(filePath)
    finalContent = Object.assign({}, finalContent, content.helpdoc)
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

/**
 * 初始化mod词条文档
 */
export async function initMod (): Promise<{} | any> {
  try {
    const cardPath = path.join(__dirname, '../mod')
    modMap = await loadMod(cardPath, false)
    const userCardPath = path.join(__dirname, '../../mod')
    if (fs.existsSync(userCardPath)) {
      userModMap = await loadMod(userCardPath, true)
    }
  } catch (e) {
    log.error('加载词条文档失败', e)
  }
}

/**
 * 获取Mod词条
 * @param key
 * @param name
 * @param self
 */
async function getMod (key: any, name: string, self: string): Promise<Ireply[]> {
  const defaultKeys: string[] = Object.keys(modMap).filter((item) => {
    return !item.startsWith('_')
  })
  const userKeys: string[] = Object.keys(userModMap).filter((item) => {
    return !item.startsWith('_')
  })
  if (defaultKeys.includes(key)) { // 优先匹配默认词条
    return generatorMod(modMap, key, name, self)
  } else if (userKeys.includes(key)) { // 其次匹配用户词条
    return generatorMod(userModMap, key, name, self)
  } else { // 模糊匹配
    const allKeys = defaultKeys.concat(userKeys)
    const likes = fuzzyQuery(allKeys, key)
    if (likes.length) {
      const res = likes.join('\n')
      return [{
        content: `${self}未找到相关的词条，你要找的是不是：${res}`,
        type: 1,
      }]
    } else  {
      return [{
        content: '不存此词条，请核实牌堆指令',
        type: 1,
      }]
    }
  }
}

/**
 * 派发处理draw指令事件
 * @param msg
 * @param name
 * @param self
 */
export async function drawModDispatch (msg: string, name: string, self: string): Promise<Ireply[]> {
  // 默认回复
  if (!msg) {
    return [{
      content: HELP_TIPS,
      type: 1,
    }]
  }
  // 内置关键词回复
  for (let i = 0; i < defaultKeyEvent.length; i++) {
    const item = defaultKeyEvent[i]
    if (item.keyword.includes(msg)) {
      return item.method()
    }
  }
  // 词条回复
  return await getMod(msg, name, self)
}

/**
 * 创建新的卡牌实例
 * @param msg
 * @param roomName
 */
export async function deckNewCard ({ msg, room, self, name }:{msg:string, room?:Room, self: string, name: string }) {
  const isRoom: boolean = !!room
  const roomName = room ? await room.topic() : ''
  if (!msg) {
    return [{ content: `${self}无法为${name}新建虚空牌堆×`, type: 1  }]
  }
  const cardList:any[] = msg.split('=').map(item => {
    return item.trim()
  })
  if (cardList.length <= 1) {
    return [{ content: `${self}无法为${name}新建不符合规则的牌堆，请参考案例: .deck new 轮盘=有弹|无弹`, type: 1  }]
  }
  const existDeck = getDeckContent({ isRoom, name: isRoom ? roomName : name  })
  // 限制牌堆实例的个数不能大于10
  if (Object.keys(existDeck).length >= 10) {
    return [{ content: `${self}处牌堆实例已达上限，请先使用命令 .deck clr 清理无用实例×`, type: 1  }]
  }
  // 从群成员列表创建实例
  if (isRoom && room) {
    if (cardList[1] === 'member') {
      const members: Contact[] = await room.memberAll()
      const nameList = []
      for (const i of members) {
        nameList.push(i.name())
      }
      cardList[1] = nameList.join('|')
    }
  }
  const res = await newCard({ isRoom: !!roomName, list: cardList, name: roomName || name  })
  if (res) {
    return [{ content: `${self}已为${name}自定义新牌堆【${cardList[0]}】√`, type: 1  }]
  }
  return []
}

/**
 * 从牌堆创建实例
 * @param msg
 * @param room
 * @param self
 * @param name
 */
export async function setDeckCard ({ isRoom, msg, roomName, self, name }:{isRoom: boolean, msg:string,  roomName:string, self: string, name: string }) {
  if (!msg) {
    return [{ content: `${self}无法为${name}新建虚空牌堆×`, type: 1  }]
  }
  const cardList:any[] = msg.split('=').map(item => {
    return item.trim()
  })
  if (cardList.length <= 1) {
    return [{ content: `${self}无法为${name}新建不符合规则的牌堆，请参考案例: .deck set 高考=高考`, type: 1  }]
  }
  const allCardKeys = getAllDrawDirective()
  if (allCardKeys.includes(cardList[1])) {
    const allMap = getAllCardMap()
    const cards = [cardList[0], allMap[cardList[1]]]
    const res = await newCard({ isDefault: true, isRoom,  list: cards, name: roomName || name  })
    if (res) {
      return [{ content: `${name}已用${cardList[1]}创建${self}的牌堆实例`, type: 1  }]
    }
    return [{ content: '牌堆实例创建失败', type: 1  }]
  }
  return [{ content: `不存在牌堆${cardList[1]},无法创建实例`, type: 1  }]
}

/**
 * 生成新的牌堆实例
 * @param list 创建的实例
 * @param name 群名或者用户名
 * @param isDefault 是否为内置牌堆 默认为 否
 * @param isRoom 是否群创建
 */
export async function newCard ({ list, name, isDefault = false, isRoom  }: { list :any[], name:string, isDefault?: boolean, isRoom: boolean}):Promise<boolean|undefined> {
  let cardBaseInfo:{ [index: string]: any }  = {}
  const cards: string[] = isDefault ? list[1] : list[1].split('|')
  let idxs: number[] = []
  const meta: string[] = []
  cards.forEach((item, index) => {
    const { weight, element } = getWeightElements(item)
    idxs = idxs.concat(Array(weight).fill(index))
    meta.push(element)
  })
  const sampler = new Sampler()
  sampler.shuffle(idxs)
  cardBaseInfo = {
    idxs,
    meta,
    size: idxs.length,
  }
  await upCreatDeck({ content:  cardBaseInfo, deckKey: list[0], isRoom,  name   })
  return true
}

/**
 * 新增或更新自定义牌组实例
 * @param name
 * @param isRoom
 * @param content
 * @param deckKey
 * @param isDelete
 * @param deleteAll
 */
export async function upCreatDeck ({ name, isRoom, content, deckKey, isDelete = false, deleteAll = false }: {deleteAll?: boolean, name:string, isRoom: boolean, content: {}, deckKey: any, isDelete?:boolean }) {
  const deckPath = path.join(__dirname, `../../data/session/${isRoom ? 'room' : 'friend'}`)
  const fileName = `/${name}.json`
  try {
    if (fs.existsSync(deckPath + fileName)) {
      const defaultContent  = await loadFileContent({ path: deckPath + fileName })
      if (isDelete) {
        if (!deleteAll) { // 是否删除全部
          delete defaultContent.decks[deckKey]
        } else {
          defaultContent.decks = {}
        }
      } else {
        defaultContent.decks[deckKey] = content
      }
      defaultContent.update_time = new Date().getTime()
      fs.writeFileSync(deckPath + fileName, JSON.stringify(defaultContent, null, '\t'))
    } else {
      mkdirsSync(deckPath)
      const finalContent: { [index: string]: any, decks: {
          [index: string]: any
        } } = { creat_time: new Date().getTime(), decks: {},  name, observer: [], type: isRoom ? 'simple' : 'solo', update_time: new Date().getTime()  }
      finalContent.decks[deckKey] = content
      fs.writeFileSync(deckPath + fileName, JSON.stringify(finalContent, null, '\t'))
    }
  } catch (e) {
    log.error('写入deck牌组失败', e)
  }
}

/**
 * 获取群中或个人自定义创建的全部牌组实例
 * @param name
 * @param isRoom
 */
export async function  getDeckContent ({ name, isRoom }:{name: string, isRoom: boolean }) {
  const deckPath = path.join(__dirname, `../../data/session/${isRoom ? 'room' : 'friend'}`)
  const fileName = `/${name}.json`
  const defaultContent  = await loadFileContent({ path: deckPath + fileName })
  return defaultContent.decks
}

/**
 * 获取群中或个人自定义创建的全部牌组实例抽取信息
 * @param name
 * @param isRoom
 * @param self
 */
export async function getDeckInfo ({ name, isRoom, self, room }:{name: string, isRoom: boolean, self: string, room?: Room}) {
  name = room ? await room.topic() : name
  const deckAll = await getDeckContent({ isRoom, name  })
  if (!Object.keys(deckAll).length) {
    return [{ content: `没有在${self}处创建任何牌堆实例，快使用.deck new 创建一个试试吧`, type: 1 }]
  }
  let content = `在${self}处创建的牌堆实例有:\n`
  for (const key in deckAll) {
    const item = deckAll[key]
    content += `${key}[${item.size}/${item.idxs.length}]\n`
  }
  return [{ content, type: 1 }]
}

/**
 * 重置牌组
 * @param name
 * @param msg
 * @param isRoom
 * @param roomName
 * @param self
 */
export async function deckReset ({ name, msg, isRoom, roomName, self }:{name: string, msg: string, isRoom: boolean, roomName: string, self: string}) {
  const deckContent: { [index: string]: any } = await getDeckContent({ isRoom, name: isRoom ? roomName : name  })
  const deckKeys = Object.keys(deckContent).filter((item:any) => {
    return !item.startsWith('_')
  })
  if (!deckKeys.includes(msg)) {
    return [{ content: '重置失败，不存在此牌堆', type: 1  }]
  }
  const content = deckContent[msg]
  content.size = content.idxs.length
  await upCreatDeck({ content, deckKey: msg, isRoom, name: isRoom ? roomName : name  })
  return [{ content: `${self}已重置牌堆实例【${msg}】√`, type: 1  }]
}

/**
 * 清除牌堆实例
 * @param deleteAll
 * @param name
 * @param msg
 * @param isRoom
 * @param roomName
 */
export async function deckClear ({ deleteAll, name, msg, isRoom, roomName }:{deleteAll?: boolean, name: string, msg: string, isRoom: boolean, roomName: string}) {
  const deckContent: { [index: string]: any } = await getDeckContent({ isRoom, name: isRoom ? roomName : name  })
  const deckKeys = Object.keys(deckContent).filter((item:any) => {
    return !item.startsWith('_')
  })
  if (!deckKeys.length) {
    return [{ content: '清除牌堆成功', type: 1  }]
  }
  if (!deckKeys.includes(msg)) {
    return [{ content: '清除牌堆失败，不存在此牌堆', type: 1  }]
  }
  if (deleteAll) {
    await upCreatDeck({ content: {}, deckKey: msg, deleteAll: true,  isDelete: true, isRoom,   name: isRoom ? roomName : name  })
    return [{ content: '已清空牌堆实例√', type: 1  }]
  } else {
    await upCreatDeck({ content: {}, deckKey: msg, deleteAll: false,  isDelete: true, isRoom,   name: isRoom ? roomName : name  })
    return [{ content: `已清理${msg}牌堆实例√`, type: 1  }]
  }
}
