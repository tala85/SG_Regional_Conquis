// src/config/axios.ts
// ====================================================
// CONFIGURACIÓN CENTRALIZADA DE AXIOS
//
// FIX: Antes la URL del backend estaba hardcodeada como
// 'http://localhost:3000' en cada llamada del frontend.
// Eso hace que cuando se despliega en producción, todo falla.
//
// CÓMO USAR:
//   import api from '../config/axios';
//   const res = await api.get('/integrantes/ranking');
//
// Para desarrollo: creá un archivo .env en frontend-conquis/ con:
//   VITE_API_URL=http://localhost:3000
//
// Para producción: configurá esa variable en tu servidor/hosting.
// ====================================================

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 15000, // 15 segundos máximo por request
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor de REQUEST: inyecta el token automáticamente en cada llamada
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('tokenConquis');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor de RESPONSE: manejo centralizado de errores de autenticación
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si el servidor responde 401 (token vencido o inválido), limpiamos la sesión
    if (error.response?.status === 401) {
      localStorage.removeItem('tokenConquis');
      localStorage.removeItem('rolConquis');
      // Redirigimos al login (recarga la app que detecta token=null)
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export default api;