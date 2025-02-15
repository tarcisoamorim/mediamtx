import React, { useEffect, useRef } from 'react';
import { Box, Card, CardContent, Typography, Alert } from '@mui/material';
import Hls from 'hls.js';

/**
 * Componente para visualização de streams HLS do MediaMTX
 * 
 * @component
 * @param {Object} props
 * @param {string} props.pathName - Nome do path para visualização
 * @example
 * return (
 *   <StreamViewer pathName="camera1" />
 * )
 */
function StreamViewer({ pathName }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  useEffect(() => {
    if (!pathName || !videoRef.current) return;

    // Destruir instância anterior do HLS se existir
    if (hlsRef.current) {
      hlsRef.current.destroy();
    }

    // Verificar suporte a HLS
    if (Hls.isSupported()) {
      const hls = new Hls({
        debug: false,
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
      });

      hls.loadSource(`http://localhost:8888/${pathName}/index.m3u8`);
      hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        videoRef.current.play().catch(error => {
          console.error('Erro ao iniciar reprodução:', error);
        });
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error('Erro de rede, tentando reconectar...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error('Erro de mídia, tentando recuperar...');
              hls.recoverMediaError();
              break;
            default:
              console.error('Erro fatal no player:', data);
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
      // Fallback para navegadores com suporte nativo a HLS (Safari)
      videoRef.current.src = `http://localhost:8888/${pathName}/index.m3u8`;
      videoRef.current.addEventListener('loadedmetadata', () => {
        videoRef.current.play().catch(error => {
          console.error('Erro ao iniciar reprodução:', error);
        });
      });
    } else {
      console.error('Navegador não suporta HLS');
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [pathName]);

  if (!pathName) {
    return (
      <Alert severity="info">
        Selecione um path para visualizar o stream
      </Alert>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Stream: {pathName}
        </Typography>
        <Box sx={{ position: 'relative', paddingTop: '56.25%' }}>
          <video
            ref={videoRef}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%'
            }}
            controls
            playsInline
          />
        </Box>
      </CardContent>
    </Card>
  );
}

export default StreamViewer;
