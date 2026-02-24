import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import prisma from '../config/db';

export const obtenerEstadisticasRegionales = async (req: AuthRequest, res: Response) => {
  try {
    const regionalId = req.usuario?.id;

    // 1. Contamos los clubes de este regional
    const totalClubes = await prisma.club.count({
      where: { regionalId: Number(regionalId) }
    });

    // 2. Contamos los pibes que pertenecen a esos clubes
    const totalIntegrantes = await prisma.integrante.count({
      where: { club: { regionalId: Number(regionalId) } }
    });

    // 3. Agrupamos para saber cuántos hay de cada cargo (Conquistadores vs Consejeros)
    const distribucionCargos = await prisma.integrante.groupBy({
      by: ['funcion'],
      where: { club: { regionalId: Number(regionalId) } },
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