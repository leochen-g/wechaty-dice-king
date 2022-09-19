import { contactSay, delay, Ireply } from '../service/talker.js'
import fs from 'fs'
import path from 'path'
import { log, Room } from 'wechaty'
import { loadFileContent, mkdirsSync } from '../utils/index.js'
import RootPath from "app-root-path"

/**
 * 指令参数为空 默认回复
 */
const OB_TIPS = '旁观模式：.ob (exit/list/clr/on/off)\n'
  + '.ob //加入旁观可以看到他人暗骰结果，必须加骰王为好友才能知道结果\n'
  + '.ob exit //退出旁观模式\n'
  + '.ob list //查看群内旁观者\n'
  + '.ob clr //清除所有旁观者\n'
  + '.ob on //全群允许旁观模式\n'
  + '.ob off //禁用旁观模式\n'
  + '暗骰与旁观仅在群聊中有效'

/**
 * 添加旁观
 * @param isRoom 是否为群消息
 * @param name 群成员名
 * @param roomName 群名
 */
export async function addOb ({ isRoom, name, roomName }:{isRoom: boolean, name: string, roomName: string}): Promise<Ireply[]> {
  if (!isRoom) {
    return [{
      content: OB_TIPS,
      type: 1,
    }]
  }
  return  await updateObserver({ isDelete: false, isDeleteAll: false, name,  roomName })
}

/**
 * 清除旁观
 * @param isRoom
 * @param name
 * @param roomName
 * @param deleteAll
 */

export async function clearOb ({ isRoom, name, roomName, deleteAll }:{isRoom: boolean, name: string, roomName: string, deleteAll: boolean}): Promise<Ireply[]> {
  if (!isRoom) {
    return [{
      content: OB_TIPS,
      type: 1,
    }]
  }
  return  await updateObserver({ isDelete: true, isDeleteAll: deleteAll, name,  roomName })
}

/**
 * 获取
 * @param isRoom
 * @param name
 * @param roomName
 */
export async function getObList ({ isRoom, roomName }:{isRoom: boolean, roomName: string}): Promise<Ireply[]> {
  if (!isRoom) {
    return [{
      content: OB_TIPS,
      type: 1,
    }]
  }
  const obList = await getObservers({ roomName })
  if (obList.length) {
    return [{ content: `当前${roomName}的旁观者有:\n ${obList.join('\n')}`, type: 1 }]
  }
  return  [{ content: `当前${roomName}暂无旁观者`, type: 1 }]
}

/**
 * 获取配置文件中的的旁观者
 * @param roomName 群名
 */
export async function getObservers ({ roomName }:{roomName: string}) {
  const deckPath = path.join(RootPath.path, '/data/session/room')
  const fileName = `/${roomName}.json`
  if (fs.existsSync(deckPath + fileName)) {
    const defaultContent  = await loadFileContent({ path: deckPath + fileName })
    return defaultContent.observer || []
  }
  return []
}

/**
 * 新增或更新旁观者
 * @param name 群成员name
 * @param isDelete 是否删除旁观
 * @param isDeleteAll 是否删除全部旁观
 * @param roomName 群名
 */
export async function updateObserver ({ name, isDelete = false, isDeleteAll = false, roomName }: {name:string, isDelete: boolean, isDeleteAll: boolean, roomName: string }): Promise<Ireply[]> {
  const deckPath = path.join(RootPath.path, '/data/session/room')
  const fileName = `/${roomName}.json`
  try {
    if (fs.existsSync(deckPath + fileName)) {
      const defaultContent  = await loadFileContent({ path: deckPath + fileName })
      if (!defaultContent.observerStats) {
        return [{ content: `${roomName}的旁观模式已经被禁用!`, type: 1 }]
      }
      if (isDelete) { // 清除旁观
        if (isDeleteAll) { // 删除所有旁观者
          defaultContent.observer = []
          defaultContent.update_time = new Date().getTime()
          fs.writeFileSync(deckPath + fileName, JSON.stringify(defaultContent, null, '\t'))
          return [{ content:`成功清除${roomName}所有旁观者√`, type: 1 }]
        } else {
          const obIndex = defaultContent.observer.indexOf(name) // 删除指定旁观者
          if (obIndex > -1) { // 是否删除
            defaultContent.observer.splice(obIndex, 1)
            defaultContent.update_time = new Date().getTime()
            fs.writeFileSync(deckPath + fileName, JSON.stringify(defaultContent, null, '\t'))
            return [{ content: `【${name}】成功退出${roomName}的旁观√`, type: 1 }]
          } else {
            return [{ content: `【${name}】没有加入${roomName}的旁观模式!`, type: 1 }]
          }
        }
      } else { // 添加旁观
        if (defaultContent.observer.includes(name)) {
          return [{ content: `【${name}】已经处于${roomName}的旁观模式!`, type: 1 }]
        } else {
          defaultContent.observer.push(name)
          defaultContent.update_time = new Date().getTime()
          fs.writeFileSync(deckPath + fileName, JSON.stringify(defaultContent, null, '\t'))
          return [{ content: `${name}成功加入${roomName}的旁观√`, type: 1 }]
        }
      }
    } else {
      mkdirsSync(deckPath)
      const finalContent: { [index: string]: any, decks: {
          [index: string]: any
        } } = { creat_time: new Date().getTime(), decks: {},  name, observer: [], observerStats: true, type: 'simple', update_time: new Date().getTime()  }
      finalContent['observer'].push(name)
      fs.writeFileSync(deckPath + fileName, JSON.stringify(finalContent, null, '\t'))
      return [{ content: `${name}成功加入${roomName}的旁观√`, type: 1 }]
    }
  } catch (e) {
    log.error('写入旁观数据失败', e)
    return []
  }
}

