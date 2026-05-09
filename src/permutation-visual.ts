const GRID_COLUMNS = 72
const GRID_ROWS = 34
const CELL_SIZE = 7
const GAP = 3
const SVG_WIDTH = GRID_COLUMNS * (CELL_SIZE + GAP) + GAP
const SVG_HEIGHT = GRID_ROWS * (CELL_SIZE + GAP) + GAP

type VisualBlock = {
  x: number
  y: number
  w: number
  h: number
}

type VisualModel = {
  labelLeft: string
  labelRight: string
  trackedCells: Set<string>
  destinationBlocks: VisualBlock[]
  flowTargets: Array<{ startColumn: number; endColumn: number; endRow: number }>
  seed: number
}

const defaultTrackedCells = new Set([
  '6:18',
  '7:18',
  '8:18',
  '9:18',
  '10:18',
  '11:18',
  '12:18',
  '13:18',
  '14:18',
  '15:18',
])

const defaultDestinationBlocks: VisualBlock[] = [
  { x: 52, y: 2, w: 4, h: 4 },
  { x: 56, y: 2, w: 3, h: 3 },
  { x: 59, y: 2, w: 5, h: 4 },
  { x: 64, y: 2, w: 3, h: 2 },
  { x: 67, y: 2, w: 4, h: 5 },
  { x: 61, y: 6, w: 4, h: 2 },
  { x: 70, y: 7, w: 2, h: 2 },
  { x: 55, y: 12, w: 4, h: 5 },
  { x: 59, y: 15, w: 3, h: 4 },
  { x: 63, y: 13, w: 2, h: 5 },
  { x: 66, y: 18, w: 7, h: 7 },
  { x: 54, y: 27, w: 9, h: 7 },
  { x: 64, y: 31, w: 4, h: 3 },
]

const defaultModel: VisualModel = {
  labelLeft: 'entrada ordenada',
  labelRight: 'posições permutadas',
  trackedCells: defaultTrackedCells,
  destinationBlocks: defaultDestinationBlocks,
  flowTargets: [
    { startColumn: 6, endColumn: 57, endRow: 16 },
    { startColumn: 9, endColumn: 60, endRow: 20 },
    { startColumn: 12, endColumn: 65, endRow: 12 },
  ],
  seed: 97,
}

const isInsideBlock = (column: number, row: number, destinationBlocks: VisualBlock[]) =>
  destinationBlocks.some(
    (block) =>
      column >= block.x &&
      column < block.x + block.w &&
      row >= block.y &&
      row < block.y + block.h,
  )

const cellColor = (column: number, row: number, model: VisualModel) => {
  if (model.trackedCells.has(`${column}:${row}`)) {
    return '#25f4c7'
  }

  if (isInsideBlock(column, row, model.destinationBlocks)) {
    return '#6b8f00'
  }

  if (column > 56 && (column + row + model.seed) % 3 !== 0) {
    return '#8aa000'
  }

  if ((column * 11 + row * 17 + model.seed) % 97 === 0) {
    return '#9aa400'
  }

  return column < 58 ? '#009a50' : '#486900'
}

const renderCells = (model: VisualModel) => {
  const cells: string[] = []

  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let column = 0; column < GRID_COLUMNS; column += 1) {
      const x = GAP + column * (CELL_SIZE + GAP)
      const y = GAP + row * (CELL_SIZE + GAP)

      cells.push(
        `<rect x="${x}" y="${y}" width="${CELL_SIZE}" height="${CELL_SIZE}" rx="1" fill="${cellColor(
          column,
          row,
          model,
        )}" />`,
      )
    }
  }

  return cells.join('')
}

const renderTrackedFlow = (model: VisualModel) => {
  const startY = GAP + 18 * (CELL_SIZE + GAP) + CELL_SIZE / 2
  const paths = model.flowTargets.map((target, index) => {
    const startX = GAP + target.startColumn * (CELL_SIZE + GAP)
    const endX = GAP + target.endColumn * (CELL_SIZE + GAP)
    const endY = GAP + target.endRow * (CELL_SIZE + GAP) + CELL_SIZE / 2
    const curveLift = index % 2 === 0 ? -28 - index * 8 : 34 + index * 7

    return `M ${startX} ${startY} C ${startX + 180} ${startY + curveLift}, ${endX - 120} ${
      endY - curveLift
    }, ${endX} ${endY}`
  })

  return paths
    .map(
      (path, index) =>
        `<path d="${path}" fill="none" stroke="${index === 0 ? '#25f4c7' : '#8cffdf'}" stroke-width="3" stroke-linecap="round" opacity="0.85" />`,
    )
    .join('')
}

