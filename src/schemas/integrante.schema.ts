import { z } from 'zod';

export const asignarClaseSchema = z.object({
  body: z.object({
    // En Zod v4 usamos 'message' directamente
    claseId: z.number({ message: 'El ID de la clase debe ser un número válido (no texto).' })
      .int({ message: 'El ID debe ser un número entero.' })
      .positive({ message: 'El ID no puede ser negativo.' })
  }),
  params: z.object({
    // coerce obliga a que el texto de la URL se trate de convertir a número seguro
    integranteId: z.coerce.number({ message: 'El parámetro de la URL debe ser un número.' })
      .int()
      .positive('El ID del integrante debe ser válido.')
  })
});