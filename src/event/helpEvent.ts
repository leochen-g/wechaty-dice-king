import { fuzzyQuery, generatorMod } from '../utils'
import { Ireply } from '../service/talker'
import fs from 'fs'
import path from 'path'
import { log } from 'wechaty'
import { getAllDrawDirective, getUserDrawDirective } from './drawEvent'
import { chunk } from 'lodash'

/**
 * 指令参数为空 默认回复
 */
const HELP_TIPS = 'Wechaty Dice! by Leo_chen\n'
  + '.help协议 确认服务协议\n'
  + '.help指令 查看指令列表\n'
  + '.help群管 查看群管指令\n'
  + '.help设定 确认骰王设定\n'
  + '.help链接 查看源码文档\n'

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
    finalContent = Object.assign({}, finalContent, content.default.helpdoc)
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
