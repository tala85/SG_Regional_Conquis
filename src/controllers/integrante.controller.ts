import { Request, Response } from 'express';
import prisma from '../config/db';
import { calcularEdadExacta } from '../utils/calcularEdad';
import { AuthRequest } from '../middlewares/auth.middleware';

// 1. CREAR INTEGRANTE (Control Manual)
export const crearIntegrante = async (req: Request, res: Response) => {
  try {
    const { nombre, apellido, fechaNacimiento, funcion, clubId, claseId } = req.body;

    if (!nombre || !apellido || !fechaNacimiento || !funcion || !clubId) {
      return res.status(400).json({ status: 'error', message: 'Faltan campos obligatorios.' });
    }

    const nuevoIntegrante = await prisma.integrante.create({
      data: {
        nombre,
        apellido,
        fechaNacimiento: new Date(fechaNacimiento),
        funcion,
        clubId: Number(clubId),
        claseId: claseId ? Number(claseId) : null 
      }
    });

    return res.status(201).json({ status: 'success', data: nuevoIntegrante });

  } catch (error) {
    console.error('Error al crear integrante:', error);
    return res.status(500).json({ status: 'error', message: 'Error interno del servidor.' });
  }
};

// 2. OBTENER AVANCE DE CLASE
export const obtenerAvanceClase = async (req: Request, res: Response) => {
  try {
    const { integranteId, claseId } = req.params;

    const totalRequisitos = await prisma.requisito.count({
      where: { seccion: { claseId: Number(claseId) } }
    });

    const requisitosAprobados = await prisma.progreso.count({
      where: {
        integranteId: Number(integranteId),
        requisito: { seccion: { claseId: Number(claseId) } }
      }
    });

    const porcentaje = totalRequisitos > 0 ? Math.round((requisitosAprobados / totalRequisitos) * 100) : 0;

    res.status(200).json({
      status: 'success',
      data: { totalRequisitos, requisitosAprobados, porcentaje: `${porcentaje}%`, puedeInvestirse: porcentaje >= 100 }
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al calcular el avance.' });
  }
};

// 3. EVALUAR CLASE SUGERIDA (Estadístico)
export const evaluarClaseCorrespondiente = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const integrante = await prisma.integrante.findUnique({ where: { id: Number(id) } });

    if (!integrante) return res.status(404).json({ status: 'error', message: 'Integrante no encontrado.' });

    const edadReal = calcularEdadExacta(new Date(integrante.fechaNacimiento));
    let edadBusqueda = edadReal;
    let mensajeSistema = 'Evaluación regular exitosa.';

    if (edadReal < 10) {
      return res.status(400).json({ status: 'error', message: `Tiene ${edadReal} años. Corresponde a Aventureros.` });
    } else if (edadReal >= 16) {
      edadBusqueda = 16; 
      mensajeSistema = '⚠️ ATENCIÓN: Habilitado para CLASES AGRUPADAS.';
    }

    const claseSugerida = await prisma.clase.findFirst({
      where: { edadSugerida: edadBusqueda, tipo: 'REGULAR' }
    });

    return res.status(200).json({
      status: 'success',
      data: {
        integrante: `${integrante.nombre} ${integrante.apellido}`,
        edadExacta: edadReal,
        claseSugerida: claseSugerida?.nombre || 'Guía Mayor',
        observaciones: mensajeSistema
      }
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Fallo en el motor de evaluación.' });
  }
};

// 4. ACTUALIZAR INTEGRANTE (Asignar clases, corregir errores, etc.)
export const actualizarIntegrante = async (req: Request, res: Response) => {
  try {
    const { id } = req.params; // Sacamos el ID de la URL
    const { nombre, apellido, fechaNacimiento, funcion, clubId, claseId } = req.body;

    // 1. Verificamos que el pibe exista en la base de datos antes de tocar nada
    const integranteExistente = await prisma.integrante.findUnique({
      where: { id: Number(id) }
    });

    if (!integranteExistente) {
      return res.status(404).json({ status: 'error', message: 'El integrante no existe.' });
    }

    // 2. Ejecutamos la actualización
    const integranteActualizado = await prisma.integrante.update({
      where: { id: Number(id) },
      data: {
        nombre: nombre !== undefined ? nombre : undefined,
        apellido: apellido !== undefined ? apellido : undefined,
        fechaNacimiento: fechaNacimiento ? new Date(fechaNacimiento) : undefined,
        funcion: funcion !== undefined ? funcion : undefined,
        clubId: clubId ? Number(clubId) : undefined,
        claseId: claseId ? Number(claseId) : undefined 
      }
    });

    return res.status(200).json({ 
      status: 'success', 
      message: 'Datos actualizados correctamente.',
      data: integranteActualizado 
    });

  } catch (error) {
    console.error('Error al actualizar integrante:', error);
    return res.status(500).json({ status: 'error', message: 'Fallo interno al actualizar.' });
  }
};

// 1. LECTURA CON PAGINACIÓN Y BÚSQUEDA SECURE
export const obtenerIntegrantesPorClub = async (req: AuthRequest, res: Response) => {
  try {
    const clubId = Number(req.params.clubId);
    const regionalId = req.usuario?.id;

    // Capturamos parámetros de la URL (Ej: ?page=1&limit=10&search=Juan)
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search ? String(req.query.search) : '';
    const skip = (page - 1) * limit;

    const clubMio = await prisma.club.findFirst({
      where: { id: clubId, regionalId: Number(regionalId) }
    });

    if (!clubMio) return res.status(403).json({ status: 'error', message: 'No tenés permisos.' });

    // Armamos el filtro de búsqueda dinámico
    const filtroBusqueda = search ? {
      OR: [
        { nombre: { contains: search, mode: 'insensitive' as const } },
        { apellido: { contains: search, mode: 'insensitive' as const } }
      ]
    } : {};

    // Buscamos el total para que el Frontend sepa cuántas páginas hay
    const total = await prisma.integrante.count({
      where: { clubId: clubId, ...filtroBusqueda }
    });

    // Traemos solo los de la página solicitada
    const integrantes = await prisma.integrante.findMany({
      where: { clubId: clubId, ...filtroBusqueda },
      skip: skip,
      take: limit,
      orderBy: { apellido: 'asc' },
      include: { clase: true }
    });

    return res.status(200).json({ 
      status: 'success', 
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      data: integrantes 
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Fallo al leer integrantes.' });
  }
};

// 2. MODIFICACIÓN: Asignarle una clase oficial a un pibe para que empiece su progreso
export const asignarClase = async (req: AuthRequest, res: Response) => {
  try {
    const integranteId = Number(req.params.integranteId);
    const { claseId } = req.body; // El ID de la clase que le vamos a asignar (ej: Amigo)

    if (!claseId) {
      return res.status(400).json({ status: 'error', message: 'Debes enviar el claseId.' });
    }

    // 1. Actualizamos el perfil del integrante
    const integranteActualizado = await prisma.integrante.update({
      where: { id: integranteId },
      data: { claseId: Number(claseId) }
    });

    // 2. Magia arquitectónica: Le abrimos su "historial" oficial en la tabla IntegranteClase
    // Esto es clave para el día de mañana saber cuándo empezó y en qué estado está
    const historialClase = await prisma.integranteClase.create({
      data: {
        integranteId: integranteId,
        claseId: Number(claseId),
        estado: 'EN_CURSO'
      }
    });

    return res.status(200).json({ 
      status: 'success', 
      message: 'Clase asignada y progreso iniciado correctamente.',
      data: { integranteActualizado, historialClase }
    });

  } catch (error) {
    console.error('Error al asignar clase:', error);
    return res.status(500).json({ status: 'error', message: 'Fallo interno al asignar la clase.' });
  }
};

// 3. LECTURA: La Banda Virtual (Ver todos los logros de un integrante)
export const obtenerBandaVirtual = async (req: AuthRequest, res: Response) => {
  try {
    const integranteId = Number(req.params.integranteId);

    const especialidadesGanadas = await prisma.integranteEspecialidad.findMany({
      where: { integranteId: integranteId },
      include: { especialidad: true },
      orderBy: { fechaAprobacion: 'desc' }
    });

    const maestriasGanadas = await prisma.integranteMaestria.findMany({
      where: { integranteId: integranteId },
      include: { maestria: true },
      orderBy: { fechaAprobacion: 'desc' }
    });

    return res.status(200).json({
      status: 'success',
      data: {
        totalEspecialidades: especialidadesGanadas.length,
        especialidades: especialidadesGanadas,
        totalMaestrias: maestriasGanadas.length,
        maestrias: maestriasGanadas
      }
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Fallo al leer la banda virtual.' });
  }
};

// 4. RANKING REGIONAL (TOP 10 XP)
export const obtenerRankingRegional = async (req: AuthRequest, res: Response) => {
  try {
    const regionalId = req.usuario?.id;

    const topIntegrantes = await prisma.integrante.findMany({
      where: { club: { regionalId: Number(regionalId) } },
      orderBy: { xp: 'desc' },
      take: 10, // Trae solo a los 10 mejores
      select: {
        id: true, nombre: true, apellido: true, xp: true, club: { select: { nombre: true } }
      }
    });

    return res.status(200).json({ status: 'success', data: topIntegrantes });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Fallo al generar ranking.' });
  }
};