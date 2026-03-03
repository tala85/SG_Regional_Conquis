import { Router } from 'express';
import { obtenerAgenda, crearEvento, eliminarEvento } from '../controllers/agenda.controller';

const router = Router();

router.get('/', obtenerAgenda);
router.post('/', crearEvento);
router.delete('/:id', eliminarEvento)
export default router;