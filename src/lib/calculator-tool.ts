export interface CalculatorHistoryEntry {
  expression: string
  result: string
}

export interface CalculatorQuickResult {
  label: string
  value: string
}

function tokenize(expression: string) {
  const tokens: string[] = []
  let current = ''

  const pushCurrent = () => {
    if (current) {
      tokens.push(current)
      current = ''
    }
  }

  for (const char of expression.replaceAll(/\s+/g, '')) {
    if (/\d|\./.test(char)) {
      current += char
      continue
    }

    pushCurrent()

    if ('+-*/()%'.includes(char)) {
      tokens.push(char)
      continue
    }

    throw new Error(`不支持的字符：${char}`)
  }

  pushCurrent()
  return tokens
}

function precedence(operator: string) {
  if (operator === '+' || operator === '-') {
    return 1
  }

  if (operator === '*' || operator === '/') {
    return 2
  }

  if (operator === '%') {
    return 3
  }

  return 0
}

function toRpn(tokens: string[]) {
  const output: string[] = []
  const operators: string[] = []
  let previousToken = ''

  for (const token of tokens) {
    if (!Number.isNaN(Number(token))) {
      output.push(token)
      previousToken = token
      continue
    }

    if (token === '(') {
      operators.push(token)
      previousToken = token
      continue
    }

    if (token === ')') {
      while (operators.length && operators[operators.length - 1] !== '(') {
        output.push(operators.pop() as string)
      }

      if (!operators.length) {
        throw new Error('括号不匹配')
      }

      operators.pop()
      previousToken = token
      continue
    }

    if (token === '-' && (!previousToken || '()+-*/%'.includes(previousToken))) {
      output.push('0')
    }

    while (
      operators.length &&
      operators[operators.length - 1] !== '(' &&
      precedence(operators[operators.length - 1]) >= precedence(token)
    ) {
      output.push(operators.pop() as string)
    }

    operators.push(token)
    previousToken = token
  }

  while (operators.length) {
    const operator = operators.pop() as string

    if (operator === '(') {
      throw new Error('括号不匹配')
    }

    output.push(operator)
  }

  return output
}

function evalRpn(tokens: string[]) {
  const stack: number[] = []

  for (const token of tokens) {
    if (!Number.isNaN(Number(token))) {
      stack.push(Number(token))
      continue
    }

    const right = stack.pop()
    const left = stack.pop()

    if (left === undefined || right === undefined) {
      throw new Error('表达式不完整')
    }

    if (token === '+') {
      stack.push(left + right)
    } else if (token === '-') {
      stack.push(left - right)
    } else if (token === '*') {
      stack.push(left * right)
    } else if (token === '/') {
      if (right === 0) {
        throw new Error('除数不能为 0')
      }

      stack.push(left / right)
    } else if (token === '%') {
      stack.push(left % right)
    } else {
      throw new Error(`不支持的运算符：${token}`)
    }
  }

  if (stack.length !== 1) {
    throw new Error('表达式无效')
  }

  return stack[0]
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) {
    throw new Error('结果无效')
  }

  const rounded = Number(value.toFixed(10))
  return Number.isInteger(rounded) ? String(rounded) : String(rounded)
}

export function evaluateExpression(expression: string) {
  if (!expression.trim()) {
    return ''
  }

  const normalized = expression.replaceAll(/(\d+(?:\.\d+)?)%/g, '($1/100)')
  const result = evalRpn(toRpn(tokenize(normalized)))
  return formatNumber(result)
}

export function buildDiscountResult(price: number, discountPercent: number): CalculatorQuickResult[] {
  const payable = price * (1 - discountPercent / 100)
  const saved = price - payable

  return [
    { label: '原价', value: formatNumber(price) },
    { label: '折后价', value: formatNumber(payable) },
    { label: '优惠金额', value: formatNumber(saved) },
  ]
}

export function buildTaxResult(amount: number, taxPercent: number): CalculatorQuickResult[] {
  const tax = amount * (taxPercent / 100)
  const total = amount + tax

  return [
    { label: '未税金额', value: formatNumber(amount) },
    { label: '税额', value: formatNumber(tax) },
    { label: '含税总额', value: formatNumber(total) },
  ]
}

export function buildSplitResult(total: number, people: number): CalculatorQuickResult[] {
  if (people <= 0) {
    throw new Error('人数必须大于 0')
  }

  return [
    { label: '总金额', value: formatNumber(total) },
    { label: '人数', value: formatNumber(people) },
    { label: '人均', value: formatNumber(total / people) },
  ]
}
