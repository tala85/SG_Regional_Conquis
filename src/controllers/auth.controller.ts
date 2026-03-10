import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../config/db";
import { AuthRequest } from "../middlewares/auth.middleware";

// ==========================================
// REGISTRO DE USUARIO (Con Creación en Cascada)
// ==========================================
export const registrarUsuario = async (req: AuthRequest, res: Response) => {
  try {
    // 1. Recibimos solo lo necesario para el acceso digital
    const { email, password, nombre, rol, clubId, integranteId } = req.body;
    const creadorRol = req.usuario?.rol;

    // 2. Validaciones de Seguridad
    if (
      (rol === "REGIONAL" || rol === "SYSADMIN") &&
      creadorRol !== "SYSADMIN"
    ) {
      return res.status(403).json({
        status: "error",
        message: "No tenés permisos para crear este nivel de usuario.",
      });
    }

    const usuarioExistente = await prisma.usuario.findUnique({
      where: { email },
    });
    if (usuarioExistente)
      return res
        .status(400)
        .json({ status: "error", message: "El correo ya está registrado." });

    // 3. Hasheo de Password
    const salt = await bcrypt.genSalt(12);
    const passwordHasheada = await bcrypt.hash(password, salt);

    // 4. Lógica de asignación
    const rolFinal = rol || "DIRECTOR";
    // Si es REGIONAL no lleva clubId, si es DIRECTOR sí.
    const clubAsignado =
      rolFinal === "REGIONAL" || rolFinal === "SYSADMIN"
        ? null
        : clubId
          ? Number(clubId)
          : null;

    // 5. CREACIÓN DEL USUARIO (Directa, sin cascada)
    const nuevoUsuario = await prisma.usuario.create({
      data: {
        email,
        password: passwordHasheada,
        nombre: String(nombre), // El nombre que mandamos desde el select
        rol: rolFinal,
        clubId: clubAsignado,
        integranteId: integranteId ? Number(integranteId) : null, // El ID de la persona física
      },
    });

    return res.status(201).json({
      status: "success",
      message: "Acceso creado y vinculado correctamente.",
      data: { email: nuevoUsuario.email },
    });
  } catch (error) {
    console.error("Error en registro:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Fallo interno al crear el acceso." });
  }
};

// ==========================================
// LOGIN
// FIX: Se unificaron las dos funciones de login que existían
// (login y loginUsuario). Se eliminó el fallback inseguro
// 'super_secreto_desarrollo' en JWT_SECRET.
// ==========================================
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email y contraseña son requeridos.",
      });
    }

    // FIX DE SEGURIDAD: Usamos un mensaje genérico siempre.
    // Antes el sistema devolvía mensajes distintos para "usuario no encontrado"
    // vs "contraseña incorrecta", lo que permite a un atacante enumerar usuarios.
    const usuario = await prisma.usuario.findUnique({ where: { email } });
    if (!usuario) {
      return res
        .status(401)
        .json({ status: "error", message: "Credenciales incorrectas." });
    }

    const passwordValida = await bcrypt.compare(password, usuario.password);
    if (!passwordValida) {
      return res
        .status(401)
        .json({ status: "error", message: "Credenciales incorrectas." });
    }

    // FIX CRÍTICO: Se eliminó el fallback 'super_secreto_desarrollo'.
    // Si JWT_SECRET no está definido en .env, el servidor debe fallar aquí
    // y no silenciosamente usar una clave débil conocida.
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error(
        "FATAL: JWT_SECRET no está definido en las variables de entorno.",
      );
      return res.status(500).json({
        status: "error",
        message: "Error de configuración del servidor.",
      });
    }

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol, clubId: usuario.clubId },
      secret,
      { expiresIn: "8h" },
    );

    return res.status(200).json({
      status: "success",
      message: "Acceso autorizado.",
      token,
      usuario: {
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol,
      },
    });
  } catch (error) {
    console.error("Error en login:", error);
    return res.status(500).json({
      status: "error",
      message: "Error interno en el servidor de autenticación.",
    });
  }
};

