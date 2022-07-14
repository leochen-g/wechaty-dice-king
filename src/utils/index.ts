import { log } from 'wechaty'
import { exec } from './dicBot'
import Sampler from 'random-sampler'
import type { Ireply } from '../service/talker'
import path from 'path'
import RootPath  from 'app-root-path'
import fs from 'fs'
import { upCreatDeck } from '../event/deckEvent'

const imagePath = path.join(__dirname, '../data/image')
const userImagePath = path.join(RootPath.path, '/data/image')

// 数组元素叠加 [1,2,3,4,,] -> [1,3,6,10,,,,]
// @ts-ignore
function arrOverAdd (arr: any) {
  if (!arr || arr.length <= 0) {
    return []
  } else {
    const temp: any = []
    for (let i = 0; i < arr.length; i++) {
      if (i === 0) {
        temp[i] = parseInt(arr[i])
      } else {
        temp[i] = temp[i - 1] + parseInt(arr[i])
      }
    }
    return temp
  }
}

/**
 * 获取数组中最接近的值得index
 * @param random 随机数
 * @param weightArray 权重数组
 * @returns {number}
 */
// @ts-ignore
function getArrIndex (random: number, weightArray: any[]) {
  let index = 0
  if (random <= weightArray[0]) {
    return 0
  } else if (random >= weightArray[weightArray.length - 1]) {
    index = weightArray.length - 1
    return index
  } else {
    for (let i = 0; i < weightArray.length; i++) {
      if (random <= weightArray[i]) {
        index = i
      } else if (random > weightArray[i] && random <= weightArray[i + 1]) {
        index = i + 1
        break
      } else if (random > weightArray[i] && random <= weightArray[i + 1]) {
        index = i + 1
        break
      }
    }
  }
  return index
}

/**
 * 获取权重 ::50:: 50代表牌堆数
 * @param a 牌堆
 */
// @ts-ignore
function getWeightArray (a: Array<any>): { weight: any[], card: any[] } {
  const weightList: any[] = []
  a.forEach((item, index, array: any[]) => {
    const weightNum: string[] = item.match(/^::[1-9]\d*::/g)
    if (weightNum && weightNum.length) {
      if (weightNum[0]?.replace(/:/g, '')) {
        weightList[index] = parseInt(weightNum[0].replace(/:/g, ''))
        array[index] = item.replace(weightNum[0], '')
      } else {
        weightList[index] = 1
      }
    } else {
      weightList[index] = 1
    }
  })
  return {
    card: a,
    weight: weightList,
  }
}

/**
 * 获取每个条目的权重
 * @param element
 */
export function getWeight (element:any) {
  const weightArray: string[] = element.match(/^::[1-9]\d*::/g) || ['::1::']
  const weightNum: string = weightArray[0]?.replace(/:/g, '') || '1'
  return parseInt(weightNum)
}

/**
 * 获取权重和处理后的字符
 * @param element
 */

export function getWeightElements (element: any): {element: string, weight: number} {
  const weightArray: string[] = element.match(/^::[1-9]\d*::/g) || ['::1::']
  const weightNum: string = weightArray[0]?.replace(/:/g, '') || '1'
  return {
    element: element.replace(weightArray[0], ''),
    weight: parseInt(weightNum),
  }
}

/**
 * 随机抽取卡牌
 * @param a 牌堆
 */
export function randomCard (a: Array<any>) {
  // const {
  //   weight,
  //   card,
  // } = getWeightArray(a)
  // const weightArray = arrOverAdd(weight)
  // const totalWeight = weightArray[weightArray.length - 1]
  // const random = Math.random() * totalWeight
  // const arrIndex = getArrIndex(random, weightArray)
  const sampler = new Sampler()
  const result = sampler.sample(a, 1, getWeight)
  const weightArray: string[] = result[0].match(/^::[1-9]\d*::/g) || ['::1::']
  const weight = weightArray[0]
  return result[0].replace(weight, '')
}

/**
   * 占位符替换函数。占位符支持嵌套表达式，如a.b.c
   * str:字串模板
   * prefix:占位符前缀
   * surfix:占位符后缀
   * obj:数据对象
   * name: 用户名
    * name: 骰王名
    * needRandom 是否需要随机获取
   */
