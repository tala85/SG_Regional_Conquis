import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware'; // Usamos el request seguro
import prisma from '../config/db';
import ExcelJS from 'exceljs';

// 1. TU FUNCIÓN ORIGINAL (Mejorada con seguridad)
export const obtenerReporteClub = async (req: AuthRequest, res: Response) => {
  try {
    const clubId = Number(req.params.clubId);
    const regionalId = req.usuario?.id; // Capturamos quién hace la petición

    // Seguridad: Verificamos que el club le pertenezca a este usuario
    const club = await prisma.club.findUnique({
      where: { id: clubId, regionalId: Number(regionalId) },
      include: {
        integrantes: {
          include: { clase: true, progresos: true }
        }
      }
    });

    if (!club) {
      return res.status(403).json({ status: 'error', message: 'No tienes permisos o el club no existe.' });
    }

    const totalIntegrantes = club.integrantes.length;
    const distribucionClases: Record<string, number> = {};
    
    club.integrantes.forEach(integrante => {
      const nombreClase = integrante.clase?.nombre || 'Sin clase asignada';
      distribucionClases[nombreClase] = (distribucionClases[nombreClase] || 0) + 1;
    });

    const resumenIntegrantes = club.integrantes.map(int => ({
      nombreCompleto: `${int.nombre} ${int.apellido}`,
      funcion: int.funcion,
      claseActual: int.clase?.nombre || 'Ninguna',
      requisitosAprobados: int.progresos.length
    }));

    return res.status(200).json({
      status: 'success',
      data: {
        informacionClub: `Iglesia: ${club.iglesia} - Distrito: ${club.distrito}`,
        estadisticas: { totalIntegrantes, distribucionClases },
        detalleIntegrantes: resumenIntegrantes
      }
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'Fallo interno al procesar el reporte.' });
  }
};

// 2. NUEVA FUNCIÓN: EXCEL DE INVESTIDURA (Fase 9)
export const generarReporteInvestidura = async (req: AuthRequest, res: Response) => {
  try {
    const regionalId = req.usuario?.id;
    const clubId = Number(req.params.clubId);

    const clubMio = await prisma.club.findFirst({ where: { id: clubId, regionalId: Number(regionalId) } });
    if (!clubMio) return res.status(403).json({ status: 'error', message: 'No tienes permisos sobre este club.' });

    // Traemos a los que ya terminaron la tarjeta
    const listosParaInvestir = await prisma.integranteClase.findMany({
      where: { integrante: { clubId: clubId }, estado: 'INVESTIDO' },
      include: { integrante: true, clase: true }
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte de Investidura');

    worksheet.columns = [
      { header: 'Nombre', key: 'nombre', width: 25 },
      { header: 'Apellido', key: 'apellido', width: 25 },
      { header: 'Clase Alcanzada', key: 'clase', width: 30 },
      { header: 'Fecha de Finalización', key: 'fecha', width: 20 },
      { header: 'XP Total', key: 'xp', width: 15 }
    ];

    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF004080' } };

    listosParaInvestir.forEach(item => {
      worksheet.addRow({
        nombre: item.integrante.nombre,
        apellido: item.integrante.apellido,
        clase: item.clase.nombre,
        fecha: item.fechaFin ? item.fechaFin.toLocaleDateString() : 'Pendiente',
        xp: item.integrante.xp
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Investidura_Club_${clubId}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'Fallo al generar el excel.' });
  }
};