import './style.css'
import { Eye, EyeOff, createElement } from 'lucide'
import {
  calculateAvalanche,
  calculateByteFrequency,
  calculateEntropy,
  calculateKeyAvalanche,
  runRepeatedTextTest,
} from './t8d-analysis'
import { conceptPageTemplate } from './concept-page'
import { decryptT8D, encryptT8D, hashT8D512 } from './t8d'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="shell">
    <section class="lab-card" aria-labelledby="title">
      <header class="header">
        <p class="eyebrow">Laboratorio experimental</p>
        <h1 id="title">Tesseract-8D/128 v0.3</h1>
        <p class="warning">Protótipo didático. Não use para proteger dados reais.</p>
        <nav class="view-tabs" aria-label="Navegação do laboratório">
          <button id="show-lab" class="tab-button is-active" type="button" aria-controls="lab-view" aria-selected="true">Laboratório</button>
          <button id="show-concept" class="tab-button" type="button" aria-controls="concept-view" aria-selected="false">Conceito</button>
        </nav>
      </header>

      <section id="lab-view" class="page-view">
      <div class="workspace">
        <section class="panel panel-input" aria-labelledby="input-title">
          <div class="panel-header">
            <h2 id="input-title">Entrada</h2>
          </div>

          <label class="field">
            <span class="field-label">Mensagem original</span>
            <textarea id="plaintext" class="textarea-large" rows="10" spellcheck="false">Mensagem de teste para o Tesseract-8D/128 v0.3</textarea>
          </label>

          <div class="input-row">
            <label class="field">
              <span class="field-label">Chave / senha</span>
              <span class="password-control">
                <input id="password" type="password" value="senha-de-laboratorio" autocomplete="current-password" />
                <button id="toggle-password" class="icon-button" type="button" aria-label="Mostrar senha" aria-pressed="false"></button>
              </span>
            </label>

            <label class="field">
              <span class="field-label">Dados associados</span>
              <input id="associated-data" type="text" placeholder="contexto opcional" />
            </label>
          </div>
        </section>

        <aside class="panel panel-actions" aria-label="Ações criptográficas">
          <div class="panel-header">
            <h2>Ações</h2>
          </div>

          <div class="action-group">
            <button id="encrypt" class="button-primary" type="button">Criptografar</button>
            <button id="decrypt" class="button-secondary" type="button">Descriptografar</button>
            <button id="hash" class="button-secondary" type="button">Gerar hash</button>
          </div>

          <div class="action-group analysis-actions">
            <button id="avalanche" class="button-analysis" type="button">Avalanche mensagem</button>
            <button id="key-avalanche" class="button-analysis" type="button">Avalanche chave</button>
            <button id="repeated-text" class="button-analysis" type="button">Texto repetido</button>
            <button id="entropy" class="button-analysis" type="button">Entropia</button>
          </div>
        </aside>

        <section class="panel panel-output" aria-labelledby="output-title">
          <div class="panel-header">
            <h2 id="output-title">Saídas</h2>
          </div>

          <div class="output-grid">
            <label class="field output-primary">
              <span class="field-label">Payload criptografado</span>
              <textarea id="payload" rows="7" spellcheck="false" placeholder="T8D3:nonceHex:ciphertextHex:tagHex"></textarea>
            </label>

            <label class="field">
              <span class="field-label">Resultado descriptografado</span>
              <textarea id="result" rows="7" spellcheck="false" readonly></textarea>
            </label>

            <label class="field output-primary">
              <span class="field-label">Hash T8D-HASH-512</span>
              <textarea id="hash-output" rows="4" spellcheck="false" readonly placeholder="T8D-HASH-512:digestHex"></textarea>
            </label>
          </div>
        </section>
      </div>

      <section class="log-panel" aria-live="polite">
        <span>Log</span>
        <pre id="log">Pronto para experimentar.</pre>
      </section>
      </section>

      ${conceptPageTemplate}
    </section>
  </main>
