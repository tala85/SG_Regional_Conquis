import { Router } from 'express';
import { registrarProgreso } from '../controllers/progreso.controller';
import { verificarToken } from '../middlewares/auth.middleware';

const router = Router();
router.post('/', verificarToken, registrarProgreso);

export default router;