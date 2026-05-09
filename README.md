# t8d-crypto-lab

Protótipo experimental em Vite + TypeScript do **Tesseract-8D/128 v0.3**, uma cifra simétrica didática inspirada em um espaço multidimensional com 8 dimensões e 128 estados por dimensão.

> Aviso: este projeto é apenas um estudo. O algoritmo não foi auditado, não segue um padrão criptográfico reconhecido e não deve ser usado em produção nem para proteger dados reais.

## Como rodar

```bash
npm install
npm run dev
```

## Tesseract-8D/128 v0.3

A v0.3 evolui o protótipo para reduzir a “complexidade visual” e aumentar a contribuição real da camada 8D na transformação criptográfica.

Principais mudanças:

- Maior participação da camada 8D no valor do byte criptografado.
- Duas S-Boxes bijetivas: `SBOX_A` para o byte principal e `SBOX_B` para máscaras, coordenadas e difusão auxiliar.
- Não linearidade nas coordenadas usando `SBOX_B`.
- Permutação com menor viés por meio de rejection sampling.
- Key schedule com domain separators: `T8D-v0.3-round-key`, `T8D-v0.3-permutation-key`, `T8D-v0.3-mask-key` e `T8D-v0.3-tag`.
- Camada reversível extra de mistura entre blocos.
- Análise de avalanche da mensagem e da chave.
- Análise de entropia e frequência de bytes.
- Testes de texto repetido e texto conhecido.

A saída da cifra v0.3 usa:

```txt
T8D3:nonceHex:ciphertextHex:tagHex
```

## Recursos implementados

- Nonce único de 16 bytes via `crypto.getRandomValues`.
- Derivação de chaves com PBKDF2 + SHA-256 pela Web Crypto API.
- Separação da chave derivada em `encryptionKey` e `authKey`.
- Subchaves por rodada com SHA-512 e domain separators.
- 24 rodadas com coordenadas 8D, rotação dimensional, mistura dimensional não linear, permutação bijetiva, difusão ida/volta e mistura entre blocos.
- Tag de autenticação com HMAC-SHA-256 validada antes da descriptografia.
- Modo hash experimental `T8D-HASH-512`, com saída `T8D-HASH-512:digestHex` de 512 bits.
- Interface para criptografar, descriptografar, gerar hash e rodar análises.
- Módulo `src/t8d-analysis.ts` com métricas de avalanche, entropia, frequência e testes exploratórios.

## Limitações conhecidas

- O algoritmo continua experimental.
- Não há prova formal de segurança.
- Não deve ser usado em produção.
- Ainda pode ser vulnerável a criptoanálise linear, diferencial, ataques de texto conhecido ou texto escolhido.
- A complexidade 8D não garante segurança por si só.
- O modo `T8D-HASH-512` é experimental e não deve substituir SHA-256, SHA-512, SHA-3 ou BLAKE3.
- É necessário comparar resultados e propriedades com algoritmos consolidados como AES-GCM, ChaCha20-Poly1305 e SHA-3.

## Próximos passos sugeridos

- Adicionar Vitest.
- Criar testes automáticos de reversibilidade com mensagens aleatórias.
- Testar payload corrompido e senha incorreta em lote.
- Medir avalanche por tamanho de mensagem.
- Medir frequência e entropia em amostras grandes.
- Melhorar e documentar formalmente a geração de permutação.
- Submeter o desenho a revisão externa.
# Tesseract-8D-128
