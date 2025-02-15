/**
 * Utilitários para streaming de mídia no MediaMTX
 */

/**
 * Classe para gerenciar streams HLS
 */
class HLSManager {
  constructor(baseUrl = 'http://localhost:8888') {
    this.baseUrl = baseUrl;
    this.players = new Map();
  }

  /**
   * Inicia um player HLS
   * @param {string} pathName - Nome do path
   * @param {HTMLVideoElement} videoElement - Elemento de vídeo
   * @returns {Promise<void>}
   */
  async startPlayer(pathName, videoElement) {
    if (!Hls.isSupported()) {
      throw new Error('HLS não é suportado neste navegador');
    }

    // Destruir player existente se houver
    this.stopPlayer(pathName);

    const hls = new Hls({
      debug: false,
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 90
    });

    const streamUrl = `${this.baseUrl}/${pathName}/index.m3u8`;

    return new Promise((resolve, reject) => {
      hls.loadSource(streamUrl);
      hls.attachMedia(videoElement);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoElement.play()
          .then(() => resolve())
          .catch(reject);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          reject(new Error(`Erro fatal HLS: ${data.type}`));
        }
      });

      this.players.set(pathName, hls);
    });
  }

  /**
   * Para um player HLS
   * @param {string} pathName - Nome do path
   */
  stopPlayer(pathName) {
    const hls = this.players.get(pathName);
    if (hls) {
      hls.destroy();
      this.players.delete(pathName);
    }
  }
}

/**
 * Classe para gerenciar streams WebRTC
 */
class WebRTCManager {
  constructor(baseUrl = 'http://localhost:8889') {
    this.baseUrl = baseUrl;
    this.connections = new Map();
  }

  /**
   * Inicia uma conexão WebRTC para visualização
   * @param {string} pathName - Nome do path
   * @param {HTMLVideoElement} videoElement - Elemento de vídeo
   * @returns {Promise<void>}
   */
  async startViewer(pathName, videoElement) {
    // Parar conexão existente se houver
    this.stopViewer(pathName);

    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    });

    pc.ontrack = (event) => {
      if (event.track.kind === 'video') {
        videoElement.srcObject = event.streams[0];
      }
    };

    try {
      const response = await fetch(`${this.baseUrl}/${pathName}/whep`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Falha ao iniciar conexão WebRTC');
      }

      const offer = await response.json();
      await pc.setRemoteDescription(new RTCSessionDescription(offer));

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await fetch(`${this.baseUrl}/${pathName}/whep`, {
        method: 'PATCH',
        body: JSON.stringify(answer)
      });

      this.connections.set(pathName, pc);
    } catch (error) {
      pc.close();
      throw error;
    }
  }

  /**
   * Para uma conexão WebRTC
   * @param {string} pathName - Nome do path
   */
  stopViewer(pathName) {
    const pc = this.connections.get(pathName);
    if (pc) {
      pc.close();
      this.connections.delete(pathName);
    }
  }
}

/**
 * Classe para gerenciar streams RTSP
 */
class RTSPManager {
  constructor(baseUrl = 'ws://localhost:8554') {
    this.baseUrl = baseUrl;
    this.connections = new Map();
  }

  /**
   * Inicia uma conexão RTSP
   * @param {string} pathName - Nome do path
   * @param {Object} options - Opções de conexão
   * @returns {Promise<WebSocket>}
   */
  async connect(pathName, options = {}) {
    const ws = new WebSocket(`${this.baseUrl}/${pathName}`);

    return new Promise((resolve, reject) => {
      ws.onopen = () => {
        this.connections.set(pathName, ws);
        resolve(ws);
      };

      ws.onerror = (error) => {
        reject(error);
      };

      ws.onclose = () => {
        this.connections.delete(pathName);
      };
    });
  }

  /**
   * Fecha uma conexão RTSP
   * @param {string} pathName - Nome do path
   */
  disconnect(pathName) {
    const ws = this.connections.get(pathName);
    if (ws) {
      ws.close();
      this.connections.delete(pathName);
    }
  }
}

export { HLSManager, WebRTCManager, RTSPManager };
