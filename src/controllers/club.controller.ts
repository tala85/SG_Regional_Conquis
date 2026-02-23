import { Request, Response } from 'express';
import prisma from '../config/db';

export const crearClub = async (req: Request, res: Response) => {
  try {
    const { nombre, iglesia, distrito, regionalId } = req.body;
    
    const nuevoClub = await prisma.club.create({
      data: { nombre, iglesia, distrito, regionalId: Number(regionalId) }
    });
    
    return res.status(201).json({ status: 'success', data: nuevoClub });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'Error al crear el club.' });
  }
};

export const obtenerIntegrantesPorClub = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const integrantes = await prisma.integrante.findMany({
      where: { clubId: Number(id) },
      include: {
        clases: true // Incluye información de las clases en las que está inscrito
      }
    });
    res.status(200).json({ status: 'success', data: integrantes });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Error al obtener integrantes.' });
  }
};