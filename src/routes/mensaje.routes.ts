import { Router } from "express";
import {
  obtenerContactos,
  enviarMensaje,
  obtenerBandejaEntrada,
  obtenerBandejaSalida,
  marcarComoLeido,
  eliminarMensaje,
} from "../controllers/mensaje.controller";
import { verificarToken } from "../middlewares/auth.middleware";
import { validarSchema } from "../middlewares/validator.middleware";
import { enviarMensajeSchema } from "../schemas/mensaje.schema";

const router = Router();

// 🛡️ TODAS las rutas de mensajería requieren estar logueado
router.use(verificarToken);

// 1. Obtener la libreta de contactos permitidos
router.get("/contactos", obtenerContactos);

// 2. Bandejas de entrada y salida
router.get("/entrada", obtenerBandejaEntrada);
router.get("/salida", obtenerBandejaSalida);

// 3. Enviar un mensaje (Pasa por el validador Zod antes de llegar al controlador)
router.post("/", validarSchema(enviarMensajeSchema), enviarMensaje);

// 4. Acciones sobre un mensaje específico
router.patch("/:id/leido", marcarComoLeido);
router.delete("/:id", eliminarMensaje);

export default router;
