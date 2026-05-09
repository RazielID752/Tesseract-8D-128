# Tesseract-8D/128 v0.3

## Explicação do funcionamento da criptografia experimental

A **Tesseract-8D/128 v0.3** é uma proposta de criptografia experimental criada para estudo. Ela funciona como uma **cifra simétrica**, ou seja, utiliza a mesma chave/senha para criptografar e descriptografar uma mensagem.

> **Aviso importante:** este algoritmo é experimental e não deve ser usado em produção ou para proteger dados reais. Ele ainda precisa passar por testes, análise matemática e criptoanálise pública.

---

## 1. Ideia central

A ideia principal é imaginar cada byte da mensagem dentro de um espaço multidimensional com:

```txt
8 dimensões
128 estados por dimensão
```

Cada byte recebe uma coordenada no formato:

```txt
[d1, d2, d3, d4, d5, d6, d7, d8]
```

Cada número representa uma posição dentro de uma dimensão. Como cada dimensão vai de `0` até `127`, usamos rotação circular com módulo 128.

Exemplo:

```txt
posição = 126
rotação = +5

resultado = (126 + 5) mod 128
resultado = 3
```

Na v0.3, essas dimensões não são apenas uma metáfora visual. Elas participam diretamente da transformação do byte, misturando valores da coordenada com subchaves e S-Boxes.

---

## 2. Fluxo geral

O processo geral da criptografia é:

```txt
Mensagem original
→ bytes
→ nonce
→ derivação de chaves
→ coordenadas 8D
→ transformação não linear com duas S-Boxes
→ permutação bijetiva com menor viés
→ difusão esquerda → direita
→ difusão direita → esquerda
→ mistura reversível entre blocos
→ tag de autenticação
→ payload final
```

A saída final da v0.3 tem o formato:

```txt
T8D3:nonceHex:ciphertextHex:tagHex
```

Onde:

```txt
T8D3       = versão do algoritmo
nonce      = valor aleatório único
ciphertext = mensagem criptografada
tag        = autenticação do payload
```

---

## 3. Conversão da mensagem em bytes

Primeiro, a mensagem original é convertida para bytes.

Exemplo:

```txt
"Oi"
```

vira algo parecido com:

```txt
[79, 105]
```

Cada caractere passa a ser tratado como um número.

---

## 4. Geração do nonce

Antes de criptografar, o algoritmo gera um **nonce**.

```txt
nonce = número aleatório usado uma única vez
```

O nonce serve para garantir que a mesma mensagem com a mesma senha gere resultados diferentes.

Exemplo:

```txt
Mensagem: "Olá"
Senha: "123"

Criptografia 1:
T8D3:abc123:...

Criptografia 2:
T8D3:98f7aa:...
```

Mesmo texto e mesma senha, mas resultado diferente por causa do nonce.

---

## 5. Derivação da chave

A senha digitada pelo usuário não é usada diretamente.

Ela passa por uma função de derivação de chave:

```txt
senha + nonce → PBKDF2 + SHA-256 → chaves internas
```

A partir disso, são criadas duas chaves internas:

```txt
encryptionKey → usada para criptografar
authKey       → usada para autenticar/verificar alteração
```

Essa separação é importante porque criptografia e autenticação não devem depender exatamente do mesmo material de chave.

---

## 6. Key schedule da v0.3

A v0.3 formaliza melhor as subchaves por rodada.

Cada rodada usa SHA-512 com separadores de domínio:

```txt
roundKey = SHA-512(encryptionKey + nonce + "T8D-v0.3-round-key" + roundNumber)
```

Além disso, são usados separadores diferentes para funções diferentes:

```txt
T8D-v0.3-round-key        → subchave principal da rodada
T8D-v0.3-permutation-key  → bytes usados na permutação
T8D-v0.3-mask-key         → máscaras, coordenadas e mistura
T8D-v0.3-tag              → autenticação do payload
```

Isso reduz o risco de reutilizar o mesmo material de chave para tarefas diferentes.

---

## 7. Coordenadas 8D

