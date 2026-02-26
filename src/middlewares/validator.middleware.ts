import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

// Usamos ZodSchema que es el estándar oficial para cualquier versión
export const validarSchema = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Intentamos validar el body, los parámetros de la URL y las queries
      schema.parse({
        body: req.body,
        params: req.params,
        query: req.query,
      });
      
      // Si todo está perfecto, le damos luz verde
      next(); 
    } catch (error) {
      // Si Zod detecta inyecciones o datos malos, frena todo acá
      if (error instanceof ZodError) {
        return res.status(400).json({
          status: 'error',
          message: 'Datos inválidos o maliciosos detectados en la petición.',
          // Usamos 'issues' que es la propiedad oficial y segura
          errores: error.issues.map((issue) => ({ 
            campo: issue.path.join('.'), 
            mensaje: issue.message 
          }))
        });
      }
      return res.status(500).json({ status: 'error', message: 'Error interno de validación.' });
    }
  };
};