export function replaceHolder (str: any, prefix: any, surfix: any, obj: any, name: string, self: string, needRandom?:boolean) {
  let ret = ''
  let p1 = 0
  let p2 = 0
  while (true) {
    p1 = str.indexOf(prefix, p2) // 匹配不到前缀直接返回
    if (p1 === -1) break

    if (p1 > p2) ret += str.substring(p2, p1)
    console.log('****', str,  surfix, p1, )
    p2 = str.indexOf(surfix, p1 + prefix.length)
    if (p2 === -1) break

    const holder = str.substring(p1 + prefix.length, p2)
    // const nests = holder.split('.') // 暂时用不上，用于嵌套对象
    let val = obj
    let temp = ''
    try {
      console.log('8888888', holder, val[holder])
      temp = needRandom ? randomCard(val[holder]) : val[holder]
      val = replaceAllPlaceholder(obj, temp, name, self, needRandom)
    } catch (E) {
      log.warn('非法的属性表达式:' + E + holder)
    }
    if (typeof (val) === 'undefined') {
      ret += prefix + holder + surfix
    } else {
      ret += val
    }
    p2 = p2 + surfix.length
  }

  if (p1 === -1) {
    ret += str.substring(p2, str.length)
  } else if (p2 === -1) {
    ret += str.substring(p1, str.length)
  }

  return ret
}

/**
 * 替换COC7e 规则
 * @param str
 * @param prefix
 * @param surfix
 */
export function replaceCoc (str: any, prefix: any, surfix: any) {
  let ret = ''
  let p1 = 0
  let p2 = 0
  console.log('str', str)
  while (true) {
    p1 = str.indexOf(prefix, p2) // 匹配不到前缀直接返回
    if (p1 === -1) break

    if (p1 > p2) ret += str.substring(p2, p1)

    p2 = str.indexOf(surfix, p1 + prefix.length)
    if (p2 === -1) break
    let holder = str.substring(p1 + prefix.length, p2)
    if (!holder.includes('d') && !holder.includes('D')) {
      ret += prefix + holder
      continue
    }
    const vars = new Map<string, number>()

    if (holder.startsWith('d') || holder.startsWith('D')) {
      holder = `1${holder}`
    }
    const val = exec(holder, vars)
    if (typeof (val) === 'undefined') {
      ret += prefix + holder + surfix
    } else {
      ret += val
    }
    p2 = p2 + surfix.length
  }
  if (p1 === -1) {
    ret += str.substring(p2, str.length)
  } else if (p2 === -1) {
    ret += str.substring(p1, str.length)
  }
  return ret
}

/**
 * 替换全部占位内容
 * @param allCard 卡排队map
 * @param replaceStr 需要替换的卡牌
 * @param name 用户名
 * @param self 骰王名
 * @param needRandom 是否需要随机
 */
export function replaceAllPlaceholder (allCard: { [index: string]: any }, replaceStr: string, name: string, self: string, needRandom?:boolean) {
  let temp = replaceStr.replace('{self}', self).replaceAll('{at}', `『${name}』`)
  temp = replaceHolder(temp, '{%', '}', allCard, name, self, needRandom)
  temp = replaceHolder(temp, '{', '}', allCard, name, self, needRandom)
  temp = replaceCoc(temp, '[', ']')
  return temp
}

/**
 * 替换牌堆中的图片内容
 * @param str
 * @param prefix
 * @param surfix
 */
export function replaceImage (str: any, prefix: any, surfix: any) {
  let ret = ''
  let p1 = 0
  let p2 = 0
  const val = ''
  const replys = []
  while (true) {
    p1 = str.indexOf(prefix, p2) // 匹配不到前缀直接返回
    if (p1 === -1) break

    if (p1 > p2) ret += str.substring(p2, p1)

    p2 = str.indexOf(surfix, p1 + prefix.length)
    if (p2 === -1) break
    const holder = str.substring(p1 + prefix.length, p2)
    if (holder.includes('https://') || holder.includes('http://')) {
      replys.push({
        type: 2,
        url: holder,
      })
    } else {
      let path = holder.startsWith('/') ? imagePath + holder : imagePath + '/' + holder
      console.log('存在', fs.existsSync(path))
      if (!fs.existsSync(path)) {
        console.log('userImagePath', userImagePath)
        path = holder.startsWith('/') ? userImagePath + holder : userImagePath + '/' + holder
      }
      replys.push({
        type: 7,
        url: path,
      })
    }
    if (typeof (val) === 'undefined') {
      ret += prefix + holder + surfix
    } else {
      ret += val
    }

    p2 = p2 + surfix.length
  }

  if (p1 === -1) {
    ret += str.substring(p2, str.length)
  } else if (p2 === -1) {
    ret += str.substring(p1, str.length)
  }
  replys.push({
    content: ret,
    type: 1,
  })
  return replys
}

