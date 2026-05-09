export type Byte = number
export type Coordinate8D = [Byte, Byte, Byte, Byte, Byte, Byte, Byte, Byte]

export const VERSION = 'T8D3'
export const ROUNDS = 24
export const NONCE_SIZE = 16
export const TAG_SIZE = 32
export const HASH_VERSION = 'T8D-HASH-512'
export const HASH_SIZE = 64

const PBKDF2_ITERATIONS = 150_000
const HASH_RATE = 64
const HASH_STATE_SIZE = 128
const DOMAIN_ROUND_KEY = 'T8D-v0.3-round-key'
const DOMAIN_PERMUTATION_KEY = 'T8D-v0.3-permutation-key'
const DOMAIN_MASK_KEY = 'T8D-v0.3-mask-key'
const DOMAIN_TAG = 'T8D-v0.3-tag'
const encoder = new TextEncoder()
const decoder = new TextDecoder()

const asBufferSource = (bytes: Uint8Array): ArrayBuffer =>
  bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer

// Algoritmo experimental e educacional. Não use este protótipo em produção.
export const SBOX_A = new Uint8Array([
  0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
  0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
  0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
  0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
  0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
  0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
  0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
  0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
  0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
  0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
  0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
  0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
  0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
  0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
  0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
  0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16,
])

export const SBOX_B = new Uint8Array(SBOX_A.map((_, index) => SBOX_A[(index * 197 + 73) & 0xff]))

const invertSBox = (sbox: Uint8Array): Uint8Array => {
  const inverse = new Uint8Array(256)

  sbox.forEach((value, index) => {
    inverse[value] = index
  })

  return inverse
}

export const INV_SBOX_A = invertSBox(SBOX_A)
export const INV_SBOX_B = invertSBox(SBOX_B)

export const concatBytes = (...chunks: Uint8Array[]): Uint8Array => {
  const size = chunks.reduce((total, chunk) => total + chunk.length, 0)
  const output = new Uint8Array(size)
  let offset = 0

  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.length
  }

  return output
}

export const toHex = (bytes: Uint8Array): string =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')

export const fromHex = (hex: string): Uint8Array => {
  if (hex.length % 2 !== 0 || /[^0-9a-f]/i.test(hex)) {
    throw new Error('Hexadecimal inválido.')
  }

  const output = new Uint8Array(hex.length / 2)

  for (let index = 0; index < output.length; index += 1) {
    output[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  }

  return output
}

export const constantTimeEqual = (left: Uint8Array, right: Uint8Array): boolean => {
  let difference = left.length ^ right.length
  const size = Math.max(left.length, right.length)

  for (let index = 0; index < size; index += 1) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0)
  }

  return difference === 0
}

const uint32Bytes = (value: number): Uint8Array => {
  const view = new DataView(new ArrayBuffer(4))
  view.setUint32(0, value, false)
  return new Uint8Array(view.buffer)
}

const lengthPrefix = (bytes: Uint8Array): Uint8Array => uint32Bytes(bytes.length)

const sha512 = async (bytes: Uint8Array): Promise<Uint8Array> =>
  new Uint8Array(await crypto.subtle.digest('SHA-512', asBufferSource(bytes)))

const deriveKeys = async (password: string, nonce: Uint8Array) => {
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    asBufferSource(encoder.encode(password)),
    'PBKDF2',
    false,
    ['deriveBits'],
  )
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: asBufferSource(concatBytes(encoder.encode(VERSION), nonce)),
      iterations: PBKDF2_ITERATIONS,
    },
    passwordKey,
    512,
  )
  const derived = new Uint8Array(bits)

  return {
    encryptionKey: derived.slice(0, 32),
    authKey: derived.slice(32, 64),
  }
}

export const expandBytes = async (seed: Uint8Array, size: number): Promise<Uint8Array> => {
  const output = new Uint8Array(size)
  let offset = 0
  let counter = 0
  let previous: Uint8Array = new Uint8Array()

  while (offset < size) {
    const digest = await sha512(concatBytes(seed, previous, uint32Bytes(counter)))
    output.set(digest.slice(0, Math.min(digest.length, size - offset)), offset)
    offset += digest.length
    previous = digest
    counter += 1
  }

  return output
}

