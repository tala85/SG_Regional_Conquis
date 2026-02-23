import { Router } from 'express';
import { crearUsuario } from '../controllers/usuario.controller';

const router = Router();
router.post('/', crearUsuario);

export default router;