Cada byte recebe uma coordenada 8D baseada em:

```txt
posição do byte
nonce
número da rodada
roundKey
maskKey
```

Exemplo conceitual:

```txt
Byte na posição 5, rodada 3
→ coordenada [8, 4, 99, 12, 31, 77, 3, 120]
```

A ideia é que cada byte não seja apenas um valor, mas também tenha uma posição derivada dentro de um espaço 8D.

---

## 8. Rotação dimensional

Depois de gerar a coordenada, aplicamos rotações nas dimensões.

Na v0.3, os deslocamentos são derivados da subchave e passam por `SBOX_B`:

```txt
deslocamento = SBOX_B[roundKeyByte] mod 128
dimensão = (dimensão + deslocamento) mod 128
```

Exemplo:

```txt
coordenada original:
[12, 87, 4, 126, 31, 0, 92, 55]

deslocamentos:
[5, 9, 2, 7, 1, 4, 3, 8]

resultado:
[17, 96, 6, 5, 32, 4, 95, 63]
```

Na quarta dimensão:

```txt
126 + 7 = 133
133 mod 128 = 5
```

---

## 9. Mistura não linear entre dimensões

Depois da rotação, uma dimensão passa a interferir na outra.

Na v0.3, a mistura usa `SBOX_B`, não apenas XOR e soma simples:

```txt
d1 = SBOX_B[d1 XOR d5 XOR roundKeyByte] mod 128
d2 = SBOX_B[d2 + d6 + round] mod 128
d3 = SBOX_B[d3 XOR d7 XOR maskKeyByte] mod 128
d4 = SBOX_B[d4 + d8 + roundKeyByte] mod 128
```

Essa coordenada não precisa ser “desfeita” na descriptografia, porque ela é recalculada a partir dos mesmos elementos:

```txt
índice + nonce + rodada + roundKey + maskKey
```

Assim, a descriptografia consegue obter a mesma coordenada e desfazer a transformação do byte.

---

## 10. Duas S-Boxes

A v0.3 usa duas S-Boxes bijetivas, ambas com 256 posições:

```txt
SBOX_A → transformação principal do byte
SBOX_B → máscaras, coordenadas, difusão auxiliar e mistura dimensional
```

Também existem as inversas:

```txt
INV_SBOX_A
INV_SBOX_B
```

A `INV_SBOX_A` é necessária para desfazer a transformação principal durante a descriptografia. A `INV_SBOX_B` existe porque a S-Box é bijetiva e pode ser útil em análises ou futuras etapas reversíveis.

---

## 11. Transformação direta do byte pela camada 8D

Na v0.3, as dimensões participam diretamente da transformação do byte.

Exemplo conceitual:

```txt
coordinateXor = d1 XOR d3 XOR d5 XOR roundKeyByte
coordinateAdd = SBOX_B[(d2 + d4 + d6 + d8 + maskKeyByte) mod 256]
mask = máscara derivada da coordenada + maskKey + rodada

valor = SBOX_A[byte XOR coordinateXor]
valor = (valor + coordinateAdd + mask) mod 256
```

Na descriptografia, a ordem é invertida:

```txt
valor = (valor - coordinateAdd - mask) mod 256
byte = INV_SBOX_A[valor] XOR coordinateXor
```

Isso faz a camada 8D afetar o valor do byte de forma mais direta do que nas versões anteriores.

---

## 12. Máscara da coordenada

Depois de misturar as dimensões, o algoritmo cria uma máscara derivada de:

```txt
coordenada 8D
maskKey
posição do byte
número da rodada
SBOX_B
```

Essa máscara é somada ao valor transformado do byte com módulo 256.

---

## 13. Permutação bijetiva com menor viés

Depois de transformar os valores, o algoritmo troca os bytes de lugar.

Exemplo:

```txt
posição original:
[0, 1, 2, 3, 4, 5]

nova ordem:
[4, 1, 5, 0, 3, 2]
```

A permutação precisa ser bijetiva:

```txt
cada posição de entrada vai para uma posição única de saída
```

