import { Router } from 'express';
import { importarRequisitosExcel } from '../controllers/import.controller';
import { verificarToken, verificarRol } from '../middlewares/auth.middleware';
import { uploadExcel } from '../middlewares/upload.middleware';

const router = Router();

// Ruta crítica: Solo el Regional puede subir el manual de requisitos
router.post('/importar-excel', verificarToken, verificarRol(['REGIONAL']), uploadExcel.single('archivo'), importarRequisitosExcel);

export default router;