import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import ExcelJS from 'exceljs';
import path from 'path';

// ==========================================
// 1. IMPORTAR INTEGRANTES DESDE EXCEL
// ==========================================
export const importarIntegrantesExcel = async (req: AuthRequest, res: Response) => {
  try {
    const regionalId = req.usuario?.id;
    if (!req.file) return res.status(400).json({ status: 'error', message: 'No se detectó archivo.' });

    const misClubes = await prisma.club.findMany({ where: { regionalId: Number(regionalId) } });
    const misClases = await prisma.clase.findMany();
    
    const mapaClubes = new Map();
    const mapaClases = new Map();
    misClubes.forEach(club => mapaClubes.set(club.iglesia, club.id));
    misClases.forEach(clase => mapaClases.set(clase.nombre, clase.id));

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const hoja = workbook.Sheets[workbook.SheetNames[0]];
    const datosExcel: any[] = XLSX.utils.sheet_to_json(hoja);

    if (datosExcel.length === 0) return res.status(400).json({ status: 'error', message: 'El Excel está vacío.' });

    let insertados = 0;

    for (const fila of datosExcel) {
      const nombreIglesiaExcel = String(fila.Club || '').trim();
      const clubIdTraducido = mapaClubes.get(nombreIglesiaExcel);
      
      const nombreClaseExcel = String(fila.Clase || '').trim();
      const claseIdTraducida = mapaClases.get(nombreClaseExcel);

      if (!clubIdTraducido) continue; 

      // 🛡️ SANITIZACIÓN DE DATOS (Ciberseguridad)
      // Agarra lo que venga, le borra todo lo que NO sea un número (letras, puntos, comas) y lo pasa a entero.
      const dniRaw = String(fila.DNI || '').replace(/\D/g, ''); 
      const dniEntero = parseInt(dniRaw, 10);

      // Si después de limpiar no quedó un número válido, rebotamos a este integrante
      if (!dniEntero || isNaN(dniEntero)) {
        console.warn(`Se omitió a ${fila.Nombre} ${fila.Apellido} por no tener un DNI válido.`);
        continue; 
      }

      try {
        const nuevoIntegrante = await prisma.integrante.create({
          data: {
            dni: dniEntero, // <-- Ahora sí, pasamos un número entero limpio
            nombre: String(fila.Nombre),
            apellido: String(fila.Apellido),
            fechaNacimiento: new Date(fila.FechaNacimiento), 
            funcion: String(fila.Funcion),
            clubId: clubIdTraducido,
            claseId: claseIdTraducida || null
          }
        });

        if (claseIdTraducida) {
          await prisma.integranteClase.create({
            data: { integranteId: nuevoIntegrante.id, claseId: claseIdTraducida, estado: 'EN_CURSO' }
          });
        }
        insertados++;
      } catch (e) {
        console.warn(`Error insertando a ${fila.Nombre} (DNI: ${dniEntero}). ¿Quizás el DNI ya existe?`, e);
      }
    }

    return res.status(201).json({ status: 'success', message: `¡Se importaron ${insertados} integrantes con DNI válido!` });

  } catch (error) {
    console.error('Error procesando el Excel:', error);
    return res.status(500).json({ status: 'error', message: 'Error al procesar la planilla.' });
  }
};


// ==========================================
// 2. DESCARGAR PLANTILLA INTELIGENTE (VERSIÓN HÍBRIDA)
// ==========================================
export const descargarPlantillaExcel = async (req: AuthRequest, res: Response) => {
  try {
    const regionalId = req.usuario?.id;
    if (!regionalId) return res.status(401).json({ status: 'error', message: 'Usuario no autenticado.' });

    // 1. Buscamos Clubes y Clases para los menús desplegables
    const clubes = await prisma.club.findMany({ where: { regionalId: Number(regionalId) }, select: { iglesia: true } });
    const clases = await prisma.clase.findMany({ select: { nombre: true }, orderBy: { edadSugerida: 'asc' } });

    const nombresIglesias = clubes.map(c => c.iglesia);
    const nombresClases = clases.map(c => c.nombre);
    
    const opcionesClub = nombresIglesias.length > 0 ? `"${nombresIglesias.join(',')}"` : '"Sin clubes"';
    const opcionesClase = nombresClases.length > 0 ? `"${nombresClases.join(',')}"` : '"Sin clases"';

    const workbook = new ExcelJS.Workbook();
    
    // 2. MAGIA ACÁ: En vez de crear uno vacío, leemos tu archivo base
    // process.cwd() nos asegura buscar desde la raíz del proyecto
    const rutaPlantilla = path.join(process.cwd(), 'templates', 'Plantilla_Alta_Masiva.xlsx');
    await workbook.xlsx.readFile(rutaPlantilla);
    
    // Agarramos la primera hoja de tu Excel
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) {
        return res.status(500).json({ status: 'error', message: 'La plantilla base no tiene hojas.' });
    }

    // 3. Inyectamos la Validación de Datos (Listas y Reglas)
    const funcionesPermitidas = '"Conquistador/a,Conquis+,Director,Director Asociado,Secretario/a,Tesorero/a,Capellan,Instructor,Consejero/a,Consejero/a Asociado,Lider"';
    
    for (let i = 2; i <= 100; i++) {
      
      // 🛡️ BARRERA 1: DNI (Columna A)
      const celdaDni = worksheet.getCell(`A${i}`);
      celdaDni.numFmt = '0'; // Obligamos a Excel a tratar la celda como número puro (mata las letras)
      celdaDni.dataValidation = {
        type: 'whole', // Tipo: Número Entero
        operator: 'between',
        formulae: [1000000, 99999999], // Rango: de 1 millón a 99 millones (7 u 8 dígitos)
        allowBlank: true,
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: '🛑 ERROR DE SEGURIDAD',
        error: 'El DNI debe tener 7 u 8 números. No se permiten letras, ni puntos, ni comas.'
      };

      // 🛡️ BARRERA 2: Listas Desplegables (Columnas E, F, G)
      worksheet.getCell(`E${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [funcionesPermitidas] };
      
      if (nombresIglesias.length > 0) {
        worksheet.getCell(`F${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [opcionesClub] };
      }
      
      if (nombresClases.length > 0) {
        worksheet.getCell(`G${i}`).dataValidation = { type: 'list', allowBlank: true, formulae: [opcionesClase] };
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Plantilla_Oficial_Conquistadores.xlsx');
    
    // Mandamos tu Excel modificado
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error al generar la plantilla:', error);
    return res.status(500).json({ status: 'error', message: 'Fallo al procesar tu plantilla base. ¿Verificaste que exista en la carpeta templates?' });
  }
};


// ==========================================
// 3. IMPORTAR REQUISITOS (ESTO NO SE TOCA)
// ==========================================
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