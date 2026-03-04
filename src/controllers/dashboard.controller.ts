import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import prisma from '../config/db';

export const obtenerEstadisticasRegionales = async (req: AuthRequest, res: Response) => {
  try {
    const usuarioId = req.usuario?.id;
    const rol = req.usuario?.rol;

    // Buscamos el perfil para saber qué zona o club tiene asignado
    const miPerfil = await prisma.usuario.findUnique({ where: { id: Number(usuarioId) } });

    // 🛡️ Filtros Inteligentes (RBAC)
    // Dependiendo de quién entra, armamos la consulta a medida
    let filtroClubes: any = {};
    let filtroIntegrantes: any = {};

    if (rol === 'DIRECTOR') {
      // El Director solo ve los números de su propio club
      filtroClubes = { id: miPerfil?.clubId || -1 };
      filtroIntegrantes = { clubId: miPerfil?.clubId || -1 };
    } else if (rol === 'REGIONAL') {
      // El Regional ve los números de todos los clubes de su Zona
      filtroClubes = { regionId: miPerfil?.regionId || -1 };
      filtroIntegrantes = { club: { regionId: miPerfil?.regionId || -1 } };
    }
    // Si es SYSADMIN, los filtros quedan vacíos y cuenta el total de la provincia.

    // 1. Contamos los clubes (aplicando el filtro inteligente)
    const totalClubes = await prisma.club.count({
      where: filtroClubes
    });

    // 2. Contamos los pibes (aplicando el filtro inteligente)
    const totalIntegrantes = await prisma.integrante.count({
      where: filtroIntegrantes
    });

    // 3. Agrupamos para saber cuántos hay de cada cargo (Conquistadores vs Consejeros)
    const distribucionCargos = await prisma.integrante.groupBy({
      by: ['funcion'],
      where: filtroIntegrantes,
      _count: { funcion: true }
    });

    return res.status(200).json({
      status: 'success',
      data: {
        totalClubes,
        totalIntegrantes,
        distribucionCargos
      }
    });
  } catch (error) {
    console.error('Error en el dashboard:', error);
    return res.status(500).json({ status: 'error', message: 'Fallo al cargar estadísticas.' });
  }
};