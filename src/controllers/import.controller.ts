import { Request, Response } from 'express';
import * as XLSX from 'xlsx';
import prisma from '../config/db';
import { AuthRequest } from '../middlewares/auth.middleware';
import ExcelJS from 'exceljs';

// ==========================================
// FUNCIÓN AUXILIAR: Parsear fechas en múltiples formatos
// Maneja: Date object, "dd/mm/yyyy", "yyyy-mm-dd", número serial de Excel
// ==========================================
const parsearFecha = (valor: any): Date | null => {
  if (!valor) return null;

  // Si ya es un objeto Date válido (cellDates:true lo convierte automáticamente)
  if (valor instanceof Date) {
    return isNaN(valor.getTime()) ? null : valor;
  }

  const str = String(valor).trim();

  // ✅ Formato dd/mm/yyyy — lo que escribe un argentino en Excel
  const matchDDMMYYYY = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (matchDDMMYYYY) {
    const fecha = new Date(`${matchDDMMYYYY[3]}-${matchDDMMYYYY[2].padStart(2,'0')}-${matchDDMMYYYY[1].padStart(2,'0')}`);
    return isNaN(fecha.getTime()) ? null : fecha;
  }

  // ✅ Formato yyyy-mm-dd (ISO estándar)
  const matchISO = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (matchISO) {
    const fecha = new Date(str);
    return isNaN(fecha.getTime()) ? null : fecha;
  }

  // ✅ Número serial de Excel (ej: 40179 = 01/01/2010)
  const numero = Number(str);
  if (!isNaN(numero) && numero > 1000) {
    const fechaParseada = XLSX.SSF.parse_date_code(numero);
    if (fechaParseada) return new Date(fechaParseada.y, fechaParseada.m - 1, fechaParseada.d);
  }

  return null;
};


