# Audiobook Generator

Converte livros em PDF ou TXT em audiobooks narrados por vozes neurais, pensado para ajudar pessoas que têm dificuldade de ler a acessarem o mesmo conteúdo ouvindo.

O projeto limpa automaticamente artefatos comuns de livros digitalizados (números de página, cabeçalhos e rodapés repetidos, palavras quebradas por hifenização de fim de linha), detecta trechos de diálogo (falas que começam com travessão `—`) para inserir uma pausa maior antes delas, e narra o texto com vozes neurais fluidas — sem soar robótico.

## Como funciona a narração

- O texto é sintetizado em trechos (parágrafos), preservando a pontuação original — é essa pontuação que faz a própria voz neural pausar naturalmente em vírgulas e frases.
- Antes de cada novo parágrafo é inserido um pequeno silêncio; antes de uma fala (parágrafo iniciado por `—`) o silêncio é maior, simulando a troca de interlocutor.
- Parágrafos muito longos são divididos em frases automaticamente, para não sobrecarregar o motor de voz, mantendo transições curtas entre elas.

## Motores de voz

O projeto usa dois motores de síntese de voz, com troca automática entre eles:

1. **Microsoft Edge TTS** (padrão) — motor neural gratuito e sem necessidade de chave de API, com dezenas de vozes em português. Requer internet.
2. **Piper TTS** (reserva) — motor open source que roda 100% localmente, sem internet. É usado automaticamente sempre que o Microsoft Edge TTS não puder ser acessado (falha de rede, bloqueio, indisponibilidade), tanto no início quanto no meio da narração.

Na primeira vez que o Piper TTS for necessário, o binário e o modelo de voz em português são baixados automaticamente (juntos, algumas dezenas de MB). Se preferir preparar isso com antecedência (por exemplo, antes de ficar sem internet), rode:

```
npm run setup
```

## Pré-requisitos

- [Node.js](https://nodejs.org/) 22.13 ou superior.

## Instalação

```
npm install
```

## Como usar

```
npm start
```

Isso sobe um servidor local e abre automaticamente `http://localhost:4747` no navegador, com a interface web:

1. Arraste um PDF ou TXT para a área de upload (ou clique para escolher o arquivo manualmente). Também é possível reutilizar um livro já salvo, escolhendo a pasta e o arquivo nos seletores "ou use um livro já salvo".
2. Confirme (ou edite) o nome do livro e escolha a voz desejada.
3. Clique em "Gerar audiobook" e acompanhe o progresso na tela.
4. Ao final, ouça pelo player embutido ou baixe o MP3 pelo botão "Baixar audiobook".

O arquivo enviado é salvo em `Conteudo/<nome do livro>/`, e o audiobook gerado fica em `Audios/<nome do livro>/<arquivo>.mp3`, exatamente como no fluxo de terminal.

### Modo terminal (avançado)

O fluxo original por terminal continua disponível:

```
npm run cli
```

Ele aceita as mesmas pastas/arquivos de `Conteudo/` e tem duas flags extras, úteis para depuração:

- `--somente-limpeza` — roda apenas a extração e limpeza do texto, gerando um arquivo `.txt` de depuração (com `[FALA]` marcando os diálogos detectados) em `.cache/tmp/`, sem gastar tempo gerando áudio.
- `--forcar-motor=piper` — pula a seleção de voz e a checagem do Microsoft Edge TTS, narrando direto com a voz padrão do Piper TTS (offline).

Exemplo:

```
npm run cli -- --somente-limpeza
npm run cli -- --forcar-motor=piper
```

## Estrutura do projeto

```
Conteudo/           livros de entrada, organizados em subpastas
Audios/              audiobooks gerados, espelhando o nome da subpasta de origem
public/               interface web (HTML, CSS e JS servidos pelo servidor local)
scripts/
  setup-piper.js     baixa e prepara o motor Piper TTS (binário + vozes)
src/
  server/             servidor web (Express): rotas da API e progresso em tempo real (SSE)
  index.js           ponto de entrada do modo terminal (npm run cli)
  config.js           constantes ajustáveis (pausas, concorrência, porta do servidor, etc.)
  cli/                 prompts interativos no terminal
  extractors/          leitura de PDF e TXT
  processing/          limpeza de texto, detecção de diálogo e segmentação
  tts/                  motores de voz (Edge TTS e Piper TTS) e troca automática entre eles
  audio/                normalização, silêncios e montagem do áudio final (via ffmpeg)
  utils/                caminhos de arquivos e logs no terminal
```

## Configurações ajustáveis

Em `src/config.js` é possível ajustar, por exemplo:

- `PAUSE_PARAGRAPH_MS`, `PAUSE_DIALOGUE_MS`, `PAUSE_SUBCHUNK_MS` — duração dos silêncios entre trechos.
- `MAX_PARAGRAPH_CHARS` — tamanho máximo de um parágrafo antes de ser dividido em frases.
- `TTS_CONCURRENCY_EDGE`, `TTS_CONCURRENCY_PIPER` — quantos trechos são narrados em paralelo.
- `MAX_CONSECUTIVE_EDGE_FAILURES` — quantas falhas seguidas do Microsoft Edge TTS disparam a troca definitiva para o Piper TTS.

## Limitações conhecidas

- O Microsoft Edge TTS não é uma API oficial da Microsoft — é o mesmo serviço usado pelo recurso "Ler em voz alta" do navegador Edge, acessado de forma não documentada. Ele pode ficar temporariamente indisponível ou mudar sem aviso; é por isso que o Piper TTS existe como alternativa local.
- A remoção de números de página e cabeçalhos/rodapés repetidos é heurística: funciona bem na maioria dos livros, mas pode ocasionalmente deixar passar algum artefato ou remover uma linha legítima muito curta e repetitiva.
- A detecção de parágrafos no PDF depende da extração de texto do arquivo original; PDFs gerados a partir de digitalizações (imagem escaneada sem OCR) não têm texto extraível.

## Licença

MIT — veja [LICENSE](LICENSE).
