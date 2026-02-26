import { Request, Response, NextFunction } from 'express';
import prisma from '../config/db';
import { AuthRequest } from './auth.middleware';

export const auditoriaMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  // interceptedRes nos permite esperar a que el controlador termine para saber si fue exitoso
  res.on('finish', async () => {
    // Solo auditamos las acciones que modifican datos (POST, PATCH, PUT, DELETE) y que hayan sido exitosas (200 o 201)
    if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) && res.statusCode < 400) {
      try {
        // Limpiamos contraseñas o datos sensibles del body antes de guardar
        const bodySeguro = { ...req.body };
        if (bodySeguro.password) delete bodySeguro.password;

        await prisma.bitacoraAuditoria.create({
          data: {
            usuarioId: req.usuario?.id || null, // Si estaba logueado, capturamos quién es
            metodo: req.method,
            ruta: req.originalUrl,
            cuerpoPeticion: Object.keys(bodySeguro).length ? JSON.stringify(bodySeguro) : null,
            ip: req.ip || req.connection.remoteAddress || 'IP_DESCONOCIDA'
          }
        });
      } catch (error) {
        console.error('Error crítico en el sistema de auditoría:', error);
      }
    }
  });

  next(); // Dejamos que la petición siga su curso normal
};