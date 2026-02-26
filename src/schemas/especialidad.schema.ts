import { z } from 'zod';

export const otorgarEspecialidadSchema = z.object({
  body: z.object({
    integranteId: z.number({ message: 'El ID del integrante debe ser numérico.' }).positive(),
    especialidadId: z.number({ message: 'El ID de la especialidad debe ser numérico.' }).positive()
  })
});