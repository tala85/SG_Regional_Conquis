import { Router } from 'express';
// 👈 Agregamos crearRegion y obtenerRegiones a la importación
import { crearClub, obtenerMisClubes, eliminarClub, crearRegion, obtenerRegiones, actualizarClub, toggleEstadoClub } from '../controllers/club.controller';
import { verificarToken, verificarRol } from '../middlewares/auth.middleware';

const router = Router();

// --- RUTAS DE REGIONES (ZONAS) ---
router.post('/regiones', verificarToken, verificarRol(['SYSADMIN']), crearRegion);
router.get('/regiones', verificarToken, obtenerRegiones);

// --- RUTAS DE CLUBES ---
router.get('/', verificarToken, obtenerMisClubes);
router.post('/', verificarToken, verificarRol(['SYSADMIN']), crearClub);
router.delete('/:id', verificarToken, verificarRol(['SYSADMIN']), eliminarClub);
router.put('/:id', verificarToken, verificarRol(['SYSADMIN']), actualizarClub);
router.put('/:id/estado', verificarToken, toggleEstadoClub);

export default router;