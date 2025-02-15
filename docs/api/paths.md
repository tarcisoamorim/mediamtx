# Endpoints de Paths - MediaMTX API

## Introdução

Os endpoints de paths são fundamentais para o MediaMTX, pois gerenciam as fontes de streaming e suas configurações. Um path representa uma fonte de mídia única no sistema.

## Endpoints

### 1. Listar Paths

```
GET /v3/paths/list
```

#### Parâmetros de Query
- `page` (opcional): Número da página
- `itemsPerPage` (opcional): Itens por página

#### Resposta
```json
{
  "pageCount": 1,
  "items": [
    {
      "name": "camera1",
      "confName": "camera1",
      "conf": {
        "source": "rtsp://camera-ip/stream",
        "sourceOnDemand": true
      },
      "source": {
        "type": "rtsp",
        "id": "conn_id"
      },
      "ready": true,
      "readyTime": "2024-02-14T10:00:00Z",
      "tracks": [
        {
          "id": 0,
          "type": "video",
          "codec": "h264"
        },
        {
          "id": 1,
          "type": "audio",
          "codec": "aac"
        }
      ]
    }
  ]
}
```

### 2. Obter Path Específico

```
GET /v3/paths/get/{name}
```

#### Parâmetros
- `name`: Nome do path

#### Resposta
```json
{
  "name": "camera1",
  "confName": "camera1",
  "conf": {
    "source": "rtsp://camera-ip/stream",
    "sourceOnDemand": true
  },
  "source": {
    "type": "rtsp",
    "id": "conn_id"
  },
  "ready": true,
  "readyTime": "2024-02-14T10:00:00Z",
  "tracks": [
    {
      "id": 0,
      "type": "video",
      "codec": "h264"
    }
  ]
}
```

### 3. Adicionar/Atualizar Path

```
POST /v3/config/paths/add/{name}
```

#### Parâmetros
- `name`: Nome do path

#### Corpo da Requisição
```json
{
  "source": "rtsp://camera-ip/stream",
  "sourceOnDemand": true,
  "record": false,
  "fallback": "rtsp://backup-camera/stream",
  "rtspTransport": "tcp",
  "readTimeout": "10s",
  "writeTimeout": "10s"
}
```

### 4. Remover Path

```
DELETE /v3/config/paths/delete/{name}
```

#### Parâmetros
- `name`: Nome do path

## Exemplos de Uso

### 1. Listar Todos os Paths

```javascript
async function listPaths() {
  try {
    const response = await fetch('http://localhost:9997/v3/paths/list');
    const data = await response.json();
    return data.items;
  } catch (error) {
    console.error('Erro ao listar paths:', error);
    throw error;
  }
}
```

### 2. Adicionar Novo Path

```javascript
async function addPath(name, config) {
  try {
    const response = await fetch(`http://localhost:9997/v3/config/paths/add/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config)
    });
    
    if (!response.ok) {
      throw new Error('Falha ao adicionar path');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Erro ao adicionar path:', error);
    throw error;
  }
}
```

### 3. Monitorar Estado do Path

```javascript
class PathMonitor {
  constructor(pathName, interval = 5000) {
    this.pathName = pathName;
    this.interval = interval;
    this.listeners = new Set();
  }

  start() {
    this.timer = setInterval(() => this.checkPath(), this.interval);
    return this;
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async checkPath() {
    try {
      const response = await fetch(`http://localhost:9997/v3/paths/get/${this.pathName}`);
      const data = await response.json();
      
      this.listeners.forEach(listener => listener(data));
    } catch (error) {
      console.error('Erro ao monitorar path:', error);
    }
  }

  addListener(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}

// Uso
const monitor = new PathMonitor('camera1').start();
monitor.addListener((pathData) => {
  console.log('Estado do path:', pathData.ready);
  console.log('Tracks:', pathData.tracks);
});
```

## Componente React para Gerenciamento de Paths

```jsx
import React, { useState, useEffect } from 'react';

function PathManager() {
  const [paths, setPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPaths();
  }, []);

  const fetchPaths = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:9997/v3/paths/list');
      const data = await response.json();
      setPaths(data.items);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const addPath = async (name, config) => {
    try {
      await fetch(`http://localhost:9997/v3/config/paths/add/${name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      
      fetchPaths(); // Recarrega a lista
    } catch (error) {
      setError(error.message);
    }
  };

  const deletePath = async (name) => {
    try {
      await fetch(`http://localhost:9997/v3/config/paths/delete/${name}`, {
        method: 'DELETE'
      });
      
      fetchPaths(); // Recarrega a lista
    } catch (error) {
      setError(error.message);
    }
  };

  if (loading) return <div>Carregando...</div>;
  if (error) return <div>Erro: {error}</div>;

  return (
    <div>
      <h2>Gerenciador de Paths</h2>
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Status</th>
            <th>Fonte</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {paths.map(path => (
            <tr key={path.name}>
              <td>{path.name}</td>
              <td>{path.ready ? 'Online' : 'Offline'}</td>
              <td>{path.conf.source}</td>
              <td>
                <button onClick={() => deletePath(path.name)}>
                  Excluir
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default PathManager;
```

## Considerações Importantes

1. **Monitoramento**
   - Implemente polling para paths críticos
   - Use websockets se disponível
   - Mantenha timeout adequado

2. **Cache**
   - Cache lista de paths
   - Invalidação sob demanda
   - TTL apropriado

3. **Erro Handling**
   - Retry em falhas temporárias
   - Feedback ao usuário
   - Logging apropriado

4. **Performance**
   - Use paginação
   - Limite número de requests
   - Implemente debounce
