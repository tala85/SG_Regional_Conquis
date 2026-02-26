import { Router } from 'express';
import { obtenerReporteClub, generarReporteInvestidura } from '../controllers/reporte.controller';
import { verificarToken } from '../middlewares/auth.middleware';

const router = Router();

// Ruta de tu reporte en JSON
router.get('/club/:clubId', verificarToken, obtenerReporteClub);

// Ruta del nuevo reporte en Excel
router.get('/investidura/club/:clubId', verificarToken, generarReporteInvestidura);

export default router;