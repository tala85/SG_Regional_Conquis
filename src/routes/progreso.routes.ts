import { Router } from 'express';
import { firmarRequisito, obtenerProgreso } from '../controllers/progreso.controller';
import { verificarToken } from '../middlewares/auth.middleware';
import { uploadImagen } from '../middlewares/upload.middleware'; // IMPORTAMOS ESTO

const router = Router();

// Ahora la ruta acepta un archivo llamado 'foto'
router.post('/firmar', verificarToken, uploadImagen.single('foto'), firmarRequisito);

router.get('/integrante/:integranteId/clase/:claseId', verificarToken, obtenerProgreso);

export default router;