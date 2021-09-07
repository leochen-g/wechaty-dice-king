import { log, Contact } from 'wechaty'
import { Ireply, contactSay, delay } from './talker'
import { drawEventDispatch } from '../event/drawEvent'

const directiveList = [
  { event:'drawCard', key: ['.draw', '。draw'] },
  { event:'drawPrivateCard', key: ['.hdraw', '。hdraw'] },
  { event: 'helpEvent', key: ['.help'] },
  { event: 'rollNum', key: ['.r'] },
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
 * @param self 骰娘名称
 * @param contact
 * @returns {string} 内容
 */
async function dispatchDirectiveContent (eName:string, msg:string, name:string, self:string, contact: Contact) {
  const content: any = ''
  const type = 1
  const url = ''
  switch (eName) {
    case 'drawCard': {
      log.info('抽取卡牌', msg)
      const key = msg.trim()
      return  drawEventDispatch(key, name, self)
    }
    case 'drawPrivateCard': {
      log.info('暗抽卡牌', msg)
      const key = msg.trim()
      const replys =  await drawEventDispatch(key, name, self)
      for (const reply of replys) {
        await delay(1000)
        await contactSay(contact, reply)
      }
      return []
    }
    case 'helpEvent':
      log.info('帮助指令')
      break
    case 'rowNum':
      log.info('投掷骰子')
      break
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
 * @returns {number} 返回回复内容
 */
export async function filterMsg ({ msg, name, self, contact }: {msg:string, name: string, self:string, contact: Contact }) {
  let msgArr: Ireply[] = []
  for (const item of directiveList) {
    for (const key of item.key) {
      if (msg.startsWith(key)) {
        msg = msg.replace(key, '')
        log.info('匹配到指令', item.event)
        msgArr = await dispatchDirectiveContent(item.event, msg, name, self, contact)
      }
    }
  }
  if (msgArr.length > 0) {
    return  msgArr
  } else {
    return  [{ content: '', type: 1,  url: '' }]
  }
}

// getCard('高考', 'ALI', 'leo').then(res => {
//   console.log('', JSON.stringify(res))
// })
//
// const vars = new Map<string, number>()
// console.log('res', exec('d1000+d1000+d1000+d1000+d1000+d1000+d1000+d1000', vars))
