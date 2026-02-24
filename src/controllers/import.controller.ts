import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import ExcelJS from 'exceljs';

export const importarIntegrantesExcel = async (req: AuthRequest, res: Response) => {
  try {
    const regionalId = req.usuario?.id;

    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No se detectó ningún archivo Excel.' });
    }

    // 1. Armamos el Diccionario Traductor: Buscamos tus clubes y los mapeamos (ej: "Central Posadas" -> ID 1)
    const misClubes = await prisma.club.findMany({
      where: { regionalId: Number(regionalId) }
    });
    
    const mapaClubes = new Map();
    misClubes.forEach(club => mapaClubes.set(club.iglesia, club.id));

    // 2. Leemos el Excel
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const hoja = workbook.Sheets[workbook.SheetNames[0]];
    const datosExcel: any[] = XLSX.utils.sheet_to_json(hoja);

    if (datosExcel.length === 0) {
       return res.status(400).json({ status: 'error', message: 'El Excel está vacío.' });
    }

    // 3. Mapeo y Traducción: Convertimos las filas de Excel a datos para la Base de Datos
    const datosParaInsertar = [];

    for (const fila of datosExcel) {
      const nombreIglesiaExcel = String(fila.Club);
      const clubIdTraducido = mapaClubes.get(nombreIglesiaExcel);

      // Escudo de seguridad: Si el director escribió un club inventado, rebotamos todo
      if (!clubIdTraducido) {
        return res.status(400).json({ 
          status: 'error', 
          message: `Error en Excel: El club "${nombreIglesiaExcel}" no existe o no te pertenece. Deteniendo importación.` 
        });
      }

      datosParaInsertar.push({
        nombre: String(fila.Nombre),
        apellido: String(fila.Apellido),
        fechaNacimiento: new Date(fila.FechaNacimiento), 
        funcion: String(fila.Funcion),
        clubId: clubIdTraducido
      });
    }

    // 4. Inserción Masiva Transaccional
    const resultado = await prisma.integrante.createMany({
      data: datosParaInsertar,
      skipDuplicates: true
    });

    return res.status(201).json({
      status: 'success',
      message: `¡Misión Cumplida! Se importaron ${resultado.count} integrantes al sistema.`
    });

  } catch (error) {
    console.error('Error procesando el Excel:', error);
    return res.status(500).json({ status: 'error', message: 'Error interno al procesar la planilla.' });
  }
};


// (Asegurate de que las otras importaciones que ya tenías de XLSX y prisma sigan arriba)