// ==========================================
// 1. IMPORTAR INTEGRANTES DESDE EXCEL
// ==========================================
export const importarIntegrantesExcel = async (req: AuthRequest, res: Response) => {
  try {
    const usuarioId = req.usuario?.id;
    const rol = req.usuario?.rol;

    if (!req.file) return res.status(400).json({ status: 'error', message: 'No se detectó archivo.' });

    // 🛡️ BARRERA DE DATOS: Buscamos qué clubes puede afectar este usuario
    const miPerfil = await prisma.usuario.findUnique({ where: { id: Number(usuarioId) } });
    let filtroClubes = {};

    if (rol === 'DIRECTOR') {
      filtroClubes = { id: miPerfil?.clubId || -1 }; // Solo su club
    } else if (rol === 'REGIONAL') {
      filtroClubes = { regionId: miPerfil?.regionId || -1 }; // Todos los clubes de su zona
    }
    // Si es SYSADMIN, filtroClubes queda vacío y trae TODOS los clubes.

    const misClubes = await prisma.club.findMany({ where: filtroClubes });
    const misClases = await prisma.clase.findMany();

    const mapaClubes = new Map<string, number>();
    const mapaClases = new Map<string, number>();

    misClubes.forEach(club => {
      mapaClubes.set(club.nombre.trim().toLowerCase(), club.id);
      if (club.iglesia) mapaClubes.set(club.iglesia.trim().toLowerCase(), club.id);
    });
    misClases.forEach(clase => mapaClases.set(clase.nombre.trim().toLowerCase(), clase.id));

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const hoja = workbook.Sheets[workbook.SheetNames[0]];
    const datosExcel: any[] = XLSX.utils.sheet_to_json(hoja);

    if (datosExcel.length === 0)
      return res.status(400).json({ status: 'error', message: 'El Excel está vacío.' });

    let insertados = 0;
    let omitidos = 0;
    const errores: string[] = [];

    for (const fila of datosExcel) {
      const nombreClubExcel = String(fila.Club || fila.club || '').trim().toLowerCase();
      const clubIdTraducido = mapaClubes.get(nombreClubExcel);
      const nombreClaseExcel = String(fila.Clase || fila.clase || '').trim().toLowerCase();
      const claseIdTraducida = mapaClases.get(nombreClaseExcel);

      if (!clubIdTraducido) {
        errores.push(`Club no encontrado o sin acceso: "${fila.Club}" — omitido: ${fila.Nombre} ${fila.Apellido}.`);
        omitidos++;
        continue;
      }

      const dniRaw = String(fila.DNI || fila.dni || '').replace(/\D/g, '');
      const dniEntero = parseInt(dniRaw, 10);

      if (!dniEntero || isNaN(dniEntero) || dniEntero < 1000000 || dniEntero > 99999999) {
        errores.push(`DNI inválido: "${fila.DNI}" — omitido: ${fila.Nombre} ${fila.Apellido}`);
        omitidos++;
        continue;
      }

      const fechaNac = parsearFecha(fila.FechaNacimiento || fila.fechanacimiento);
      if (!fechaNac) {
        errores.push(`Fecha inválida: "${fila.FechaNacimiento}" para DNI ${dniEntero} — omitido. Usá formato dd/mm/aaaa.`);
        omitidos++;
        continue;
      }

      try {
        const nuevoIntegrante = await prisma.integrante.create({
          data: {
            dni: dniEntero,
            nombre: String(fila.Nombre || fila.nombre).trim(),
            apellido: String(fila.Apellido || fila.apellido).trim(),
            fechaNacimiento: fechaNac,
            funcion: String(fila.Funcion || fila.funcion || 'CONQUISTADOR').trim(),
            clubId: clubIdTraducido,
            claseId: claseIdTraducida || null,
            xp: 0
          }
        });

        if (claseIdTraducida) {
          await prisma.integranteClase.create({
            data: { integranteId: nuevoIntegrante.id, claseId: claseIdTraducida, estado: 'EN_CURSO' }
          });
        }
        insertados++;
      } catch (e: any) {
        if (e?.code === 'P2002') {
          errores.push(`DNI duplicado: ${dniEntero} (${fila.Nombre} ${fila.Apellido}) — ya existe en el sistema.`);
        } else {
          errores.push(`Error inesperado con DNI ${dniEntero}: ${e?.message}`);
        }
        omitidos++;
      }
    }

    return res.status(201).json({
      status: 'success',
      message: `Importación completada: ${insertados} ingresados, ${omitidos} omitidos.`,
      detalle: errores.length > 0 ? errores : ['✅ Todos los integrantes se importaron sin errores.']
    });

  } catch (error) {
    console.error('Error procesando el Excel:', error);
    return res.status(500).json({ status: 'error', message: 'Error al procesar la planilla.' });
  }
};


