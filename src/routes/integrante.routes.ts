import { Router } from 'express';
import { crearIntegrante } from '../controllers/integrante.controller';
import { verificarToken } from '../middlewares/auth.middleware'; // Importamos el middleware

const router = Router();

// Insertamos verificarToken en el medio. Funciona como un peaje.
router.post('/', verificarToken, crearIntegrante);

export default router;