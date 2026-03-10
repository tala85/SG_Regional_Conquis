import { Request, Response } from "express";
import prisma from "../config/db";
import { calcularEdadExacta } from "../utils/calcularEdad";
import { AuthRequest } from "../middlewares/auth.middleware";

// ==========================================
// 1. CREAR INTEGRANTE
// ==========================================
export const crearIntegrante = async (req: AuthRequest, res: Response) => {
  try {
    const { dni, nombre, apellido, fechaNacimiento, funcion, clubId, claseId } =
      req.body;
    const rol = req.usuario?.rol;
    const usuarioId = req.usuario?.id;

    // Validaciones de campos obligatorios
    if (!dni || !nombre || !apellido || !fechaNacimiento || !clubId) {
      return res.status(400).json({
        status: "error",
        message:
          "DNI, nombre, apellido, fecha de nacimiento y club son obligatorios.",
      });
    }

    // Sanitización de DNI
    const dniRaw = String(dni).replace(/\D/g, "");
    const dniEntero = parseInt(dniRaw, 10);

    if (isNaN(dniEntero) || dniEntero < 1000000 || dniEntero > 99999999) {
      return res.status(400).json({
        status: "error",
        message:
          "El DNI debe tener 7 u 8 dígitos numéricos. Sin puntos ni letras.",
      });
    }

    // Los DIRECTOR solo pueden agregar a sus propios clubes
    // 🛡️ REGLA DE CIBERSEGURIDAD ACTUALIZADA
    if (rol === "DIRECTOR") {
      if (Number(clubId) !== req.usuario?.clubId) {
        return res.status(403).json({
          status: "error",
          message: "No tenés permisos para agregar integrantes a este club.",
        });
      }
    }

    const nuevoIntegrante = await prisma.integrante.create({
      data: {
        dni: dniEntero,
        nombre: String(nombre).trim(),
        apellido: String(apellido).trim(),
        fechaNacimiento: new Date(fechaNacimiento),
        funcion: String(funcion || "CONQUISTADOR").trim(),
        clubId: Number(clubId),
        claseId: claseId ? Number(claseId) : null,
        xp: 0,
      },
    });

    if (claseId) {
      await prisma.integranteClase.create({
        data: {
          integranteId: nuevoIntegrante.id,
          claseId: Number(claseId),
          estado: "EN_CURSO",
        },
      });
    }

    return res.status(201).json({
      status: "success",
      message: "Conquistador alistado con éxito.",
      data: nuevoIntegrante,
    });
  } catch (error: any) {
    console.error("Error creando integrante:", error);
    // P2002 = violación de unique constraint (DNI duplicado)
    if (error?.code === "P2002") {
      return res.status(409).json({
        status: "error",
        message: "Ya existe un integrante con ese DNI en el sistema.",
      });
    }
    return res
      .status(500)
      .json({ status: "error", message: "Fallo al crear integrante." });
  }
};

