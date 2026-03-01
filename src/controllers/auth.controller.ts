import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';

// 1. REGISTRO SEGURO (Hasheando la contraseña)
export const registrarUsuario = async (req: Request, res: Response) => {
  try {
    // Agregamos clubId a lo que recibimos del body
    const { email, password, nombre, rol, clubId, pais = 'Argentina', provincia = 'Misiones', campoMision = 'Asociación Norte Argentina', region = 'Región' } = req.body;

    const usuarioExistente = await prisma.usuario.findUnique({ where: { email } });
    if (usuarioExistente) return res.status(400).json({ status: 'error', message: 'El correo ya está en uso.' });

    const salt = await bcrypt.genSalt(10);
    const passwordHasheada = await bcrypt.hash(password, salt);

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        email, password: passwordHasheada, nombre,
        rol: rol || 'DIRECTOR',
        clubId: clubId ? Number(clubId) : null, // <-- LO GUARDAMOS ACÁ
        pais, provincia, campoMision, region
      }
    });

    return res.status(201).json({ status: 'success', message: 'Usuario creado.', data: { email: nuevoUsuario.email } });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Fallo al registrar usuario.' });
  }
};

// 2. LOGIN (Verificando hash y generando Token)
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // A. Buscamos al usuario por su email
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) {
      return res.status(404).json({ status: 'error', message: 'Usuario no encontrado.' });
    }

    // B. Comparamos la contraseña en texto plano con el hash de la base de datos
    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res.status(401).json({ status: 'error', message: 'Contraseña incorrecta.' });
    }

    // C. Generamos el Token de acceso (JWT)
    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol }, // Payload (Datos útiles)
      process.env.JWT_SECRET as string,     // Firma
      { expiresIn: '8h' }                   // Tiempo de vida del token
    );

    return res.status(200).json({
      status: 'success',
      token: token,
      usuario: { nombre: usuario.nombre, rol: usuario.rol }
    });

  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Error en el login.' });
  }
};

// NUEVO: SISTEMA DE LOGIN (CIBERSEGURIDAD)
export const loginUsuario = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 1. Buscamos si el correo existe
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) {
      return res.status(401).json({ status: 'error', message: 'Credenciales incorrectas.' });
    }

    // 2. Comparamos la contraseña encriptada (Ciberseguridad)
    const passValida = await bcrypt.compare(password, usuario.password);
    if (!passValida) {
      return res.status(401).json({ status: 'error', message: 'Credenciales incorrectas.' });
    }

    // 3. Generamos el pase de entrada (Token) válido por 8 horas
    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol }, 
      process.env.JWT_SECRET || 'super_secreto_desarrollo', 
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      status: 'success',
      message: 'Acceso autorizado.',
      token,
      data: { nombre: usuario.nombre, email: usuario.email, rol: usuario.rol }
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ status: 'error', message: 'Fallo interno en el servidor de autenticación.' });
  }
};