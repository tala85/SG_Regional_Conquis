import { Router } from 'express';
import { verificarToken } from '../middlewares/auth.middleware'; // Importamos el middleware
import { crearIntegrante, evaluarClaseCorrespondiente, obtenerAvanceClase, actualizarIntegrante } from '../controllers/integrante.controller';

const router = Router();

// Insertamos verificarToken en el medio. Funciona como un peaje.
router.post('/', verificarToken, crearIntegrante);

// Ruta para actualizar los datos de un integrante (ej: asignarle una clase)
router.put('/:id', verificarToken, actualizarIntegrante);

export default router;