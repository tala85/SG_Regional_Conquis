import { z } from "zod";

export const enviarMensajeSchema = z.object({
  body: z.object({
    destinatarioId: z
      .number({
        message:
          "El ID del destinatario es obligatorio y debe ser un número válido.",
      })
      .positive("El ID debe ser un número positivo."),

    asunto: z
      .string({
        message: "El asunto es obligatorio y debe ser texto.",
      })
      .min(3, "El asunto es muy corto. Mínimo 3 caracteres.")
      .max(150, "El asunto no puede superar los 150 caracteres."),

    cuerpo: z
      .string({
        message: "El cuerpo del mensaje es obligatorio y debe ser texto.",
      })
      .min(2, "El mensaje no puede estar vacío.")
      .max(5000, "El mensaje es demasiado largo."),
  }),
});
