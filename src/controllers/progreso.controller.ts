import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import prisma from '../config/db';

export const firmarRequisito = async (req: AuthRequest, res: Response) => {
  try {
    const { integranteId, requisitoId } = req.body;
    const evaluadorId = req.usuario?.id; 
    
    // Si el middleware dejó pasar una foto, guardamos la ruta relativa
    const urlFotoRespaldo = req.file ? `/uploads/${req.file.filename}` : null;

    if (!integranteId || !requisitoId) {
      return res.status(400).json({ status: 'error', message: 'Faltan datos: integranteId o requisitoId.' });
    }

    if (!evaluadorId) {
      return res.status(401).json({ status: 'error', message: 'No estás autorizado para firmar.' });
    }

    // 1. Escudo de Integridad: Evitar firmas duplicadas
    const progresoExistente = await prisma.progreso.findFirst({
      where: {
        integranteId: Number(integranteId),
        requisitoId: Number(requisitoId)
      }
    });

    if (progresoExistente) {
      return res.status(400).json({ 
        status: 'error', 
        message: 'Este requisito ya fue firmado para este integrante.' 
      });
    }

    // 2. La Firma: Insertamos el registro de aprobación
    const nuevoProgreso = await prisma.progreso.create({
      data: {
        integranteId: Number(integranteId),
        requisitoId: Number(requisitoId),
        evaluadorId: Number(evaluadorId),
        urlFotoRespaldo: urlFotoRespaldo ? String(urlFotoRespaldo) : null
      }
    });

    return res.status(201).json({
      status: 'success',
      message: '¡Requisito firmado y aprobado correctamente!',
      data: nuevoProgreso
    });

  } catch (error) {
    console.error('Error al firmar requisito:', error);
    return res.status(500).json({ status: 'error', message: 'Fallo interno al registrar el progreso.' });
  }
};

// LECTURA: Calcular el progreso de un integrante en una clase específica
export const obtenerProgreso = async (req: AuthRequest, res: Response) => {
  try {
    const integranteId = Number(req.params.integranteId);
    const claseId = Number(req.params.claseId);

    // 1. Buscamos todas las secciones y requisitos de la clase
    const secciones = await prisma.seccionRequisito.findMany({
      where: { claseId: claseId },
      include: { requisitos: true }
    });

    // Sumamos cuántos requisitos hay en total para esta clase
    let totalRequisitos = 0;
    secciones.forEach(sec => totalRequisitos += sec.requisitos.length);

    if (totalRequisitos === 0) {
      return res.status(400).json({ status: 'error', message: 'La clase no tiene requisitos cargados.' });
    }

    // 2. Buscamos cuáles de esos requisitos ya tiene firmados el integrante
    const aprobados = await prisma.progreso.findMany({
      where: {
        integranteId: integranteId,
        requisito: { seccion: { claseId: claseId } }
      },
      select: { requisitoId: true, fechaAprobacion: true } // Solo traemos los IDs y la fecha para no saturar
    });

    const totalAprobados = aprobados.length;
    
    // 3. Matemática pura: Calculamos el porcentaje (redondeado)
    const porcentaje = Math.round((totalAprobados / totalRequisitos) * 100);

    return res.status(200).json({
      status: 'success',
      data: {
        totalRequisitos,
        totalAprobados,
        porcentaje: porcentaje,
        requisitosAprobados: aprobados // Esta lista le sirve al Frontend para pintar los "checks" en verde
      }
    });

  } catch (error) {
    console.error('Error al calcular progreso:', error);
    return res.status(500).json({ status: 'error', message: 'Fallo interno al calcular el progreso.' });
  }
};