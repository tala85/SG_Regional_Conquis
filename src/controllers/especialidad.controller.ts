import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import prisma from "../config/db";
import * as XLSX from "xlsx";

// 1. INGESTA MASIVA: Subir el diccionario de las 500+ especialidades
export const importarEspecialidadesExcel = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    if (!req.file)
      return res
        .status(400)
        .json({ status: "error", message: "No hay archivo adjunto." });

    // Leemos el "Libro" completo
    const workbook = XLSX.read(req.file.buffer, { type: "buffer" });

    // --- PROCESAR HOJA 1: ESPECIALIDADES (Índice 0) ---
    const hojaEspecialidades = workbook.Sheets[workbook.SheetNames[0]];
    const datosEspecialidades: any[] =
      XLSX.utils.sheet_to_json(hojaEspecialidades);

    let espInsertadas = 0;
    for (const fila of datosEspecialidades) {
      const nombreStr = fila.Nombre ? String(fila.Nombre).trim() : "";
      if (!nombreStr) continue; // Si la fila está vacía, salta a la siguiente

      const categoriaStr = fila.Categoria
        ? String(fila.Categoria).trim()
        : "Sin Categoría";
      const esVigente = fila.Vigente
        ? String(fila.Vigente).toUpperCase() !== "NO"
        : true;

      await prisma.especialidad.upsert({
        where: { nombre: nombreStr },
        update: { categoria: categoriaStr, vigente: esVigente },
        create: {
          nombre: nombreStr,
          categoria: categoriaStr,
          vigente: esVigente,
        },
      });
      espInsertadas++;
    }

    // --- PROCESAR HOJA 2: MAESTRÍAS (Índice 1) ---
    let maeInsertadas = 0;
    // Verificamos de forma segura que el Excel realmente tenga una segunda hoja
    if (workbook.SheetNames.length > 1) {
      const hojaMaestrias = workbook.Sheets[workbook.SheetNames[1]];
      const datosMaestrias: any[] = XLSX.utils.sheet_to_json(hojaMaestrias);

      for (const fila of datosMaestrias) {
        // En tu PDF vi que la columna se llama "Tipo" (ej: Maestría en ADRA)
        const nombreStr = fila.Tipo ? String(fila.Tipo).trim() : "";
        if (!nombreStr) continue;

        // Capturamos el texto explicativo
        const requisitosStr = fila.Requisitos
          ? String(fila.Requisitos).trim()
          : "";

        await prisma.maestria.upsert({
          where: { nombre: nombreStr },
          update: { requisitos: requisitosStr },
          create: { nombre: nombreStr, requisitos: requisitosStr },
        });
        maeInsertadas++;
      }
    }

    return res.status(200).json({
      status: "success",
      message: `¡Ingesta exitosa! Especialidades procesadas: ${espInsertadas} | Maestrías procesadas: ${maeInsertadas}.`,
    });
  } catch (error) {
    console.error("Error en la ingesta masiva:", error);
    return res
      .status(500)
      .json({
        status: "error",
        message: "Fallo al procesar el archivo Excel.",
      });
  }
};

// 2. LECTURA: Traer solo las vigentes (para llenar los menús desplegables del Frontend)
export const obtenerEspecialidadesVigentes = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const especialidades = await prisma.especialidad.findMany({
      where: { vigente: true },
      orderBy: { nombre: "asc" },
    });
    return res.status(200).json({ status: "success", data: especialidades });
  } catch (error) {
    return res
      .status(500)
      .json({ status: "error", message: "Fallo al leer especialidades." });
  }
};

