import { Router } from 'express';
import { registrarProgreso } from '../controllers/progreso.controller';
import { verificarToken, verificarRol } from '../middlewares/auth.middleware';

const router = Router();

// Ruta crítica: Exige token y rol de REGIONAL
router.post('/firmar', verificarToken, verificarRol(['REGIONAL']), registrarProgreso);

export default router;