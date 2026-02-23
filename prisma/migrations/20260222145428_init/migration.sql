-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('REGIONAL', 'DIRECTOR');

-- CreateEnum
CREATE TYPE "TipoClase" AS ENUM ('REGULAR', 'AVANZADA', 'LIDERAZGO');

-- CreateEnum
CREATE TYPE "EstadoClase" AS ENUM ('EN_CURSO', 'CONDICIONAL_85', 'HONORES_100', 'INVESTIDO');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "division" TEXT NOT NULL DEFAULT 'DSA',
    "pais" TEXT NOT NULL,
    "provincia" TEXT NOT NULL,
    "campoMision" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "permiteInvestiduraCondicional" BOOLEAN NOT NULL DEFAULT true,
    "porcentajeCondicional" INTEGER NOT NULL DEFAULT 85,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Club" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "iglesia" TEXT NOT NULL,
    "distrito" TEXT NOT NULL,
    "regionalId" INTEGER NOT NULL,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Integrante" (
    "id" SERIAL NOT NULL,
    "clubId" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "fechaNacimiento" TIMESTAMP(3) NOT NULL,
    "funcion" TEXT NOT NULL,

    CONSTRAINT "Integrante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clase" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoClase" NOT NULL,
    "color" TEXT NOT NULL,
    "edadSugerida" INTEGER NOT NULL,

    CONSTRAINT "Clase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeccionRequisito" (
    "id" SERIAL NOT NULL,
    "claseId" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,

    CONSTRAINT "SeccionRequisito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Requisito" (
    "id" SERIAL NOT NULL,
    "seccionId" INTEGER NOT NULL,
    "descripcion" TEXT NOT NULL,
    "esSubRequisito" BOOLEAN NOT NULL DEFAULT false,
    "requisitoPadreId" INTEGER,
    "requiereFoto" BOOLEAN NOT NULL DEFAULT false,
    "grupoOpcionalId" TEXT,

    CONSTRAINT "Requisito_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegranteClase" (
    "id" SERIAL NOT NULL,
    "integranteId" INTEGER NOT NULL,
    "claseId" INTEGER NOT NULL,
    "estado" "EstadoClase" NOT NULL,
    "isExternalAgrupada" BOOLEAN NOT NULL DEFAULT false,
    "fechaInicio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegranteClase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Progreso" (
    "id" SERIAL NOT NULL,
    "integranteId" INTEGER NOT NULL,
    "requisitoId" INTEGER NOT NULL,
    "evaluadorId" INTEGER NOT NULL,
    "fechaAprobacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "urlFotoRespaldo" TEXT,

    CONSTRAINT "Progreso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- AddForeignKey
ALTER TABLE "Club" ADD CONSTRAINT "Club_regionalId_fkey" FOREIGN KEY ("regionalId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Integrante" ADD CONSTRAINT "Integrante_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeccionRequisito" ADD CONSTRAINT "SeccionRequisito_claseId_fkey" FOREIGN KEY ("claseId") REFERENCES "Clase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisito" ADD CONSTRAINT "Requisito_seccionId_fkey" FOREIGN KEY ("seccionId") REFERENCES "SeccionRequisito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisito" ADD CONSTRAINT "Requisito_requisitoPadreId_fkey" FOREIGN KEY ("requisitoPadreId") REFERENCES "Requisito"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegranteClase" ADD CONSTRAINT "IntegranteClase_integranteId_fkey" FOREIGN KEY ("integranteId") REFERENCES "Integrante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntegranteClase" ADD CONSTRAINT "IntegranteClase_claseId_fkey" FOREIGN KEY ("claseId") REFERENCES "Clase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progreso" ADD CONSTRAINT "Progreso_integranteId_fkey" FOREIGN KEY ("integranteId") REFERENCES "Integrante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progreso" ADD CONSTRAINT "Progreso_requisitoId_fkey" FOREIGN KEY ("requisitoId") REFERENCES "Requisito"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Progreso" ADD CONSTRAINT "Progreso_evaluadorId_fkey" FOREIGN KEY ("evaluadorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