const deriveDomainKey = async (
  encryptionKey: Uint8Array,
  nonce: Uint8Array,
  domainSeparator: string,
  round: number,
): Promise<Uint8Array> =>
  sha512(concatBytes(encryptionKey, nonce, encoder.encode(domainSeparator), uint32Bytes(round)))

export const deriveRoundKey = (
  encryptionKey: Uint8Array,
  nonce: Uint8Array,
  round: number,
): Promise<Uint8Array> => deriveDomainKey(encryptionKey, nonce, DOMAIN_ROUND_KEY, round)

const derivePermutationKey = async (
  encryptionKey: Uint8Array,
  nonce: Uint8Array,
  round: number,
  size: number,
): Promise<Uint8Array> => {
  const seed = await deriveDomainKey(encryptionKey, nonce, DOMAIN_PERMUTATION_KEY, round)
  return expandBytes(seed, Math.max(128, size * 8 + 64))
}

const deriveMaskKey = (
  encryptionKey: Uint8Array,
  nonce: Uint8Array,
  round: number,
): Promise<Uint8Array> => deriveDomainKey(encryptionKey, nonce, DOMAIN_MASK_KEY, round)

export const generateTag = async (
  authKey: Uint8Array,
  nonce: Uint8Array,
  ciphertext: Uint8Array,
  associatedData = '',
): Promise<Uint8Array> => {
  const key = await crypto.subtle.importKey(
    'raw',
    asBufferSource(authKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const associatedBytes = encoder.encode(associatedData)
  const data = concatBytes(
    encoder.encode(DOMAIN_TAG),
    lengthPrefix(encoder.encode(VERSION)),
    encoder.encode(VERSION),
    lengthPrefix(nonce),
    nonce,
    lengthPrefix(ciphertext),
    ciphertext,
    lengthPrefix(associatedBytes),
    associatedBytes,
  )

  return new Uint8Array(await crypto.subtle.sign('HMAC', key, asBufferSource(data))).slice(0, TAG_SIZE)
}

export const generateCoordinate8D = (
  roundKey: Uint8Array,
  maskKey: Uint8Array,
  nonce: Uint8Array,
  index: number,
  round: number,
): Coordinate8D => [
  (roundKey[(index + 0) % roundKey.length] ^ nonce[index % nonce.length] ^ round) & 0x7f,
  (maskKey[(index + 11) % maskKey.length] + index + round) & 0x7f,
  (roundKey[(index + 23) % roundKey.length] ^ maskKey[(index + 3) % maskKey.length]) & 0x7f,
  (nonce[(index + 5) % nonce.length] + maskKey[(index + 37) % maskKey.length]) & 0x7f,
  (roundKey[(index + 41) % roundKey.length] ^ (index * 17)) & 0x7f,
  (maskKey[(index + 53) % maskKey.length] + nonce[(index + 9) % nonce.length]) & 0x7f,
  (roundKey[(index + 67) % roundKey.length] ^ roundKey[(index + 19) % roundKey.length]) & 0x7f,
  (maskKey[(index + 79) % maskKey.length] + roundKey[(index + 29) % roundKey.length] + round) & 0x7f,
]

export const rotateDimensions = (
  coordinate: Coordinate8D,
  roundKey: Uint8Array,
  round: number,
): Coordinate8D => {
  const rotated = coordinate.map((value, index) => {
    const displacement = SBOX_B[roundKey[(round + index) % roundKey.length]] & 0x7f
    return (value + displacement) & 0x7f
  })

  return rotated as Coordinate8D
}

export const mixDimensions = (
  coordinate: Coordinate8D,
  roundKey: Uint8Array,
  maskKey: Uint8Array,
  round: number,
): Coordinate8D => {
  const [d1, d2, d3, d4, d5, d6, d7, d8] = coordinate
  const mixed: Coordinate8D = [
    SBOX_B[d1 ^ d5 ^ roundKey[0]] & 0x7f,
    SBOX_B[(d2 + d6 + round) & 0xff] & 0x7f,
    SBOX_B[d3 ^ d7 ^ maskKey[1]] & 0x7f,
    SBOX_B[(d4 + d8 + roundKey[2]) & 0xff] & 0x7f,
    SBOX_B[d5 ^ mixedSource(d1, d3, maskKey[3])] & 0x7f,
    SBOX_B[(d6 + d2 + maskKey[4]) & 0xff] & 0x7f,
    SBOX_B[d7 ^ d4 ^ roundKey[5]] & 0x7f,
    SBOX_B[(d8 + d1 + round + maskKey[6]) & 0xff] & 0x7f,
  ]

  return mixed
}

const mixedSource = (left: Byte, right: Byte, keyByte: Byte): Byte => (left + right + keyByte) & 0xff

export const coordinateMask = (
  coordinate: Coordinate8D,
  maskKey: Uint8Array,
  index: number,
  round: number,
): Byte => {
  const [d1, d2, d3, d4, d5, d6, d7, d8] = coordinate
  const coordinateSum = (d2 + d4 + d6 + d8) & 0xff
  return (
    SBOX_B[coordinateSum] ^
    SBOX_B[(d1 ^ d3 ^ d5 ^ d7 ^ maskKey[index % maskKey.length]) & 0xff] ^
    SBOX_B[(index + round + maskKey[(index + 17) % maskKey.length]) & 0xff]
  ) & 0xff
}

type RandomStream = {
  bytes: Uint8Array
  cursor: number
  fallbackState: number
}

const createRandomStream = (bytes: Uint8Array): RandomStream => {
  let state = 0x9e3779b9

  for (let index = 0; index < bytes.length; index += 1) {
    state = (state ^ ((bytes[index] + index) << ((index % 4) * 8))) >>> 0
    state = Math.imul(state ^ (state >>> 16), 0x85ebca6b) >>> 0
  }

  return { bytes, cursor: 0, fallbackState: state >>> 0 }
}

const nextUint32 = (randomStream: RandomStream): number => {
  if (randomStream.cursor + 4 <= randomStream.bytes.length) {
    const value =
      (randomStream.bytes[randomStream.cursor] << 24) |
      (randomStream.bytes[randomStream.cursor + 1] << 16) |
      (randomStream.bytes[randomStream.cursor + 2] << 8) |
      randomStream.bytes[randomStream.cursor + 3]
    randomStream.cursor += 4
    return value >>> 0
  }

  let value = randomStream.fallbackState
  value ^= value << 13
  value ^= value >>> 17
  value ^= value << 5
  randomStream.fallbackState = value >>> 0
  return randomStream.fallbackState
}

export const getUnbiasedRandomInt = (maxExclusive: number, randomStream: RandomStream): number => {
  if (!Number.isInteger(maxExclusive) || maxExclusive <= 0 || maxExclusive > 0x1_0000_0000) {
    throw new Error('Limite inválido para geração uniforme.')
  }

  const range = 0x1_0000_0000
  const limit = Math.floor(range / maxExclusive) * maxExclusive
  let value = nextUint32(randomStream)

  while (value >= limit) {
    value = nextUint32(randomStream)
  }

  return value % maxExclusive
}

export const createPermutation = (size: number, randomBytes: Uint8Array): number[] => {
  const permutation = Array.from({ length: size }, (_, index) => index)
  const randomStream = createRandomStream(randomBytes)

  for (let index = size - 1; index > 0; index -= 1) {
    const swapIndex = getUnbiasedRandomInt(index + 1, randomStream)
    ;[permutation[index], permutation[swapIndex]] = [permutation[swapIndex], permutation[index]]
  }

  return permutation
}

export const invertPermutation = (permutation: number[]): number[] => {
  const inverse = new Array<number>(permutation.length)

  permutation.forEach((target, source) => {
    inverse[target] = source
  })

  return inverse
}

export const applyPermutation = (bytes: Uint8Array, permutation: number[]): Uint8Array => {
  const output = new Uint8Array(bytes.length)

  permutation.forEach((target, source) => {
    output[target] = bytes[source]
  })

  return output
}

export const forwardDiffusion = (bytes: Uint8Array, roundKey: Uint8Array): Uint8Array => {
  const output = new Uint8Array(bytes.length)
  let accumulator = SBOX_B[roundKey[0]]

  for (let index = 0; index < bytes.length; index += 1) {
    output[index] = bytes[index] ^ accumulator
    accumulator = SBOX_B[(output[index] + roundKey[index % roundKey.length] + index) & 0xff]
  }

  return output
}

export const inverseForwardDiffusion = (bytes: Uint8Array, roundKey: Uint8Array): Uint8Array => {
  const output = new Uint8Array(bytes.length)
  let accumulator = SBOX_B[roundKey[0]]

  for (let index = 0; index < bytes.length; index += 1) {
    output[index] = bytes[index] ^ accumulator
    accumulator = SBOX_B[(bytes[index] + roundKey[index % roundKey.length] + index) & 0xff]
  }

  return output
}

export const backwardDiffusion = (bytes: Uint8Array, roundKey: Uint8Array): Uint8Array => {
  const output = new Uint8Array(bytes.length)
  let accumulator = SBOX_B[roundKey[1]]

  for (let index = bytes.length - 1; index >= 0; index -= 1) {
    output[index] = bytes[index] ^ accumulator
    accumulator = SBOX_B[(output[index] + roundKey[(index + 17) % roundKey.length] + index) & 0xff]
  }

  return output
}

export const inverseBackwardDiffusion = (bytes: Uint8Array, roundKey: Uint8Array): Uint8Array => {
  const output = new Uint8Array(bytes.length)
  let accumulator = SBOX_B[roundKey[1]]

  for (let index = bytes.length - 1; index >= 0; index -= 1) {
    output[index] = bytes[index] ^ accumulator
    accumulator = SBOX_B[(bytes[index] + roundKey[(index + 17) % roundKey.length] + index) & 0xff]
  }

  return output
}

export const mixBlocks = (bytes: Uint8Array, roundKey: Uint8Array, round: number): Uint8Array => {
  const output = new Uint8Array(bytes)

  if (output.length === 1) {
    output[0] ^= SBOX_A[(roundKey[round % roundKey.length] + round) & 0xff]
    return output
  }

  for (let index = 1; index < output.length; index += 1) {
    const influence = output[index - 1] ^ SBOX_A[(roundKey[index % roundKey.length] + round) & 0xff]
    output[index] = (output[index] + influence) & 0xff
  }

  for (let index = output.length - 2; index >= 0; index -= 1) {
    const influence = (output[index + 1] + SBOX_B[(roundKey[(index + 17) % roundKey.length] + index + round) & 0xff]) & 0xff
    output[index] ^= influence
  }

  return output
}

export const inverseMixBlocks = (bytes: Uint8Array, roundKey: Uint8Array, round: number): Uint8Array => {
  const output = new Uint8Array(bytes)

  if (output.length === 1) {
    output[0] ^= SBOX_A[(roundKey[round % roundKey.length] + round) & 0xff]
    return output
  }

  for (let index = 0; index < output.length - 1; index += 1) {
    const influence = (output[index + 1] + SBOX_B[(roundKey[(index + 17) % roundKey.length] + index + round) & 0xff]) & 0xff
    output[index] ^= influence
  }

  for (let index = output.length - 1; index > 0; index -= 1) {
    const influence = output[index - 1] ^ SBOX_A[(roundKey[index % roundKey.length] + round) & 0xff]
    output[index] = (output[index] - influence + 512) & 0xff
  }

  return output
}

export const encryptRound = (
  bytes: Uint8Array,
  roundKey: Uint8Array,
  permutationKey: Uint8Array,
  maskKey: Uint8Array,
  nonce: Uint8Array,
  round: number,
): Uint8Array => {
  const transformed = new Uint8Array(bytes.length)

  for (let index = 0; index < bytes.length; index += 1) {
    const coordinate = mixDimensions(
      rotateDimensions(generateCoordinate8D(roundKey, maskKey, nonce, index, round), roundKey, round),
      roundKey,
      maskKey,
      round,
    )
    const [d1, d2, d3, d4, d5, d6, , d8] = coordinate
    const coordinateXor = d1 ^ d3 ^ d5 ^ roundKey[index % roundKey.length]
    const coordinateAdd = SBOX_B[(d2 + d4 + d6 + d8 + maskKey[index % maskKey.length]) & 0xff]
    const masked = SBOX_A[bytes[index] ^ coordinateXor]
    transformed[index] = (masked + coordinateAdd + coordinateMask(coordinate, maskKey, index, round)) & 0xff
  }

  const permutation = createPermutation(bytes.length, permutationKey)
  const permuted = applyPermutation(transformed, permutation)
  const diffused = backwardDiffusion(forwardDiffusion(permuted, roundKey), roundKey)
  return mixBlocks(diffused, maskKey, round)
}

export const decryptRound = (
  bytes: Uint8Array,
  roundKey: Uint8Array,
  permutationKey: Uint8Array,
  maskKey: Uint8Array,
  nonce: Uint8Array,
  round: number,
): Uint8Array => {
  const unmixed = inverseMixBlocks(bytes, maskKey, round)
  const undiffused = inverseForwardDiffusion(inverseBackwardDiffusion(unmixed, roundKey), roundKey)
  const unpermuted = applyPermutation(undiffused, invertPermutation(createPermutation(bytes.length, permutationKey)))
  const output = new Uint8Array(bytes.length)

  for (let index = 0; index < bytes.length; index += 1) {
    const coordinate = mixDimensions(
      rotateDimensions(generateCoordinate8D(roundKey, maskKey, nonce, index, round), roundKey, round),
      roundKey,
      maskKey,
      round,
    )
    const [d1, d2, d3, d4, d5, d6, , d8] = coordinate
    const coordinateXor = d1 ^ d3 ^ d5 ^ roundKey[index % roundKey.length]
    const coordinateAdd = SBOX_B[(d2 + d4 + d6 + d8 + maskKey[index % maskKey.length]) & 0xff]
    const shifted =
      (unpermuted[index] - coordinateAdd - coordinateMask(coordinate, maskKey, index, round) + 768) & 0xff
    output[index] = INV_SBOX_A[shifted] ^ coordinateXor
  }

  return output
}

const deriveRoundMaterial = async (
  encryptionKey: Uint8Array,
  nonce: Uint8Array,
  round: number,
  size: number,
) => ({
  roundKey: await deriveRoundKey(encryptionKey, nonce, round),
  permutationKey: await derivePermutationKey(encryptionKey, nonce, round, size),
  maskKey: await deriveMaskKey(encryptionKey, nonce, round),
})

export const encryptT8DWithNonce = async (
  plaintextBytes: Uint8Array,
  password: string,
  nonce: Uint8Array,
  associatedData = '',
): Promise<string> => {
  const { encryptionKey, authKey } = await deriveKeys(password, nonce)
  let state: Uint8Array = new Uint8Array(plaintextBytes)

  for (let round = 0; round < ROUNDS; round += 1) {
    const material = await deriveRoundMaterial(encryptionKey, nonce, round, state.length)
    state = encryptRound(state, material.roundKey, material.permutationKey, material.maskKey, nonce, round)
  }

  const tag = await generateTag(authKey, nonce, state, associatedData)
  return `${VERSION}:${toHex(nonce)}:${toHex(state)}:${toHex(tag)}`
}

export const encryptT8D = async (
  plaintext: string,
  password: string,
  associatedData = '',
): Promise<string> => {
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_SIZE))
  return encryptT8DWithNonce(encoder.encode(plaintext), password, nonce, associatedData)
}

