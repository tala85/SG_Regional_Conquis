import { Router } from 'express';
import { login, registrarUsuario, actualizarUsuario, obtenerUsuarios, resetearPassword, eliminarUsuario } from '../controllers/auth.controller';
import { verificarToken, verificarRol } from '../middlewares/auth.middleware';

const router = Router();

// 1. LOGIN: Es la única puerta abierta al público (No lleva verificarToken)
router.post('/login', login);

// 2. CREAR USUARIO: 🛡️ ACÁ ESTABA EL ERROR. Le agregamos verificarToken
// Además, le decimos que solo SYSADMIN y REGIONAL pueden intentar crear cuentas
router.post('/registro', verificarToken, verificarRol(['SYSADMIN', 'REGIONAL']), registrarUsuario);

// 3. OBTENER Y ACTUALIZAR USUARIOS: También blindados
router.get('/usuarios', verificarToken, obtenerUsuarios);
router.put('/usuarios/:id', verificarToken, actualizarUsuario);
router.delete('/usuario/:id', verificarToken, eliminarUsuario);
router.put('/usuario/reset/:id', verificarToken, resetearPassword);
export default router;