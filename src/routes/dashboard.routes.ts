import { Router } from 'express';
import { obtenerEstadisticasRegionales } from '../controllers/dashboard.controller';
import { verificarToken, verificarRol } from '../middlewares/auth.middleware';

const router = Router();
router.get('/regional', verificarToken, verificarRol(['REGIONAL']), obtenerEstadisticasRegionales);
export default router;