// ==========================================
// ACTUALIZAR USUARIO (Perfil, Password y Región)
// ==========================================
export const actualizarUsuario = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const targetId = Number(id);
    const { nombre, email, rol, clubId, password, regionId } = req.body;

    const operarioId = req.usuario?.id;
    const esSysadmin = req.usuario?.rol === "SYSADMIN";

    // 🛡️ 1. CORTAFUEGOS ANTI-BOLA/IDOR CRÍTICO:
    // Si NO sos SYSADMIN, solo podés editar TU PROPIO perfil.
    if (!esSysadmin && targetId !== operarioId) {
      console.warn(
        `🛑 INTRUSIÓN: Usuario ${operarioId} intentó secuestrar/modificar la cuenta ${targetId}`,
      );
      return res.status(403).json({
        status: "error",
        message: "Brecha de seguridad: Solo podés modificar tu propio perfil.",
      });
    }

    if (!nombre || !email || !rol) {
      return res.status(400).json({
        status: "error",
        message: "Nombre, email y rol son obligatorios.",
      });
    }

    // Buscamos el perfil actual en la BD para comparar y verificar existencia
    const perfilActual = await prisma.usuario.findUnique({
      where: { id: targetId },
    });

    if (!perfilActual) {
      return res
        .status(404)
        .json({
          status: "error",
          message: "Usuario no encontrado en el sistema.",
        });
    }

    // 🛡️ 2. PREVENCIÓN DE ESCALADA DE PRIVILEGIOS:
    // Si sos Sysadmin, tomamos lo que mandaste. Si no, forzamos a que mantengas lo que ya tenías en BD.
    const rolFinal = esSysadmin ? rol : perfilActual.rol;

    // Lógica de Club y Región dependiendo del rol final (blindada)
    let clubFinal = perfilActual.clubId;
    let regionFinal = perfilActual.regionId;

    if (esSysadmin) {
      // Solo el Sysadmin puede reasignar clubes y regiones
      clubFinal =
        rolFinal === "REGIONAL" || rolFinal === "SYSADMIN"
          ? null
          : clubId
            ? Number(clubId)
            : null;
      regionFinal =
        rolFinal === "REGIONAL" && regionId ? Number(regionId) : null;
    }

    // Preparamos los datos base a actualizar, sanitizados
    const datosActualizar: any = {
      nombre: String(nombre).trim(),
      email: String(email).trim().toLowerCase(), // Sanitización estándar
      rol: rolFinal,
      clubId: clubFinal,
      regionId: regionFinal,
    };

    // 🛡️ 3. BARRERA DE CRIPTOGRAFÍA: Si mandaron password nueva, la procesamos
    if (password && password.trim() !== "") {
      if (password.length < 8) {
        return res.status(400).json({
          status: "error",
          message: "La nueva contraseña debe tener al menos 8 caracteres.",
        });
      }
      const salt = await bcrypt.genSalt(12);
      datosActualizar.password = await bcrypt.hash(password, salt);
    }

    await prisma.usuario.update({
      where: { id: targetId },
      data: datosActualizar,
    });

    return res
      .status(200)
      .json({ status: "success", message: "Perfil actualizado con éxito." });
  } catch (error) {
    console.error("Error actualizando usuario:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Error al actualizar el perfil." });
  }
};

// ==========================================
// OBTENER LISTA DE USUARIOS (Con Aislamiento RBAC Avanzado)
// ==========================================
export const obtenerUsuarios = async (req: AuthRequest, res: Response) => {
  try {
    const rolUsuario = req.usuario?.rol;
    const miUsuarioId = req.usuario?.id;

    let filtro: any = {}; // Por defecto, SYSADMIN ve a todos

    if (rolUsuario === "DIRECTOR") {
      filtro = { id: miUsuarioId };
    } else if (rolUsuario === "REGIONAL") {
      // 🛡️ BARRERA CORREGIDA: Buscamos qué zona tiene este Regional
      const miPerfil = await prisma.usuario.findUnique({
        where: { id: Number(miUsuarioId) },
      });

      // Buscamos todos los clubes de ESA zona
      const misClubes = await prisma.club.findMany({
        where: { regionId: miPerfil?.regionId || -1 },
      });
      const misClubesIds = misClubes.map((c) => c.id);

      // Le mostramos su propio perfil (id) y los directores que tengan clubId dentro de su zona
      filtro = {
        OR: [{ id: miUsuarioId }, { clubId: { in: misClubesIds } }],
      };
    }

    const usuarios = await prisma.usuario.findMany({
      where: filtro,
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        clubId: true,
        regionId: true,
        region: { select: { nombre: true } },
      },
      orderBy: { rol: "desc" },
    });

    const clubes = await prisma.club.findMany();

    const data = usuarios.map((u) => ({
      ...u,
      club: clubes.find((c) => c.id === u.clubId) || null,
    }));

    return res.status(200).json({ status: "success", data });
  } catch (error) {
    console.error("Error obteniendo usuarios:", error);
    return res
      .status(500)
      .json({ status: "error", message: "Error al obtener usuarios." });
  }
};

// ==========================================
// ELIMINAR USUARIO (Solo Sysadmin)
// ==========================================
export const eliminarUsuario = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (req.usuario?.rol !== "SYSADMIN")
      return res.status(403).json({ message: "No tenés permiso" });

    await prisma.usuario.delete({ where: { id: Number(id) } });
    res.json({ status: "success", message: "Usuario eliminado" });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Error al eliminar" });
  }
};

// ==========================================
// RESETEAR PASSWORD (A una genérica: Conquis2026)
// ==========================================
export const resetearPassword = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    if (req.usuario?.rol !== "SYSADMIN")
      return res.status(403).json({ message: "No tenés permiso" });

    const salt = await bcrypt.genSalt(12);
    const passwordDefault = await bcrypt.hash("Conquis2026", salt);

    await prisma.usuario.update({
      where: { id: Number(id) },
      data: { password: passwordDefault },
    });

    res.json({
      status: "success",
      message: "Contraseña reseteada a: Conquis2026",
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: "Error al resetear" });
  }
};