// ==========================================
// 2. DESCARGAR PLANTILLA INTELIGENTE
// ✅ Generada 100% desde cero con ExcelJS puro
// ✅ La lista de clubes usa 'nombre' (no 'iglesia') — igual que el importador
// ==========================================
export const descargarPlantillaExcel = async (req: AuthRequest, res: Response) => {
  try {
    const usuarioId = req.usuario?.id;
    const rol = req.usuario?.rol;

    if (!usuarioId) return res.status(401).json({ status: 'error', message: 'Usuario no autenticado.' });

    // 🛡️ BARRERA DE DATOS: Mostramos en el Excel solo los clubes que le corresponden
    const miPerfil = await prisma.usuario.findUnique({ where: { id: Number(usuarioId) } });
    let filtroClubes = {};

    if (rol === 'DIRECTOR') {
      filtroClubes = { id: miPerfil?.clubId || -1 };
    } else if (rol === 'REGIONAL') {
      filtroClubes = { regionId: miPerfil?.regionId || -1 };
    }

    const clubes = await prisma.club.findMany({
      where: filtroClubes,
      select: { nombre: true }
    });
    
    const clases = await prisma.clase.findMany({
      select: { nombre: true },
      orderBy: { edadSugerida: 'asc' }
    });

    const nombresClubes = clubes.map(c => c.nombre);
    const nombresClases = clases.map(c => c.nombre);

    const workbook  = new ExcelJS.Workbook();
    workbook.creator = 'SG Conquis Pro';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('Carga_Integrantes', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    // Columnas — los nombres DEBEN coincidir exactamente con lo que lee el importador
    worksheet.columns = [
      { header: 'DNI',             key: 'DNI',             width: 15 },
      { header: 'Nombre',          key: 'Nombre',          width: 22 },
      { header: 'Apellido',        key: 'Apellido',        width: 22 },
      { header: 'FechaNacimiento', key: 'FechaNacimiento', width: 18 },
      { header: 'Funcion',         key: 'Funcion',         width: 22 },
      { header: 'Club',            key: 'Club',            width: 28 },
      { header: 'Clase',           key: 'Clase',           width: 22 },
    ];

    // Estilo del encabezado
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell(cell => {
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border    = { bottom: { style: 'medium', color: { argb: 'FFFBBF24' } } };
    });
    headerRow.height = 22;

    // Fila de ejemplo — muestra el formato esperado
    const filaEjemplo = worksheet.getRow(2);
    filaEjemplo.values = [
      45123456, 'Juan', 'Pérez', '12/05/2010',
      'Conquistador/a',
      nombresClubes[0] || 'Nombre del Club',
      nombresClases[0] || ''
    ];
    filaEjemplo.eachCell(cell => {
      cell.font = { italic: true, color: { argb: 'FF9CA3AF' } };
    });

    // Listas para validaciones
    const funcionesPermitidas = '"Conquistador/a,Conquis+,Director,Director Asociado,Secretario/a,Tesorero/a,Capellan,Instructor,Consejero/a,Consejero/a Asociado,Lider"';
    const opcionesClub  = nombresClubes.length > 0 ? `"${nombresClubes.join(',')}"` : '"Sin clubes"';
    const opcionesClase = nombresClases.length  > 0 ? `"${nombresClases.join(',')}"` : '"Sin clases"';

    // Validaciones fila por fila (filas 2 a 200)
    for (let i = 2; i <= 200; i++) {

      // Col A — DNI numérico entero, 7-8 dígitos
      worksheet.getCell(`A${i}`).numFmt = '0';
      worksheet.getCell(`A${i}`).dataValidation = {
        type: 'whole', operator: 'between', formulae: [1000000, 99999999],
        allowBlank: true, showErrorMessage: true,
        errorStyle: 'error', errorTitle: '🛑 DNI Inválido',
        error: 'El DNI debe tener 7 u 8 dígitos. Sin puntos ni letras.',
        showInputMessage: true, promptTitle: 'DNI',
        prompt: 'Ingresá el DNI sin puntos (7 u 8 dígitos).'
      };

      // Col D — Fecha de nacimiento en formato dd/mm/yyyy
      worksheet.getCell(`D${i}`).numFmt = 'dd/mm/yyyy';
      worksheet.getCell(`D${i}`).dataValidation = {
        type: 'date', operator: 'between',
        formulae: [new Date('1990-01-01'), new Date('2020-12-31')],
        allowBlank: true, showErrorMessage: true,
        errorStyle: 'warning', errorTitle: 'Fecha sospechosa',
        error: 'Revisá el formato. Usá dd/mm/aaaa. Ej: 15/03/2012',
        showInputMessage: true, promptTitle: 'Fecha de Nacimiento',
        prompt: 'Ingresá en formato dd/mm/aaaa. Ej: 15/03/2012'
      };

      // Col E — Función (lista desplegable)
      worksheet.getCell(`E${i}`).dataValidation = {
        type: 'list', allowBlank: true, formulae: [funcionesPermitidas],
        showInputMessage: true, promptTitle: 'Función',
        prompt: 'Elegí la función del integrante.',
        showErrorMessage: true, errorStyle: 'warning',
        errorTitle: 'Función no válida', error: 'Seleccioná una opción de la lista.'
      };

      // Col F — Club (lista dinámica con nombre de los clubes)
      if (nombresClubes.length > 0) {
        worksheet.getCell(`F${i}`).dataValidation = {
          type: 'list', allowBlank: true, formulae: [opcionesClub],
          showInputMessage: true, promptTitle: 'Club',
          prompt: 'Elegí el club al que pertenece.',
          showErrorMessage: true, errorStyle: 'warning',
          errorTitle: 'Club no registrado',
          error: 'Este club no existe en el sistema. Elegí uno de la lista.'
        };
      }

      // Col G — Clase (lista dinámica)
      if (nombresClases.length > 0) {
        worksheet.getCell(`G${i}`).dataValidation = {
          type: 'list', allowBlank: true, formulae: [opcionesClase],
          showInputMessage: true, promptTitle: 'Clase',
          prompt: 'Elegí la clase asignada (opcional).',
          showErrorMessage: true, errorStyle: 'warning',
          errorTitle: 'Clase no registrada',
          error: 'Esta clase no existe. Elegí una de la lista.'
        };
      }
    }

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Plantilla_Alta_Masiva.xlsx');

    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    console.error('Error al generar la plantilla:', error);
    return res.status(500).json({ status: 'error', message: 'Fallo al generar la plantilla.' });
  }
};


// ==========================================
// 3. IMPORTAR REQUISITOS DESDE EXCEL/CSV
// ==========================================
export const importarRequisitosExcel = async (req: Request, res: Response) => {
  try {
    if (!req.file)
      return res.status(400).json({ status: 'error', message: 'No se detectó el archivo Excel.' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const hoja = workbook.Sheets[workbook.SheetNames[0]];
    const datosExcel: any[] = XLSX.utils.sheet_to_json(hoja);

    if (datosExcel.length === 0)
      return res.status(400).json({ status: 'error', message: 'La planilla Excel está vacía.' });

    const cacheClases    = new Map<string, number>();
    const cacheSecciones = new Map<string, number>();
    let requisitosInsertados = 0;

    for (const fila of datosExcel) {
      const nombreClase   = String(fila.Clase).trim();
      let tipoClase       = String(fila.Tipo).trim().toUpperCase().replace(/\s+/g, '_');
      const nombreSeccion = String(fila.Seccion).trim();
      const numeroPunto   = fila.NumeroPunto ? String(fila.NumeroPunto).trim() : null;
      const descripcion   = String(fila.Descripcion).trim();
      const opciones      = fila.Opciones ? String(fila.Opciones).trim() : null;

      const claveClase = `${nombreClase}-${tipoClase}`;
      let claseId = cacheClases.get(claveClase);

      if (!claseId) {
        let claseDB = await prisma.clase.findFirst({
          where: { nombre: nombreClase, tipo: tipoClase as any }
        });
        if (!claseDB) {
          claseDB = await prisma.clase.create({
            data: { nombre: nombreClase, tipo: tipoClase as any, color: '#000000', edadSugerida: 10 }
          });
        }
        claseId = claseDB.id;
        cacheClases.set(claveClase, claseId);
      }

      const claveSeccion = `${claseId}-${nombreSeccion}`;
      let seccionId = cacheSecciones.get(claveSeccion);

      if (!seccionId) {
        let seccionDB = await prisma.seccionRequisito.findFirst({
          where: { claseId, titulo: nombreSeccion }
        });
        if (!seccionDB) {
          seccionDB = await prisma.seccionRequisito.create({
            data: { claseId, titulo: nombreSeccion, orden: cacheSecciones.size + 1 }
          });
        }
        seccionId = seccionDB.id;
        cacheSecciones.set(claveSeccion, seccionId);
      }

      await prisma.requisito.create({
        data: { seccionId, numero: numeroPunto, descripcion, opcionesExtra: opciones }
      });

      requisitosInsertados++;
    }

    return res.status(201).json({
      status: 'success',
      message: `¡Se procesaron y guardaron ${requisitosInsertados} requisitos en la base de datos.`
    });

  } catch (error) {
    console.error('Error procesando requisitos:', error);
    return res.status(500).json({ status: 'error', message: 'Fallo interno al procesar el Excel de requisitos.' });
  }
};