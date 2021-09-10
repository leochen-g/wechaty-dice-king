import { log, Contact, Room } from 'wechaty'
import { Ireply, contactSay, delay } from './talker'
import { drawEventDispatch } from '../event/drawEvent'
import { drawModDispatch } from '../event/helpEvent'
import { exec } from '../utils/dicBot'
import { deckClear, deckNewCard, deckReset, getDeckInfo, setDeckCard } from '../event/deckEvent'

export type IFilterMsg = {
  eName: string,
  msg: string,
  name: string,
  self: string,
  contact: Contact,
  room?: Room
}

const directiveList = [
  { event:'drawPrivateCard', key: ['.drawh', '。drawh'] },
  { event:'drawCard', key: ['.draw', '。draw'] },
  { event: 'helpEvent', key: ['.help', '。help'] },
  { event: 'rollNum', key: ['.r', '。r'] },
  { event: 'todayCharacter', key: ['.jrrp', '。jrrp'] },
  { event: 'deckNew', key: ['.deck new', '.decknew', '。deck new', '。decknew'] },
  { event: 'deckSet', key: ['.deck set', '.deckset', '。deck set', '。deckset'] },
  { event: 'deckShow', key: ['.deck show', '。deck show', '.deckshow', '。deckshow'] },
  { event: 'deckReset', key: ['.deck reset', '。deck reset', '.deckreset', '。deckreset'] },
  { event: 'deckClear', key: ['.deck clr', '。deck clr', '.deckclr', '。deckclr'] },
]

/**
 * 生成回复内容
 * @param type 内容类型
 * @param content 内容
 * @param url 链接
 * @returns {[{type: *, content: *, url: *}]}
 */
function msgArr (type = 1, content = '', url = '') {
  const obj: Ireply = { content: content, type: type,  url: url }
  return [obj]
}
/**
 * 根据事件名称分配不同的指令处理，并获取返回内容
 * @param {string} eName 事件名称
 * @param {string} msg 消息内容
 * @param name
 * @param self 骰王名称
 * @param contact
 * @param room
 * @returns {string} 内容
 */
async function dispatchDirectiveContent ({ eName, msg, name, self, contact, room }: IFilterMsg) {
  let content: any = ''
  let type = 1
  const url = ''
  const isRoom = !!room
  const roomName = room ? await room.topic() : ''
  switch (eName) {
    // 骰子
    case 'drawCard': {
      log.info('抽取卡牌', msg)
      return  drawEventDispatch({  msg,  name, room, self  })
    }
    // 私聊骰子
    case 'drawPrivateCard': {
      log.info('暗抽卡牌', msg)
      const replys =  await drawEventDispatch({  msg,  name, room, self })
      for (const reply of replys) {
        await delay(1000)
        await contactSay(contact, reply)
      }
      return []
    }
    // 帮助
    case 'helpEvent': {
      log.info('帮助指令', msg)
      return  drawModDispatch(msg, name, self)
    }
    // 今日人品
    case 'todayCharacter':
      type = 1
      content = `${name} 今日的人品值是${exec('1d100', new Map())}`
      break
    // 随机投掷
    case 'rollNum': {
      type = 1
      if (msg) {
        content = `${name} 掷骰: ${msg}=${exec(msg, new Map())}`
      } else {
        content = `${name} 掷骰: D100=${exec('1d100', new Map())}`
      }
      break
    }
    case 'deckNew': {
      const res = await deckNewCard({ msg, name, room, self  })
      return res
    }
    case 'deckShow': {
      const res = await getDeckInfo({ isRoom, name, room, self  })
      return res
    }
    case 'deckReset': {
      if (!msg) {
        content = '未指定牌堆名'
      } else {
        const res = await deckReset({ isRoom,  msg, name, roomName, self })
        return res
      }
      break
    }
    case 'deckClear': {
      const isDeleteAll = !msg
      return await deckClear({ deleteAll: isDeleteAll, isRoom,  msg, name, roomName })
    }
    case 'deckSet': {
      return await setDeckCard({ isRoom, msg, name, roomName,  self })
    }
    default:
      break
  }
  return msgArr(type, content, url)
}

/**
 * 微信好友文本消息事件过滤
 *
 * @param {string} msg 消息内容
 * @param name
 * @param self
 * @param contact
 * @param room 群组
 * @returns {number} 返回回复内容
 */
export async function filterMsg ({ msg, name, self, contact, room }: {msg:string, name: string, self:string, contact: Contact, room?: Room }) {
  let msgArr: Ireply[] = []
  for (const item of directiveList) {
    for (const key of item.key) {
      if (msg.startsWith(key)) {
        msg = msg.replace(key, '').trim()
        log.info('匹配到指令', item.event)
        msgArr = await dispatchDirectiveContent({ contact, eName: item.event,  msg, name, room, self  })
      }
    }
  }
  if (msgArr.length > 0) {
    return  msgArr
  } else {
    return  [{ content: '', type: 1,  url: '' }]
  }
}
