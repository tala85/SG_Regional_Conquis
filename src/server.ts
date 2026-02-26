import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet'; // 1. Importamos Helmet
import rateLimit from 'express-rate-limit'; // 2. Importamos Rate Limiter
import dotenv from 'dotenv';
import claseRoutes from './routes/clase.routes';
import integranteRoutes from './routes/integrante.routes';
import usuarioRoutes from './routes/usuario.routes';
import clubRoutes from './routes/club.routes';
import authRoutes from './routes/auth.routes';
import reporteRoutes from './routes/reporte.routes';
import progresoRoutes from './routes/progreso.routes';
import requisitoRoutes from './routes/requisito.routes';

// Cargar variables de entorno (.env)
dotenv.config();

const app = express();


// --- ZONA DE CIBERSEGURIDAD (HARDENING) ---

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

// --- FIN ZONA DE SEGURIDAD ---

app.use(cors());
app.use(express.json());
import path from 'path'; // Arriba de todo en las importaciones

// ... más abajo, después de express.json()
// Servir archivos estáticos (Las fotos de evidencia)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Y agregamos la ruta del dashboard
import dashboardRoutes from './routes/dashboard.routes';
import especialidadRoutes from './routes/especialidad.routes';
import { auditoriaMiddleware } from './middlewares/audit.middleware';
import auditRoutes from './routes/audit.routes';
app.use('/api/dashboard', dashboardRoutes);

// --- SISTEMA DE AUDITORÍA ---
app.use(auditoriaMiddleware);

// ==========================================
// RUTAS
// ==========================================

// Ruta de prueba (Health Check) para saber si el servidor está vivo
app.get('/api/estado', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    mensaje: 'Servidor del SG Regional Conquistadores funcionando impecable. 🏕️'
  });
});
// Rutas de la API
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

// ==========================================
// INICIO DEL SERVIDOR
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor encendido y escuchando en http://localhost:${PORT}`);
    console.log(`🚀 Servidor blindado y corriendo en el puerto ${PORT}`);
});