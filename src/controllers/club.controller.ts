import { Response } from 'express';
import { AuthRequest } from '../middlewares/auth.middleware';
import prisma from '../config/db';

// 1. ALTA: Crear un club nuevo asignado automáticamente al Regional que lo crea
export const crearClub = async (req: AuthRequest, res: Response) => {
  try {
    // Agregamos 'nombre' a los datos que esperamos recibir
    const { nombre, iglesia, distrito } = req.body; 
    const regionalId = req.usuario?.id;

    // Validamos que vengan los dos datos principales
    if (!nombre || !iglesia) {
      return res.status(400).json({ status: 'error', message: 'El nombre del club y de la iglesia son obligatorios.' });
    }

    const nuevoClub = await prisma.club.create({
      data: {
        nombre: String(nombre), // Inyectamos el nombre en la base de datos
        iglesia: String(iglesia),
        distrito: distrito ? String(distrito) : 'Sin distrito',
        regionalId: Number(regionalId) 
      }
    });

    return res.status(201).json({ status: 'success', data: nuevoClub });
  } catch (error) {
    console.error('Error al crear club:', error);
    return res.status(500).json({ status: 'error', message: 'Fallo interno al crear el club.' });
  }
};

// 2. LECTURA: Traer SOLO los clubes que te pertenecen a vos
export const obtenerMisClubes = async (req: AuthRequest, res: Response) => {
  try {
    const regionalId = req.usuario?.id;

    const misClubes = await prisma.club.findMany({
      where: { regionalId: Number(regionalId) }
    });

    return res.status(200).json({ status: 'success', data: misClubes });
  } catch (error) {
    console.error('Error al obtener clubes:', error);
    return res.status(500).json({ status: 'error', message: 'Fallo interno al leer los clubes.' });
  }
};

// 3. BAJA: Eliminar un club (con protección IDOR)
export const eliminarClub = async (req: AuthRequest, res: Response) => {
  try {
    const clubId = req.params.id;
    const regionalId = req.usuario?.id;

    // Primero verificamos que el club exista Y te pertenezca
    const clubExistente = await prisma.club.findFirst({
      where: { 
        id: Number(clubId),
        regionalId: Number(regionalId) // Prevención IDOR
      }
    });

    if (!clubExistente) {
      return res.status(403).json({ status: 'error', message: 'Acceso denegado o el club no existe.' });
    }

    // Si pasó el escudo, lo borramos
    await prisma.club.delete({
      where: { id: Number(clubId) }
    });

    return res.status(200).json({ status: 'success', message: 'Club eliminado correctamente.' });
  } catch (error) {
    console.error('Error al eliminar club:', error);
    return res.status(500).json({ status: 'error', message: 'Fallo interno al eliminar el club.' });
  }
};