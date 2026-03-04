import { Router } from "express";
import { verificarToken, verificarRol } from "../middlewares/auth.middleware";
import {
  crearIntegrante,
  actualizarIntegrante,
  obtenerBandaVirtual,
  obtenerRanking,
  obtenerMetricas,
  obtenerListaClubes,
  obtenerListaClases,
  subirAvatar,
  obtenerIntegrantesPorClub,
  asignarClase,
} from "../controllers/integrante.controller";
import {
  importarIntegrantesExcel,
  descargarPlantillaExcel,
} from "../controllers/import.controller";
import { validarSchema } from "../middlewares/validator.middleware";
import { asignarClaseSchema } from "../schemas/integrante.schema";

// Importamos tus middlewares de carga de archivos
import { uploadExcel, uploadImagen } from "../middlewares/upload.middleware";

const router = Router();

// ==========================================
// RUTAS DE IMPORTACIÓN MASIVA (EXCEL)
// ==========================================
// 1. Descargar la plantilla vacía
router.get("/plantilla", verificarToken, descargarPlantillaExcel);
// 2. Subir el Excel lleno (Usamos uploadExcel que ya tenías)
router.post(
  "/importar",
  verificarToken,
  uploadExcel.single("archivo"),
  importarIntegrantesExcel,
);
// ==========================================
// RUTAS OPERATIVAS NORMALES
// ==========================================
router.get("/ranking", verificarToken, obtenerRanking);
router.get("/metricas", verificarToken, obtenerMetricas);
router.get("/club/:clubId", verificarToken, obtenerIntegrantesPorClub);
router.post("/", verificarToken, crearIntegrante);
router.put("/:id", verificarToken, actualizarIntegrante);
router.patch(
  "/:integranteId/asignar-clase",
  verificarToken,
  validarSchema(asignarClaseSchema),
  asignarClase,
);
router.get("/:integranteId/banda-virtual", verificarToken, obtenerBandaVirtual);
router.get("/clubes/lista", verificarToken, obtenerListaClubes);
router.get("/clases/lista", verificarToken, obtenerListaClases);

// Ruta para el Avatar
router.post(
  "/:id/avatar",
  verificarToken,
  uploadImagen.single("foto"),
  subirAvatar,
);

export default router;
