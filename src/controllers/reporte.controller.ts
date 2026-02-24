import { Request, Response } from 'express';
import prisma from '../config/db';

export const obtenerReporteClub = async (req: Request, res: Response) => {
  try {
    const { clubId } = req.params;

    // 1. Buscamos el club e incluimos toda su "rama" de datos relacionales
    const club = await prisma.club.findUnique({
      where: { id: Number(clubId) },
      include: {
        integrantes: {
          include: {
            clase: true,       // Traemos los datos de la clase asignada
            progresos: true    // Traemos la lista de requisitos que ya aprobó
          }
        }
      }
    });

    if (!club) {
      return res.status(404).json({ status: 'error', message: 'Club no encontrado en la base de datos.' });
    }

    // 2. Procesamiento de datos (Lógica de negocio)
    const totalIntegrantes = club.integrantes.length;
    
    // Contamos cuántos chicos hay en cada clase
    const distribucionClases: Record<string, number> = {};
    
    club.integrantes.forEach(integrante => {
      const nombreClase = integrante.clase?.nombre || 'Sin clase asignada';
      distribucionClases[nombreClase] = (distribucionClases[nombreClase] || 0) + 1;
    });

    // Mapeamos un resumen limpio de cada integrante
    const resumenIntegrantes = club.integrantes.map(int => ({
      nombreCompleto: `${int.nombre} ${int.apellido}`,
      funcion: int.funcion,
      claseActual: int.clase?.nombre || 'Ninguna',
      requisitosAprobados: int.progresos.length
    }));

    // 3. Devolvemos el reporte empaquetado
    return res.status(200).json({
      status: 'success',
      data: {
        informacionClub: `Iglesia: ${club.iglesia} - Distrito: ${club.distrito}`,
        estadisticas: {
          totalIntegrantes,
          distribucionClases
        },
        detalleIntegrantes: resumenIntegrantes
      }
    });

  } catch (error) {
    console.error('Error al generar el reporte:', error);
    return res.status(500).json({ status: 'error', message: 'Fallo interno al procesar el reporte del club.' });
  }
};