// ==========================================
// 2. OBTENER AVANCE DE CLASE
// ==========================================
export const obtenerAvanceClase = async (req: Request, res: Response) => {
  try {
    const { integranteId, claseId } = req.params;

    const totalRequisitos = await prisma.requisito.count({
      where: { seccion: { claseId: Number(claseId) } },
    });
    const requisitosAprobados = await prisma.progreso.count({
      where: {
        integranteId: Number(integranteId),
        requisito: { seccion: { claseId: Number(claseId) } },
      },
    });

    const porcentaje =
      totalRequisitos > 0
        ? Math.round((requisitosAprobados / totalRequisitos) * 100)
        : 0;

    return res.status(200).json({
      status: "success",
      data: {
        totalRequisitos,
        requisitosAprobados,
        porcentaje: `${porcentaje}%`,
        puedeInvestirse: porcentaje >= 100,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ status: "error", message: "Error al calcular el avance." });
  }
};

// ==========================================
// 3. EVALUAR CLASE SUGERIDA
// ==========================================
export const evaluarClaseCorrespondiente = async (
  req: Request,
  res: Response,
) => {
  try {
    const { id } = req.params;
    const integrante = await prisma.integrante.findUnique({
      where: { id: Number(id) },
    });

    if (!integrante)
      return res
        .status(404)
        .json({ status: "error", message: "Integrante no encontrado." });

    const edadReal = calcularEdadExacta(new Date(integrante.fechaNacimiento));

    if (edadReal < 10) {
      return res.status(400).json({
        status: "error",
        message: `Tiene ${edadReal} años. Corresponde a Aventureros, no a Conquistadores.`,
      });
    }

    const edadBusqueda = edadReal >= 16 ? 16 : edadReal;
    const mensajeSistema =
      edadReal >= 16
        ? "⚠️ ATENCIÓN: Habilitado para CLASES AGRUPADAS (16+)."
        : "Evaluación regular exitosa.";

    const claseSugerida = await prisma.clase.findFirst({
      where: { edadSugerida: edadBusqueda, tipo: "REGULAR" },
    });

    return res.status(200).json({
      status: "success",
      data: {
        integrante: `${integrante.nombre} ${integrante.apellido}`,
        edadExacta: edadReal,
        claseSugerida: claseSugerida?.nombre || "Guía Mayor",
        observaciones: mensajeSistema,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ status: "error", message: "Fallo en el motor de evaluación." });
  }
};

// ==========================================
// 4. ACTUALIZAR INTEGRANTE
// ==========================================
export const actualizarIntegrante = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, funcion, claseId } = req.body;

    if (!nombre || !apellido) {
      return res.status(400).json({
        status: "error",
        message: "Nombre y apellido son obligatorios.",
      });
    }

    const actualizado = await prisma.integrante.update({
      where: { id: Number(id) },
      data: {
        nombre: String(nombre).trim(),
        apellido: String(apellido).trim(),
        funcion: String(funcion).trim(),
        claseId: claseId ? Number(claseId) : null,
      },
      include: { club: true, clase: true },
    });

    return res.status(200).json({
      status: "success",
      message: "Expediente actualizado.",
      data: actualizado,
    });
  } catch (error) {
    console.error("Error actualizando integrante:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Fallo al actualizar el expediente." });
  }
};

// ==========================================
// 5. ELIMINAR INTEGRANTE
// FIX: Antes no existía este endpoint en el controller
// aunque el frontend lo llamaba con axios.delete
// ==========================================
export const eliminarIntegrante = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const rol = req.usuario?.rol;
    const usuarioId = req.usuario?.id;
    const integranteId = Number(id);

    const integrante = await prisma.integrante.findUnique({
      where: { id: integranteId },
      include: { club: true },
    });

    if (!integrante) {
      return res
        .status(404)
        .json({ status: "error", message: "Integrante no encontrado." });
    }

    // 🛡️ CORTAFUEGOS DE CIBERSEGURIDAD (Aislamiento de Datos)
    if (rol === "DIRECTOR") {
      // Un Director solo puede tocar a los integrantes de su propio club
      if (integrante.clubId !== req.usuario?.clubId) {
        return res.status(403).json({
          status: "error",
          message:
            "Violación de acceso: Este integrante pertenece a otro club.",
        });
      }
    } else if (rol === "REGIONAL") {
      // Un Regional solo puede tocar a los integrantes de los clubes de SU zona
      const miPerfil = await prisma.usuario.findUnique({
        where: { id: Number(usuarioId) },
      });
      if (integrante.club?.regionId !== miPerfil?.regionId) {
        return res.status(403).json({
          status: "error",
          message: "Violación de acceso: Este club no pertenece a tu zona.",
        });
      }
    }
    // Si el rol es 'SYSADMIN', el código pasa de largo y le permite hacer todo.

    // Eliminamos en cascada manual (Prisma no hace cascade automático aquí)
    await prisma.progreso.deleteMany({ where: { integranteId } });
    await prisma.integranteClase.deleteMany({ where: { integranteId } });
    await prisma.integranteEspecialidad.deleteMany({ where: { integranteId } });
    await prisma.integranteMaestria.deleteMany({ where: { integranteId } });
    await prisma.integrante.delete({ where: { id: integranteId } });

    return res.status(200).json({
      status: "success",
      message: `Integrante ${integrante.nombre} ${integrante.apellido} eliminado del sistema.`,
    });
  } catch (error) {
    console.error("Error eliminando integrante:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Fallo al eliminar el integrante." });
  }
};

