import api from "../config/axios.config";
import type { Mensaje, UsuarioContacto } from "../types/mensaje.types";

export const mensajeService = {
  // 1. Obtener la bandeja de entrada
  obtenerBandejaEntrada: async (): Promise<Mensaje[]> => {
    // Agregamos /api/
    const response = await api.get("/api/mensajes/entrada");
    return response.data.data;
  },

  // 2. Obtener los mensajes enviados
  obtenerBandejaSalida: async (): Promise<Mensaje[]> => {
    // Agregamos /api/
    const response = await api.get("/api/mensajes/salida");
    return response.data.data;
  },

  // 3. Enviar un nuevo mensaje
  enviarMensaje: async (datos: {
    destinatarioId: number;
    asunto: string;
    cuerpo: string;
  }) => {
    // Agregamos /api/
    const response = await api.post("/api/mensajes", datos);
    return response.data;
  },

  // 4. Marcar mensaje como leído
  marcarLeido: async (id: number) => {
    // Agregamos /api/
    const response = await api.put(`/api/mensajes/${id}/leer`);
    return response.data;
  },

  // 5. Obtener lista de contactos para el select
  obtenerContactos: async (): Promise<UsuarioContacto[]> => {
    // Agregamos /api/
    const response = await api.get("/api/mensajes/contactos");
    return response.data.data;
  },
};
