import { PrismaClient, TipoClase } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Limpiamos la tabla por si ya había algo cargado
  await prisma.clase.deleteMany();

  const clases = [
    // CLASES REGULARES
    { nombre: 'Amigo', tipo: TipoClase.REGULAR, color: 'Azul', edadSugerida: 10 },
    { nombre: 'Compañero', tipo: TipoClase.REGULAR, color: 'Rojo', edadSugerida: 11 },
    { nombre: 'Explorador', tipo: TipoClase.REGULAR, color: 'Verde', edadSugerida: 12 },
    { nombre: 'Pionero', tipo: TipoClase.REGULAR, color: 'Gris', edadSugerida: 13 },
    { nombre: 'Excursionista', tipo: TipoClase.REGULAR, color: 'Violeta', edadSugerida: 14 },
    { nombre: 'Guía', tipo: TipoClase.REGULAR, color: 'Amarillo', edadSugerida: 15 },
    
    // CLASES AVANZADAS
    { nombre: 'Amigo de la naturaleza', tipo: TipoClase.AVANZADA, color: 'Azul', edadSugerida: 10 },
    { nombre: 'Compañero de Excursionista', tipo: TipoClase.AVANZADA, color: 'Rojo', edadSugerida: 11 },
    { nombre: 'Explorador de campo y de bosque', tipo: TipoClase.AVANZADA, color: 'Verde', edadSugerida: 12 },
    { nombre: 'Pionero de nuevas fronteras', tipo: TipoClase.AVANZADA, color: 'Gris', edadSugerida: 13 },
    { nombre: 'Excursionista en el bosque', tipo: TipoClase.AVANZADA, color: 'Violeta', edadSugerida: 14 },
    { nombre: 'Guía de exploración', tipo: TipoClase.AVANZADA, color: 'Amarillo', edadSugerida: 15 },

    // CLASES DE LIDERAZGO
    { nombre: 'Guía Mayor', tipo: TipoClase.LIDERAZGO, color: 'Multicolor', edadSugerida: 16 },
    { nombre: 'Guía Mayor Máster', tipo: TipoClase.LIDERAZGO, color: 'Multicolor', edadSugerida: 16 },
    { nombre: 'Guía Mayor Máster Avanzado', tipo: TipoClase.LIDERAZGO, color: 'Multicolor', edadSugerida: 16 },
  ];

  await prisma.clase.createMany({
    data: clases,
  });

  console.log('🌱 Clases de la DSA sembradas con éxito en la base de datos.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });