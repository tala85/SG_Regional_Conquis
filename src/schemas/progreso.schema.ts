import { z } from 'zod';

export const firmarRequisitoSchema = z.object({
  body: z.object({
    integranteId: z.coerce.number({ message: 'ID de integrante obligatorio.' }).int().positive(),
    requisitoId: z.coerce.number({ message: 'ID de requisito obligatorio.' }).int().positive(),
    // NUEVO: El ID de la especialidad es opcional, solo se manda si el requisito es ABIERTA u OPCIONES
    especialidadElegidaId: z.coerce.number().int().positive().optional() 
  })
});