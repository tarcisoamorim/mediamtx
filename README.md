<h1 align="center">
  <br>
  Peep-MediaServer
  <br>
  <br>
</h1>

<br>

_Peep-MediaServer_ é um servidor de streaming customizado baseado no MediaMTX, otimizado para sistemas de câmeras CFTV. É um servidor de mídia em tempo real pronto para uso e sem dependências externas que permite publicar, ler, fazer proxy, gravar e reproduzir streams de vídeo e áudio. Foi concebido como um "roteador de mídia" que roteia fluxos de mídia de uma ponta a outra.

<h3>Recursos</h3>

- Publicar streams ao vivo no servidor com SRT, WebRTC, RTSP, RTMP, HLS, MPEG-TS, RTP
- Ler streams ao vivo do servidor com SRT, WebRTC, RTSP, RTMP, HLS
- Streams são automaticamente convertidos de um protocolo para outro
- Servir vários streams ao mesmo tempo em caminhos separados
- Recarregar a configuração sem desconectar clientes existentes (hot reloading)
- Gravar streams em disco em formato fMP4 ou MPEG-TS
- Reproduzir streams gravados
- Autenticar usuários com autenticação interna, HTTP ou JWT
- Encaminhar streams para outros servidores
- Fazer proxy de requisições para outros servidores
- Controlar o servidor através da API de Controle
- Extrair métricas do servidor em formato compatível com Prometheus
- Monitorar performance para investigar consumo de CPU e RAM
- Executar hooks (comandos externos) quando clientes conectam, desconectam, leem ou publicam streams
- Compatível com Linux, Windows e macOS, não requer nenhuma dependência ou interpretador, é um único executável
- ...e muitos outros recursos

## Instalação

### Binários

Baixe e extraia um binário pré-compilado da [página de releases](https://github.com/tarcisoamorim/mediamtx/releases).

### Docker

Imagens Docker estão disponíveis no Docker Hub:

```bash
docker run --rm -it \
  --network=host \
  tarcisoamorim/peep-mediaserver:latest
```

### Compilar do Fonte

Requisitos:
- Go 1.25 ou superior

```bash
git clone https://github.com/tarcisoamorim/mediamtx.git
cd mediamtx
go build .
./peep-mediaserver
```

## Configuração

O servidor procura por um arquivo de configuração chamado `peep-mediaserver.yml` no diretório atual. Você pode especificar um caminho diferente com:

```bash
./peep-mediaserver /caminho/para/peep-mediaserver.yml
```

Um arquivo de configuração de exemplo com todas as opções disponíveis está incluído no release.

### Configuração Rápida

Configuração mínima para começar:

```yaml
# Arquivo: peep-mediaserver.yml
logLevel: info
logDestinations: [stdout]

# Configurações RTSP
rtsp: yes
rtspAddress: :8554

# Configurações HLS
hls: yes
hlsAddress: :8888

# Configurações WebRTC
webrtc: yes
webrtcAddress: :8889

# Configurações de paths (streams)
paths:
  all:
```

## Uso Básico

### Publicar Stream RTSP

```bash
ffmpeg -re -stream_loop -1 -i video.mp4 -c copy -f rtsp rtsp://localhost:8554/mystream
```

### Ler Stream

**RTSP:**
```bash
ffmpeg -i rtsp://localhost:8554/mystream -c copy output.mp4
```

**HLS:**
```
http://localhost:8888/mystream
```

**WebRTC:**
```
http://localhost:8889/mystream
```

## Uso em Produção para CFTV

### Gravação Contínua

Configure gravação automática de câmeras:

```yaml
paths:
  camera_01:
    source: rtsp://admin:senha@192.168.1.10:554/stream
    record: yes
    recordPath: ./recordings/%path/%Y-%m-%d_%H-%M-%S
    recordFormat: fmp4
```

### Autenticação

Proteja seus streams:

```yaml
authMethod: internal
authInternalUsers:
  - user: admin
    pass: senha_segura
    permissions:
      - action: publish
      - action: read
```

### Múltiplas Câmeras

```yaml
paths:
  camera_frontal:
    source: rtsp://admin:senha@192.168.1.10:554/stream
    record: yes

  camera_lateral:
    source: rtsp://admin:senha@192.168.1.11:554/stream
    record: yes

  camera_traseira:
    source: rtsp://admin:senha@192.168.1.12:554/stream
    record: yes
```

## API de Controle

A API REST está disponível em `http://localhost:9997/v3/`:

```bash
# Listar configuração
curl http://localhost:9997/v3/config/global/get

# Listar paths ativos
curl http://localhost:9997/v3/paths/list

# Obter métricas
curl http://localhost:9997/v3/metrics/get
```

Documentação completa da API: `api/openapi.yaml`

## Métricas

Métricas Prometheus disponíveis em `http://localhost:9998/metrics`:

```yaml
metrics: yes
metricsAddress: :9998
```

## Performance

- Suporta centenas de câmeras simultâneas
- Baixo uso de CPU e memória
- Otimizado para sistemas Linux
- Suporte para hardware de transcodificação (quando usando FFmpeg)

## Suporte

Este projeto é baseado no excelente [MediaMTX](https://github.com/bluenviron/mediamtx) com customizações para sistemas CFTV.

## Créditos

Baseado no [MediaMTX](https://github.com/bluenviron/mediamtx) por bluenviron.

## Licença

MIT License - veja arquivo LICENSE para detalhes.
