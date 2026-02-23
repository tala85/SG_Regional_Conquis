import { Request, Response } from 'express';
import prisma from '../config/db';

export const obtenerClases = async (req: Request, res: Response) => {
  try {
    // Le pedimos a Prisma que traiga todas las clases
    const clases = await prisma.clase.findMany({
      orderBy: { edadSugerida: 'asc' } // Las ordenamos por edad
    });

    res.status(200).json({
      status: 'success',
      data: clases
    });
  } catch (error) {
    console.error('Error al obtener clases:', error);
    res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al consultar la base de datos.'
    });
  }
};