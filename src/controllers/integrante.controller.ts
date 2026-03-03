import { Request, Response } from 'express';
import prisma from '../config/db';
import { calcularEdadExacta } from '../utils/calcularEdad';
import { AuthRequest } from '../middlewares/auth.middleware';

// 1. CREAR INTEGRANTE
// 1. CREAR INTEGRANTE
export const crearIntegrante = async (req: AuthRequest, res: Response) => {
  try {
    // 1. Agregamos 'dni' acá para recibirlo del frontend
    const { dni, nombre, apellido, fechaNacimiento, funcion, clubId, claseId } = req.body;
    const rol = req.usuario?.rol;
    const usuarioId = req.usuario?.id;
    
    // 2. Validación: Si no mandan DNI, cortamos la ejecución
    if (!dni) {
      return res.status(400).json({ status: 'error', message: 'El DNI es un dato obligatorio.' });
    }

    if (rol !== 'REGIONAL') {
      const clubMio = await prisma.club.findFirst({ where: { id: Number(clubId), regionalId: Number(usuarioId) } });
      if (!clubMio) {
        return res.status(403).json({ status: 'error', message: 'No tenés permisos para agregar chicos a este club.' });
      }
    }

    const nuevoIntegrante = await prisma.integrante.create({
      data: {
        dni: Number(dni), // 3. Lo convertimos a número antes de guardarlo
        nombre,
        apellido,
        fechaNacimiento: new Date(fechaNacimiento),
        funcion: funcion || 'CONQUISTADOR',
        clubId: Number(clubId),
        xp: 0
      }
    });

    if (claseId) {
      await prisma.integranteClase.create({
        data: { integranteId: nuevoIntegrante.id, claseId: Number(claseId) }
      });
    }

    return res.status(201).json({ status: 'success', message: 'Conquistador alistado con éxito.', data: nuevoIntegrante });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'Fallo al crear integrante. Verificá que el DNI no esté duplicado.' });
  }
};

// 2. OBTENER AVANCE DE CLASE
export const obtenerAvanceClase = async (req: Request, res: Response) => {
  try {
    const { integranteId, claseId } = req.params;
    const totalRequisitos = await prisma.requisito.count({ where: { seccion: { claseId: Number(claseId) } } });
    const requisitosAprobados = await prisma.progreso.count({
      where: { integranteId: Number(integranteId), requisito: { seccion: { claseId: Number(claseId) } } }
    });
    const porcentaje = totalRequisitos > 0 ? Math.round((requisitosAprobados / totalRequisitos) * 100) : 0;
    res.status(200).json({ status: 'success', data: { totalRequisitos, requisitosAprobados, porcentaje: `${porcentaje}%`, puedeInvestirse: porcentaje >= 100 } });
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

    const claseSugerida = await prisma.clase.findFirst({ where: { edadSugerida: edadBusqueda, tipo: 'REGULAR' } });
    return res.status(200).json({
      status: 'success', data: { integrante: `${integrante.nombre} ${integrante.apellido}`, edadExacta: edadReal, claseSugerida: claseSugerida?.nombre || 'Guía Mayor', observaciones: mensajeSistema }
    });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Fallo en el motor de evaluación.' });
  }
};

// 4. ACTUALIZAR INTEGRANTE (FUSIONADO Y MEJORADO)
export const actualizarIntegrante = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, funcion, claseId } = req.body;
    
    const actualizado = await prisma.integrante.update({
      where: { id: Number(id) },
      data: {
        nombre,
        apellido,
        funcion,
        claseId: claseId ? Number(claseId) : null // Si mandan un ID, lo asigna.
      },
      include: { club: true, clase: true } // Devolvemos los datos completos
    });

    return res.status(200).json({ status: 'success', data: actualizado, message: 'Expediente actualizado' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'Fallo al actualizar el expediente' });
  }
};

// 6. OBTENER INTEGRANTES POR CLUB
export const obtenerIntegrantesPorClub = async (req: AuthRequest, res: Response) => {
  try {
    const clubId = Number(req.params.clubId);
    const regionalId = req.usuario?.id;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const search = req.query.search ? String(req.query.search) : '';
    const skip = (page - 1) * limit;

    const clubMio = await prisma.club.findFirst({ where: { id: clubId, regionalId: Number(regionalId) } });
    if (!clubMio) return res.status(403).json({ status: 'error', message: 'No tenés permisos.' });

    const filtroBusqueda = search ? { OR: [ { nombre: { contains: search, mode: 'insensitive' as const } }, { apellido: { contains: search, mode: 'insensitive' as const } } ] } : {};
    const total = await prisma.integrante.count({ where: { clubId: clubId, ...filtroBusqueda } });
    const integrantes = await prisma.integrante.findMany({ 
      where: { clubId: clubId, ...filtroBusqueda }, 
      skip: skip, 
      take: limit, 
      orderBy: { apellido: 'asc' }, 
      include: { 
        clase: true,
        club: { select: { nombre: true } } // <-- ¡ESTA ES LA LÍNEA MÁGICA QUE FALTABA!
      } 
    });

    return res.status(200).json({ status: 'success', meta: { total, page, limit, totalPages: Math.ceil(total / limit) }, data: integrantes });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Fallo al leer integrantes.' });
  }
};

