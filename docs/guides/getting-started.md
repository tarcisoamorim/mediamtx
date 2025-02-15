# Guia de Início Rápido - Frontend MediaMTX

## Introdução

Este guia fornece as informações necessárias para começar a desenvolver o frontend para o MediaMTX.

## Pré-requisitos

1. **Node.js e npm**
   - Node.js 18.x ou superior
   - npm 8.x ou superior

2. **MediaMTX Server**
   - Servidor MediaMTX rodando localmente
   - API habilitada e acessível

3. **Conhecimentos Recomendados**
   - JavaScript/TypeScript
   - React.js
   - APIs REST
   - Streaming de mídia (RTSP, WebRTC, HLS)

## Configuração do Ambiente

### 1. Criar Projeto React

```bash
# Usando Create React App
npx create-react-app mediamtx-frontend
cd mediamtx-frontend

# ou usando Vite
npm create vite@latest mediamtx-frontend -- --template react
cd mediamtx-frontend
```

### 2. Instalar Dependências

```bash
npm install axios       # Cliente HTTP
npm install @mui/material @emotion/react @emotion/styled  # UI Components
npm install react-router-dom  # Roteamento
npm install react-query      # Gerenciamento de estado/cache
npm install video.js        # Player de vídeo
```

### 3. Estrutura do Projeto

```
src/
├── api/
│   ├── client.js      # Cliente API
│   ├── paths.js       # Endpoints de paths
│   ├── rtsp.js        # Endpoints RTSP
│   └── auth.js        # Autenticação
├── components/
│   ├── PathList/      # Lista de paths
│   ├── StreamPlayer/  # Player de vídeo
│   └── Dashboard/     # Dashboard principal
├── contexts/
│   └── AuthContext.js # Contexto de autenticação
├── hooks/
│   └── useApi.js      # Hook personalizado para API
└── utils/
    └── streaming.js   # Utilitários de streaming
```

## Primeiros Passos

### 1. Configurar Cliente API

```javascript
// src/api/client.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:9997';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para tratamento de erros
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Redirecionar para login
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

### 2. Criar Componente de Lista de Paths

```jsx
// src/components/PathList/PathList.jsx
import React, { useState, useEffect } from 'react';
import apiClient from '../../api/client';

function PathList() {
  const [paths, setPaths] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPaths();
  }, []);

  const loadPaths = async () => {
    try {
      const response = await apiClient.get('/v3/paths/list');
      setPaths(response.data.items);
    } catch (error) {
      console.error('Erro ao carregar paths:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <div>
      <h2>Paths Disponíveis</h2>
      <ul>
        {paths.map(path => (
          <li key={path.name}>
            {path.name} - {path.ready ? 'Online' : 'Offline'}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PathList;
```

### 3. Implementar Player de Vídeo

```jsx
// src/components/StreamPlayer/StreamPlayer.jsx
import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

function StreamPlayer({ path }) {
  const videoRef = useRef(null);
  const playerRef = useRef(null);

  useEffect(() => {
    if (!videoRef.current) return;

    playerRef.current = videojs(videoRef.current, {
      autoplay: true,
      controls: true,
      sources: [{
        src: `http://localhost:8888/${path}/index.m3u8`,
        type: 'application/x-mpegURL'
      }]
    });

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
      }
    };
  }, [path]);

  return (
    <div data-vjs-player>
      <video ref={videoRef} className="video-js" />
    </div>
  );
}

export default StreamPlayer;
```

## Exemplos de Uso

### 1. Dashboard Principal

```jsx
// src/components/Dashboard/Dashboard.jsx
import React from 'react';
import PathList from '../PathList/PathList';
import StreamPlayer from '../StreamPlayer/StreamPlayer';

function Dashboard() {
  const [selectedPath, setSelectedPath] = useState(null);

  return (
    <div className="dashboard">
      <div className="sidebar">
        <PathList onPathSelect={setSelectedPath} />
      </div>
      <div className="main-content">
        {selectedPath && (
          <StreamPlayer path={selectedPath} />
        )}
      </div>
    </div>
  );
}

export default Dashboard;
```

### 2. Formulário de Adição de Path

```jsx
// src/components/PathForm/PathForm.jsx
import React, { useState } from 'react';
import apiClient from '../../api/client';

function PathForm({ onSuccess }) {
  const [formData, setFormData] = useState({
    name: '',
    source: '',
    sourceOnDemand: true
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await apiClient.post(`/v3/config/paths/add/${formData.name}`, {
        source: formData.source,
        sourceOnDemand: formData.sourceOnDemand
      });
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao adicionar path:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Nome do Path"
        value={formData.name}
        onChange={e => setFormData({...formData, name: e.target.value})}
      />
      <input
        type="text"
        placeholder="URL da Fonte"
        value={formData.source}
        onChange={e => setFormData({...formData, source: e.target.value})}
      />
      <button type="submit">Adicionar Path</button>
    </form>
  );
}

export default PathForm;
```

## Próximos Passos

1. Implementar autenticação
2. Adicionar monitoramento em tempo real
3. Melhorar tratamento de erros
4. Implementar testes
5. Otimizar performance

## Recursos Adicionais

- [Documentação da API](../api/overview.md)
- [Guia de Autenticação](../api/authentication.md)
- [Exemplos de Código](../examples/)
