const operators = new Map<string, number>([
  ['+', 1],
  ['-', 1],
  ['*', 2],
  ['X', 2],
  ['/', 2],
  ['D', 3],
  ['d', 3],
])

export const dice = (n: number, d: number): number => {
  let result: number = 0
  for (let i = 0; i < n; i++) {
    result += Math.floor(Math.random() * d) + 1
  }
  return result
}

const tokens = (src: string): string[] => {
  const result: string[] = ['']
  src = src.startsWith('d') || src.startsWith('D') ? `1${src}` : src
  for (const c of src) {
    if (operators.get(c) || c === '(' || c === ')') {
      if (result[result.length - 1].length > 0 && isNaN(Number(result[result.length - 1])) && (c === 'D' || c === 'd')) {
        result[result.length - 1] += c
      } else {
        if (result[result.length - 1] === '') {
          // 兼容 非规范的格式 例如 d100 + d200
          if (c === 'd' || c === 'D') {
            if (operators.get(result[result.length - 2])) {
              result.splice(result.length - 1, 0, '1')
            }
          }
          result[result.length - 1] = c
        } else {
          result.push(c)
        }
        result.push('')
      }
    } else {
      result[result.length - 1] += c
    }
  }
  return result
}

const rpn = (tokens: string[]): string[] => {
  const ops: string[] = []
  const result: string[] = []

  for (const token of tokens) {
    const opPriority = operators.get(token)
    if (opPriority) {
      while (ops.length > 0) {
        if (opPriority <= (operators.get(ops[ops.length - 1]) || 0)) {
          result.push(ops.pop() || '')
        } else {
          break
        }
      }
      ops.push(token)
    } else if (token === '(') {
      ops.push(token)
    } else if (token === ')') {
      while (ops[ops.length - 1] !== '(') {
        result.push(ops.pop() || '')
        if (ops.length < 1) {
          return []
        }
      }
      ops.pop()
    } else {
      result.push(token)
    }
  }

  while (ops.length > 0) {
    const op = ops.pop() || ''
    if (op === '(') {
      return []
    } else {
      result.push(op)
    }
  }
  return result
}

const calc = (rpnTokens: string[], vars: Map<string, number>): string | number | undefined => {
  const stack: (string | number)[] = []
  for (const token of rpnTokens) {
    if (operators.get(token)) {
      const v2 = Number(stack.pop())
      const v1 = Number(stack.pop())
      switch (token) {
        case '+':
          stack.push((v1 + v2))
          break
        case '-':
          stack.push((v1 - v2))
          break
        case '*':
        case 'X':
          stack.push((v1 * v2))
          break
        case '/':
          stack.push((v1 / v2))
          break
        case 'D':
        case 'd':
          if (v1 > 100) {
            stack.push('【太多骰子了，被淹没了也骰不出来】')
          } else if (v2 > 1000) {
            stack.push('【让我数数骰子有多少面先~1...2...】')
          } else {
            stack.push(dice(v1, v2))
          }
          break
      }
    } else {
      if (token[0] === '$') {
        const v = vars.get(token.slice(1))
        if (v || v === 0) {
          stack.push(v)
        } else {
          stack.push(NaN)
        }
      } else {
        stack.push(token)
      }
    }
  }
  return stack.pop()
}

export const exec = (exp: string, vars: Map<string, number>): number | string | undefined => calc(rpn(tokens(exp)), vars)