// 7. ASIGNAR CLASE
export const asignarClase = async (req: AuthRequest, res: Response) => {
  try {
    const integranteId = Number(req.params.integranteId);
    const { claseId } = req.body;
    if (!claseId) return res.status(400).json({ status: 'error', message: 'Debes enviar el claseId.' });

    const integranteActualizado = await prisma.integrante.update({ where: { id: integranteId }, data: { claseId: Number(claseId) } });
    const historialClase = await prisma.integranteClase.create({ data: { integranteId: integranteId, claseId: Number(claseId), estado: 'EN_CURSO' } });

    return res.status(200).json({ status: 'success', message: 'Clase asignada y progreso iniciado.', data: { integranteActualizado, historialClase } });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Fallo interno al asignar la clase.' });
  }
};

// 8. OBTENER BANDA VIRTUAL
export const obtenerBandaVirtual = async (req: AuthRequest, res: Response) => {
  try {
    const integranteId = Number(req.params.integranteId);
    const especialidadesGanadas = await prisma.integranteEspecialidad.findMany({ where: { integranteId: integranteId }, include: { especialidad: true }, orderBy: { fechaAprobacion: 'desc' } });
    const maestriasGanadas = await prisma.integranteMaestria.findMany({ where: { integranteId: integranteId }, include: { maestria: true }, orderBy: { fechaAprobacion: 'desc' } });

    return res.status(200).json({ status: 'success', data: { totalEspecialidades: especialidadesGanadas.length, especialidades: especialidadesGanadas, totalMaestrias: maestriasGanadas.length, maestrias: maestriasGanadas } });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Fallo al leer la banda virtual.' });
  }
};

// 9. OBTENER RANKING (FILTRO CONQUIS+)
export const obtenerRanking = async (req: AuthRequest, res: Response) => {
  try {
    const rol = req.usuario?.rol;
    const usuarioId = req.usuario?.id;
    let filtroIntegrantes: any = { xp: { gt: 0 } }; 

    if (rol === 'DIRECTOR') { filtroIntegrantes.club = { regionalId: usuarioId }; } 

    const ranking = await prisma.integrante.findMany({ where: filtroIntegrantes, orderBy: { xp: 'desc' }, take: 10, include: { club: { select: { nombre: true } } } });
    return res.status(200).json({ status: 'success', data: ranking });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Fallo al cargar ranking.' });
  }
};

// 10. OBTENER METRICAS
export const obtenerMetricas = async (req: AuthRequest, res: Response) => {
  try {
    const totalIntegrantes = await prisma.integrante.count();
    const totalInvestidos = await prisma.integranteClase.count({ where: { estado: 'INVESTIDO' } });
    const topConquistador = await prisma.integrante.findFirst({ orderBy: { xp: 'desc' }, select: { nombre: true, apellido: true, xp: true, club: { select: { nombre: true } } } });

    return res.status(200).json({ status: 'success', data: { totalIntegrantes, totalInvestidos, topXP: topConquistador ? `${topConquistador.nombre} ${topConquistador.apellido} (${topConquistador.xp} XP)` : 'Sin datos', porcentaje: totalIntegrantes > 0 ? Math.round((totalInvestidos / totalIntegrantes) * 100) : 0 } });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Fallo al calcular métricas.' });
  }
};

// 11. OBTENER CLUBES Y CLASES
export const obtenerListaClubes = async (req: AuthRequest, res: Response) => {
  try {
    const rol = req.usuario?.rol;
    const usuarioId = req.usuario?.id;
    let filtro = {};
    if (rol === 'DIRECTOR') { filtro = { regionalId: usuarioId }; }
    const clubes = await prisma.club.findMany({ where: filtro, select: { id: true, nombre: true } });
    return res.status(200).json({ status: 'success', data: clubes });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Fallo al cargar clubes.' });
  }
};

export const obtenerListaClases = async (req: AuthRequest, res: Response) => {
  try {
    const clases = await prisma.clase.findMany({ orderBy: { edadSugerida: 'asc' }, select: { id: true, nombre: true } });
    return res.status(200).json({ status: 'success', data: clases });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Fallo al cargar las clases.' });
  }
};

// 12. CREAR CLUB
export const crearClub = async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, iglesia, distrito } = req.body;
    const regionalId = req.usuario?.id;
    const rol = req.usuario?.rol;

    if (rol !== 'REGIONAL') return res.status(403).json({ status: 'error', message: 'Solo la jerarquía Regional puede fundar clubes.' });

    const nuevoClub = await prisma.club.create({ data: { nombre, iglesia: iglesia || 'Iglesia Local', distrito: distrito || 'Distrito Misiones', regionalId: Number(regionalId) } });
    return res.status(201).json({ status: 'success', message: '¡Club fundado con éxito en la región!', data: nuevoClub });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Fallo al registrar el club.' });
  }
};

// NUEVO: SUBIR FOTO DE PERFIL (AVATAR)
export const subirAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ status: 'error', message: 'No se detectó ninguna imagen.' });

    // La ruta pública donde se guardó la foto
    const imageUrl = `/uploads/${req.file.filename}`;

    const actualizado = await prisma.integrante.update({
      where: { id: Number(id) },
      data: { avatarUrl: imageUrl }
    });

    return res.status(200).json({ status: 'success', message: 'Foto de perfil actualizada.', data: actualizado });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Error al procesar la foto.' });
  }
};