Na v0.3, a escolha dos índices evita o uso direto de:

```txt
j = random % (i + 1)
```

Esse módulo direto pode introduzir viés estatístico. Por isso a v0.3 usa **rejection sampling**:

```txt
getUnbiasedRandomInt(maxExclusive, randomStream)
```

A função gera números dentro de uma faixa que pode ser dividida igualmente por `maxExclusive`. Valores fora dessa faixa são descartados e outro número é lido.

---

## 14. Difusão esquerda → direita

Depois da permutação, aplicamos difusão da esquerda para a direita:

```txt
bloco[i] = bloco[i] XOR acumulador
acumulador = SBOX_B[bloco[i] + chave + posição]
```

Isso faz um byte depender dos bytes anteriores.

Se um byte no começo mudar, essa alteração começa a afetar os próximos bytes.

---

## 15. Difusão direita → esquerda

Depois fazemos a difusão no sentido contrário:

```txt
bloco[i] = bloco[i] XOR acumulador
acumulador = SBOX_B[bloco[i] + chave + posição]
```

Agora um byte também depende dos bytes que vêm depois.

Com isso, uma pequena mudança pode se espalhar pela mensagem inteira.

---

## 16. Mistura reversível entre blocos

A v0.3 adiciona uma camada extra de mistura entre posições do bloco.

Ela é implementada de forma reversível:

```txt
inverseMixBlocks(mixBlocks(data)) === data
```

A mistura usa passes sequenciais com soma modular, XOR, `SBOX_A`, `SBOX_B`, subchave e número da rodada.

O objetivo é aumentar a difusão sem perder a capacidade de descriptografar.

---

## 17. Repetição por 24 rodadas

Todo esse processo acontece várias vezes:

```txt
Rodada 1:
coordenada → rotação → mistura 8D → SBOX_A/SBOX_B → permutação → difusão → mixBlocks

Rodada 2:
coordenada → rotação → mistura 8D → SBOX_A/SBOX_B → permutação → difusão → mixBlocks

...

Rodada 24:
coordenada → rotação → mistura 8D → SBOX_A/SBOX_B → permutação → difusão → mixBlocks
```

Cada rodada usa subchaves diferentes.

---

## 18. Tag de autenticação

Depois de gerar o texto criptografado, o algoritmo cria uma **tag**.

A tag funciona como uma autenticação da mensagem criptografada.

Ela é criada usando:

```txt
T8D-v0.3-tag + versão + nonce + ciphertext + dados associados
```

junto com a chave de autenticação.

Se alguém alterar um caractere do `ciphertext`, do `nonce`, da tag ou usar dados associados diferentes, a tag deixa de bater.

Nesse caso, a descriptografia rejeita a mensagem:

```txt
Tag inválida. A mensagem pode ter sido alterada ou a chave está errada.
```

Isso é importante porque criptografia sem autenticação pode ser manipulada.

---

## 19. Como funciona a descriptografia

Para descriptografar, o algoritmo faz o caminho inverso.

Primeiro:

```txt
1. separa versão, nonce, ciphertext e tag
2. recalcula a tag
3. compara com a tag recebida
```

Se a tag estiver errada, o processo é interrompido antes de descriptografar.

Se a tag estiver correta, o algoritmo desfaz as rodadas de trás para frente:

```txt
Rodada 23 → desfaz
Rodada 22 → desfaz
Rodada 21 → desfaz
...
Rodada 0  → desfaz
```

A ordem inversa é:

```txt
desfaz mixBlocks
desfaz difusão direita → esquerda
desfaz difusão esquerda → direita
desfaz permutação
recalcula coordenada 8D
desfaz soma de máscara e coordinateAdd
desfaz SBOX_A
desfaz XOR com coordinateXor
```

No final, os bytes voltam para o texto original.

---

## 20. Modo hash T8D-HASH-512

O projeto também possui um modo hash experimental:

```txt
T8D-HASH-512:digestHex
```

Ele gera um digest de 512 bits.

O modo hash absorve:

```txt
versão do hash
dados associados
mensagem
padding
```

