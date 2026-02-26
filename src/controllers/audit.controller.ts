import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import prisma from '../config/db';

export const obtenerRegistrosAuditoria = async (req: AuthRequest, res: Response) => {
  try {
    const logs = await prisma.bitacoraAuditoria.findMany({
      orderBy: { fecha: 'desc' },
      take: 100, 
      include: {
        // Le pedimos solo los datos que realmente existen en la tabla Usuario
        usuario: { select: { nombre: true, email: true } } 
      }
    });

    return res.status(200).json({ status: 'success', data: logs });
  } catch (error) {
    console.error('Error al leer auditoría:', error);
    return res.status(500).json({ status: 'error', message: 'Fallo al acceder a la bitácora.' });
  }
};