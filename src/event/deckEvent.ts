import {  getWeightElements, mkdirsSync, loadFileContent } from '../utils/index.js'
import RootPath  from 'app-root-path'
import type { Ireply } from '../service/talker.js'
import fs from 'fs'
import path from 'path'
import { Contact, log, Room } from 'wechaty'
import { getAllCardMap, getAllDrawDirective } from './drawEvent.js'
import Sampler from 'random-sampler'

/**
 * 指令参数为空 默认回复
 */
const HELP_TIPS = '牌堆实例.deck\n'
  + '该指令可以在群内自设牌堆，使用.draw时，牌堆实例优先级高于同名公共对象\n'
  + '抽牌不会放回直到抽空\n'
  + '每个群的牌堆列表至多保存10个牌堆\n'
  + '.deck set ([牌堆实例名]=)[公共牌堆名] //从公共牌堆创建实例\n'
  + '.deck set ([牌堆实例名]=)member //从群成员列表创建实例 可以用在群成员抽奖\n'
  + '.deck show //查看牌堆实例列表\n'
  + '.deck show [牌堆名] //查看剩余卡牌\n'
  + '.deck reset [牌堆名] //重置剩余卡牌\n'
  + '.deck clr //清空所有实例\n'
  + '.deck clr [牌堆名]//清空所有实例\n'
  + '.deck new [牌堆名]=[卡面1](...|[卡面n])\t//自定义牌堆\n'
  + '例:\n'
  + '.deck new 俄罗斯轮盘=有弹|无弹|无弹|无弹|无弹|无弹\n'
  + '除show外其他群内操作需要用户信任或管理权限'

/**
 * deck 帮助
 */
export function deckHelp ():Ireply[] {
  return [{ content: HELP_TIPS, type: 1 }]
}

/**
 * 创建新的卡牌实例
 * @param msg
 * @param roomName
 */
export async function deckNewCard ({ msg, room, self, name }:{msg:string, room?:Room, self: string, name: string }): Promise<Ireply[]> {
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
export async function setDeckCard ({ isRoom, msg, roomName, self, name }:{isRoom: boolean, msg:string,  roomName:string, self: string, name: string }): Promise<Ireply[]> {
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
  const deckPath = path.join(RootPath.path, `/data/session/${isRoom ? 'room' : 'friend'}`)
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
        } } = { creat_time: new Date().getTime(), decks: {},  name, observer: [], observerStats: true, type: isRoom ? 'simple' : 'solo', update_time: new Date().getTime()  }
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
  const deckPath = path.join(RootPath.path, `/data/session/${isRoom ? 'room' : 'friend'}`)
  const fileName = `/${name}.json`
  const defaultContent  = await loadFileContent({ path: deckPath + fileName })
  console.log('defaultContent', defaultContent)
  return defaultContent?.decks || {}
}

/**
 * 获取群中或个人自定义创建的全部牌组实例抽取信息
 * @param name
 * @param isRoom
 * @param self
 */
export async function getDeckInfo ({ name, isRoom, self, room }:{name: string, isRoom: boolean, self: string, room?: Room}): Promise<Ireply[]> {
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
export async function deckReset ({ name, msg, isRoom, roomName, self }:{name: string, msg: string, isRoom: boolean, roomName: string, self: string}): Promise<Ireply[]> {
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
export async function deckClear ({ deleteAll, name, msg, isRoom, roomName }:{deleteAll?: boolean, name: string, msg: string, isRoom: boolean, roomName: string}): Promise<Ireply[]> {
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
