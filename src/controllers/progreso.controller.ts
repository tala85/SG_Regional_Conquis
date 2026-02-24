import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import prisma from '../config/db';

export const registrarProgreso = async (req: AuthRequest, res: Response) => {
  try {
    const { integranteId, requisitoId, urlFotoRespaldo } = req.body;
    
    // Obtenemos el ID del evaluador (el Regional) directamente desde el Token de seguridad
    const evaluadorId = req.usuario?.id; 

    // Validación básica de inputs
    if (!integranteId || !requisitoId) {
      return res.status(400).json({ status: 'error', message: 'Faltan datos obligatorios.' });
    }

    // 1. Auditoría de Seguridad: Verificamos si este pibe ya tiene este requisito firmado
    const firmaExistente = await prisma.progreso.findFirst({
      where: {
        integranteId: Number(integranteId),
        requisitoId: Number(requisitoId)
      }
    });

    if (firmaExistente) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Rechazado: El integrante ya tiene este requisito aprobado y firmado.' 
      });
    }

    // 2. Si está limpio, registramos la firma nueva con trazabilidad completa
    const nuevoProgreso = await prisma.progreso.create({
      data: {
        integranteId: Number(integranteId),
        requisitoId: Number(requisitoId),
        evaluadorId: Number(evaluadorId),
        urlFotoRespaldo: urlFotoRespaldo || null
      }
    });

    return res.status(201).json({
      status: 'success',
      message: 'Requisito firmado y aprobado correctamente.',
      data: nuevoProgreso
    });

  } catch (error) {
    console.error('Error al registrar progreso:', error);
    return res.status(500).json({ status: 'error', message: 'Error interno al procesar la firma del requisito.' });
  }
};