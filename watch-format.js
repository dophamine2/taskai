// Перевод текстовой записи LaTeX/KaTeX в обозначения, которые затем фильтрует watchChunks.
// Это преобразование текста, а не вычисление или решение формулы.
function formatWatchInput(raw) {
  const unsupported = new Set()
  const symbols = {
    cdot: '·', times: '×', div: ':', pm: '±', mp: '-/+',
    le: '<=', leq: '<=', ge: '>=', geq: '>=', ne: '!=', neq: '!=',
    approx: '~', sim: '~', simeq: '~=', equiv: '=', infty: 'беск',
    to: '->', rightarrow: '->', leftarrow: '<-', leftrightarrow: '<->',
    Rightarrow: '=>', Leftarrow: '<=', Leftrightarrow: '<=>',
    in: ' прин ', notin: ' не прин ', cup: ' U ', cap: ' пересеч ',
    subset: ' подмн ', supset: ' надмн ', emptyset: 'пусто', varnothing: 'пусто',
    forall: 'для любого ', exists: 'существует ', neg: 'не ', land: ' и ', lor: ' или ',
    sum: 'сумма', prod: 'произв', int: 'интеграл', partial: 'd', nabla: 'набла',
    angle: 'угол ', perp: ' перп ', parallel: ' парал ', degree: '°', circ: '°',
    ldots: '...', cdots: '...', dots: '...', lbrace: '{', rbrace: '}',
    lvert: '|', rvert: '|', vert: '|', colon: ':', quad: ' ', qquad: ' ',
    sin: 'sin', cos: 'cos', tan: 'tan', cot: 'cot', tg: 'tg', ctg: 'ctg',
    log: 'log', ln: 'ln', exp: 'exp', lim: 'lim', min: 'min', max: 'max',
    alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ε',
    zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'θ', iota: 'ι', kappa: 'κ',
    lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', omicron: 'ο', pi: 'π', varpi: 'π',
    rho: 'ρ', varrho: 'ρ', sigma: 'σ', varsigma: 'σ', tau: 'τ', upsilon: 'υ',
    phi: 'φ', varphi: 'φ', chi: 'χ', psi: 'ψ', omega: 'ω',
    Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π',
    Sigma: 'Σ', Upsilon: 'Υ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω'
  }
  const wrappers = new Set(['text', 'textrm', 'textnormal', 'textbf', 'textit', 'mathrm',
    'mathbf', 'mathit', 'mathsf', 'mathtt', 'mathcal', 'mathbb', 'operatorname', 'boxed',
    'mbox', 'underline', 'overline', 'displaystyle', 'textstyle'])
  let source = String(raw)
    .replace(/\r\n?/g, '\n')
    .replace(/^[ \t]*```[^\n]*$/gm, '')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/\$\$([\s\S]*?)\$\$|(?<!\\)\$([^$\n]+)(?<!\\)\$/g, (_, block, inline) => block ?? inline)
    .replace(/\\[()[\]]/g, '')
    .replace(/\\(?:begin|end)\s*\{(?:aligned\*?|align\*?|gather\*?|equation\*?|cases|[bpBvV]?matrix)\}/g, '\n')
    .replace(/^[ \t]*#{1,6}[ \t]+/gm, '')
    .replace(/\*\*|__/g, '')
    .replace(/\[([^\]\n]+)\]\([^\n)]*\)/g, '$1')
  if (/\\begin\s*\{(?:aligned\*?|align\*?|cases|[bpBvV]?matrix)\}/.test(String(raw))) source = source.replace(/&/g, ' ')

  function convert(input, depth = 0) {
    // Ограничение вложенности защищает ввод от переполнения стека.
    if (depth > 40) { unsupported.add('глубокая вложенность'); return input }
    let i = 0, out = ''
    const skipSpace = () => { while (/\s/.test(input[i] || '') && i < input.length) i++ }
    const group = (open = '{', close = '}') => {
      skipSpace()
      if (input[i] !== open) return null
      const start = ++i
      let level = 1
      while (i < input.length && level) {
        if (input[i] === '\\') { i += 2; continue }
        if (input[i] === open) level++
        if (input[i] === close) level--
        if (level) i++
      }
      const body = input.slice(start, i)
      if (level) unsupported.add('незакрытая скобка')
      else i++
      return convert(body, depth + 1)
    }
    const argument = () => {
      const body = group()
      if (body !== null) return body
      if (i >= input.length) { unsupported.add('пропущенный аргумент'); return '' }
      if (input[i] === '\\') return command()
      return input[i++]
    }
    const factor = value => /^[\p{L}\p{N}.,_]+$/u.test(value) ? value : '(' + value + ')'
    const command = () => {
      i++
      if (input[i] === '\\') { i++; return '\n' }
      const match = /^[a-zA-Z]+/.exec(input.slice(i))
      if (!match) {
        const ch = input[i++] || ''
        return /[,;: ]/.test(ch) ? ' ' : ch === '!' ? '' : ch
      }
      const name = match[0]
      i += name.length
      if (['frac', 'dfrac', 'tfrac'].includes(name)) return factor(argument()) + '/' + factor(argument())
      if (name === 'sqrt') {
        const degree = group('[', ']')
        return 'кр' + (degree && degree !== '2' ? degree : '') + '(' + argument() + ')'
      }
      if (name === 'vec' || name === 'overrightarrow') return argument() + '->'
      if (name === 'overleftarrow') return argument() + '<-'
      if (name === 'pmod') return '(mod ' + argument() + ')'
      if (name === 'bmod') return ' mod '
      if (name === 'left' || name === 'right' || name === 'middle') {
        skipSpace()
        if (input[i] === '.') i++
        return ''
      }
      if (name === 'displaystyle' || name === 'textstyle') return ''
      if (wrappers.has(name)) return argument()
      if (Object.hasOwn(symbols, name)) return symbols[name]
      unsupported.add('\\' + name)
      // Незнакомую команду оставляем видимой, чтобы её можно было проверить в предпросмотре.
      return name
    }
    while (i < input.length) {
      const ch = input[i]
      if (ch === '\\') { out += command(); continue }
      if (ch === '^' || ch === '_') {
        i++
        const value = argument()
        out += ch === '^' && value === '2' ? '²'
          : ch === '^' && value === '3' ? '³'
          : ch + factor(value)
        continue
      }
      out += ch
      i++
    }
    return out
  }
  const text = convert(source)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { text, unsupported: [...unsupported] }
}
