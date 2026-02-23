import { Router } from 'express';
import { obtenerClases } from '../controllers/clase.controller';

const router = Router();

// Cuando alguien entre a GET /, ejecutamos obtenerClases
router.get('/', obtenerClases);

export default router;