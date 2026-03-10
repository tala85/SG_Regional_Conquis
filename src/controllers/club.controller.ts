import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import prisma from "../config/db";

// 1. ALTA: Crear un club nuevo y asignarlo a una Región (Zona)
export const crearClub = async (req: AuthRequest, res: Response) => {
  try {
    // 👈 AHORA RECIBE regionId EN VEZ DE regionalId
    const { nombre, iglesia, distrito, regionId } = req.body;

    if (!nombre || !iglesia || !regionId) {
      return res.status(400).json({
        status: "error",
        message: "Nombre, iglesia y Región son obligatorios.",
      });
    }

    const nuevoClub = await prisma.club.create({
      data: {
        nombre: String(nombre),
        iglesia: String(iglesia),
        distrito: distrito ? String(distrito) : "Sin distrito",
        regionId: Number(regionId), // 👈 SE CONECTA A LA CAJA DE LA REGIÓN
      },
    });

    return res.status(201).json({ status: "success", data: nuevoClub });
  } catch (error) {
    console.error("Error al crear club:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Fallo interno al crear el club." });
  }
};

// 2. LECTURA: Inteligencia de Aislamiento de Datos (RBAC)
export const obtenerMisClubes = async (req: AuthRequest, res: Response) => {
  try {
    const rolUsuario = req.usuario?.rol;
    const miClubId = req.usuario?.clubId; // El club asignado al Director (puede ser null)

    let filtro = {}; // Si es SYSADMIN o REGIONAL, por ahora verán todos los clubes

    // 🛡️ BARRERA DE DATOS: Si es DIRECTOR, solo ve su propio club
    if (rolUsuario === "DIRECTOR") {
      if (!miClubId) {
        return res
          .status(403)
          .json({ status: "error", message: "Director sin club asignado." });
      }
      filtro = { id: miClubId };
    }

    const misClubes = await prisma.club.findMany({
      where: filtro,
      orderBy: { nombre: "asc" }, // Los ordenamos alfabéticamente para que quede prolijo
    });

    return res.status(200).json({ status: "success", data: misClubes });
  } catch (error) {
    console.error("Error al obtener clubes:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Fallo interno al leer los clubes." });
  }
};

// 3. BAJA: Eliminar un club (Exclusivo SYSADMIN)
export const eliminarClub = async (req: AuthRequest, res: Response) => {
  try {
    const clubId = Number(req.params.id);
    const rolUsuario = req.usuario?.rol;

    // 🛡️ Defensa en profundidad: Revalidamos el rol acá por si falla el middleware
    if (rolUsuario !== "SYSADMIN") {
      return res.status(403).json({
        status: "error",
        message:
          "Operación clasificada. Solo el Sysadmin puede eliminar un club completo.",
      });
    }

    // Verificamos que el club exista antes de intentar borrarlo
    const clubExistente = await prisma.club.findUnique({
      where: { id: clubId },
    });

    if (!clubExistente) {
      return res.status(404).json({
        status: "error",
        message: "El club no existe o ya fue eliminado.",
      });
    }

    // Si pasó los escudos, procedemos a la baja
    await prisma.club.delete({
      where: { id: clubId },
    });

    return res.status(200).json({
      status: "success",
      message: `Club '${clubExistente.nombre}' eliminado correctamente del sistema.`,
    });
  } catch (error) {
    console.error("Error al eliminar club:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Fallo interno al eliminar el club." });
  }
};

// ==========================================
// GESTIÓN DE REGIONES (ZONAS)
// ==========================================
export const crearRegion = async (req: AuthRequest, res: Response) => {
  try {
    const { nombre } = req.body;
    if (!nombre)
      return res.status(400).json({
        status: "error",
        message: "El nombre de la región es obligatorio.",
      });

    const nuevaRegion = await prisma.region.create({
      data: { nombre: String(nombre) },
    });

    return res.status(201).json({ status: "success", data: nuevaRegion });
  } catch (error) {
    console.error("Error al crear región:", error);
    return res.status(500).json({
      status: "error",
      message: "Fallo al crear la región. Puede que el nombre ya exista.",
    });
  }
};

export const obtenerRegiones = async (req: AuthRequest, res: Response) => {
  try {
    const regiones = await prisma.region.findMany({
      orderBy: { nombre: "asc" },
    });
    return res.status(200).json({ status: "success", data: regiones });
  } catch (error) {
    return res
      .status(500)
      .json({ status: "error", message: "Fallo al obtener las regiones." });
  }
};

// ==========================================
// ACTUALIZAR CLUB (Cambiar nombre o Región)
// ==========================================
export const actualizarClub = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, iglesia, distrito, regionId } = req.body;

    const clubActualizado = await prisma.club.update({
      where: { id: Number(id) },
      data: {
        nombre: String(nombre),
        iglesia: String(iglesia),
        distrito: String(distrito),
        regionId: Number(regionId),
      },
    });

    return res.status(200).json({ status: "success", data: clubActualizado });
  } catch (error) {
    console.error("Error al actualizar club:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Fallo al actualizar el club." });
  }
};
// ==========================================
// CAMBIAR ESTADO DEL CLUB (Baja/Alta Lógica)
// ==========================================
export const toggleEstadoClub = async (req: any, res: any) => {
  try {
    const { id } = req.params;
    if (req.usuario?.rol !== "SYSADMIN")
      return res.status(403).json({ message: "Sin permisos" });

    // Buscamos cómo está el club ahora
    const club = await prisma.club.findUnique({ where: { id: Number(id) } });
    if (!club) return res.status(404).json({ message: "Club no encontrado" });

    // Invertimos el estado (si estaba en true pasa a false, y viceversa)
    const clubActualizado = await prisma.club.update({
      where: { id: Number(id) },
      data: { activo: !club.activo },
    });

    res.json({
      status: "success",
      message: `Club ${clubActualizado.activo ? "Activado" : "Inactivado"} correctamente`,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ status: "error", message: "Error al cambiar estado" });
  }
};
