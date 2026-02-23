import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import prisma from '../config/db';

export const registrarProgreso = async (req: AuthRequest, res: Response) => {
  try {
    const { integranteId, requisitoId, urlFotoRespaldo } = req.body;
    const evaluadorId = req.usuario.id; // Obtenemos el ID del evaluador desde el Token

    const nuevoProgreso = await prisma.progreso.create({
      data: {
        integranteId: Number(integranteId),
        requisitoId: Number(requisitoId),
        evaluadorId: evaluadorId,
        urlFotoRespaldo
      }
    });

    res.status(201).json({ status: 'success', data: nuevoProgreso });
  } catch (error) {
    console.error(error);
    res.status(500).json({ status: 'error', message: 'Error al registrar el progreso.' });
  }
};