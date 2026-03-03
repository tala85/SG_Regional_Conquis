import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const obtenerAgenda = async (req: Request, res: Response) => {
  try {
    // Busca los eventos ordenados por fecha más próxima
    const eventos = await prisma.eventoAgenda.findMany({
      orderBy: { fecha: 'asc' }
    });
    res.status(200).json({ data: eventos });
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener la agenda.', error });
  }
};

export const crearEvento = async (req: Request, res: Response) => {
  try {
    const { titulo, descripcion, fecha, clubId } = req.body;
    
    const nuevoEvento = await prisma.eventoAgenda.create({
      data: {
        titulo,
        descripcion,
        fecha: new Date(fecha), // Convertimos el string a Fecha
        clubId: clubId ? parseInt(clubId) : null,
        estado: 'PENDIENTE'
      }
    });
    
    res.status(201).json({ message: 'Evento creado exitosamente', data: nuevoEvento });
  } catch (error) {
    res.status(500).json({ message: 'Error al registrar el evento.', error });
  }
};

export const eliminarEvento = async (req: Request, res: Response) => {
  try {
    // Le afirmamos a TypeScript que el parámetro id es un único string
    const id = req.params.id as string;
    
    await prisma.eventoAgenda.delete({
      where: { id: parseInt(id, 10) }
    });
    
    res.status(200).json({ message: 'Evento eliminado de la agenda.' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar el evento.', error });
  }
};