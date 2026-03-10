import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import prisma from "../config/db";

export const obtenerRegistrosAuditoria = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    // 🛡️ Paginación real para no explotar la memoria del servidor
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 50; // Traemos de a 50 logs por defecto
    const skip = (page - 1) * limit;

    const [logs, totalLogs] = await Promise.all([
      prisma.bitacoraAuditoria.findMany({
        orderBy: { fecha: "desc" },
        skip: skip,
        take: limit,
        include: {
          usuario: { select: { nombre: true, email: true } },
        },
      }),
      prisma.bitacoraAuditoria.count(), // Contamos el total para el frontend
    ]);

    return res.status(200).json({
      status: "success",
      data: logs,
      meta: {
        total: totalLogs,
        page,
        limit,
        totalPages: Math.ceil(totalLogs / limit),
      },
    });
  } catch (error) {
    console.error("Error al leer auditoría:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Fallo al acceder a la bitácora." });
  }
};