const renderVisual = (model: VisualModel) => `
  <svg class="permutation-svg" viewBox="0 0 ${SVG_WIDTH} ${SVG_HEIGHT}" role="img" aria-labelledby="permutation-title permutation-desc">
    <title id="permutation-title">Visualização da permutação Tesseract-8D</title>
    <desc id="permutation-desc">Grade de bytes mostrando uma faixa de entrada sendo espalhada para posições diferentes depois das rodadas.</desc>
    <rect width="${SVG_WIDTH}" height="${SVG_HEIGHT}" rx="18" fill="#020604" />
    ${renderCells(model)}
    <g opacity="0.95">
      ${renderTrackedFlow(model)}
    </g>
    <rect x="12" y="12" width="208" height="28" rx="14" fill="#020604" opacity="0.78" />
    <text x="24" y="31" fill="#cffff3" font-family="ui-monospace, Consolas, monospace" font-size="13">${model.labelLeft}</text>
    <rect x="${SVG_WIDTH - 240}" y="12" width="218" height="28" rx="14" fill="#020604" opacity="0.78" />
    <text x="${SVG_WIDTH - 226}" y="31" fill="#e7ff9c" font-family="ui-monospace, Consolas, monospace" font-size="13">${model.labelRight}</text>
  </svg>
`

const bytesFromHex = (hex: string): Uint8Array => {
  const output = new Uint8Array(Math.floor(hex.length / 2))

  for (let index = 0; index < output.length; index += 1) {
    output[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  }

  return output
}

const payloadCiphertextBytes = (payload: string): Uint8Array => {
  const [, , ciphertextHex] = payload.split(':')

  if (!ciphertextHex || /[^0-9a-f]/i.test(ciphertextHex)) {
    return new Uint8Array()
  }

  return bytesFromHex(ciphertextHex)
}

const checksum = (bytes: Uint8Array): number =>
  bytes.reduce((sum, byte, index) => (sum + byte * (index + 1)) % 997, 0)

const buildEncryptionModel = (plaintext: string, payload: string): VisualModel => {
  const ciphertext = payloadCiphertextBytes(payload)
  const trackedCount = Math.min(Math.max(plaintext.length, 6), 18)
  const trackedCells = new Set<string>()

  for (let index = 0; index < trackedCount; index += 1) {
    trackedCells.add(`${4 + index}:18`)
  }

  const seed = checksum(ciphertext) + plaintext.length * 13
  const destinationBlocks: VisualBlock[] = Array.from({ length: Math.min(18, Math.max(8, ciphertext.length)) }, (_, index) => {
    const byte = ciphertext[index % Math.max(1, ciphertext.length)] ?? seed
    const next = ciphertext[(index + 5) % Math.max(1, ciphertext.length)] ?? seed
    return {
      x: 50 + ((byte + index * 7) % 21),
      y: 2 + ((next + index * 11) % 30),
      w: 2 + (byte % 6),
      h: 2 + (next % 6),
    }
  })

  const flowTargets = Array.from({ length: 6 }, (_, index) => {
    const byte = ciphertext[index % Math.max(1, ciphertext.length)] ?? seed
    return {
      startColumn: 4 + index * 2,
      endColumn: 50 + ((byte + index * 9) % 21),
      endRow: 4 + ((byte + index * 13) % 27),
    }
  })

  return {
    labelLeft: `${plaintext.length || 1} bytes de entrada`,
    labelRight: `${ciphertext.length} bytes cifrados`,
    trackedCells,
    destinationBlocks,
    flowTargets,
    seed,
  }
}

export const createEncryptionPermutationVisual = (plaintext: string, payload: string): string =>
  renderVisual(buildEncryptionModel(plaintext, payload))

export const permutationVisualSvg = renderVisual(defaultModel)