export const decryptT8D = async (
  payload: string,
  password: string,
  associatedData = '',
): Promise<string> => {
  const [version, nonceHex, ciphertextHex, tagHex] = payload.split(':')

  if (version !== VERSION || !nonceHex || ciphertextHex === undefined || !tagHex) {
    throw new Error('Payload T8D inválido.')
  }

  const nonce = fromHex(nonceHex)
  const ciphertext = fromHex(ciphertextHex)
  const receivedTag = fromHex(tagHex)

  if (nonce.length !== NONCE_SIZE || receivedTag.length !== TAG_SIZE) {
    throw new Error('Payload T8D inválido.')
  }

  const { encryptionKey, authKey } = await deriveKeys(password, nonce)
  const expectedTag = await generateTag(authKey, nonce, ciphertext, associatedData)

  if (!constantTimeEqual(receivedTag, expectedTag)) {
    throw new Error('Tag inválida. A mensagem pode ter sido alterada ou a chave está errada.')
  }

  let state = ciphertext

  for (let round = ROUNDS - 1; round >= 0; round -= 1) {
    const material = await deriveRoundMaterial(encryptionKey, nonce, round, state.length)
    state = decryptRound(state, material.roundKey, material.permutationKey, material.maskKey, nonce, round)
  }

  return decoder.decode(state)
}

