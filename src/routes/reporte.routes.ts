import { Router } from 'express';
import { obtenerReporteClub } from '../controllers/reporte.controller';
import { verificarToken, verificarRol } from '../middlewares/auth.middleware';

const router = Router();

// Ruta protegida: requiere token válido y que el rol sea REGIONAL
router.get('/club/:clubId', verificarToken, verificarRol(['REGIONAL']), obtenerReporteClub);

export default router;