/**
 * 更新旁观状态
 * @param name 群成员名
 * @param roomName 群名
 * @param offOb 是否关闭旁观
 * @param isRoom 是否为群消息
 */
export async function updateObserverStats ({ name, roomName, offOb = false, isRoom }: {name:string, offOb: boolean, roomName: string, isRoom: boolean }): Promise<Ireply[]> {
  if (!isRoom) {
    return [{
      content: OB_TIPS,
      type: 1,
    }]
  }
  const deckPath = path.join(RootPath.path, '/data/session/room')
  const fileName = `/${roomName}.json`
  try {
    if (fs.existsSync(deckPath + fileName)) {
      const defaultContent  = await loadFileContent({ path: deckPath + fileName })
      if (defaultContent.observerStats) { // 默认是开启的
        if (offOb) { // 关闭
          defaultContent.observerStats = false
          defaultContent.update_time = new Date().getTime()
          fs.writeFileSync(deckPath + fileName, JSON.stringify(defaultContent, null, '\t'))
          return [{ content: `${roomName}旁观模式已经被禁用!`, type: 1 }]
        } else { // 开启
          return [{ content: `${roomName}旁观模式没有被禁用!`, type: 1 }]
        }
      } else { // 默认是关闭
        if (!offOb) { // 开启
          defaultContent.observerStats = true
          defaultContent.update_time = new Date().getTime()
          fs.writeFileSync(deckPath + fileName, JSON.stringify(defaultContent, null, '\t'))
          return [{ content: `${roomName}旁观模式已经启用!`, type: 1 }]
        } else { // 关闭
          return [{ content: `${roomName}旁观模式已经被禁用!`, type: 1 }]
        }
      }
    } else {
      mkdirsSync(deckPath)
      const finalContent: { [index: string]: any, decks: {
          [index: string]: any
        } } = { creat_time: new Date().getTime(), decks: {},  name, observer: [], observerStats: true, type: 'simple', update_time: new Date().getTime()  }
      if (!offOb) { // 关闭旁观为false
        finalContent['observer'].push(name)
        fs.writeFileSync(deckPath + fileName, JSON.stringify(finalContent, null, '\t'))
        return [{ content: `${name}成功加入${roomName}的旁观√`, type: 1 }]
      } else { // 关闭旁观为true
        fs.writeFileSync(deckPath + fileName, JSON.stringify(finalContent, null, '\t'))
        return [{ content: `${roomName}旁观模式已经被禁用!`, type: 1 }]
      }
    }
  } catch (e) {
    log.error('更新旁观状态失败', e)
    return []
  }
}

/**
 * 旁观者获取暗抽的结果
 * @param roomName
 * @param room
 * @param replys
 * @param userName
 */
export async function obGetPrivateCard ({ roomName, room, replys, userName  }: { room: Room, roomName: string, replys: Ireply[], userName: string}) {
  const observers = await getObservers({ roomName })
  if (observers.length) {
    for (let i = 0; i < observers.length; i++) {
      const name = observers[i]
      const contact = await room.member({ name })
      if (contact) {
        await contactSay(contact, { content: `在${roomName}中 来看看${userName}抽到了什么:`, type: 1 })
        for (const reply of replys) {
          await delay(1000)
          await contactSay(contact, reply)
        }
      }
      log.info(`好友中不存在旁观者${name}，请加骰王为好友后再开启旁观`)
    }
  }
}
