# Autenticação na API MediaMTX

## Métodos de Autenticação

O MediaMTX suporta três métodos de autenticação:

### 1. Autenticação Interna

```yaml
authMethod: internal
authInternalUsers:
  - user: "admin"
    pass: "senha123"
    permissions:
      - action: publish
      - action: read
      - action: api
```

#### Exemplo de Uso
```javascript
const headers = {
  'Authorization': 'Basic ' + btoa('admin:senha123')
};

fetch('http://localhost:9997/v3/paths/list', {
  headers: headers
});
```

### 2. Autenticação HTTP

```yaml
authMethod: http
authHTTPAddress: "http://auth-server/validate"
```

O servidor externo receberá um POST com:
```json
{
  "user": "username",
  "password": "password",
  "ip": "ip",
  "action": "publish|read|playback|api|metrics|pprof",
  "path": "path",
  "protocol": "rtsp|rtmp|hls|webrtc|srt",
  "id": "id",
  "query": "query"
}
```

#### Exemplo de Uso
```javascript
// A autenticação é gerenciada pelo servidor HTTP externo
fetch('http://localhost:9997/v3/paths/list', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});
```

### 3. Autenticação JWT

```yaml
authMethod: jwt
authJWTJWKS: "https://identity-server/.well-known/jwks.json"
authJWTClaimKey: "mediamtx_permissions"
```

O JWT deve conter as permissões no formato:
```json
{
  "mediamtx_permissions": [
    {
      "action": "publish",
      "path": "camera1"
    }
  ]
}
```

#### Exemplo de Uso
```javascript
fetch('http://localhost:9997/v3/paths/list', {
  headers: {
    'Authorization': 'Bearer ' + jwt
  }
});
```

## Implementação no Frontend

### 1. Classe de Autenticação

```javascript
class AuthService {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('auth_token');
  }

  async login(username, password) {
    try {
      // Implementar lógica de login baseada no método de autenticação
      const response = await fetch(`${this.baseUrl}/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) throw new Error('Falha na autenticação');

      const data = await response.json();
      this.token = data.token;
      localStorage.setItem('auth_token', this.token);
      
      return true;
    } catch (error) {
      console.error('Erro de autenticação:', error);
      throw error;
    }
  }

  getAuthHeaders() {
    if (!this.token) return {};
    
    return {
      'Authorization': `Bearer ${this.token}`
    };
  }

  logout() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  isAuthenticated() {
    return !!this.token;
  }
}
```

### 2. Cliente API com Autenticação

```javascript
class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.auth = new AuthService(baseUrl);
  }

  async request(endpoint, options = {}) {
    const headers = {
      ...options.headers,
      ...this.auth.getAuthHeaders()
    };

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers
      });

      if (response.status === 401) {
        this.auth.logout();
        throw new Error('Não autorizado');
      }

      return await response.json();
    } catch (error) {
      console.error('Erro na requisição:', error);
      throw error;
    }
  }
}
```

### 3. Exemplo de Uso em React

```jsx
import { useState, useEffect } from 'react';

const apiClient = new ApiClient('http://localhost:9997');

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [paths, setPaths] = useState([]);

  useEffect(() => {
    if (isAuthenticated) {
      loadPaths();
    }
  }, [isAuthenticated]);

  const login = async (username, password) => {
    try {
      await apiClient.auth.login(username, password);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Erro no login:', error);
    }
  };

  const loadPaths = async () => {
    try {
      const data = await apiClient.request('/v3/paths/list');
      setPaths(data.items);
    } catch (error) {
      console.error('Erro ao carregar paths:', error);
    }
  };

  return (
    <div>
      {!isAuthenticated ? (
        <LoginForm onSubmit={login} />
      ) : (
        <PathsList paths={paths} />
      )}
    </div>
  );
}
```

## Boas Práticas de Segurança

1. **Armazenamento Seguro**
   - Nunca armazene senhas
   - Use localStorage apenas para tokens JWT
   - Considere usar httpOnly cookies para tokens

2. **Renovação de Token**
   - Implemente refresh tokens quando necessário
   - Renove tokens antes da expiração
   - Limpe tokens expirados

3. **Tratamento de Erros**
   - Implemente logout automático em erro 401
   - Forneça feedback claro ao usuário
   - Mantenha logs de falhas de autenticação

4. **HTTPS**
   - Sempre use HTTPS em produção
   - Verifique certificados SSL
   - Implemente HSTS quando possível
