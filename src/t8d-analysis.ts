import { NONCE_SIZE, encryptT8D, encryptT8DWithNonce, fromHex } from './t8d'

const encoder = new TextEncoder()

type RepeatedTextTestResult = {
  entropy: number
  ciphertextLength: number
  mostFrequentByte: number
  mostFrequentCount: number
  firstVsSecondCiphertextBitDifference: number
}

type KnownPlaintextTestResult = {
  samples: number
  averageAvalanche: number
  minAvalanche: number
  maxAvalanche: number
}

const ciphertextFromPayload = (payload: string): Uint8Array => {
  const [, , ciphertextHex] = payload.split(':')

  if (ciphertextHex === undefined) {
    throw new Error('Payload T8D inválido.')
  }

  return fromHex(ciphertextHex)
}

export const bitDifference = (a: Uint8Array, b: Uint8Array): number => {
  const size = Math.min(a.length, b.length)
  let difference = Math.abs(a.length - b.length) * 8

  for (let index = 0; index < size; index += 1) {
    let xor = a[index] ^ b[index]

    while (xor > 0) {
      difference += xor & 1
      xor >>= 1
    }
  }

  return difference
}

export const calculateAvalanche = async (plaintext: string, password: string): Promise<number> => {
  const originalBytes = encoder.encode(plaintext.length > 0 ? plaintext : '\0')
  const changedBytes = new Uint8Array(originalBytes)
  changedBytes[0] ^= 0x01

  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_SIZE))
  const first = ciphertextFromPayload(await encryptT8DWithNonce(originalBytes, password, nonce, 'analysis-message'))
  const second = ciphertextFromPayload(await encryptT8DWithNonce(changedBytes, password, nonce, 'analysis-message'))
  const comparedBits = Math.max(first.length, second.length) * 8

  return comparedBits === 0 ? 0 : (bitDifference(first, second) / comparedBits) * 100
}

export const calculateKeyAvalanche = async (plaintext: string, password: string): Promise<number> => {
  const plaintextBytes = encoder.encode(plaintext.length > 0 ? plaintext : '\0')
  const nonce = crypto.getRandomValues(new Uint8Array(NONCE_SIZE))
  const changedPassword = `${password}\u0001`
  const first = ciphertextFromPayload(await encryptT8DWithNonce(plaintextBytes, password, nonce, 'analysis-key'))
  const second = ciphertextFromPayload(await encryptT8DWithNonce(plaintextBytes, changedPassword, nonce, 'analysis-key'))
  const comparedBits = Math.max(first.length, second.length) * 8

  return comparedBits === 0 ? 0 : (bitDifference(first, second) / comparedBits) * 100
}

export const calculateByteFrequency = (data: Uint8Array): number[] => {
  const frequency = new Array<number>(256).fill(0)

  for (const byte of data) {
    frequency[byte] += 1
  }

  return frequency
}

export const calculateEntropy = (data: Uint8Array): number => {
  if (data.length === 0) {
    return 0
  }

  return calculateByteFrequency(data).reduce((entropy, count) => {
    if (count === 0) {
      return entropy
    }

    const probability = count / data.length
    return entropy - probability * Math.log2(probability)
  }, 0)
}

export const compareCiphertexts = (a: string, b: string): number =>
  bitDifference(ciphertextFromPayload(a), ciphertextFromPayload(b))

export const runRepeatedTextTest = async (password: string): Promise<object> => {
  const repeatedText = 'T8D-REPETIDO-'.repeat(128)
  const firstPayload = await encryptT8D(repeatedText, password, 'repeated-text-test')
  const secondPayload = await encryptT8D(repeatedText, password, 'repeated-text-test')
  const firstCiphertext = ciphertextFromPayload(firstPayload)
  const frequency = calculateByteFrequency(firstCiphertext)
  let mostFrequentByte = 0
  let mostFrequentCount = 0

  frequency.forEach((count, byte) => {
    if (count > mostFrequentCount) {
      mostFrequentByte = byte
      mostFrequentCount = count
    }
  })

  const result: RepeatedTextTestResult = {
    entropy: calculateEntropy(firstCiphertext),
    ciphertextLength: firstCiphertext.length,
    mostFrequentByte,
    mostFrequentCount,
    firstVsSecondCiphertextBitDifference: compareCiphertexts(firstPayload, secondPayload),
  }

  return result
}

export const runKnownPlaintextTest = async (password: string): Promise<object> => {
  const samples = [
    'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    '00000000000000000000000000000000',
    'The quick brown fox jumps over the lazy dog',
    'Tesseract-8D/128 known plaintext probe',
  ]
  const avalanches = await Promise.all(samples.map((sample) => calculateAvalanche(sample, password)))
  const total = avalanches.reduce((sum, value) => sum + value, 0)
  const result: KnownPlaintextTestResult = {
    samples: samples.length,
    averageAvalanche: total / avalanches.length,
    minAvalanche: Math.min(...avalanches),
    maxAvalanche: Math.max(...avalanches),
  }

  return result
}
