# Visão Geral da API MediaMTX

## Introdução

A API do MediaMTX é uma API RESTful que permite o controle completo do servidor de streaming. Esta documentação fornece todas as informações necessárias para integrar o frontend com o servidor MediaMTX.

## Informações Básicas

- **URL Base**: `http://localhost:9997`
- **Versão da API**: v3
- **Formato de Dados**: JSON
- **Autenticação**: Suporta múltiplos métodos (internal, http, jwt)

## Endpoints Principais

### Configuração Global
- `GET /v3/config/global/get` - Obtém configuração global
- `POST /v3/config/global/patch` - Atualiza configuração global

### Paths
- `GET /v3/paths/list` - Lista todos os paths
- `GET /v3/paths/get/{name}` - Obtém detalhes de um path
- `POST /v3/config/paths/add/{name}` - Adiciona/atualiza um path
- `DELETE /v3/config/paths/delete/{name}` - Remove um path

### RTSP
- `GET /v3/rtspsessions/list` - Lista sessões RTSP
- `GET /v3/rtspsessions/get/{id}` - Obtém detalhes de uma sessão
- `POST /v3/rtspsessions/kick/{id}` - Encerra uma sessão

### RTMP
- `GET /v3/rtmpconns/list` - Lista conexões RTMP
- `GET /v3/rtmpconns/get/{id}` - Obtém detalhes de uma conexão
- `POST /v3/rtmpconns/kick/{id}` - Encerra uma conexão

### WebRTC
- `GET /v3/webrtcsessions/list` - Lista sessões WebRTC
- `GET /v3/webrtcsessions/get/{id}` - Obtém detalhes de uma sessão
- `POST /v3/webrtcsessions/kick/{id}` - Encerra uma sessão

### Gravações
- `GET /v3/recordings/get/{name}` - Obtém gravações de um path

## Formatos de Resposta

### Sucesso
```json
{
  "status": "success",
  "data": {
    // dados específicos do endpoint
  }
}
```

### Erro
```json
{
  "error": "mensagem de erro"
}
```

## Códigos de Status HTTP

- `200` - Sucesso
- `400` - Requisição inválida
- `401` - Não autorizado
- `404` - Recurso não encontrado
- `500` - Erro interno do servidor

## Rate Limiting

Atualmente, a API não implementa rate limiting, mas recomenda-se implementar throttling no cliente para evitar sobrecarga do servidor.

## Boas Práticas

1. **Tratamento de Erros**
   - Sempre verifique o campo `error` nas respostas
   - Implemente retry para falhas temporárias
   - Mantenha logs de erros para debugging

2. **Performance**
   - Use paginação quando disponível
   - Cache respostas quando apropriado
   - Implemente debounce em operações frequentes

3. **Segurança**
   - Sempre use HTTPS em produção
   - Nunca exponha credenciais no código
   - Implemente timeout em todas as requisições

## Próximos Passos

- [Guia de Autenticação](../guides/authentication.md)
- [Exemplos de Código](../examples/)
- [Documentação Detalhada dos Endpoints](./)
