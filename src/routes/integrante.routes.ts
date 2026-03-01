import { Router } from 'express';
import { verificarToken, verificarRol } from '../middlewares/auth.middleware'; // Importamos el middleware
import { crearIntegrante, evaluarClaseCorrespondiente, obtenerAvanceClase, actualizarIntegrante, obtenerBandaVirtual, obtenerRanking, obtenerMetricas, obtenerListaClubes, obtenerListaClases, crearClub, subirAvatar } from '../controllers/integrante.controller';
import { uploadExcel } from '../middlewares/upload.middleware';
import { importarIntegrantesExcel, descargarPlantillaExcel } from '../controllers/import.controller';
import { obtenerIntegrantesPorClub, asignarClase } from '../controllers/integrante.controller';
import { validarSchema } from '../middlewares/validator.middleware';
import { asignarClaseSchema } from '../schemas/integrante.schema';
import { uploadImagen } from '../middlewares/upload.middleware';

const router = Router();
router.get('/ranking', verificarToken, obtenerRanking);
router.get('/metricas', verificarToken, obtenerMetricas); // Nueva ruta de estadísticas
router.get('/club/:clubId', verificarToken, obtenerIntegrantesPorClub);

// Insertamos verificarToken en el medio. Funciona como un peaje.
router.post('/', verificarToken, crearIntegrante);

// Ruta para actualizar los datos de un integrante (ej: asignarle una clase)
router.put('/:id', verificarToken, actualizarIntegrante);

// Ruta para carga masiva por Excel
// Notá cómo ponemos el 'uploadExcel.single' en el medio como filtro
router.post('/importar-excel', verificarToken, uploadExcel.single('archivo'), importarIntegrantesExcel);

// Ruta para que el Regional descargue la plantilla inteligente
router.get('/plantilla-excel', verificarToken, descargarPlantillaExcel);
// Rutas operativas (ABM)
router.get('/club/:clubId', verificarToken, obtenerIntegrantesPorClub); 
// Le inyectamos la validación de Zod antes de que llegue al controlador (asignarClase)
router.patch(
  '/:integranteId/asignar-clase', 
  verificarToken, 
  validarSchema(asignarClaseSchema), 
  asignarClase
);

router.get('/:integranteId/banda-virtual', verificarToken, obtenerBandaVirtual);
router.get('/clubes/lista', verificarToken, obtenerListaClubes);
router.get('/clases/lista', verificarToken, obtenerListaClases);
router.post('/clubes', verificarToken, crearClub);
router.post('/:id/avatar', verificarToken, uploadImagen.single('foto'), subirAvatar);

export default router;