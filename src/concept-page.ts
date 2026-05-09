import { permutationVisualSvg } from './permutation-visual'

export const conceptPageTemplate = `
  <section id="concept-view" class="page-view is-hidden" aria-labelledby="concept-title">
    <div class="concept-hero">
      <p class="eyebrow">Guia conceitual</p>
      <h2 id="concept-title">Como o Tesseract-8D/128 v0.3 funciona</h2>
      <p>
        Esta página resume a ideia da cifra experimental para quem vai testar o laboratório.
        O objetivo é estudar conceitos de criptografia, não proteger dados reais.
      </p>
    </div>

    <div class="concept-grid">
      <article class="concept-card concept-wide">
        <span class="concept-kicker">Formato</span>
        <h3>Payload da v0.3</h3>
        <p>A saída autenticada da cifra usa versão, nonce, ciphertext e tag.</p>
        <pre class="concept-code">T8D3:nonceHex:ciphertextHex:tagHex</pre>
      </article>

      <article class="concept-card concept-visual concept-wide">
        <span class="concept-kicker">Visual</span>
        <h3>Como a permutação espalha posições</h3>
        <p>
          A faixa clara representa bytes próximos na entrada. Depois das rodadas, esses bytes
          passam a ocupar posições distantes no bloco, junto com difusão e mistura entre blocos.
        </p>
        ${permutationVisualSvg}
      </article>

      <article class="concept-card">
        <span class="concept-kicker">Espaço 8D</span>
        <h3>8 dimensões, 128 estados</h3>
        <p>
          Cada byte recebe uma coordenada <code>[d1..d8]</code>. Na v0.3, essas dimensões
          participam diretamente da transformação do byte, em vez de servirem só como posição.
        </p>
      </article>

      <article class="concept-card">
        <span class="concept-kicker">Nonce</span>
        <h3>Mesmo texto, saída diferente</h3>
        <p>
          Um nonce aleatório de 16 bytes faz mensagens iguais com a mesma senha produzirem
          ciphertexts diferentes.
        </p>
      </article>

      <article class="concept-card">
        <span class="concept-kicker">Chaves</span>
        <h3>PBKDF2 e separação</h3>
        <p>
          A senha passa por PBKDF2 + SHA-256. O material derivado é separado em
          <code>encryptionKey</code> e <code>authKey</code>.
        </p>
      </article>

      <article class="concept-card">
        <span class="concept-kicker">Key schedule</span>
        <h3>Domain separators</h3>
        <p>Subchaves usam SHA-512 com separadores diferentes para reduzir reutilização de material.</p>
        <ul class="concept-list">
          <li><code>T8D-v0.3-round-key</code></li>
          <li><code>T8D-v0.3-permutation-key</code></li>
          <li><code>T8D-v0.3-mask-key</code></li>
          <li><code>T8D-v0.3-tag</code></li>
        </ul>
      </article>

      <article class="concept-card">
        <span class="concept-kicker">Não linearidade</span>
        <h3>Duas S-Boxes</h3>
        <p>
          <code>SBOX_A</code> transforma o byte principal. <code>SBOX_B</code> atua em
          coordenadas, máscaras, difusão auxiliar e mistura dimensional.
        </p>
      </article>

      <article class="concept-card">
        <span class="concept-kicker">Byte</span>
        <h3>Camada 8D ativa</h3>
        <p>As dimensões entram no valor do byte por XOR, soma modular, máscaras e S-Boxes.</p>
        <pre class="concept-code">valor = SBOX_A[byte XOR d1 XOR d3 XOR d5 XOR roundKeyByte]
valor = valor + SBOX_B[d2 + d4 + d6 + d8 + maskKeyByte]</pre>
      </article>

      <article class="concept-card">
        <span class="concept-kicker">Permutação</span>
        <h3>Menor viés estatístico</h3>
        <p>
          A permutação é bijetiva e usa rejection sampling em vez de módulo direto
          <code>random % n</code>.
        </p>
      </article>

      <article class="concept-card">
        <span class="concept-kicker">Difusão</span>
        <h3>Ida, volta e mixBlocks</h3>
        <p>
          Cada rodada aplica difusão esquerda → direita, direita → esquerda e uma mistura
          reversível entre posições do bloco.
        </p>
      </article>

      <article class="concept-card">
        <span class="concept-kicker">Autenticação</span>
        <h3>Tag antes de descriptografar</h3>
        <p>
          A tag HMAC-SHA-256 autentica versão, nonce, ciphertext e dados associados.
          Se a tag falha, a descriptografia é interrompida.
        </p>
      </article>

      <article class="concept-card">
        <span class="concept-kicker">Hash</span>
        <h3>T8D-HASH-512</h3>
        <p>
          O laboratório também tem um modo hash experimental com saída
          <code>T8D-HASH-512:digestHex</code> de 512 bits.
        </p>
      </article>

      <article class="concept-card">
        <span class="concept-kicker">Análises</span>
        <h3>Métricas exploratórias</h3>
        <p>
          A interface mede avalanche da mensagem, avalanche da chave, entropia e comportamento
          com texto repetido.
        </p>
      </article>

      <article class="concept-card concept-warning concept-wide">
        <span class="concept-kicker">Limites</span>
        <h3>O que isso não prova</h3>
        <p>
          Avalanche e entropia não provam segurança. A complexidade 8D também não garante
          resistência contra criptoanálise linear, diferencial, texto conhecido ou texto escolhido.
        </p>
        <p>
          Para dados reais, use algoritmos consolidados como AES-GCM, ChaCha20-Poly1305,
          SHA-256, SHA-512 ou SHA-3.
        </p>
      </article>
    </div>
  </section>
`
