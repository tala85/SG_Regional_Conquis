import { Router } from 'express';
import { crearClub, obtenerMisClubes, eliminarClub } from '../controllers/club.controller';
import { verificarToken, verificarRol } from '../middlewares/auth.middleware';

const router = Router();

// Todas estas rutas requieren que el usuario esté logueado y sea REGIONAL
router.use(verificarToken, verificarRol(['REGIONAL']));

router.post('/', crearClub);             // POST a /api/clubes
router.get('/', obtenerMisClubes);       // GET a /api/clubes
router.delete('/:id', eliminarClub);     // DELETE a /api/clubes/1

export default router;