export const avalancheTest = async (plaintext: string, password: string): Promise<number> => {
  const originalBytes = encoder.encode(plaintext.length > 0 ? plaintext : '\0')
  const changedBytes = new Uint8Array(originalBytes)
  changedBytes[0] ^= 0x01

  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_SIZE))
  const firstPayload = await encryptT8DWithNonce(originalBytes, password, nonce, 'avalanche-test')
  const secondPayload = await encryptT8DWithNonce(changedBytes, password, nonce, 'avalanche-test')
  const firstCiphertext = fromHex(firstPayload.split(':')[2] ?? '')
  const secondCiphertext = fromHex(secondPayload.split(':')[2] ?? '')
  const size = Math.min(firstCiphertext.length, secondCiphertext.length)

  if (size === 0) {
    return 0
  }

  let changedBits = 0

  for (let index = 0; index < size; index += 1) {
    let difference = firstCiphertext[index] ^ secondCiphertext[index]

    while (difference > 0) {
      changedBits += difference & 1
      difference >>= 1
    }
  }

  return (changedBits / (size * 8)) * 100
}

const deriveHashRoundKey = async (
  state: Uint8Array,
  blockCounter: number,
  round: number,
): Promise<Uint8Array> =>
  sha512(concatBytes(encoder.encode(HASH_VERSION), encoder.encode(DOMAIN_ROUND_KEY), uint32Bytes(blockCounter), uint32Bytes(round), state.slice(0, HASH_RATE)))

