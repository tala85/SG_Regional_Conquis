import { Router } from 'express';
import { importarEspecialidadesExcel, obtenerCatalogoMaestrias, obtenerEspecialidades, obtenerEspecialidadesVigentes, otorgarEspecialidad, otorgarMaestria } from '../controllers/especialidad.controller';
import { verificarToken, verificarRol } from '../middlewares/auth.middleware';
import { uploadExcel } from '../middlewares/upload.middleware';
import { validarSchema } from '../middlewares/validator.middleware';
import { otorgarEspecialidadSchema } from '../schemas/especialidad.schema';

const router = Router();

// Rutas protegidas
router.post('/importar', verificarToken, verificarRol(['REGIONAL']), uploadExcel.single('archivo'), importarEspecialidadesExcel);
router.get('/vigentes', verificarToken, obtenerEspecialidadesVigentes);
router.get('/maestrias', verificarToken, obtenerCatalogoMaestrias);
router.post('/otorgar', verificarToken, validarSchema(otorgarEspecialidadSchema), otorgarEspecialidad);
router.post('/maestria/otorgar', verificarToken, otorgarMaestria);
router.get('/', obtenerEspecialidades);

export default router;