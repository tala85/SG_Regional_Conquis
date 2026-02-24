import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extendemos la petición de Express para inyectarle los datos del usuario que descubrimos en el token
export interface AuthRequest extends Request {
  usuario?: any;
}

export const verificarToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // 1. Buscamos el token en la cabecera (Header) de la petición
    const authHeader = req.headers.authorization;
    
    // Si no mandan token o no tiene el formato "Bearer <token>", lo rebotamos
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', message: 'Acceso denegado. Faltan credenciales.' });
    }

    // 2. Extraemos solo el token (separamos la palabra "Bearer ")
    const token = authHeader.split(' ')[1];

    // 3. Verificamos la firma criptográfica usando la clave de tu .env
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string);

    // 4. Si es válido, guardamos los datos del usuario en la petición y lo dejamos pasar
    req.usuario = decoded;
    next();
    
  } catch (error) {
    // Si el token fue modificado, es falso o ya expiró, salta este error
    return res.status(403).json({ status: 'error', message: 'Token inválido o expirado.' });
  }
};

// Middleware para Control de Acceso Basado en Roles (RBAC)
export const verificarRol = (rolesPermitidos: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    
    // Verificamos que el usuario exista en la petición (lo tuvo que haber puesto el verificarToken antes)
    if (!req.usuario) {
      return res.status(401).json({ status: 'error', message: 'Usuario no autenticado.' });
    }

    // Si el rol del usuario NO está en la lista de roles permitidos, lo rebotamos (Error 403 Forbidden)
    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({ 
        status: 'error', 
        message: 'Acceso denegado: No tienes el nivel de privilegios necesario para ver este reporte.' 
      });
    }

    // Si el rol es correcto (ej: es REGIONAL), le abrimos la puerta para que vea el reporte
    next();
  };
};