const applyHashPermutation = async (state: Uint8Array, blockCounter: number): Promise<Uint8Array> => {
  let permuted = state
  const nonce = await expandBytes(concatBytes(encoder.encode(HASH_VERSION), uint32Bytes(blockCounter)), NONCE_SIZE)

  for (let round = 0; round < ROUNDS; round += 1) {
    const roundKey = await deriveHashRoundKey(permuted, blockCounter, round)
    const permutationKey = await expandBytes(
      concatBytes(roundKey, encoder.encode(DOMAIN_PERMUTATION_KEY)),
      Math.max(128, permuted.length * 8 + 64),
    )
    const maskKey = await sha512(concatBytes(roundKey, encoder.encode(DOMAIN_MASK_KEY), uint32Bytes(round)))
    permuted = encryptRound(permuted, roundKey, permutationKey, maskKey, nonce, round)
  }

  return permuted
}

const absorbHashBlock = async (
  state: Uint8Array,
  block: Uint8Array,
  blockCounter: number,
): Promise<Uint8Array> => {
  const absorbed = new Uint8Array(state)

  for (let index = 0; index < HASH_RATE; index += 1) {
    absorbed[index] ^= block[index]
  }

  absorbed[HASH_RATE + (blockCounter % HASH_RATE)] ^= blockCounter & 0xff
  return applyHashPermutation(absorbed, blockCounter)
}

