import { Response } from "express";
import prisma from "../config/db"; // 👈 CORRECCIÓN: Usamos la instancia única
import { AuthRequest } from "../middlewares/auth.middleware";

export const obtenerAgenda = async (req: AuthRequest, res: Response) => {
  try {
    const rol = req.usuario?.rol;
    const miClubId = req.usuario?.clubId;

    // 🛡️ Filtro inteligente: El Director ve solo su agenda y eventos globales (clubId = null)
    const filtro =
      rol === "DIRECTOR"
        ? { OR: [{ clubId: miClubId }, { clubId: null }] }
        : {}; // Regional y Sysadmin ven todo

    const eventos = await prisma.eventoAgenda.findMany({
      where: filtro,
      orderBy: { fecha: "asc" },
    });
    return res.status(200).json({ status: "success", data: eventos });
  } catch (error) {
    return res
      .status(500)
      .json({ status: "error", message: "Error al obtener la agenda." });
  }
};

export const crearEvento = async (req: AuthRequest, res: Response) => {
  try {
    const { titulo, descripcion, fecha, clubId } = req.body;
    const rol = req.usuario?.rol;
    const miClubId = req.usuario?.clubId;

    // 🛡️ Control de Jurisdicción: Un Director solo puede crear para su club
    const clubAsignado =
      rol === "DIRECTOR" ? miClubId : clubId ? parseInt(clubId) : null;

    const nuevoEvento = await prisma.eventoAgenda.create({
      data: {
        titulo: String(titulo),
        descripcion: descripcion ? String(descripcion) : null,
        fecha: new Date(fecha),
        clubId: clubAsignado,
        estado: "PENDIENTE",
      },
    });

    return res
      .status(201)
      .json({
        status: "success",
        message: "Evento agendado exitosamente",
        data: nuevoEvento,
      });
  } catch (error) {
    return res
      .status(500)
      .json({ status: "error", message: "Error al registrar el evento." });
  }
};

export const eliminarEvento = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const rol = req.usuario?.rol;
    const miClubId = req.usuario?.clubId;

    const evento = await prisma.eventoAgenda.findUnique({ where: { id } });
    if (!evento)
      return res
        .status(404)
        .json({ status: "error", message: "Evento no encontrado." });

    // 🛡️ Control de Jurisdicción: El Director no puede borrar eventos de otros o globales
    if (rol === "DIRECTOR" && evento.clubId !== miClubId) {
      return res
        .status(403)
        .json({
          status: "error",
          message: "No podés eliminar un evento que no pertenece a tu club.",
        });
    }

    await prisma.eventoAgenda.delete({ where: { id } });
    return res
      .status(200)
      .json({ status: "success", message: "Evento cancelado y eliminado." });
  } catch (error) {
    return res
      .status(500)
      .json({ status: "error", message: "Error al eliminar el evento." });
  }
};
