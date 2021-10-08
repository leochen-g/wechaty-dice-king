import { FileBox, UrlLink, MiniProgram, Room, Contact, log }  from  'wechaty'

export interface Ireply {
  type: number,
  content?: string,
  url?: string,
  title?: string,
  description?: string,
  appid?: string,
  pagePath?: string,
  thumbKey?: string,
  thumbUrl?: string,
}

/**
 * 延时函数
 * @param {*} ms 毫秒
 */
export async function delay (ms:number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 群回复
 * @param room
 * @param {*} contact
 * @param {*} msg
 * type 1 文字 2 图片url 3 图片base64 4 url链接 5 小程序  6 名片 7 本地文件
 */
export async function roomSay (room: Room, contact: Contact | '', msg: Ireply) {
  try {
    if (msg.type === 1 && msg.content) {
      // 文字
      log.info('回复内容', msg.content)
      contact ? await room.say(msg.content, contact) : await room.say(msg.content)
    } else if (msg.type === 2 && msg.url) {
      // url文件
      const obj = FileBox.fromUrl(msg.url)
      log.info('回复内容', obj)
      if (contact) {
        await room.say('', contact)
      }
      await delay(500)
      await room.say(obj)
    } else if (msg.type === 3 && msg.url) {
      // bse64文件
      const obj = FileBox.fromDataURL(msg.url, 'room-avatar.jpg')
      if (contact) {
        await room.say('', contact)
      }
      await delay(500)
      await room.say(obj)
    } else if (msg.type === 4 && msg.url && msg.title && msg.description) {
      log.info('in url')
      const url = new UrlLink({
        description: msg.description,
        thumbnailUrl: msg.thumbUrl,
        title: msg.title,
        url: msg.url,
      })
      await room.say(url)
    } else if (msg.type === 5 && msg.appid && msg.title && msg.pagePath && msg.description && msg.thumbUrl && msg.thumbKey) {
      const miniProgram = new MiniProgram({
        appid: msg.appid,
        description: msg.description,
        pagePath: msg.pagePath,
        thumbKey: msg.thumbKey,
        thumbUrl: msg.thumbUrl,
        title: msg.title,
      })
      await room.say(miniProgram)
    } else if (msg.type === 7 && msg.url) {
      const obj = FileBox.fromFile(msg.url)
      if (contact) {
        await room.say('', contact)
      }
      await delay(500)
      await room.say(obj)
    }
  } catch (e) {
    log.warn('群回复错误', e)
  }
}

/**
 * 私聊发送消息
 * @param contact
 * @param msg
 * @param isRoom
 *  type 1 文字 2 图片url 3 图片base64 4 url链接 5 小程序  6 名片
 */
export async function contactSay (contact: Contact, msg: Ireply, isRoom: boolean = false) {
  try {
    if (msg.type === 1 && msg.content) {
      // 文字
      log.info('回复内容', msg.content)
      await contact.say(msg.content)
    } else if (msg.type === 2 && msg.url) {
      // url文件
      const obj = FileBox.fromUrl(msg.url)
      log.info('回复内容', obj)
      if (isRoom) {
        await contact.say(`@${contact.name()}`)
        await delay(500)
      }
      await contact.say(obj)
    } else if (msg.type === 3 && msg.url) {
      // bse64文件
      const obj = FileBox.fromDataURL(msg.url, 'user-avatar.jpg')
      await contact.say(obj)
    } else if (msg.type === 4 && msg.url && msg.title && msg.description && msg.thumbUrl) {
      const url = new UrlLink({
        description: msg.description,
        thumbnailUrl: msg.thumbUrl,
        title: msg.title,
        url: msg.url,
      })
      await contact.say(url)
    } else if (msg.type === 5 && msg.appid && msg.title && msg.pagePath && msg.description && msg.thumbUrl && msg.thumbKey) {
      const miniProgram = new MiniProgram({
        appid: msg.appid,
        description: msg.description,
        pagePath: msg.pagePath,
        thumbKey: msg.thumbKey,
        thumbUrl: msg.thumbUrl,
        title: msg.title,
      })
      await contact.say(miniProgram)
    } else if (msg.type === 7 && msg.url) {
      // 本地文件
      const obj = FileBox.fromFile(msg.url)
      await contact.say(obj)
    }
  } catch (e) {
    log.warn('私聊发送消息失败', msg, e)
  }
}
