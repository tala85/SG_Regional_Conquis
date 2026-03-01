import { Router } from 'express';
import { registrarUsuario, loginUsuario } from '../controllers/auth.controller';
import rateLimit from 'express-rate-limit';

const router = Router();

// 🛡️ CIBERSEGURIDAD: Configuramos la protección contra Fuerza Bruta
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Ventana de tiempo: 15 minutos
  max: 5, // Límite de 5 intentos fallidos por IP
  message: { 
    status: 'error', 
    message: 'Demasiados intentos de acceso fallidos. Por seguridad, su IP ha sido bloqueada temporalmente. Intente nuevamente en 15 minutos.' 
  },
  standardHeaders: true, // Devuelve la info del límite en los headers `RateLimit-*`
  legacyHeaders: false, // Deshabilita los headers `X-RateLimit-*` (obsoletos)
});

// Rutas de Autenticación
router.post('/registro', registrarUsuario);

// Aplicamos el escudo SOLO a la ruta de Login
router.post('/login', loginLimiter, loginUsuario);

export default router;