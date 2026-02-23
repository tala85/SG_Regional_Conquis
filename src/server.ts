import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import claseRoutes from './routes/clase.routes';
import integranteRoutes from './routes/integrante.routes';
import usuarioRoutes from './routes/usuario.routes';
import clubRoutes from './routes/club.routes';
import authRoutes from './routes/auth.routes';
import progresoRoutes from './routes/progreso.routes';

// Cargar variables de entorno (.env)
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARES (Nuestra primera línea de defensa)
// ==========================================

// Helmet securiza las cabeceras HTTP (oculta que usamos Express, previene XSS, etc.)
app.use(helmet()); 

// CORS permite que tu futuro frontend se conecte sin bloqueos
app.use(cors()); 

// Permite que el servidor entienda datos en formato JSON
app.use(express.json()); 

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
app.use('/api/progreso', progresoRoutes);

// ==========================================
// INICIO DEL SERVIDOR
// ==========================================
app.listen(PORT, () => {
  console.log(`🚀 Servidor encendido y escuchando en http://localhost:${PORT}`);
  console.log(`🛡️  Seguridad base (Helmet & CORS) activada.`);
});