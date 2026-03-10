export interface UsuarioContacto {
  id: number;
  nombre: string;
  email: string;
  rol: string;
}

export interface Mensaje {
  id: number;
  asunto: string;
  cuerpo: string;
  leido: boolean;
  fechaEnvio: string; // Viene como string (ISO date) desde el JSON de la API
  remitenteId: number;
  destinatarioId: number;
  // El backend hace un "include" dependiendo de qué bandeja miremos
  remitente?: UsuarioContacto;
  destinatario?: UsuarioContacto;
}

// Lo que necesitamos enviar para crear un mensaje nuevo
export interface EnviarMensajePayload {
  destinatarioId: number;
  asunto: string;
  cuerpo: string;
}