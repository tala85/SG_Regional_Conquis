import { Request, Response } from 'express';
import prisma from '../config/db';

export const crearUsuario = async (req: Request, res: Response) => {
  try {
    const { nombre, email, password, rol, pais, provincia, campoMision, region } = req.body;
    
    const nuevoUsuario = await prisma.usuario.create({
      data: { nombre, email, password, rol, pais, provincia, campoMision, region }
    });
    
    return res.status(201).json({ status: 'success', data: nuevoUsuario });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'Error al crear el usuario.' });
  }
};