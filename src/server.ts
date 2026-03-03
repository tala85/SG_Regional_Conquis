import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet'; 
import rateLimit from 'express-rate-limit'; 
import dotenv from 'dotenv';
import path from 'path'; // <-- Lo movimos arriba

// ==========================================
// IMPORTACIÓN DE RUTAS Y MIDDLEWARES
// ==========================================
import claseRoutes from './routes/clase.routes';
import integranteRoutes from './routes/integrante.routes';
import usuarioRoutes from './routes/usuario.routes';
import clubRoutes from './routes/club.routes';
import authRoutes from './routes/auth.routes';
import reporteRoutes from './routes/reporte.routes';
import progresoRoutes from './routes/progreso.routes';
import requisitoRoutes from './routes/requisito.routes';
import dashboardRoutes from './routes/dashboard.routes'; // <-- Lo movimos arriba
import especialidadRoutes from './routes/especialidad.routes'; // <-- Lo movimos arriba
import auditRoutes from './routes/audit.routes'; // <-- Lo movimos arriba
import { auditoriaMiddleware } from './middlewares/audit.middleware'; // <-- Lo movimos arriba
import agendaRoutes from './routes/agenda.routes';

// Cargar variables de entorno (.env)
dotenv.config();

const app = express();

// ==========================================
// ZONA DE CIBERSEGURIDAD (HARDENING)
// ==========================================

// Escudo 1: Helmet protege las cabeceras HTTP de ataques XSS y Clickjacking
app.use(helmet());

// Escudo 2: Rate Limiting (Protección contra Fuerza Bruta y DoS)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Ventana de 15 minutos
  max: 100, // Límite de 100 peticiones por IP en esa ventana de tiempo
  message: { 
    status: 'error', 
    message: 'Demasiadas peticiones desde esta IP. El escudo de seguridad se activó. Intente de nuevo en 15 minutos.' 
  },
  standardHeaders: true, 
  legacyHeaders: false, 
});

// Aplicamos el limitador a TODAS las rutas que empiecen con /api
app.use('/api', limiter); 

app.use(cors());
app.use(express.json());

// Servir archivos estáticos (Las fotos de evidencia)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// --- SISTEMA DE AUDITORÍA (El Ojo que Todo lo Ve) ---
// Ahora sí, lo usamos DESPUÉS de haberlo importado arriba
app.use(auditoriaMiddleware);

// ==========================================
// RUTAS DE LA API
// ==========================================

// Ruta de prueba (Health Check)
app.get('/api/estado', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    mensaje: 'Servidor del SG Regional Conquistadores funcionando impecable. 🏕️'
  });
});

app.use('/api/dashboard', dashboardRoutes);
app.use('/api/clases', claseRoutes);
app.use('/api/integrantes', integranteRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/clubes', clubRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/reportes', reporteRoutes);
app.use('/api/progresos', progresoRoutes);
app.use('/api/requisitos', requisitoRoutes);
app.use('/api/especialidades', especialidadRoutes);
app.use('/api/auditoria', auditRoutes);
app.use('/api/agenda', agendaRoutes);

// ==========================================
// INICIO DEL SERVIDOR
// ==========================================
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs'; // <-- Ojo, fijate de tener importado bcrypt arriba

const prisma = new PrismaClient();

/// ==========================================
// 🚀 INICIALIZADOR DEL SISTEMA (SEEDER)
// ==========================================
const inicializarSistema = async () => {
  try {
    const cantidadUsuarios = await prisma.usuario.count();
    if (cantidadUsuarios === 0) {
      console.log('🌱 Base de datos vacía. Creando superusuario inicial...');
      const passwordHash = await bcrypt.hash('admin123', 10); 
      
      await prisma.usuario.create({
        data: {
          nombre: 'Comandante Regional',
          email: 'admin@conquis.com',
          password: passwordHash,
          rol: 'REGIONAL',
          pais: 'Argentina',
          provincia: 'Misiones',
          campoMision: 'Asociación Norte Argentina', 
          region: 'Región 1' 
        }
      });
      console.log('✅ Superusuario creado: admin@conquis.com | admin123');
    }

    // 👇 ACÁ ESTÁ LA MAGIA PARA LAS CLASES 👇
    const cantidadClases = await prisma.clase.count();
    if (cantidadClases === 0) {
      console.log('📚 Cargando Catálogo Oficial de Clases...');
      await prisma.clase.createMany({
        data: [
          { nombre: 'Amigo', tipo: 'REGULAR', color: '#3B82F6', edadSugerida: 10 },
          { nombre: 'Compañero', tipo: 'REGULAR', color: '#EF4444', edadSugerida: 11 },
          { nombre: 'Explorador', tipo: 'REGULAR', color: '#22C55E', edadSugerida: 12 },
          { nombre: 'Pionero', tipo: 'REGULAR', color: '#64748B', edadSugerida: 13 },
          { nombre: 'Excursionista', tipo: 'REGULAR', color: '#8B5CF6', edadSugerida: 14 },
          { nombre: 'Guía', tipo: 'REGULAR', color: '#EAB308', edadSugerida: 15 },
          { nombre: 'Amigo de la naturaleza', tipo: 'AVANZADA', color: '#3B82F6', edadSugerida: 10 },
          { nombre: 'Compañero de excurcionismo', tipo: 'AVANZADA', color: '#EF4444', edadSugerida: 11 },
          { nombre: 'Explorador de campo y de bosque', tipo: 'AVANZADA', color: '#22C55E', edadSugerida: 12 },
          { nombre: 'Pionero de nuevas fronteras', tipo: 'AVANZADA', color: '#64748B', edadSugerida: 13 },
          { nombre: 'Excursionista en el bosque', tipo: 'AVANZADA', color: '#8B5CF6', edadSugerida: 14 },
          { nombre: 'Guía de exploracion', tipo: 'AVANZADA', color: '#EAB308', edadSugerida: 15 },
          { nombre: 'Conquis+ N1', tipo: 'NIVEL_1', color: '#1E40AF', edadSugerida: 16 },
          { nombre: 'Conquis+ N2', tipo: 'NIVEL_2', color: '#581C87', edadSugerida: 17 },
          
        ]
      });
      console.log('✅ Catálogo de Clases inicializado.');
    }
  } catch (error) {
    console.error('⚠️ Error al inicializar el sistema:', error);
  }
};


// Ejecutamos la función antes de levantar el servidor
inicializarSistema();

// ==========================================
// INICIO DEL SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor blindado y corriendo en el puerto ${PORT}`);
});