// ==========================================
// 6. OBTENER INTEGRANTES POR CLUB (con paginación y búsqueda real)
// ==========================================
export const obtenerIntegrantesPorClub = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const clubSolicitadoId = Number(req.params.clubId);
    const rolUsuario = req.usuario?.rol;
    const miClubId = req.usuario?.clubId;

    // 🛡️ CORTAFUEGOS: El Director solo puede pedir ver a SU club.
    if (rolUsuario === "DIRECTOR" && clubSolicitadoId !== miClubId) {
      console.warn(
        `🛑 INTRUSIÓN: Director ${req.usuario?.id} intentó espiar el club ${clubSolicitadoId}`,
      );
      return res.status(403).json({
        status: "error",
        message:
          "Violación de Seguridad: Solo tenés jurisdicción sobre tu propio club.",
      });
    }

    // --- MOTOR DE PAGINACIÓN Y BÚSQUEDA ---
    // Recibimos parámetros de la URL (ej: ?page=1&limit=10&search=juan)
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search ? String(req.query.search).trim() : "";
    const skip = (page - 1) * limit;

    // Armamos el filtro dinámico
    const filtro: any = { clubId: clubSolicitadoId };

    if (search) {
      // Intentamos convertir la búsqueda a número por si están buscando un DNI
      const searchNum = Number(search);
      filtro.OR = [
        { nombre: { contains: search, mode: "insensitive" } },
        { apellido: { contains: search, mode: "insensitive" } },
        ...(isNaN(searchNum) ? [] : [{ dni: searchNum }]), // Solo agrega el filtro DNI si es un número válido
      ];
    }

    // Ejecutamos ambas consultas en paralelo (Promise.all) para no perder tiempo
    const [integrantes, totalIntegrantes] = await Promise.all([
      prisma.integrante.findMany({
        where: filtro,
        skip: skip,
        take: limit,
        include: {
          club: { select: { nombre: true } },
          clase: { select: { nombre: true } },
        },
        orderBy: { xp: "desc" },
      }),
      prisma.integrante.count({ where: filtro }), // Contamos el total real con ese filtro
    ]);

    return res.status(200).json({
      status: "success",
      data: integrantes,
      meta: {
        total: totalIntegrantes,
        page,
        limit,
        totalPages: Math.ceil(totalIntegrantes / limit),
      },
    });
  } catch (error) {
    console.error("Error obteniendo el directorio:", error);
    return res.status(500).json({
      status: "error",
      message: "Fallo al obtener la nómina del club.",
    });
  }
};

// ==========================================
// 7. ASIGNAR CLASE
// ==========================================
export const asignarClase = async (req: AuthRequest, res: Response) => {
  try {
    const integranteId = Number(req.params.integranteId);
    const { claseId } = req.body;

    if (!claseId) {
      return res
        .status(400)
        .json({ status: "error", message: "Debes enviar el claseId." });
    }

    const integranteActualizado = await prisma.integrante.update({
      where: { id: integranteId },
      data: { claseId: Number(claseId) },
    });

    const historialClase = await prisma.integranteClase.create({
      data: { integranteId, claseId: Number(claseId), estado: "EN_CURSO" },
    });

    return res.status(200).json({
      status: "success",
      message: "Clase asignada y progreso iniciado.",
      data: { integranteActualizado, historialClase },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ status: "error", message: "Fallo interno al asignar la clase." });
  }
};

