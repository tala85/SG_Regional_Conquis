import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import prisma from "../config/db";

// ==========================================
// 1. OBTENER CONTACTOS PERMITIDOS (Para el Frontend)
// ==========================================
export const obtenerContactos = async (req: AuthRequest, res: Response) => {
  try {
    const miId = req.usuario?.id;
    const miRol = req.usuario?.rol;

    const miPerfil = await prisma.usuario.findUnique({
      where: { id: Number(miId) },
      include: { club: true },
    });

    let filtro: any = {};

    if (miRol === "DIRECTOR") {
      // Un Director ve al SYSADMIN y al REGIONAL de su misma zona
      filtro = {
        OR: [
          { rol: "SYSADMIN" },
          { rol: "REGIONAL", regionId: miPerfil?.club?.regionId },
        ],
      };
    } else if (miRol === "REGIONAL") {
      // Un Regional ve al SYSADMIN y a los DIRECTORES de los clubes de su zona
      filtro = {
        OR: [
          { rol: "SYSADMIN" },
          { rol: "DIRECTOR", club: { regionId: miPerfil?.regionId } },
        ],
      };
    }
    // Si es SYSADMIN, el filtro queda vacío y ve a todos

    const contactos = await prisma.usuario.findMany({
      where: filtro,
      select: { id: true, nombre: true, email: true, rol: true },
      orderBy: { rol: "desc" },
    });

    // Filtramos para no mandarse un mensaje a sí mismo
    const contactosFinal = contactos.filter((c) => c.id !== miId);

    return res.status(200).json({ status: "success", data: contactosFinal });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: "error",
      message: "Fallo al cargar la libreta de contactos.",
    });
  }
};

// ==========================================
// 2. ENVIAR MENSAJE (Con barrera jerárquica)
// ==========================================
export const enviarMensaje = async (req: AuthRequest, res: Response) => {
  try {
    const { destinatarioId, asunto, cuerpo } = req.body;
    const remitenteId = req.usuario?.id;
    const rolRemitente = req.usuario?.rol;

    if (!destinatarioId || !asunto || !cuerpo) {
      return res
        .status(400)
        .json({ status: "error", message: "Faltan datos obligatorios." });
    }

    // Buscamos a ambos para validar jurisdicción
    const [remitente, destinatario] = await Promise.all([
      prisma.usuario.findUnique({
        where: { id: Number(remitenteId) },
        include: { club: true },
      }),
      prisma.usuario.findUnique({
        where: { id: Number(destinatarioId) },
        include: { club: true },
      }),
    ]);

    if (!destinatario || !remitente) {
      return res
        .status(404)
        .json({ status: "error", message: "Usuario no encontrado." });
    }

    // 🛡️ MOTOR DE REGLAS JERÁRQUICAS
    let autorizado = false;
    if (rolRemitente === "SYSADMIN") {
      autorizado = true;
    } else if (rolRemitente === "REGIONAL") {
      if (
        destinatario.rol === "SYSADMIN" ||
        (destinatario.rol === "DIRECTOR" &&
          destinatario.club?.regionId === remitente.regionId)
      ) {
        autorizado = true;
      }
    } else if (rolRemitente === "DIRECTOR") {
      if (
        destinatario.rol === "SYSADMIN" ||
        (destinatario.rol === "REGIONAL" &&
          destinatario.regionId === remitente.club?.regionId)
      ) {
        autorizado = true;
      }
    }

    if (!autorizado) {
      console.warn(
        `🛑 BARRERA: Usuario ${remitenteId} (${rolRemitente}) intentó mensajear a ${destinatarioId} (${destinatario.rol}) sin permiso.`,
      );
      return res.status(403).json({
        status: "error",
        message:
          "Política de comunicación: No tenés autorización para contactar a este nivel.",
      });
    }

    const nuevoMensaje = await prisma.mensaje.create({
      data: {
        remitenteId: Number(remitenteId),
        destinatarioId: Number(destinatarioId),
        asunto: String(asunto).trim(),
        cuerpo: String(cuerpo).trim(),
      },
    });

    return res.status(201).json({
      status: "success",
      message: "Mensaje enviado correctamente.",
      data: nuevoMensaje,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: "error", message: "Fallo al despachar el mensaje." });
  }
};

// ==========================================
// 3. OBTENER BANDEJA DE ENTRADA Y SALIDA
// ==========================================
export const obtenerBandejaEntrada = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const miId = req.usuario?.id;
    const mensajes = await prisma.mensaje.findMany({
      where: { destinatarioId: Number(miId), ocultoDestinatario: false },
      include: {
        remitente: {
          select: { nombre: true, rol: true, email: true },
        },
        destinatario: {
          select: { id: true, nombre: true, rol: true },
        },
      },
      orderBy: { fechaEnvio: "desc" },
    });

    return res.status(200).json({ status: "success", data: mensajes });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Fallo al leer la bandeja de entrada.",
    });
  }
};

export const obtenerBandejaSalida = async (req: AuthRequest, res: Response) => {
  try {
    const miId = req.usuario?.id;
    const mensajes = await prisma.mensaje.findMany({
      where: { remitenteId: Number(miId), ocultoRemitente: false },
      include: {
        destinatario: { select: { nombre: true, rol: true, email: true } },
        remitente: { select: { nombre: true, rol: true, email: true } },
      },
      orderBy: { fechaEnvio: "desc" },
    });
    return res.status(200).json({ status: "success", data: mensajes });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Fallo al leer la bandeja de salida.",
    });
  }
};

// ==========================================
// 4. CAMBIAR ESTADO (Leído / Borrado Lógico)
// ==========================================
export const marcarComoLeido = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const miId = req.usuario?.id;

    // Solo el destinatario real puede marcar como leído
    const mensaje = await prisma.mensaje.findUnique({ where: { id } });
    if (!mensaje || mensaje.destinatarioId !== miId) {
      return res
        .status(403)
        .json({ status: "error", message: "Acceso denegado." });
    }

    await prisma.mensaje.update({
      where: { id },
      data: { leido: true },
    });

    return res
      .status(200)
      .json({ status: "success", message: "Mensaje marcado como leído." });
  } catch (error) {
    return res.status(500).json({ status: "error", message: "Error interno." });
  }
};

export const eliminarMensaje = async (req: AuthRequest, res: Response) => {
  try {
    const id = Number(req.params.id);
    const miId = Number(req.usuario?.id);

    const mensaje = await prisma.mensaje.findUnique({ where: { id } });
    if (!mensaje)
      return res
        .status(404)
        .json({ status: "error", message: "Mensaje no encontrado." });

    // Lógica de Soft Delete: Ocultamos según quién hizo el pedido
    if (mensaje.remitenteId === miId) {
      await prisma.mensaje.update({
        where: { id },
        data: { ocultoRemitente: true },
      });
    } else if (mensaje.destinatarioId === miId) {
      await prisma.mensaje.update({
        where: { id },
        data: { ocultoDestinatario: true },
      });
    } else {
      return res.status(403).json({
        status: "error",
        message: "Violación de acceso: Este mensaje no es tuyo.",
      });
    }

    return res
      .status(200)
      .json({ status: "success", message: "Mensaje eliminado de tu bandeja." });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: "Error al intentar borrar el mensaje.",
    });
  }
};