// 3. ASIGNACIÓN: Ponerle el parche oficial al integrante
export const otorgarEspecialidad = async (req: AuthRequest, res: Response) => {
  try {
    const { integranteId, especialidadId } = req.body;
    const evaluadorId = req.usuario?.id;
    const rolEvaluador = req.usuario?.rol;

    // 🛡️ BARRERA JURISDICCIONAL (Anti-IDOR)
    const integrante = await prisma.integrante.findUnique({
      where: { id: Number(integranteId) },
      select: { clubId: true },
    });

    if (!integrante)
      return res
        .status(404)
        .json({ status: "error", message: "Integrante no encontrado." });

    if (
      rolEvaluador === "DIRECTOR" &&
      integrante.clubId !== req.usuario?.clubId
    ) {
      return res
        .status(403)
        .json({
          status: "error",
          message:
            "Violación de acceso: Este conquistador pertenece a otro club.",
        });
    }

    // Escudo: Verificar que no la tenga ya repetida
    const yaLaTiene = await prisma.integranteEspecialidad.findFirst({
      where: {
        integranteId: Number(integranteId),
        especialidadId: Number(especialidadId),
      },
    });

    if (yaLaTiene)
      return res
        .status(400)
        .json({
          status: "error",
          message: "El integrante ya posee esta especialidad.",
        });

    const nuevaAsignacion = await prisma.integranteEspecialidad.create({
      data: {
        integranteId: Number(integranteId),
        especialidadId: Number(especialidadId),
        evaluadorId: Number(evaluadorId),
      },
    });

    return res
      .status(201)
      .json({
        status: "success",
        message: "Especialidad otorgada.",
        data: nuevaAsignacion,
      });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ status: "error", message: "Fallo al otorgar especialidad." });
  }
};

// 4. OTORGAR MAESTRÍA (La banda de mayor rango)
export const otorgarMaestria = async (req: AuthRequest, res: Response) => {
  try {
    const { integranteId, maestriaId } = req.body;
    const evaluadorId = req.usuario?.id;
    const rolEvaluador = req.usuario?.rol;

    // 🛡️ BARRERA JURISDICCIONAL (Anti-IDOR)
    const integrante = await prisma.integrante.findUnique({
      where: { id: Number(integranteId) },
      select: { clubId: true },
    });

    if (!integrante)
      return res
        .status(404)
        .json({ status: "error", message: "Integrante no encontrado." });

    if (
      rolEvaluador === "DIRECTOR" &&
      integrante.clubId !== req.usuario?.clubId
    ) {
      return res
        .status(403)
        .json({
          status: "error",
          message:
            "Violación de acceso: Este conquistador pertenece a otro club.",
        });
    }

    const yaLaTiene = await prisma.integranteMaestria.findFirst({
      where: {
        integranteId: Number(integranteId),
        maestriaId: Number(maestriaId),
      },
    });

    if (yaLaTiene)
      return res
        .status(400)
        .json({
          status: "error",
          message: "El integrante ya posee esta maestría.",
        });

    const nuevaAsignacion = await prisma.integranteMaestria.create({
      data: {
        integranteId: Number(integranteId),
        maestriaId: Number(maestriaId),
        evaluadorId: Number(evaluadorId),
      },
    });

    return res
      .status(201)
      .json({
        status: "success",
        message: "¡Maestría otorgada con honor!",
        data: nuevaAsignacion,
      });
  } catch (error) {
    return res
      .status(500)
      .json({ status: "error", message: "Fallo al otorgar maestría." });
  }
};

// LECTURA: Catálogo de Maestrías
export const obtenerCatalogoMaestrias = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const maestrias = await prisma.maestria.findMany({
      orderBy: { nombre: "asc" },
    });
    return res.status(200).json({ status: "success", data: maestrias });
  } catch (error) {
    return res
      .status(500)
      .json({ status: "error", message: "Fallo al leer maestrías." });
  }
};

export const obtenerEspecialidades = async (req: Request, res: Response) => {
  try {
    const especialidades = await prisma.especialidad.findMany({
      orderBy: { nombre: "asc" },
    });
    return res.status(200).json({ status: "success", data: especialidades });
  } catch (error) {
    return res
      .status(500)
      .json({
        status: "error",
        message: "Fallo al obtener el catálogo de especialidades.",
      });
  }
};
