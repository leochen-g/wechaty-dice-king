import { log } from 'wechaty'
import { exec } from './dicBot'
import path from 'path'
import fs from 'fs'

const imagePath = path.join(__dirname, '../data/image')
const userImagePath = path.join(__dirname, '../../data/image')

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

function getWeightArray (a: Array<any>): { weight: any[], card: any[] } {
  const weightList: any[] = []
  a.forEach((item, index, array: any[]) => {
    const weightNum: string[] = item.match(/^::[1-9]\d*::/g)
    if (weightNum && weightNum.length) {
      if (weightNum[0].replace(/:/g, '')) {
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
 * 随机抽取卡牌
 * @param a 牌堆
 */
export function randomCard (a: Array<any>) {
  const {
    weight,
    card,
  } = getWeightArray(a)
  const weightArray = arrOverAdd(weight)
  const totalWeight = weightArray[weightArray.length - 1]
  const random = Math.random() * totalWeight
  const arrIndex = getArrIndex(random, weightArray)
  return card[arrIndex]
}

/*
   * 占位符替换函数。占位符支持嵌套表达式，如a.b.c
   * str:字串模板
   * prefix:占位符前缀
   * surfix:占位符后缀
   * obj:数据对象
   */
export function replaceHolder (str: any, prefix: any, surfix: any, obj: any, name: string, self: string) {
  let ret = ''
  let p1 = 0
  let p2 = 0
  while (true) {
    p1 = str.indexOf(prefix, p2) // 匹配不到前缀直接返回
    if (p1 === -1) break

    if (p1 > p2) ret += str.substring(p2, p1)

    p2 = str.indexOf(surfix, p1 + prefix.length)
    if (p2 === -1) break

    const holder = str.substring(p1 + prefix.length, p2)
    // const nests = holder.split('.') // 暂时用不上，用于嵌套对象
    let val = obj
    let temp = ''
    try {
      temp = randomCard(val[holder])
      val = replaceAllPlaceholder(obj, temp, name, self)
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

export function replaceCoc (str: any, prefix: any, surfix: any) {
  let ret = ''
  let p1 = 0
  let p2 = 0
  while (true) {
    p1 = str.indexOf(prefix, p2) // 匹配不到前缀直接返回
    if (p1 === -1) break

    if (p1 > p2) ret += str.substring(p2, p1)

    p2 = str.indexOf(surfix, p1 + prefix.length)
    if (p2 === -1) break
    let holder = str.substring(p1 + prefix.length, p2)
    if (!holder.includes('d')) {
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

function replaceAllPlaceholder (allCard: { [index: string]: any }, replaceStr: string, name: string, self: string) {
  let temp = replaceStr.replace('{self}', self).replace('{at}', name)
  temp = replaceHolder(temp, '{%', '}', allCard, name, self)
  temp = replaceHolder(temp, '{', '}', allCard, name, self)
  temp = replaceCoc(temp, '[', ']')
  return temp
}

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
      if (!fs.existsSync(path)) {
        path = holder.startsWith('/') ? userImagePath + holder : imagePath + '/' + holder
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

export function generatorCard (allCard: { [index: string]: any }, key: string, name: string, self: string) {
  const card = randomCard(allCard[key])
  console.log('card', card)
  const replace = replaceAllPlaceholder(allCard, card, name, self).replace('<', '【').replace('>', '】')
  return replaceImage(replace, '[CQ:image,file=', ']')
}

export function getLastNumberStr (str: string):string {
  const strs = str.replace(/[^/d]/g, '|')
  const strsArr = strs.split('|')
  return strsArr[strsArr.length - 1]
}
