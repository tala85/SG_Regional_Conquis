import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// 1. Extendemos el Request de Express para que acepte nuestro usuario inyectado
export interface AuthRequest extends Request {
  usuario?: {
    id: number;
    rol: string;
    clubId: number | null;
  };
}

// 2. Middleware para verificar el Token JWT (Ya lo tenías, lo dejamos igual pero usando AuthRequest)
export const verificarToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: 'Acceso denegado. Token no proporcionado.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as any;
    req.usuario = payload; // Inyectamos los datos decodificados (id y rol)
    next();
  } catch (error) {
    return res.status(401).json({ status: 'error', message: 'Token inválido o expirado.' });
  }
};

// 3. El Patovica de los Roles (El que agregamos recién)
export const verificarRol = (rolesPermitidos: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    // Como usamos AuthRequest, TypeScript ya sabe que req.usuario existe
    const rolUsuario = req.usuario?.rol; 

    if (!rolUsuario || !rolesPermitidos.includes(rolUsuario)) {
      return res.status(403).json({
        status: 'error',
        message: `⛔ ACCESO DENEGADO. Nivel de seguridad insuficiente. Se requiere: ${rolesPermitidos.join(' o ')}.`
      });
    }
    
    next();
  };
};