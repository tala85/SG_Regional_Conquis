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