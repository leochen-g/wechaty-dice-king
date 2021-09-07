import { generate } from 'qrcode-terminal'
import { Wechaty, WechatyPlugin, ScanStatus, log, Contact, Message, Room } from 'wechaty'
import { filterMsg } from './service/directive'
import { contactSay, Ireply, delay, roomSay } from './service/talker'
import { initCard } from './event/drawEvent'

export interface DiceBotConfig {
  quickModel?: boolean;
  cardJson?: [];
}

/**
 * 消息事件监听
 * @param {*} msg
 * @returns
 */
async function onMessage (msg: Message) {
  try {
    const room = msg.room() // 是否为群消息
    const msgSelf = msg.self() // 是否自己发给自己的消息
    if (msgSelf) return
    if (room) {
      // @ts-ignore
      await dispatchRoomFilterByMsgType(this, room, msg)
    } else {
      // @ts-ignore
      await dispatchFriendFilterByMsgType(this, msg)
    }
  } catch (e) {
    log.error('reply error', e)
  }
}

/**
 * 根据消息类型过滤私聊消息事件
 * @param {*} that bot实例
 * @param {*} msg 消息主体
 */
async function dispatchFriendFilterByMsgType (that:any, msg:Message) {
  try {
    const type = msg.type()
    const contact = msg.talker() // 发消息人
    const name = contact.name()
    const isOfficial = contact.type() === that.Contact.Type.Official
    const userSelfName = that.userSelf().name()
    let content = ''
    switch (type) {
      case that.Message.Type.Text:
        content = msg.text()
        if (!isOfficial) {
          log.info(`发消息人${name}:${content}`)
          const replys: Ireply[] = await filterMsg({ contact, msg: content,  name, self: userSelfName  })
          for (const reply of replys) {
            await delay(1000)
            await contactSay(contact, reply)
          }
        }
        break
      default:
        break
    }
  } catch (error) {
    log.error('监听消息错误', error)
  }
}

/**
 * 根据消息类型过滤群消息事件
 * @param {*} that bot实例
 * @param {*} room room对象
 * @param {*} msg 消息主体
 */
async function dispatchRoomFilterByMsgType (that:any, room:Room, msg:Message) {
  const contact = msg.talker() // 发消息人
  const contactName = contact.name()
  const roomName = await room.topic()
  const type = msg.type()
  const userSelfName = that.userSelf().name()
  let content = ''
  let mentionSelf: boolean = false
  switch (type) {
    case that.Message.Type.Text:
      content = msg.text()
      log.info(`群名: ${roomName} 发消息人: ${contactName} 内容: ${content}`)
      mentionSelf = content.includes(`@${userSelfName}`)
      if (mentionSelf) {
        content = content.replace(/@[^,，：:\s@]+/g, '').trim()
        const replys: Ireply[] = await filterMsg({ contact, msg: content, name: contactName, self: userSelfName })
        for (const reply of replys) {
          await delay(1000)
          await roomSay(room, contact, reply)
        }
      }
      break
    default:
      break
  }
}

async function onLogin (user: Contact) {
  log.info(`骰王助手${user}登录了`)
}

async function onLogout (user: Contact) {
  log.info(`骰王助手${user}已登出`)
}

/**
 * 扫描登录，显示二维码
 */
async function onScan (qrcode:string, status: ScanStatus) {
  generate(qrcode)
  log.info('扫描状态', status)
  const qrImgUrl = [
    'https://api.qrserver.com/v1/create-qr-code/?data=',
    encodeURIComponent(qrcode),
  ].join('')
  log.info(qrImgUrl)
}

export function diceBot (
  config: DiceBotConfig = {
    cardJson: [],
    quickModel: false,
  }
): WechatyPlugin {
  initCard().then(res => {
    log.info('加载牌堆成功', res)
    return ''
  }).catch(e => {
    log.info('加载牌堆失败', e)
  })
  return function (wechaty: Wechaty) {
    wechaty.on('message', onMessage)
    if (config.quickModel) {
      wechaty.on('scan', onScan)
      wechaty.on('login', onLogin)
      wechaty.on('logout', onLogout)
    }
  }
}