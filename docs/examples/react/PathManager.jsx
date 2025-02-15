import React, { useState, useEffect } from 'react';
import { Box, Button, Card, CardContent, Grid, Typography, Alert } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';

/**
 * Componente para gerenciamento de paths do MediaMTX
 * 
 * @component
 * @example
 * return (
 *   <PathManager />
 * )
 */
function PathManager() {
  const [paths, setPaths] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const columns = [
    { field: 'name', headerName: 'Nome', flex: 1 },
    { field: 'ready', headerName: 'Status', width: 130,
      renderCell: (params) => (
        <Typography color={params.value ? 'success.main' : 'error.main'}>
          {params.value ? 'Online' : 'Offline'}
        </Typography>
      )
    },
    { field: 'source', headerName: 'Fonte', flex: 2,
      valueGetter: (params) => params.row.conf?.source || 'N/A'
    },
    { field: 'actions', headerName: 'Ações', width: 200,
      renderCell: (params) => (
        <Box>
          <Button
            variant="contained"
            color="error"
            size="small"
            onClick={() => handleDelete(params.row.name)}
          >
            Excluir
          </Button>
        </Box>
      )
    }
  ];

  useEffect(() => {
    fetchPaths();
    // Atualiza a lista a cada 5 segundos
    const interval = setInterval(fetchPaths, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchPaths = async () => {
    try {
      const response = await fetch('http://localhost:9997/v3/paths/list');
      if (!response.ok) throw new Error('Falha ao carregar paths');
      
      const data = await response.json();
      setPaths(data.items);
      setError(null);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (name) => {
    try {
      const response = await fetch(`http://localhost:9997/v3/config/paths/delete/${name}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Falha ao excluir path');

      await fetchPaths();
    } catch (error) {
      setError(error.message);
    }
  };

  const handleAddPath = async (pathData) => {
    try {
      const response = await fetch(`http://localhost:9997/v3/config/paths/add/${pathData.name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pathData.config)
      });

      if (!response.ok) throw new Error('Falha ao adicionar path');

      await fetchPaths();
    } catch (error) {
      setError(error.message);
    }
  };

  return (
    <Box sx={{ height: 400, width: '100%' }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h5" component="h2" gutterBottom>
                Gerenciador de Paths
              </Typography>
              
              {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {error}
                </Alert>
              )}

              <DataGrid
                rows={paths}
                columns={columns}
                pageSize={5}
                rowsPerPageOptions={[5]}
                getRowId={(row) => row.name}
                loading={loading}
                autoHeight
                disableSelectionOnClick
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default PathManager;