// ==========================================
// 8. OBTENER BANDA VIRTUAL
// ==========================================
export const obtenerBandaVirtual = async (req: AuthRequest, res: Response) => {
  try {
    const integranteId = Number(req.params.integranteId);

    const [especialidadesGanadas, maestriasGanadas] = await Promise.all([
      prisma.integranteEspecialidad.findMany({
        where: { integranteId },
        include: { especialidad: true },
        orderBy: { fechaAprobacion: "desc" },
      }),
      prisma.integranteMaestria.findMany({
        where: { integranteId },
        include: { maestria: true },
        orderBy: { fechaAprobacion: "desc" },
      }),
    ]);

    return res.status(200).json({
      status: "success",
      data: {
        totalEspecialidades: especialidadesGanadas.length,
        especialidades: especialidadesGanadas,
        totalMaestrias: maestriasGanadas.length,
        maestrias: maestriasGanadas,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ status: "error", message: "Fallo al leer la banda virtual." });
  }
};

// ==========================================
// 9. OBTENER RANKING CONQUIS+
// ==========================================
export const obtenerRanking = async (req: AuthRequest, res: Response) => {
  try {
    const rol = req.usuario?.rol;
    const usuarioId = req.usuario?.id;

    // FIX: Los DIRECTOR solo ven el ranking de su región
    const filtroIntegrantes: any = { xp: { gt: 0 } };
    if (rol === "DIRECTOR") {
      filtroIntegrantes.club = { regionalId: usuarioId };
    }

    const ranking = await prisma.integrante.findMany({
      where: filtroIntegrantes,
      orderBy: { xp: "desc" },
      take: 10,
      include: { club: { select: { nombre: true } } },
    });

    return res.status(200).json({ status: "success", data: ranking });
  } catch (error) {
    return res
      .status(500)
      .json({ status: "error", message: "Fallo al cargar el ranking." });
  }
};

// ==========================================
// 10. OBTENER MÉTRICAS DEL TABLERO
// ==========================================
export const obtenerMetricas = async (req: AuthRequest, res: Response) => {
  try {
    const [totalIntegrantes, totalInvestidos, topConquistador] =
      await Promise.all([
        prisma.integrante.count(),
        prisma.integranteClase.count({ where: { estado: "INVESTIDO" } }),
        prisma.integrante.findFirst({
          orderBy: { xp: "desc" },
          select: {
            nombre: true,
            apellido: true,
            xp: true,
            club: { select: { nombre: true } },
          },
        }),
      ]);

    const porcentaje =
      totalIntegrantes > 0
        ? Math.round((totalInvestidos / totalIntegrantes) * 100)
        : 0;

    return res.status(200).json({
      status: "success",
      data: {
        totalIntegrantes,
        totalInvestidos,
        topXP: topConquistador
          ? `${topConquistador.nombre} ${topConquistador.apellido} (${topConquistador.xp} XP)`
          : "Sin datos",
        porcentaje,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ status: "error", message: "Fallo al calcular métricas." });
  }
};

// ==========================================
// OBTENER LISTA DE CLUBES (Con Aislamiento Estricto)
// ==========================================
export const obtenerListaClubes = async (req: AuthRequest, res: Response) => {
  try {
    const rolUsuario = req.usuario?.rol;
    const miUsuarioId = req.usuario?.id;

    let filtro = {}; // SYSADMIN ve todos

    if (rolUsuario === "DIRECTOR") {
      const miPerfil = await prisma.usuario.findUnique({
        where: { id: Number(miUsuarioId) },
      });
      filtro = { id: miPerfil?.clubId || -1 };
    } else if (rolUsuario === "REGIONAL") {
      // 🛡️ BARRERA: El Regional SOLO ve los clubes que tienen SU mismo regionId
      const miPerfil = await prisma.usuario.findUnique({
        where: { id: Number(miUsuarioId) },
      });
      filtro = { regionId: miPerfil?.regionId || -1 };
    }

    const clubes = await prisma.club.findMany({
      where: filtro,
      orderBy: { nombre: "asc" },
    });

    return res.status(200).json({ status: "success", data: clubes });
  } catch (error) {
    console.error("Error al obtener lista de clubes:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Fallo al obtener clubes." });
  }
};

export const obtenerListaClases = async (req: AuthRequest, res: Response) => {
  try {
    const clases = await prisma.clase.findMany({
      orderBy: { edadSugerida: "asc" },
      select: { id: true, nombre: true },
    });

    return res.status(200).json({ status: "success", data: clases });
  } catch (error) {
    return res
      .status(500)
      .json({ status: "error", message: "Fallo al cargar las clases." });
  }
};

// ==========================================
// 12. SUBIR AVATAR
// ==========================================
export const subirAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res
        .status(400)
        .json({ status: "error", message: "No se detectó ninguna imagen." });
    }

    // Validación de tipo de archivo
    const tiposPermitidos = ["image/jpeg", "image/png", "image/webp"];
    if (!tiposPermitidos.includes(req.file.mimetype)) {
      return res.status(400).json({
        status: "error",
        message: "Solo se permiten imágenes JPG, PNG o WEBP.",
      });
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    const actualizado = await prisma.integrante.update({
      where: { id: Number(id) },
      data: { avatarUrl: imageUrl },
    });

    return res.status(200).json({
      status: "success",
      message: "Foto de perfil actualizada.",
      data: actualizado,
    });
  } catch (error) {
    return res
      .status(500)
      .json({ status: "error", message: "Error al procesar la foto." });
  }
};