// Modo hash experimental para estudo. Não use como substituto de hashes padronizados.
export const hashT8D512 = async (message: string, associatedData = ''): Promise<string> => {
  const messageBytes = encoder.encode(message)
  const associatedBytes = encoder.encode(associatedData)
  const absorbedInput = concatBytes(
    encoder.encode(HASH_VERSION),
    lengthPrefix(associatedBytes),
    associatedBytes,
    lengthPrefix(messageBytes),
    messageBytes,
  )
  let state = await expandBytes(encoder.encode(`${HASH_VERSION}:iv:v0.3`), HASH_STATE_SIZE)
  let offset = 0
  let blockCounter = 0
  let needsFinalPaddingBlock = absorbedInput.length % HASH_RATE === 0

  while (offset < absorbedInput.length || needsFinalPaddingBlock) {
    const block = new Uint8Array(HASH_RATE)
    const chunk = absorbedInput.slice(offset, offset + HASH_RATE)
    block.set(chunk)

    if (chunk.length < HASH_RATE) {
      block[chunk.length] = 0x80
      block[HASH_RATE - 1] ^= 0x01
      needsFinalPaddingBlock = false
    }

    state = await absorbHashBlock(state, block, blockCounter)
    offset += HASH_RATE
    blockCounter += 1
  }

  state = await applyHashPermutation(state, blockCounter)

  const squeezeMask = await expandBytes(
    concatBytes(encoder.encode(`${HASH_VERSION}:squeeze:v0.3`), state, uint32Bytes(blockCounter)),
    HASH_SIZE,
  )
  const digest = new Uint8Array(HASH_SIZE)

  for (let index = 0; index < HASH_SIZE; index += 1) {
    digest[index] = state[index] ^ squeezeMask[index]
  }

  return `${HASH_VERSION}:${toHex(digest)}`
}
