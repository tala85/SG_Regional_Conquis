import { Router } from 'express';
// Faltaba importar obtenerUsuarios acá:
import { registrarUsuario, loginUsuario, actualizarUsuario, obtenerUsuarios } from '../controllers/auth.controller';
import { verificarToken } from '../middlewares/auth.middleware'; 
import rateLimit from 'express-rate-limit';

const router = Router();

// 🛡️ CIBERSEGURIDAD: Configuramos la protección contra Fuerza Bruta
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // 5 intentos
  message: { 
    status: 'error', 
    message: 'Demasiados intentos de acceso fallidos. Por seguridad, su IP ha sido bloqueada temporalmente. Intente nuevamente en 15 minutos.' 
  },
  standardHeaders: true, 
  legacyHeaders: false, 
});

// Rutas de Autenticación
router.post('/registro', registrarUsuario);
router.post('/login', loginLimiter, loginUsuario);

// Rutas de Gestión de Usuarios (Faltaba la ruta GET)
router.get('/usuarios', verificarToken, obtenerUsuarios); // <-- ¡Esta es la que devuelve la lista!
router.put('/usuarios/:id', verificarToken, actualizarUsuario);

export default router;