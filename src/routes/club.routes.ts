import { Router } from 'express';
import { crearClub, obtenerIntegrantesPorClub } from '../controllers/club.controller';
import { verificarToken } from '../middlewares/auth.middleware'; // Importamos el middleware

const router = Router();
router.post('/', verificarToken, crearClub);
router.get('/:id/integrantes', verificarToken, obtenerIntegrantesPorClub);

export default router;