`

const plaintextInput = document.querySelector<HTMLTextAreaElement>('#plaintext')!
const passwordInput = document.querySelector<HTMLInputElement>('#password')!
const associatedDataInput = document.querySelector<HTMLInputElement>('#associated-data')!
const payloadInput = document.querySelector<HTMLTextAreaElement>('#payload')!
const resultInput = document.querySelector<HTMLTextAreaElement>('#result')!
const hashOutput = document.querySelector<HTMLTextAreaElement>('#hash-output')!
const logOutput = document.querySelector<HTMLPreElement>('#log')!
const togglePasswordButton = document.querySelector<HTMLButtonElement>('#toggle-password')!
const labView = document.querySelector<HTMLElement>('#lab-view')!
const conceptView = document.querySelector<HTMLElement>('#concept-view')!
const showLabButton = document.querySelector<HTMLButtonElement>('#show-lab')!
const showConceptButton = document.querySelector<HTMLButtonElement>('#show-concept')!

const log = (message: string) => {
  logOutput.textContent = `[${new Date().toLocaleTimeString()}] ${message}`
}

const requirePassword = () => {
  const password = passwordInput.value

  if (!password) {
    throw new Error('Informe uma chave/senha para continuar.')
  }

  return password
}

const ciphertextBytesFromPayload = (payload: string): Uint8Array => {
  const [, , ciphertextHex] = payload.split(':')

  if (ciphertextHex === undefined) {
    throw new Error('Criptografe uma mensagem antes de medir a entropia.')
  }

  const output = new Uint8Array(ciphertextHex.length / 2)

  for (let index = 0; index < output.length; index += 1) {
    output[index] = Number.parseInt(ciphertextHex.slice(index * 2, index * 2 + 2), 16)
  }

  return output
}

const setPasswordIcon = (isVisible: boolean) => {
  togglePasswordButton.replaceChildren(
    createElement(isVisible ? EyeOff : Eye, {
      width: 20,
      height: 20,
      'aria-hidden': 'true',
      'stroke-width': 2,
    }),
  )
}

setPasswordIcon(false)

const setActiveView = (view: 'lab' | 'concept') => {
  const showLab = view === 'lab'

  labView.classList.toggle('is-hidden', !showLab)
  conceptView.classList.toggle('is-hidden', showLab)
  showLabButton.classList.toggle('is-active', showLab)
  showConceptButton.classList.toggle('is-active', !showLab)
  showLabButton.setAttribute('aria-selected', String(showLab))
  showConceptButton.setAttribute('aria-selected', String(!showLab))
}

showLabButton.addEventListener('click', () => setActiveView('lab'))
showConceptButton.addEventListener('click', () => setActiveView('concept'))

document.querySelector<HTMLButtonElement>('#encrypt')!.addEventListener('click', async () => {
  try {
    payloadInput.value = await encryptT8D(
      plaintextInput.value,
      requirePassword(),
      associatedDataInput.value,
    )
    log('Mensagem criptografada com sucesso.')
  } catch (error) {
    log(error instanceof Error ? error.message : 'Falha ao criptografar.')
  }
})

document.querySelector<HTMLButtonElement>('#decrypt')!.addEventListener('click', async () => {
  try {
    resultInput.value = await decryptT8D(
      payloadInput.value.trim(),
      requirePassword(),
      associatedDataInput.value,
    )
    log('Payload autenticado e descriptografado com sucesso.')
  } catch (error) {
    log(error instanceof Error ? error.message : 'Falha ao descriptografar.')
  }
})

document.querySelector<HTMLButtonElement>('#avalanche')!.addEventListener('click', async () => {
  try {
    const changedBits = await calculateAvalanche(plaintextInput.value, requirePassword())
    log(`Avalanche da mensagem: aproximadamente ${changedBits.toFixed(2)}% dos bits do ciphertext mudaram.`)
  } catch (error) {
    log(error instanceof Error ? error.message : 'Falha ao executar o teste avalanche.')
  }
})

document.querySelector<HTMLButtonElement>('#key-avalanche')!.addEventListener('click', async () => {
  try {
    const changedBits = await calculateKeyAvalanche(plaintextInput.value, requirePassword())
    log(`Avalanche da chave: aproximadamente ${changedBits.toFixed(2)}% dos bits do ciphertext mudaram.`)
  } catch (error) {
    log(error instanceof Error ? error.message : 'Falha ao executar o teste avalanche da chave.')
  }
})

document.querySelector<HTMLButtonElement>('#repeated-text')!.addEventListener('click', async () => {
  try {
    const result = await runRepeatedTextTest(requirePassword())
    log(`Teste de texto repetido:\n${JSON.stringify(result, null, 2)}`)
  } catch (error) {
    log(error instanceof Error ? error.message : 'Falha ao executar o teste de texto repetido.')
  }
})

document.querySelector<HTMLButtonElement>('#entropy')!.addEventListener('click', async () => {
  try {
    if (!payloadInput.value.trim()) {
      payloadInput.value = await encryptT8D(plaintextInput.value, requirePassword(), associatedDataInput.value)
    }

    const ciphertext = ciphertextBytesFromPayload(payloadInput.value.trim())
    const entropy = calculateEntropy(ciphertext)
    const frequency = calculateByteFrequency(ciphertext)
    const occupiedBytes = frequency.filter((count) => count > 0).length

    log(`Entropia do ciphertext: ${entropy.toFixed(4)} bits/byte. Bytes ocupados: ${occupiedBytes}/256.`)
  } catch (error) {
    log(error instanceof Error ? error.message : 'Falha ao calcular entropia.')
  }
})

document.querySelector<HTMLButtonElement>('#hash')!.addEventListener('click', async () => {
  try {
    hashOutput.value = await hashT8D512(plaintextInput.value, associatedDataInput.value)
    log('Hash T8D-HASH-512 gerado com sucesso.')
  } catch (error) {
    log(error instanceof Error ? error.message : 'Falha ao gerar hash.')
  }
})

togglePasswordButton.addEventListener('click', () => {
  const shouldShow = passwordInput.type === 'password'

  passwordInput.type = shouldShow ? 'text' : 'password'
  togglePasswordButton.setAttribute('aria-label', shouldShow ? 'Ocultar senha' : 'Mostrar senha')
  togglePasswordButton.setAttribute('aria-pressed', String(shouldShow))
  setPasswordIcon(shouldShow)
})
