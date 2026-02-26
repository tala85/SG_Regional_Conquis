import { Router } from 'express';
import { obtenerRegistrosAuditoria } from '../controllers/audit.controller';
import { verificarToken } from '../middlewares/auth.middleware';

const router = Router();

// Endpoint ultra-protegido para leer los logs
router.get('/', verificarToken, obtenerRegistrosAuditoria);

export default router;