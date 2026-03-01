import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import prisma from '../config/db';

export const firmarRequisito = async (req: AuthRequest, res: Response) => {
  try {
    const { integranteId, requisitoId, especialidadElegidaId } = req.body;
    const evaluadorId = req.usuario?.id;
    const urlFotoRespaldo = req.file ? `/uploads/${req.file.filename}` : null;

    if (!evaluadorId) return res.status(401).json({ status: 'error', message: 'No autorizado.' });

    const requisitoDb = await prisma.requisito.findUnique({
      where: { id: Number(requisitoId) },
      include: { seccion: true }
    });

    if (!requisitoDb) return res.status(404).json({ status: 'error', message: 'Requisito no encontrado.' });

    const yaFirmado = await prisma.progreso.findFirst({
      where: { integranteId: Number(integranteId), requisitoId: Number(requisitoId) }
    });
    if (yaFirmado) return res.status(400).json({ status: 'error', message: 'Requisito ya firmado.' });

    // --- EL MOTOR DE ESPECIALIDADES ---
    let especialidadAOtorgaId: number | null = null;

    if (requisitoDb.opcionesExtra) {
      if (requisitoDb.opcionesExtra.startsWith('FIJA:')) {
        const nombreBuscado = requisitoDb.opcionesExtra.split(':')[1].trim();
        const esp = await prisma.especialidad.findUnique({ where: { nombre: nombreBuscado } });
        if (esp) especialidadAOtorgaId = esp.id;
      } 
      else if (requisitoDb.opcionesExtra.startsWith('OPCIONES:') || requisitoDb.opcionesExtra.startsWith('ABIERTA:')) {
        if (!especialidadElegidaId) {
          return res.status(400).json({ status: 'error', message: 'Este requisito exige que envíes especialidadElegidaId.' });
        }

        const espElegida = await prisma.especialidad.findUnique({ where: { id: Number(especialidadElegidaId) } });
        if (!espElegida) return res.status(404).json({ status: 'error', message: 'La especialidad elegida no existe.' });

        if (requisitoDb.opcionesExtra.startsWith('OPCIONES:')) {
          const permitidas = requisitoDb.opcionesExtra.split(':')[1].split('|').map(s => s.trim().toLowerCase());
          if (!permitidas.includes(espElegida.nombre.toLowerCase())) {
            return res.status(403).json({ status: 'error', message: `Especialidad no permitida. Opciones: ${permitidas.join(', ')}` });
          }
        }
        
        if (requisitoDb.opcionesExtra.startsWith('ABIERTA:')) {
          const categoriaRequerida = requisitoDb.opcionesExtra.split(':')[1].trim().toLowerCase();
          if (espElegida.categoria.toLowerCase() !== categoriaRequerida) {
            return res.status(403).json({ status: 'error', message: `La especialidad debe ser de la categoría: ${categoriaRequerida}` });
          }
        }
        
        especialidadAOtorgaId = espElegida.id;
      }
    }

    // --- TRANSACCIÓN PRINCIPAL (Firma de Progreso) ---
    const nuevoProgreso = await prisma.progreso.create({
      data: {
        integranteId: Number(integranteId),
        requisitoId: Number(requisitoId),
        evaluadorId: Number(evaluadorId),
        urlFotoRespaldo
      }
    });

    // Otorgamos el parche si corresponde
    if (especialidadAOtorgaId) {
      const yaTieneParche = await prisma.integranteEspecialidad.findFirst({
        where: { integranteId: Number(integranteId), especialidadId: especialidadAOtorgaId }
      });
      if (!yaTieneParche) {
        await prisma.integranteEspecialidad.create({
          data: {
            integranteId: Number(integranteId),
            especialidadId: especialidadAOtorgaId,
            evaluadorId: Number(evaluadorId)
          }
        });
      }
    }

    // --- MOTOR DE GAMIFICACIÓN (XP ESTRICTO) ---
    const xpGanados = requisitoDb.puntosXp; 
    let mensajeExtra = '';

    if (xpGanados > 0) {
      await prisma.integrante.update({
        where: { id: Number(integranteId) },
        data: { xp: { increment: xpGanados } }
      });
      mensajeExtra += ` ¡El integrante ganó ${xpGanados} XP!`;
    }

    // --- INVESTIDURA AUTOMÁTICA ---
    const claseId = requisitoDb.seccion.claseId;
    const secciones = await prisma.seccionRequisito.findMany({ where: { claseId }, include: { requisitos: true } });
    let totalRequisitos = 0;
    secciones.forEach(sec => totalRequisitos += sec.requisitos.length);

    const aprobados = await prisma.progreso.count({
      where: { integranteId: Number(integranteId), requisito: { seccion: { claseId } } }
    });

    if (aprobados >= totalRequisitos && totalRequisitos > 0) {
      await prisma.integranteClase.updateMany({
        where: { integranteId: Number(integranteId), claseId: claseId, estado: 'EN_CURSO' },
        data: { estado: 'INVESTIDO', fechaFin: new Date() }
      });
      mensajeExtra += ' ¡El integrante completó el 100% de la clase y está INVESTIDO!';
    }

    return res.status(201).json({
      status: 'success',
      message: 'Requisito firmado.' + mensajeExtra,
      data: nuevoProgreso
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'Fallo al firmar.' });
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
// 3. BUSCAR REQUISITOS PENDIENTES (Para el Frontend)
export const obtenerRequisitosPendientes = async (req: AuthRequest, res: Response) => {
  try {
    const integranteId = Number(req.params.integranteId);
    
    // Buscamos al pibe para saber en qué clase está
    const integrante = await prisma.integrante.findUnique({
      where: { id: integranteId }
    });

    if (!integrante || !integrante.claseId) {
      return res.status(400).json({ status: 'error', message: 'No tiene clase asignada.' });
    }

    // Traemos todo el manual de su clase, pero incluyendo si este pibe ya lo firmó
    const secciones = await prisma.seccionRequisito.findMany({
      where: { claseId: integrante.claseId },
      include: {
        requisitos: {
          include: {
            progresos: { where: { integranteId: integranteId } }
          },
          orderBy: { id: 'asc' }
        }
      },
      orderBy: { orden: 'asc' }
    });

    // Filtramos para devolver SOLO los que no tienen firmas
    const pendientes: any[] = [];
    secciones.forEach(sec => {
      sec.requisitos.forEach(req => {
        if (req.progresos.length === 0) {
          pendientes.push({
            id: req.id,
            numero: req.numero || '-',
            descripcion: req.descripcion,
            seccion: sec.titulo,
            esEspecialidad: req.opcionesExtra ? true : false,
            puntosXp: req.puntosXp
          });
        }
      });
    });

    return res.status(200).json({ status: 'success', data: pendientes });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'Fallo al buscar pendientes.' });
  }
};