/**
 * 随机抽取卡牌
 * @param allCard
 * @param key
 * @param name
 * @param self
 */
export function generatorCard (allCard: { [index: string]: any }, key: string, name: string, self: string) {
  const card = randomCard(allCard[key])
  const replace = replaceAllPlaceholder(allCard, card, name, self, true).replaceAll('<', '【').replaceAll('>', '】')
  console.log('replace', replace)
  return replaceImage(replace, '[CQ:image,file=', ']')
}

/**
 * 根据key 直接获取帮助文档
 * @param allCard
 * @param key
 * @param name
 * @param self
 */
export function generatorMod (allCard: { [index: string]: any }, key: string, name: string, self: string) {
  const card = allCard[key]
  const replace = replaceAllPlaceholder(allCard, card, name, self, false).replaceAll('<', '【').replaceAll('>', '】')
  return replaceImage(replace, '[CQ:image,file=', ']')
}

/**
 * 使用test方法实现模糊查询
 * @param  {Array}  list     原数组
 * @param  {String} keyWord  查询的关键词
 * @return {Array}           查询的结果
 */
export function fuzzyQuery (list:any[], keyWord: string): any[] {
  const reg =  new RegExp(keyWord)
  const arr = []
  for (let i = 0; i < list.length; i++) {
    if (reg.test(list[i])) {
      arr.push(list[i])
    }
  }
  return arr
}

export function getLastNumberStr (str: string):string {
  const strs = str.replace(/[^/d]/g, '|')
  const strsArr = strs.split('|')
  return strsArr[strsArr.length - 1] || ''
}

/**
 * 同步递归创建目录
 * @param dirname
 */
export function mkdirsSync (dirname:string):boolean {
  try {
    if (fs.existsSync(dirname)) {
      return true
    } else {
      if (mkdirsSync(path.dirname(dirname))) {
        fs.mkdirSync(dirname)
        return true
      }
      return false
    }
  } catch (e) {
    log.error('创建目录失败', e)
    return false
  }
}

/**
 * 读取文件内容
 */
export async function loadFileContent ({ path }:{ path: string}) {
  if (fs.existsSync(path)) {
    const content = await import(path)
    return content.default
  }
  return {}
}

/**
 * 返回实例的随机卡牌
 * @param deckContent
 * @param allCard
 * @param name
 * @param roomName
 * @param isRoom
 * @param keyword
 * @param self
 */
export async function generatorCustomCard ({ allCard, deckContent, isRoom, name, roomName, keyword, self }:{deckContent:{ [index: string]: any }, allCard:{ [index: string]: any }, roomName:string,  name:string, isRoom:boolean, self: string, keyword: string}):Promise<Ireply[]> {
  let { size, idxs, meta } = deckContent
  if (!size) {
    return [{ content: `牌堆【${keyword}】已抽空，请使用.deck reset 牌堆名手动重置牌堆`, type: 1 }]
  }
  let tempList = idxs.splice(0, size)
  const randomIndex = Math.round(Math.random() * (size - 1))
  const randomValue = tempList.splice(randomIndex, 1)[0]
  idxs.unshift(randomValue)
  tempList = tempList.concat(idxs)
  size = size - 1
  idxs = tempList
  await upCreatDeck({ content: { idxs, meta, size   }, deckKey: keyword,   isRoom, name: isRoom ? roomName : name   })
  const randomCard = meta[randomValue]
  const replace = replaceAllPlaceholder(allCard, randomCard, name, self, true).replace('<', '【').replace('>', '】')
  let reply = replaceImage(replace, '[CQ:image,file=', ']')
  reply = reply.map(item => {
    if (item.type === 1) {
      item.content = `来看看${name}抽到了什么：\n${item.content}`
    }
    return item
  })
  if (!size) {
    reply.push({ content: `牌堆【${keyword}】已抽空，请使用.deck reset 抽奖手动重置牌堆`, type: 1 })
  }
  return  reply
}