Depois aplica uma permutação interna baseada nas rodadas T8D.

> Assim como a cifra, o hash é experimental e não deve substituir SHA-256, SHA-512, SHA-3 ou BLAKE3.

---

## 21. Funções de análise

A v0.3 adiciona um módulo de análise em:

```txt
src/t8d-analysis.ts
```

Funções disponíveis:

```txt
bitDifference(a, b)
calculateAvalanche(plaintext, password)
calculateKeyAvalanche(plaintext, password)
calculateByteFrequency(data)
calculateEntropy(data)
compareCiphertexts(a, b)
runRepeatedTextTest(password)
runKnownPlaintextTest(password)
```

Essas funções ajudam a observar:

```txt
efeito avalanche da mensagem
efeito avalanche da chave
frequência dos bytes
entropia aproximada
diferença entre ciphertexts
comportamento com texto repetido
comportamento com textos conhecidos
```

Essas métricas não provam segurança, mas ajudam a encontrar padrões ruins e regressões.

---

## 22. Interface do laboratório

A interface foi reorganizada em três áreas:

```txt
Entrada → mensagem, senha e dados associados
Ações   → criptografia, descriptografia, hash e análises
Saídas  → payload, resultado descriptografado e hash
```

Botões disponíveis:

```txt
Criptografar
Descriptografar
Gerar hash
Avalanche mensagem
Avalanche chave
Texto repetido
Entropia
```

O log mostra erros e resultados resumidos das análises.

---

## 23. Resumo simples

A criptografia v0.3 funciona assim:

```txt
1. Pega a mensagem
2. Transforma em bytes
3. Gera um nonce aleatório
4. Deriva chaves internas usando a senha
5. Gera subchaves com domain separators
6. Para cada byte, cria uma coordenada 8D
7. Rotaciona e mistura essas dimensões com SBOX_B
8. Usa SBOX_A e SBOX_B para transformar o byte
9. Embaralha os bytes com permutação sem colisão e menor viés
10. Espalha mudanças com difusão em ida e volta
11. Aplica mistura reversível entre blocos
12. Repete tudo por 24 rodadas
13. Gera uma tag para proteger contra alteração
14. Retorna: T8D3 + nonce + ciphertext + tag
```

---

## 24. Limitações conhecidas

Mesmo com as melhorias, a v0.3 continua sendo uma base experimental.

Limitações importantes:

```txt
não há prova formal de segurança
não há criptoanálise pública suficiente
pode ser vulnerável a criptoanálise linear
pode ser vulnerável a criptoanálise diferencial
pode ser vulnerável a ataques de texto conhecido
pode ser vulnerável a ataques de texto escolhido
a complexidade 8D não garante segurança por si só
as métricas de avalanche e entropia não provam segurança
```

O projeto deve ser comparado com algoritmos consolidados, como:

```txt
AES-GCM
ChaCha20-Poly1305
SHA-256
SHA-512
SHA-3
```

---

## 25. Próximos passos sugeridos

Para evoluir o projeto, os próximos passos seriam:

```txt
1. Criar testes automatizados com Vitest
2. Testar reversibilidade com milhares de mensagens aleatórias
3. Testar payload corrompido em lote
4. Testar senha incorreta em lote
5. Medir avalanche ao alterar 1 bit da entrada
6. Medir avalanche ao alterar 1 bit da chave
7. Testar mensagens repetitivas maiores
8. Comparar entropia em amostras grandes
9. Testar padrões de texto conhecido e escolhido
10. Submeter o algoritmo para análise de outras pessoas
```

---

## 26. Aviso final

Este projeto é útil para aprender conceitos de criptografia, como:

```txt
cifra simétrica
nonce
derivação de chave
S-Box
permutação
difusão
confusão
tag de autenticação
efeito avalanche
entropia
hash experimental
```

Mas ele **não deve substituir algoritmos consolidados**, como AES-GCM, ChaCha20-Poly1305, SHA-256, SHA-512, SHA-3 ou padrões pós-quânticos revisados por especialistas.