// 4. NUEVO: ESTADÍSTICAS DE PROGRESO (Para la barra visual)
export const obtenerEstadisticasProgreso = async (req: AuthRequest, res: Response) => {
  try {
    const integranteId = Number(req.params.integranteId);
    
    // Buscamos al integrante y su clase
    const integrante = await prisma.integrante.findUnique({ 
      where: { id: integranteId }, include: { clase: true } 
    });

    if (!integrante || !integrante.claseId) {
      return res.status(200).json({ status: 'success', data: { total: 0, aprobados: 0, porcentaje: 0, clase: 'Sin Clase' } });
    }

    // Contamos cuántos requisitos tiene su manual en total
    const totalReq = await prisma.requisito.count({ 
      where: { seccion: { claseId: integrante.claseId } } 
    });

    // Contamos cuántos ya le firmaste a este pibe
    const aprobados = await prisma.progreso.count({ 
      where: { integranteId } 
    });

    // Matemática simple para el porcentaje
    const porcentaje = totalReq > 0 ? Math.round((aprobados / totalReq) * 100) : 0;

    return res.status(200).json({ 
      status: 'success', 
      data: { total: totalReq, 
        aprobados, 
        porcentaje, 
        clase: integrante.clase?.nombre || 'Sin Clase' } 
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'Fallo al calcular barra de progreso.' });
  }
};

// NUEVO: CARGA MASIVA DE REQUISITOS (Adaptado a tu Schema exacto)
export const cargarRequisitosMasivos = async (req: AuthRequest, res: Response) => {
  try {
    const { requisitos } = req.body; 
    const rol = req.usuario?.rol;

    if (rol !== 'REGIONAL') return res.status(403).json({ status: 'error', message: 'Solo Regionales pueden alterar el manual.' });

    let contador = 0;
    
    // Iteramos sobre la lista que nos envíen por Apidog
    for (const reqItem of requisitos) {
       // 1. Buscamos la sección en SeccionRequisito usando "titulo" en lugar de "nombre"
       let seccion = await prisma.seccionRequisito.findFirst({ 
         where: { titulo: reqItem.seccionTitulo, claseId: Number(reqItem.claseId) } 
       });
       
       // Si la sección no existe, la creamos (le ponemos orden 1 por defecto si no lo mandan)
       if (!seccion) {
          seccion = await prisma.seccionRequisito.create({ 
            data: { titulo: reqItem.seccionTitulo, claseId: Number(reqItem.claseId), orden: reqItem.ordenSeccion || 1 } 
          });
       }
       
       // 2. Creamos el requisito enlazado
       await prisma.requisito.create({
          data: {
             numero: reqItem.numero,
             descripcion: reqItem.descripcion,
             puntosXp: reqItem.puntosXp || 0,
             seccionId: seccion.id,
             // Valores obligatorios según tu schema:
             esSubRequisito: reqItem.esSubRequisito || false,
             requiereFoto: reqItem.requiereFoto || false
          }
       });
       contador++;
    }

    return res.status(201).json({ status: 'success', message: `${contador} requisitos inyectados a la base de datos con éxito.` });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'Fallo al procesar la carga masiva.' });
  }
}