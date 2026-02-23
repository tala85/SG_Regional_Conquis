import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';

// 1. REGISTRO SEGURO (Hasheando la contraseña)
export const registrarUsuario = async (req: Request, res: Response) => {
  try {
    const { nombre, email, password, rol, pais, provincia, campoMision, region } = req.body;

    // Generamos la sal y encriptamos la contraseña
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const nuevoUsuario = await prisma.usuario.create({
      data: {
        nombre, email, rol, pais, provincia, campoMision, region,
        password: hashedPassword // Guardamos el hash, NUNCA el texto plano
      }
    });

    return res.status(201).json({ status: 'success', message: 'Usuario registrado seguro.' });
  } catch (error) {
    return res.status(500).json({ status: 'error', message: 'Error al registrar usuario.' });
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