export const descargarPlantillaExcel = async (req: AuthRequest, res: Response) => {
  try {
    const regionalId = req.usuario?.id;

    if (!regionalId) {
      return res.status(401).json({ status: 'error', message: 'Usuario no autenticado.' });
    }

    // 1. Buscamos los clubes asignados a este Regional (usamos el campo "iglesia" de tu schema)
    const clubes = await prisma.club.findMany({
      where: { regionalId: Number(regionalId) },
      select: { iglesia: true } 
    });

    const nombresIglesias = clubes.map(c => c.iglesia);
    
    // Si no tenés clubes cargados, ponemos un mensaje de aviso en el desplegable
    const opcionesClub = nombresIglesias.length > 0 
      ? `"${nombresIglesias.join(',')}"` 
      : '"Sin clubes asignados"';

    // 2. Creamos el archivo Excel en blanco en la memoria
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Carga_Integrantes');

   // 3. Definimos las columnas y le clavamos el formato de fecha corta a la columna C
    worksheet.columns = [
      { header: 'Nombre', key: 'nombre', width: 20 },
      { header: 'Apellido', key: 'apellido', width: 20 },
      { 
        header: 'FechaNacimiento', 
        key: 'fechaNacimiento', 
        width: 18, 
        style: { numFmt: 'dd/mm/yyyy' } // <--- Esto obliga a Excel a mostrarlo como Fecha Corta
      },
      { header: 'Funcion', key: 'funcion', width: 22 },
      { header: 'Club', key: 'club', width: 25 }
    ];

    // 4. Inyectamos la Validación de Datos (Listas desplegables) para las primeras 100 filas
    // Sacamos Aventurero y agregamos Conquis+
    const funcionesPermitidas = '"Conquistador/a,Conquis+,Director,Director Asociado,Secretario/a,Tesorero/a,Capellan,Instructor,Consejero/a,Consejero/a Asociado,Lider"';
    for (let i = 2; i <= 100; i++) {
      // Lista desplegable para la Función (Columna D)
      worksheet.getCell(`D${i}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [funcionesPermitidas]
      };

      // Lista desplegable para el Club/Iglesia (Columna E)
      if (nombresIglesias.length > 0) {
        worksheet.getCell(`E${i}`).dataValidation = {
          type: 'list',
          allowBlank: true,
          formulae: [opcionesClub]
        };
      }
    }

    // 5. Configuramos la respuesta HTTP para obligar al navegador/cliente a descargar el archivo
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=plantilla_inteligente.xlsx');

    // 6. Escribimos el archivo y lo enviamos
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error al generar la plantilla:', error);
    return res.status(500).json({ status: 'error', message: 'Fallo interno al generar el Excel.' });
  }
};

export const importarRequisitosExcel = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ status: 'error', message: 'No se detectó el archivo Excel.' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const hoja = workbook.Sheets[workbook.SheetNames[0]];
    const datosExcel: any[] = XLSX.utils.sheet_to_json(hoja);

    if (datosExcel.length === 0) {
       return res.status(400).json({ status: 'error', message: 'La planilla Excel está vacía.' });
    }

    // Diccionarios en caché para no saturar PostgreSQL
    const cacheClases = new Map<string, number>();
    const cacheSecciones = new Map<string, number>();

    let requisitosInsertados = 0;

    for (const fila of datosExcel) {
      const nombreClase = String(fila.Clase).trim();
      
      // Sanitización: Convertimos "Nivel 1" a "NIVEL_1" y "Regular" a "REGULAR"
      let tipoClase = String(fila.Tipo).trim().toUpperCase(); 
      tipoClase = tipoClase.replace(/\s+/g, '_'); 

      const nombreSeccion = String(fila.Seccion).trim();
      const numeroPunto = fila.NumeroPunto ? String(fila.NumeroPunto).trim() : null;
      const descripcion = String(fila.Descripcion).trim();
      const opciones = fila.Opciones ? String(fila.Opciones).trim() : null;

      // 1. Buscamos o Creamos la Clase al vuelo
      const claveClase = `${nombreClase}-${tipoClase}`;
      let claseId = cacheClases.get(claveClase);

      if (!claseId) {
        let claseDB = await prisma.clase.findFirst({
          where: { nombre: nombreClase, tipo: tipoClase as any }
        });

        if (!claseDB) {
          claseDB = await prisma.clase.create({
            data: {
              nombre: nombreClase,
              tipo: tipoClase as any,
              color: '#000000', // Color genérico temporal
              edadSugerida: 10  // Edad genérica temporal
            }
          });
        }
        claseId = claseDB.id;
        cacheClases.set(claveClase, claseId);
      }

      // 2. Buscamos o Creamos la Sección (ej: "I", "II", "AV")
      const claveSeccion = `${claseId}-${nombreSeccion}`;
      let seccionId = cacheSecciones.get(claveSeccion);

      if (!seccionId) {
        let seccionDB = await prisma.seccionRequisito.findFirst({
          where: { claseId: claseId, titulo: nombreSeccion }
        });

        if (!seccionDB) {
          seccionDB = await prisma.seccionRequisito.create({
            data: {
              claseId: claseId,
              titulo: nombreSeccion,
              orden: cacheSecciones.size + 1 
            }
          });
        }
        seccionId = seccionDB.id;
        cacheSecciones.set(claveSeccion, seccionId);
      }

      // 3. Insertamos el Requisito final
      await prisma.requisito.create({
        data: {
          seccionId: seccionId,
          numero: numeroPunto,
          descripcion: descripcion,
          opcionesExtra: opciones
        }
      });

      requisitosInsertados++;
    }

    return res.status(201).json({
      status: 'success',
      message: `¡Impresionante! Se procesaron y guardaron ${requisitosInsertados} requisitos en la base de datos.`
    });

  } catch (error) {
    console.error('Error procesando requisitos:', error);
    return res.status(500).json({ status: 'error', message: 'Fallo interno al procesar el Excel de requisitos.' });
  }
};