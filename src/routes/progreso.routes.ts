import { Router } from 'express';
import { cargarRequisitosMasivos, firmarRequisito, limpiarManuales, obtenerEstadisticasProgreso, obtenerProgreso, obtenerRequisitosPendientes } from '../controllers/progreso.controller';
import { verificarToken } from '../middlewares/auth.middleware';
import { uploadImagen } from '../middlewares/upload.middleware';
import { validarSchema } from '../middlewares/validator.middleware'; // NUEVO
import { firmarRequisitoSchema } from '../schemas/progreso.schema'; // NUEVO

const router = Router();

// El orden de los escudos es vital: 1. Token -> 2. Foto -> 3. Zod -> 4. Controlador
router.post('/firmar', 
  verificarToken, 
  uploadImagen.single('foto'), 
  validarSchema(firmarRequisitoSchema), 
  firmarRequisito
);

router.get('/integrante/:integranteId/pendientes', verificarToken, obtenerRequisitosPendientes);
router.get('/integrante/:integranteId/estadisticas', verificarToken, obtenerEstadisticasProgreso);
router.delete('/carga-masiva/limpiar', verificarToken, limpiarManuales);
router.post('/carga-masiva', verificarToken, cargarRequisitosMasivos);
export default router;