import multer from 'multer';
import path from 'path';

// 1. Almacenamiento en RAM (Memory Storage): El archivo nunca toca el disco duro.
const storage = multer.memoryStorage();

// 2. Filtro de extensiones y tipos MIME
const fileFilter = (req: any, file: Express.Multer.File, cb: any) => {
  // Aceptamos solo extensiones clásicas de Excel
  const filetypes = /xlsx|xls/;
  
  // Verificamos la firma interna del archivo (MIME type)
  const mimetype = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                   file.mimetype === 'application/vnd.ms-excel';
                   
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true); // Luz verde, pasa el filtro
  }
  
  // Luz roja, lo rebotamos
  cb(new Error('Error de seguridad: El archivo debe ser un formato Excel válido (.xlsx o .xls)'));
};

// 3. Empaquetamos el middleware con un límite estricto de peso
export const uploadExcel = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // Límite de 5MB (suficiente para miles de filas de Excel)
});

import fs from 'fs';

// 1. Creamos la carpeta "uploads" si no existe (Ciberseguridad: evitar errores de pathing)
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 2. Configuramos el almacenamiento físico para imágenes
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Sanitización: Renombramos la foto con un código único para que no sobreescriba otras ni inyecte código
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, 'evidencia-' + uniqueSuffix + path.extname(file.originalname).toLowerCase());
  }
});

// 3. Empaquetamos el escudo para imágenes
export const uploadImagen = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Límite estricto de 5MB por foto
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Error de seguridad: Solo se permiten archivos de imagen (JPG, PNG).'));
    }
  }
});