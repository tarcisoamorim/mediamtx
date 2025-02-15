/**
 * Cliente API para o MediaMTX
 * Encapsula todas as chamadas à API do MediaMTX
 */
class ApiClient {
  constructor(baseUrl = 'http://localhost:9997') {
    this.baseUrl = baseUrl;
    this.token = localStorage.getItem('auth_token');
  }

  /**
   * Configura o token de autenticação
   * @param {string} token - Token JWT ou Basic Auth
   */
  setToken(token) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  /**
   * Remove o token de autenticação
   */
  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  /**
   * Realiza uma requisição à API
   * @param {string} endpoint - Endpoint da API
   * @param {Object} options - Opções da requisição
   * @returns {Promise<Object>} Resposta da API
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (response.status === 401) {
        this.clearToken();
        throw new Error('Não autorizado');
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro na requisição');
      }

      return data;
    } catch (error) {
      console.error(`Erro na requisição para ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Lista todos os paths
   * @param {Object} params - Parâmetros de paginação
   * @returns {Promise<Object>} Lista de paths
   */
  async listPaths(params = {}) {
    return this.request('/v3/paths/list', {
      method: 'GET',
      params
    });
  }

  /**
   * Obtém detalhes de um path específico
   * @param {string} name - Nome do path
   * @returns {Promise<Object>} Detalhes do path
   */
  async getPath(name) {
    return this.request(`/v3/paths/get/${name}`, {
      method: 'GET'
    });
  }

  /**
   * Adiciona ou atualiza um path
   * @param {string} name - Nome do path
   * @param {Object} config - Configuração do path
   * @returns {Promise<Object>} Resultado da operação
   */
  async addPath(name, config) {
    return this.request(`/v3/config/paths/add/${name}`, {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }

  /**
   * Remove um path
   * @param {string} name - Nome do path
   * @returns {Promise<Object>} Resultado da operação
   */
  async deletePath(name) {
    return this.request(`/v3/config/paths/delete/${name}`, {
      method: 'DELETE'
    });
  }

  /**
   * Lista todas as sessões RTSP
   * @param {Object} params - Parâmetros de paginação
   * @returns {Promise<Object>} Lista de sessões RTSP
   */
  async listRTSPSessions(params = {}) {
    return this.request('/v3/rtspsessions/list', {
      method: 'GET',
      params
    });
  }

  /**
   * Lista todas as conexões RTMP
   * @param {Object} params - Parâmetros de paginação
   * @returns {Promise<Object>} Lista de conexões RTMP
   */
  async listRTMPConnections(params = {}) {
    return this.request('/v3/rtmpconns/list', {
      method: 'GET',
      params
    });
  }

  /**
   * Lista todas as sessões WebRTC
   * @param {Object} params - Parâmetros de paginação
   * @returns {Promise<Object>} Lista de sessões WebRTC
   */
  async listWebRTCSessions(params = {}) {
    return this.request('/v3/webrtcsessions/list', {
      method: 'GET',
      params
    });
  }

  /**
   * Obtém gravações de um path
   * @param {string} name - Nome do path
   * @returns {Promise<Object>} Lista de gravações
   */
  async getRecordings(name) {
    return this.request(`/v3/recordings/get/${name}`, {
      method: 'GET'
    });
  }

  /**
   * Obtém configuração global
   * @returns {Promise<Object>} Configuração global
   */
  async getGlobalConfig() {
    return this.request('/v3/config/global/get', {
      method: 'GET'
    });
  }

  /**
   * Atualiza configuração global
   * @param {Object} config - Nova configuração
   * @returns {Promise<Object>} Resultado da operação
   */
  async updateGlobalConfig(config) {
    return this.request('/v3/config/global/patch', {
      method: 'POST',
      body: JSON.stringify(config)
    });
  }
}

export default ApiClient;
