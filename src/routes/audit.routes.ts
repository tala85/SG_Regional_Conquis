import { Router } from "express";
import { obtenerRegistrosAuditoria } from "../controllers/audit.controller";
import { verificarToken, verificarRol } from "../middlewares/auth.middleware"; // Importamos verificarRol

const router = Router();

// 🛡️ ESCUDO ACTIVO: Solo el SYSADMIN puede leer los logs
router.get(
  "/",
  verificarToken,
  verificarRol(["SYSADMIN"]),
  obtenerRegistrosAuditoria,
);

export default router;
