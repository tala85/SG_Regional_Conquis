import { Request, Response } from 'express';
import prisma from '../config/db';

export const crearIntegrante = async (req: Request, res: Response) => {
  try {
    const { nombre, apellido, fechaNacimiento, funcion, clubId } = req.body;

    // 1. Validación estricta de campos obligatorios
    if (!nombre || !apellido || !fechaNacimiento || !funcion || !clubId) {
      return res.status(400).json({
        status: 'error',
        message: 'Faltan campos obligatorios. Asegúrese de enviar nombre, apellido, fechaNacimiento, funcion y clubId.'
      });
    }

    // 2. Creación en la base de datos usando Prisma
    const nuevoIntegrante = await prisma.integrante.create({
      data: {
        nombre,
        apellido,
        fechaNacimiento: new Date(fechaNacimiento), // Convertimos el string a formato Fecha
        funcion,
        clubId: Number(clubId) // Aseguramos que el ID sea un número
      }
    });

    // 3. Respuesta exitosa
    return res.status(201).json({
      status: 'success',
      data: nuevoIntegrante
    });

  } catch (error) {
    console.error('Error al crear integrante:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Error interno del servidor al crear el integrante.'
    });
  }
};