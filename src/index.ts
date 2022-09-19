import Qrterminal from 'qrcode-terminal'
import { Wechaty, WechatyPlugin, ScanStatus, log, Contact, Message, Room } from 'wechaty'
import { filterMsg } from './service/directive'
import { contactSay, Ireply, delay, roomSay } from './service/talker'
import { initCard } from './event/drawEvent'
import { initMod } from './event/helpEvent'

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
    const userSelfName = that.currentUser.name()
    let content = ''
    switch (type) {
      case that.Message.Type.Text:
        content = msg.text().trim()
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
  const userSelfName = that.currentUser.name()
  let content = ''
  switch (type) {
    case that.Message.Type.Text: {
      content = msg.text()
      log.info(`群名: ${roomName} 发消息人: ${contactName} 内容: ${content}`)
      const mentionSelf = content.includes(`@${userSelfName}`)
      content = mentionSelf ? content.replace(/@[^,，：:\s@]+/g, '').trim() : content.trim()
      const replys: Ireply[] = await filterMsg({ contact, msg: content, name: contactName, room, self: userSelfName  })
      for (const reply of replys) {
        await delay(1000)
        await roomSay(room, '', reply)
      }
      break
    }
    default:
      break
  }
}

function onLogin (user: Contact) {
  log.info(`骰王助手${user}登录了`)
}

function onLogout (user: Contact) {
  log.info(`骰王助手${user}已登出`)
}

/**
 * 扫描登录，显示二维码
 */
function onScan (qrcode:string, status: ScanStatus) {
  if (status === ScanStatus.Waiting || status === ScanStatus.Timeout) {
    log.info('扫描状态', status)
    Qrterminal.generate(qrcode)
    const qrImgUrl = [
      'https://wechaty.github.io/qrcode/',
      encodeURIComponent(qrcode),
    ].join('')
    log.info(qrImgUrl)
  } else {
    log.info('WechatyDiceBot', 'QRCodeTerminal onScan: %s(%s)', ScanStatus[status], status)
  }
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
  initMod().then(res => {
    log.info('加载词条成功', res)
    return ''
  }).catch(e => {
    log.info('加载词条失败', e)
  })
  return function (wechaty: Wechaty) {
    if (config.quickModel) {
      wechaty.on('scan', onScan)
      wechaty.on('login', onLogin)
      wechaty.on('logout', onLogout)
    }
    wechaty.on('message', onMessage)
  }
}
