import { useEffect, useState, type FormEvent } from "react";
import api from "./config/axios.config.ts";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import Papa from "papaparse";
import Mensajeria from "./components/Mensajeria";
import { mensajeService } from "./services/mensaje.service.ts";

// --- INTERFACES ---
interface Integrante {
  id: number;
  nombre: string;
  apellido: string;
  xp: number;
  funcion: string;
  avatarUrl?: string;
  club: { nombre: string };
  clase?: { nombre: string };
  claseId?: number;
}

interface IntegranteFisico {
  id: number;
  nombre: string;
  apellido: string;
  dni: number;
  clubId: number;
}

interface EspecialidadGanada {
  id: number;
  fechaAprobacion: string;
  especialidad: { nombre: string; categoria: string; colorFondo: string };
}
interface MaestriaGanada {
  id: number;
  fechaAprobacion: string;
  maestria: { nombre: string; requisitos: string };
}
interface BandaVirtual {
  totalEspecialidades: number;
  especialidades: EspecialidadGanada[];
  totalMaestrias: number;
  maestrias: MaestriaGanada[];
}
interface RequisitoPendiente {
  id: number;
  numero: string;
  descripcion: string;
  seccion: string;
  esEspecialidad: boolean;
  puntosXp: number;
  opcionesExtra?: string;
}
interface LogAuditoria {
  id: number;
  metodo: string;
  ruta: string;
  ip: string;
  fecha: string;
  usuario?: { nombre: string; email: string };
}
interface MaestriaCatalogo {
  id: number;
  nombre: string;
  requisitos: string;
}
interface Metricas {
  totalIntegrantes: number;
  totalInvestidos: number;
  topXP: string;
  porcentaje: number;
}
interface OpcionLista {
  id: string | number;
  nombre: string;
  activo?: boolean;
  iglesia?: string;
  regionId?: string | number | null;
}

// ✅ URL base del backend para construir rutas de imágenes (avatares)
// Lee la variable de entorno, si no existe usa localhost como fallback
const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

function App() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("tokenConquis"),
  );
  const [mostrarPass, setMostrarPass] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPass, setLoginPass] = useState("");
  const [errorLogin, setErrorLogin] = useState("");
  const [mensajesSinLeer, setMensajesSinLeer] = useState(0);
  const [vista, setVista] = useState<
    | "dashboard"
    | "directorio"
    | "perfil"
    | "auditoria"
    | "gestion"
    | "agenda"
    | "mensajes"
  >("dashboard");
  const [eventosAgenda, setEventosAgenda] = useState<any[]>([]);
  const [nuevoEvento, setNuevoEvento] = useState({
    titulo: "",
    descripcion: "",
    fecha: "",
    clubId: "",
  });
  const [ranking, setRanking] = useState<Integrante[]>([]);
  const [directorio, setDirectorio] = useState<Integrante[]>([]);
  const [clubSeleccionadoDirectorio, setClubSeleccionadoDirectorio] =
    useState<string>("");
  const [logsAuditoria, setLogsAuditoria] = useState<LogAuditoria[]>([]);
  const [filtroAudit, setFiltroAudit] = useState("");
  const [metricas, setMetricas] = useState<Metricas>({
    totalIntegrantes: 0,
    totalInvestidos: 0,
    topXP: "-",
    porcentaje: 0,
  });
  const [catalogoMaestrias, setCatalogoMaestrias] = useState<
    MaestriaCatalogo[]
  >([]);
  const [catalogoEspecialidades, setCatalogoEspecialidades] = useState<any[]>(
    [],
  );
  const [clubesDisponibles, setClubesDisponibles] = useState<OpcionLista[]>([]);
  const [clasesDisponibles, setClasesDisponibles] = useState<OpcionLista[]>([]);
  const [listaDirectores, setListaDirectores] = useState<any[]>([]);
  const [listaIntegrantes, setListaIntegrantes] = useState<IntegranteFisico[]>(
    [],
  ); // 🛡️ Memoria global para vincular identidades (IAM)
  const [modoEdicion, setModoEdicion] = useState(false);
  const [datosEdicion, setDatosEdicion] = useState({
    nombre: "",
    apellido: "",
    funcion: "",
    claseId: "",
  });
  const [opcionesMultiples, setOpcionesMultiples] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [dirEditando, setDirEditando] = useState<any>(null);
  const [integranteSeleccionado, setIntegranteSeleccionado] =
    useState<Integrante | null>(null);
  const [bandaVirtual, setBandaVirtual] = useState<BandaVirtual | null>(null);
  const [requisitosPendientes, setRequisitosPendientes] = useState<
    RequisitoPendiente[]
  >([]);
  const [estadisticasClase, setEstadisticasClase] = useState({
    total: 0,
    aprobados: 0,
    porcentaje: 0,
    clase: "",
  });
  const [mostrarFormFirma, setMostrarFormFirma] = useState(false);
  const [reqId, setReqId] = useState("");
  const [espElegidaId, setEspElegidaId] = useState("");
  const [fotoRespaldo, setFotoRespaldo] = useState<File | null>(null);
  const [maestriaAOtorgarId, setMaestriaAOtorgarId] = useState("");
  const [opcionSeleccionada, setOpcionSeleccionada] = useState<string>("");
  const [altaConqui, setAltaConqui] = useState({
    dni: "",
    nombre: "",
    apellido: "",
    fechaNacimiento: "",
    funcion: "CONQUISTADOR",
    claseId: "",
    clubId: "",
  });
  const [altaDir, setAltaDir] = useState({
    nombre: "",
    apellido: "",
    dni: "",
    fechaNacimiento: "", // Datos físicos
    email: "",
    password: "",
    rol: "DIRECTOR",
    clubId: "",
    integranteId: "",
    crearFisico: true, // Este interruptor decide qué hacemos
  });
  const [altaClub, setAltaClub] = useState({
    nombre: "",
    iglesia: "",
    distrito: "",
    regionId: "",
  });
  const [altaRegion, setAltaRegion] = useState({ nombre: "" });
  const [regionesDisponibles, setRegionesDisponibles] = useState<any[]>([]);
  const [clubEditando, setClubEditando] = useState<any>(null);

  // ✅ El interceptor de axios.config.ts ya inyecta el token automáticamente.
  // Solo necesitamos recargar datos cuando el token cambia.
  useEffect(() => {
    if (token) {
      cargarCatalogoMaestrias();
      cargarRankingYMetricas();
      cargarCatalogosFormularios();
      chequearMensajesNuevos();
    }
  }, [token, vista]);

  // =============================================
  // AUTH
  // =============================================
  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setErrorLogin("");
    try {
      // ✅ ANTES: axios.post('http://localhost:3000/api/auth/login', ...)
      // ✅ AHORA: api.post('/api/auth/login', ...)  — sin URL hardcodeada
      const res = await api.post("/api/auth/login", {
        email: loginEmail,
        password: loginPass,
      });
      const rolRecibido = res.data.data?.rol || res.data.usuario?.rol;
      localStorage.setItem("rolConquis", rolRecibido);
      localStorage.setItem("tokenConquis", res.data.token);
      setToken(res.data.token);
    } catch (error: any) {
      setErrorLogin(error.response?.data?.message || "Error de conexión.");
    }
  };

  const cerrarSesion = () => {
    localStorage.removeItem("tokenConquis");
    localStorage.removeItem("rolConquis");
    setToken(null);
    setVista("dashboard");
  };

  // =============================================
  // CARGA DE DATOS
  // =============================================
  const cargarRankingYMetricas = () => {
    setCargando(true);
    // ✅ Todos los api.get() ya no llevan 'http://localhost:3000'
    api
      .get("/api/integrantes/ranking")
      .then((res) => setRanking(res.data.data))
      .catch(console.error);
    api
      .get("/api/integrantes/metricas")
      .then((res) => setMetricas(res.data.data))
      .catch(console.error)
      .finally(() => setCargando(false));
  };

  const cargarCatalogoMaestrias = () => {
    api
      .get("/api/especialidades/maestrias")
      .then((res) => setCatalogoMaestrias(res.data.data))
      .catch(console.error);
  };

  const cargarCatalogosFormularios = () => {
    api
      .get("/api/integrantes/clubes/lista")
      .then((res) => {
        setClubesDisponibles(res.data.data);
        if (res.data.data.length > 0)
          setClubSeleccionadoDirectorio(res.data.data[0].id.toString());
      })
      .catch(console.error);
    api
      .get("/api/integrantes/clases/lista")
      .then((res) => setClasesDisponibles(res.data.data))
      .catch(console.error);
    api
      .get("/api/especialidades")
      .then((res) => setCatalogoEspecialidades(res.data.data))
      .catch(console.error);
    api
      .get("/api/auth/usuarios")
      .then((res) => setListaDirectores(res.data.data))
      .catch(console.error);
    api
      .get("/api/clubes/regiones")
      .then((res) => setRegionesDisponibles(res.data.data))
      .catch(console.error);
  };

  const cargarAuditoria = async () => {
    try {
      const respuesta = await api.get("/api/auditoria");
      setLogsAuditoria(respuesta.data.data);
    } catch (error) {
      console.error("Error cargando bitácora:", error);
    }
  };

  const chequearMensajesNuevos = async () => {
    try {
      const bandeja = await mensajeService.obtenerBandejaEntrada();
      // Filtramos y contamos cuántos tienen el campo 'leido' en false
      const cantidadSinLeer = bandeja.filter((msg) => !msg.leido).length;
      setMensajesSinLeer(cantidadSinLeer);
    } catch (error) {
      console.error("No se pudo obtener el contador de mensajes");
    }
  };

  // Función para descontar manualmente el globo rojo
  const descontarNotificacion = () => {
    setMensajesSinLeer((prev) => Math.max(0, prev - 1));
  };

  // =============================================
  // AGENDA
  // =============================================
  const cargarAgenda = async () => {
    try {
      const res = await api.get("/api/agenda");
      setEventosAgenda(res.data.data);
    } catch (error) {
      console.error("Error cargando agenda", error);
    }
  };

  const handleCrearEvento = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/agenda", nuevoEvento);
      alert("📅 Evento agendado con éxito.");
      setNuevoEvento({ titulo: "", descripcion: "", fecha: "", clubId: "" });
      cargarAgenda();
    } catch (error: any) {
      alert(`Error al agendar: ${error.response?.data?.message}`);
    }
  };

  const handleEliminarEvento = async (id: number) => {
    if (
      window.confirm("⚠️ ¿Estás seguro de que querés eliminar este evento?")
    ) {
      try {
        await api.delete(`/api/agenda/${id}`);
        cargarAgenda();
      } catch (error: any) {
        alert(`Error al eliminar: ${error.response?.data?.message}`);
      }
    }
  };

  const handleBackupSeguridad = () => {
    alert(
      "Iniciando volcado de Base de Datos cifrada... (Módulo en construcción para la Fase 4)",
    );
  };

  // =============================================
  // CONTROLADOR DE VISTAS
  // =============================================
  useEffect(() => {
    if (vista === "directorio" && clubSeleccionadoDirectorio) {
      setCargando(true);
      api
        .get(`/api/integrantes/club/${clubSeleccionadoDirectorio}?limit=100`)
        .then((res) => setDirectorio(res.data.data))
        .catch(console.error)
        .finally(() => setCargando(false));
    }
    if (vista === "auditoria") cargarAuditoria();
    if (vista === "agenda") cargarAgenda();
  }, [vista, clubSeleccionadoDirectorio]);

  // =============================================
  // PERFIL E INTEGRANTE
  // =============================================
  const verPerfil = async (integrante: Integrante) => {
    setIntegranteSeleccionado(integrante);
    setVista("perfil");
    setBandaVirtual(null);
    setMostrarFormFirma(false);

    // 1. Cargar Banda Virtual (Independiente de la clase)
    try {
      const resBanda = await api.get(
        `/api/integrantes/${integrante.id}/banda-virtual`,
      );
      setBandaVirtual(resBanda.data.data);
    } catch (error) {
      console.error("Error al cargar la banda virtual:", error);
    }

    // 2. Cargar Progresos y Estadísticas (Depende de si tiene clase)
    try {
      const [resPendientes, resStats] = await Promise.all([
        api.get(`/api/progresos/integrante/${integrante.id}/pendientes`),
        api.get(`/api/progresos/integrante/${integrante.id}/estadisticas`),
      ]);
      setRequisitosPendientes(resPendientes.data.data);
      setEstadisticasClase(resStats.data.data);
    } catch (error: any) {
      // Si el backend nos responde 400, significa que no hay clase asignada (es nuestra regla de negocio)
      if (error.response?.status === 400) {
        console.warn(`El integrante no tiene clase asignada todavía.`);
        setRequisitosPendientes([]); // Vaciamos la lista para que no rompa el mapeo
        setEstadisticasClase({
          total: 0,
          aprobados: 0,
          porcentaje: 0,
          clase: "Sin Clase",
        });
      } else {
        console.error("Error al cargar los progresos:", error);
      }
    }
  };

  const handleSubirAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (
      !integranteSeleccionado ||
      !e.target.files ||
      e.target.files.length === 0
    )
      return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("foto", file);
    try {
      const res = await api.post(
        `/api/integrantes/${integranteSeleccionado.id}/avatar`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      alert("Foto de perfil actualizada.");
      verPerfil({
        ...integranteSeleccionado,
        avatarUrl: res.data.data.avatarUrl,
      });
    } catch (error: any) {
      alert(`Error al subir foto: ${error.response?.data?.message}`);
    }
  };

  const handleFirmarRequisito = async (e: FormEvent) => {
    e.preventDefault();
    if (!integranteSeleccionado || !reqId) return;

    const reqActivo = requisitosPendientes.find(
      (r) => r.id.toString() === reqId,
    );

    if (reqActivo?.opcionesExtra?.startsWith("CHECKBOX:")) {
      const cantidadRequerida = parseInt(
        reqActivo.opcionesExtra.split(":")[1],
        10,
      );
      if (opcionesMultiples.length < cantidadRequerida) {
        alert(
          `Debés tildar al menos ${cantidadRequerida} opciones para cumplir este requisito.`,
        );
        return;
      }
    }

    const formData = new FormData();
    formData.append("integranteId", integranteSeleccionado.id.toString());
    formData.append("requisitoId", reqId);
    if (espElegidaId) formData.append("especialidadElegidaId", espElegidaId);
    if (fotoRespaldo) formData.append("foto", fotoRespaldo);
    if (opcionSeleccionada) formData.append("notas", opcionSeleccionada);
    if (opcionesMultiples.length > 0)
      formData.append("notas", opcionesMultiples.join(" | "));

    try {
      const res = await api.post("/api/progresos/firmar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert(`¡Éxito! ${res.data.message}`);
      setReqId("");
      setEspElegidaId("");
      setFotoRespaldo(null);
      setMostrarFormFirma(false);
      verPerfil(integranteSeleccionado);
    } catch (error: any) {
      alert(`Error al firmar: ${error.response?.data?.message}`);
    }
  };

  const handleOtorgarMaestria = async (e: FormEvent) => {
    e.preventDefault();
    if (!integranteSeleccionado || !maestriaAOtorgarId) return;
    try {
      await api.post("/api/especialidades/maestria/otorgar", {
        integranteId: integranteSeleccionado.id,
        maestriaId: maestriaAOtorgarId,
      });
      alert("¡Maestría otorgada con honor!");
      setMaestriaAOtorgarId("");
      verPerfil(integranteSeleccionado);
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.message}`);
    }
  };

  const handleEliminarIntegrante = async () => {
    if (!integranteSeleccionado) return;

    const confirmacion = window.confirm(
      `⚠️ ADVERTENCIA ⚠️\n¿Eliminar a ${integranteSeleccionado.nombre} ${integranteSeleccionado.apellido} de forma IRREVERSIBLE?`,
    );

    if (confirmacion) {
      try {
        await api.delete(`/api/integrantes/${integranteSeleccionado.id}`);
        alert("Integrante dado de baja correctamente.");

        // 1. Limpiamos la lista "directorio" para no recargar la pantalla
        setDirectorio((prevDirectorio) =>
          prevDirectorio.filter((int) => int.id !== integranteSeleccionado.id),
        );

        // 2. Limpiamos la memoria del seleccionado
        setIntegranteSeleccionado(null);

        // 3. Volvemos a la vista "directorio" (¡Con comillas!)
        setVista("directorio");
      } catch (error: any) {
        const mensajeError =
          error.response?.data?.message ||
          "Ocurrió un error de conexión con el servidor.";
        alert(`Error al eliminar: ${mensajeError}`);
      }
    }
  };

  const guardarEdicionIntegrante = async (e: FormEvent) => {
    e.preventDefault();
    if (!integranteSeleccionado) return;
    try {
      const res = await api.put(
        `/api/integrantes/${integranteSeleccionado.id}`,
        datosEdicion,
      );
      alert("¡Expediente actualizado!");
      setModoEdicion(false);
      verPerfil(res.data.data);
    } catch (error) {
      alert("Error al editar el expediente.");
    }
  };

  const abrirPanelEdicion = () => {
    setDatosEdicion({
      nombre: integranteSeleccionado?.nombre || "",
      apellido: integranteSeleccionado?.apellido || "",
      funcion: integranteSeleccionado?.funcion || "",
      claseId: integranteSeleccionado?.claseId?.toString() || "",
    });
    setModoEdicion(true);
  };

  const handleImprimirExpediente = () => {
    window.print();
  };

  const cambiarEstadoClub = async (id: number | string) => {
    if (
      window.confirm(
        "¿Seguro que querés cambiar el estado de este club? (Los inactivos no aparecerán en los formularios).",
      )
    ) {
      try {
        await api.put(`/api/clubes/${id}/estado`);
        cargarCatalogosFormularios(); // Recargamos todo para actualizar la vista
      } catch (e) {
        alert("Error al cambiar el estado del club.");
      }
    }
  };

  // =============================================
  // ALTAS (Conquistador, Director, Club)
  // =============================================
  const handleAltaConquistador = async (e: FormEvent) => {
    e.preventDefault();
    if (!altaConqui.clubId) {
      alert("Debes seleccionar un club.");
      return;
    }
    try {
      await api.post("/api/integrantes", altaConqui);
      alert("¡Integrante alistado exitosamente!");
      setAltaConqui({
        dni: "",
        nombre: "",
        apellido: "",
        fechaNacimiento: "",
        funcion: "CONQUISTADOR",
        claseId: "",
        clubId: "",
      });
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.message}`);
    }
  };

  const handleAltaDirector = async (e: FormEvent) => {
    e.preventDefault();

    // 🛡️ NUEVA VALIDACIÓN INTELIGENTE:
    // Solo exigimos el club si el rol que están intentando crear es DIRECTOR
    if (altaDir.rol === "DIRECTOR" && !altaDir.clubId) {
      alert("Debés asignarle un club al Director.");
      return;
    }

    try {
      await api.post("/api/auth/registro", altaDir);
      alert("¡Usuario registrado exitosamente!");
      // Limpiamos el formulario
      setAltaDir({
        nombre: "",
        apellido: "",
        dni: "",
        fechaNacimiento: "",
        email: "",
        password: "",
        rol: "DIRECTOR",
        clubId: "",
        integranteId: "",
        crearFisico: true,
      });
      // Recargamos la nómina de accesos para que aparezca en la tabla de abajo
      cargarCatalogosFormularios();
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.message}`);
    }
  };

  const handleAltaClub = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/clubes", altaClub);
      alert("¡Club fundado y asignado exitosamente!");
      setAltaClub({ nombre: "", iglesia: "", distrito: "", regionId: "" }); // 👈 Limpiamos todo
      cargarCatalogosFormularios();
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.message}`);
    }
  };

  const handleAltaRegion = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/api/clubes/regiones", altaRegion);
      alert("¡Región (Zona) creada exitosamente!");
      setAltaRegion({ nombre: "" });
      cargarCatalogosFormularios(); // Recarga la lista para que aparezca al instante
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.message}`);
    }
  };

  // =============================================
  // IMPORTACIÓN / EXPORTACIÓN
  // =============================================
  const handleSubirCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      transformHeader: (header) => header.trim(),
      complete: async (results) => {
        try {
          await api.post("/api/progresos/carga-masiva", {
            requisitos: results.data,
          });
          alert(
            `¡Ingesta exitosa! Se cargaron ${results.data.length} requisitos.`,
          );
          e.target.value = "";
        } catch (error: any) {
          alert(
            `Error al cargar: ${error.response?.data?.message || "Mirá la consola (F12)."}`,
          );
        }
      },
    });
  };

  const handleSubirEspecialidades = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("archivo", file);
    try {
      const res = await api.post("/api/especialidades/importar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert(`✅ ¡Base Maestra Cargada!\n${res.data.message}`);
      e.target.value = "";
      cargarCatalogosFormularios();
    } catch (error: any) {
      alert(
        `❌ Error en la ingesta: ${error.response?.data?.message || "Revisá la consola."}`,
      );
    }
  };

  const handleLimpiarManuales = async () => {
    const confirmacion = window.confirm(
      "⚠️ ADVERTENCIA CRÍTICA ⚠️\n¿Eliminar TODOS los requisitos? No se puede deshacer.",
    );
    if (confirmacion) {
      try {
        await api.delete("/api/progresos/carga-masiva/limpiar");
        alert("¡Base de datos limpiada con éxito!");
      } catch (error: any) {
        alert(
          `Error al limpiar: ${error.response?.data?.message || "Revisá la consola."}`,
        );
      }
    }
  };

  const descargarExcel = async () => {
    setDescargando(true);
    try {
      const clubParaExportar =
        clubesDisponibles.length > 0 ? clubesDisponibles[0].id : 1;
      const response = await api.get(
        `/api/reportes/investidura/club/${clubParaExportar}`,
        { responseType: "blob" },
      );
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Investidura_Club.xlsx");
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch {
      alert("Error al descargar el archivo Excel.");
    } finally {
      setDescargando(false);
    }
  };

  const handleDescargarPlantillaIntegrantes = async () => {
    try {
      const response = await api.get("/api/integrantes/plantilla", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "Plantilla_Alta_Masiva.xlsx");
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (error) {
      alert("Error al descargar la plantilla.");
    }
  };

  const handleSubirExcelIntegrantes = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("archivo", file);
    try {
      const res = await api.post("/api/integrantes/importar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert(`¡Éxito! ${res.data.message}`);
      e.target.value = "";
      cargarCatalogosFormularios();
    } catch (error: any) {
      alert(
        `Error en la importación: ${error.response?.data?.message || "Revisá la consola."}`,
      );
    }
  };

  // =============================================
  // DATOS PARA GRÁFICOS
  // =============================================
  const dataTorta = [
    { name: "Investidos", value: metricas.totalInvestidos },
    {
      name: "En Proceso",
      value: metricas.totalIntegrantes - metricas.totalInvestidos,
    },
  ];
  const COLORES_TORTA = ["#10B981", "#E5E7EB"];
  const dataBarras = ranking.map((int) => ({ nombre: int.nombre, xp: int.xp }));

  // =============================================
  // PANTALLA DE LOGIN
  // =============================================
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-gray-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md">
          <div className="text-center mb-8 flex flex-col items-center justify-center">
            {/* Agregamos un flex row para que logo y texto estén en la misma línea */}
            <div className="flex flex-row items-center justify-center gap-5 mb-8">
              <img
                src="/logo-conquis.png"
                alt="Logo Conquistadores"
                className="w-24 h-24 object-contain"
              />
              <div className="flex flex-col text-left">
                <h1 className="text-4xl font-black text-blue-900 tracking-wider uppercase leading-none">
                  SG Regional
                </h1>
                <p className="text-gray-500 font-bold tracking-widest uppercase text-sm mt-1">
                  Acceso Autorizado
                </p>
              </div>
            </div>
          </div>
          {errorLogin && (
            <div className="bg-red-100 text-red-800 p-3 rounded mb-4 text-sm font-bold border border-red-200">
              {errorLogin}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full mt-1 p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                Contraseña Segura
              </label>
              <div className="relative">
                <input
                  type={mostrarPass ? "text" : "password"} // Alterna el tipo
                  required
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="w-full mt-1 p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none pr-10"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPass(!mostrarPass)}
                  className="absolute right-3 top-10 text-gray-500 hover:text-gray-700"
                >
                  {mostrarPass ? "🙈" : "👁️"}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-lg shadow-lg uppercase tracking-widest"
            >
              Iniciar Sesión
            </button>
          </form>
        </div>
      </div>
    );
  }

  // =============================================
  // APP PRINCIPAL
  // =============================================
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <nav className="bg-blue-900 text-white shadow-md p-4 print:hidden">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-4">
          <div className="font-black text-3xl tracking-wider flex items-center gap-3">
            <img
              src="/logo-conquis.png"
              alt="Logo"
              className="w-12 h-12 object-contain drop-shadow-sm"
            />
            <span className="hidden sm:inline">SG Regional</span>
          </div>
          <div className="space-x-1 sm:space-x-2 text-sm sm:text-base flex flex-wrap">
            <button
              onClick={() => setVista("dashboard")}
              className={`px-3 py-2 rounded font-bold transition-colors ${vista === "dashboard" ? "bg-blue-700" : "hover:bg-blue-800"}`}
            >
              Tablero
            </button>
            <button
              onClick={() => setVista("directorio")}
              className={`px-3 py-2 rounded font-bold transition-colors ${vista === "directorio" ? "bg-yellow-600" : "hover:bg-blue-800"}`}
            >
              Nómina Gral
            </button>
            <button
              onClick={() => setVista("gestion")}
              className={`px-3 py-2 rounded font-bold transition-colors ${vista === "gestion" ? "bg-green-700" : "hover:bg-blue-800"}`}
            >
              Gestión
            </button>
            <button
              onClick={() => setVista("agenda")}
              className={`px-3 py-2 rounded font-bold transition-colors ${vista === "agenda" ? "bg-purple-600" : "hover:bg-blue-800"}`}
            >
              Agenda
            </button>

            <button
              onClick={() => setVista("mensajes")}
              className={`relative px-3 py-2 rounded font-bold transition-colors ${vista === "mensajes" ? "bg-teal-600" : "hover:bg-blue-800"}`}
            >
              Mensajes
              {/* Notificador visual (Badge) */}
              {mensajesSinLeer > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-md border-2 border-blue-900 animate-pulse">
                  {mensajesSinLeer}
                </span>
              )}
            </button>

            {/* 🛡️ RESTRICCIÓN: El SOC solo lo opera el Administrador Global */}
            {localStorage.getItem("rolConquis") === "SYSADMIN" && (
              <button
                onClick={() => setVista("auditoria")}
                className={`px-3 py-2 rounded font-bold transition-colors ${vista === "auditoria" ? "bg-red-700" : "hover:bg-blue-800"}`}
              >
                Auditoría
              </button>
            )}
            <button
              onClick={cerrarSesion}
              className="px-3 py-2 bg-red-600 rounded font-bold hover:bg-red-700 transition-colors ml-4 border border-red-500"
            >
              Salir
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 p-4 sm:p-8 max-w-6xl mx-auto w-full">
        {/* VISTA 1: DASHBOARD */}
        {vista === "dashboard" && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800 border-b-4 border-yellow-500 pb-2 inline-block">
                Tablero Gerencial
              </h1>
              <button
                onClick={descargarExcel}
                disabled={descargando}
                className={`px-4 py-2 rounded shadow text-white font-bold transition-colors ${descargando ? "bg-gray-400" : "bg-green-600 hover:bg-green-700"}`}
              >
                {descargando ? "Generando..." : "📥 Exportar Excel"}
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                  Plantilla Activa
                </p>
                <p className="text-3xl font-black text-blue-900 mt-2">
                  {metricas.totalIntegrantes}
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                  Investidos
                </p>
                <p className="text-3xl font-black text-green-600 mt-2">
                  {metricas.totalInvestidos}
                </p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-yellow-500">
                <p className="text-sm font-bold text-gray-500 uppercase tracking-wide">
                  % Efectividad
                </p>
                <p className="text-3xl font-black text-yellow-600 mt-2">
                  {metricas.porcentaje}%
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center justify-center">
                <h2 className="text-lg font-black text-gray-800 mb-2 uppercase">
                  Efectividad de Investidura
                </h2>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dataTorta}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {dataTorta.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={COLORES_TORTA[index % COLORES_TORTA.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center justify-center">
                <h2 className="text-lg font-black text-gray-800 mb-2 uppercase">
                  Distribución de Experiencia (Top 5)
                </h2>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={dataBarras.slice(0, 5)}
                      margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                    >
                      <XAxis dataKey="nombre" tick={{ fontSize: 12 }} />
                      <YAxis />
                      <Tooltip cursor={{ fill: "transparent" }} />
                      <Bar dataKey="xp" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-black text-gray-800 mb-4 uppercase">
                Ranking Conquis+ (Top 10)
              </h2>
              {cargando ? (
                <p className="text-gray-500 font-bold animate-pulse">
                  Cargando datos...
                </p>
              ) : (
                <div className="grid gap-3">
                  {ranking.map((int, idx) => (
                    <div
                      key={int.id}
                      onClick={() => verPerfil(int)}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded border cursor-pointer hover:border-blue-300 hover:shadow-md transition-all"
                    >
                      <div className="flex items-center gap-4">
                        {/* ✅ ANTES: src={`http://localhost:3000${int.avatarUrl}`} */}
                        {/* ✅ AHORA: usa API_BASE que lee del .env */}
                        {int.avatarUrl ? (
                          <img
                            src={`${API_BASE}${int.avatarUrl}`}
                            className={`w-10 h-10 rounded-full object-cover border-2 ${idx === 0 ? "border-yellow-500" : "border-gray-300"}`}
                            alt="Avatar"
                          />
                        ) : (
                          <div
                            className={`w-10 h-10 flex items-center justify-center rounded-full font-black text-white ${idx === 0 ? "bg-yellow-500" : "bg-gray-400"}`}
                          >
                            {idx + 1}
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-lg text-gray-800">
                            {int.nombre} {int.apellido}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {int.club?.nombre} • Ver expediente
                          </p>
                        </div>
                      </div>
                      <div className="bg-blue-100 px-4 py-2 rounded border border-blue-200 text-blue-900 font-black tracking-widest">
                        {int.xp} XP
                      </div>
                    </div>
                  ))}
                  {ranking.length === 0 && (
                    <p className="text-gray-500 text-center py-4">
                      No hay integrantes con XP registrados.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VISTA 2: DIRECTORIO */}
        {vista === "directorio" && (
          <div className="animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
              <h1 className="text-3xl font-bold text-gray-800 border-b-4 border-yellow-500 pb-2">
                Integrantes
              </h1>
              <div className="w-full md:w-1/3">
                <label className="block text-xs font-bold text-gray-500 uppercase">
                  Seleccionar Club
                </label>
                <select
                  value={clubSeleccionadoDirectorio}
                  onChange={(e) =>
                    setClubSeleccionadoDirectorio(e.target.value)
                  }
                  className="w-full p-2 border-2 border-gray-300 rounded font-bold"
                >
                  {clubesDisponibles
                    .filter((c: any) => c.activo !== false) // 🛡️ BARRERA: Solo mostramos los activos
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            {cargando ? (
              <p className="animate-pulse font-bold text-gray-500">
                Cargando nómina...
              </p>
            ) : (
              <div className="bg-white rounded-xl shadow-lg overflow-x-auto border border-gray-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-800 text-white uppercase text-xs">
                    <tr className="divide-x divide-gray-700">
                      <th className="p-4">Integrante</th>
                      <th className="p-4">Función</th>
                      <th className="p-4">Clase Actual</th>
                      <th className="p-4 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {directorio.map((int) => (
                      <tr key={int.id} className="hover:bg-blue-50">
                        <td className="p-4 flex items-center gap-3">
                          {int.avatarUrl ? (
                            <img
                              src={`${API_BASE}${int.avatarUrl}`}
                              className="w-8 h-8 rounded-full object-cover shadow"
                              alt="avatar"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold">
                              {int.nombre.charAt(0)}
                            </div>
                          )}
                          <span className="font-bold text-gray-800">
                            {int.nombre} {int.apellido}
                          </span>
                        </td>
                        <td className="p-4 text-gray-600 font-semibold">
                          {int.funcion}
                        </td>
                        <td className="p-4">
                          <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">
                            {int.clase?.nombre || "Sin Asignar"}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => verPerfil(int)}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700"
                          >
                            Ver Perfil
                          </button>
                        </td>
                      </tr>
                    ))}
                    {directorio.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="p-8 text-center text-gray-500 font-bold"
                        >
                          No hay integrantes en este club.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* VISTA 3: GESTIÓN */}
        {vista === "gestion" && (
          <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-green-500">
              <h2 className="text-xl font-black text-gray-800 mb-6 uppercase">
                Agregar Integrante
              </h2>
              <form onSubmit={handleAltaConquistador} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    DNI (Sin puntos) *
                  </label>
                  <input
                    required
                    type="number"
                    value={altaConqui.dni}
                    onChange={(e) =>
                      setAltaConqui({ ...altaConqui, dni: e.target.value })
                    }
                    className="w-full p-2 border rounded bg-gray-50 text-sm"
                    placeholder="Ej: 45123456"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Nombre *
                    </label>
                    <input
                      required
                      type="text"
                      value={altaConqui.nombre}
                      onChange={(e) =>
                        setAltaConqui({ ...altaConqui, nombre: e.target.value })
                      }
                      className="w-full p-2 border rounded bg-gray-50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Apellido *
                    </label>
                    <input
                      required
                      type="text"
                      value={altaConqui.apellido}
                      onChange={(e) =>
                        setAltaConqui({
                          ...altaConqui,
                          apellido: e.target.value,
                        })
                      }
                      className="w-full p-2 border rounded bg-gray-50 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Club *
                  </label>
                  <select
                    required
                    value={altaConqui.clubId}
                    onChange={(e) =>
                      setAltaConqui({ ...altaConqui, clubId: e.target.value })
                    }
                    className="w-full p-2 border rounded bg-white text-sm"
                  >
                    <option value="">-- Seleccione club --</option>
                    {clubesDisponibles
                      .filter((c: any) => c.activo !== false) // 🛡️ BARRERA: Solo mostramos los activos
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Nacimiento
                  </label>
                  <input
                    required
                    type="date"
                    value={altaConqui.fechaNacimiento}
                    onChange={(e) =>
                      setAltaConqui({
                        ...altaConqui,
                        fechaNacimiento: e.target.value,
                      })
                    }
                    className="w-full p-2 border rounded bg-gray-50 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Función
                    </label>
                    <select
                      required
                      value={altaConqui.funcion}
                      onChange={(e) =>
                        setAltaConqui({
                          ...altaConqui,
                          funcion: e.target.value,
                        })
                      }
                      className="w-full p-2 border border-green-300 rounded text-sm bg-white"
                    >
                      <option value="CONQUISTADOR">Conquistador</option>
                      <option value="CONQUIS+">Conquis+</option>
                      <option value="CONSEJERO">Consejero</option>
                      <option value="INSTRUCTOR">Instructor</option>
                      <option value="SUBDIRECTOR">Subdirector</option>

                      {/* 👇 MAGIA ACÁ: Habilitamos Director y Regional SOLO para Sysadmin */}
                      {localStorage.getItem("rolConquis")?.toUpperCase() ===
                        "SYSADMIN" && (
                        <>
                          <option
                            value="DIRECTOR"
                            className="font-bold text-blue-700"
                          >
                            Director
                          </option>
                          <option
                            value="REGIONAL"
                            className="font-bold text-purple-700"
                          >
                            Regional
                          </option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Clase Inicial
                    </label>
                    <select
                      value={altaConqui.claseId}
                      onChange={(e) =>
                        setAltaConqui({
                          ...altaConqui,
                          claseId: e.target.value,
                        })
                      }
                      className="w-full p-2 border rounded bg-white text-sm"
                    >
                      <option value="">-- Ninguna --</option>
                      {clasesDisponibles.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 mt-4 bg-green-600 text-white font-black rounded hover:bg-green-700"
                >
                  REGISTRAR MANUALMENTE
                </button>
              </form>
            </div>
            {/* ========================================== */}
            {/* COLUMNA 2: AGREGAR USUARIO (SISTEMA)         */}
            {/* ========================================== */}
            {localStorage.getItem("rolConquis") === "SYSADMIN" && (
              <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-600">
                <h2 className="text-xl font-black text-gray-800 mb-4 uppercase">
                  Agregar Usuario (Sistema)
                </h2>

                <form onSubmit={handleAltaDirector} className="space-y-4">
                  {/* 1. ELEGIR ROL Y CLUB */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">
                        Rol de Acceso *
                      </label>
                      <select
                        value={altaDir.rol}
                        onChange={(e) =>
                          setAltaDir({
                            ...altaDir,
                            rol: e.target.value,
                            integranteId: "",
                            nombre: "",
                          })
                        }
                        className="w-full p-2 border border-gray-300 rounded text-sm bg-purple-50 font-bold text-purple-900"
                      >
                        <option value="DIRECTOR">Director (Club)</option>
                        <option value="REGIONAL">Regional (Zona)</option>
                      </select>
                    </div>

                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">
                        Asignar a Club / Staff *
                      </label>
                      <select
                        required
                        value={altaDir.clubId}
                        onChange={async (e) => {
                          const clubSeleccionado = e.target.value;
                          setAltaDir({
                            ...altaDir,
                            clubId: clubSeleccionado,
                            integranteId: "",
                            nombre: "",
                          });
                          if (clubSeleccionado) {
                            try {
                              const res = await api.get(
                                `/api/integrantes/club/${clubSeleccionado}`,
                              );
                              setListaIntegrantes(res.data.data || []);
                            } catch (err) {
                              setListaIntegrantes([]);
                            }
                          } else {
                            setListaIntegrantes([]);
                          }
                        }}
                        className="w-full p-2 border border-blue-300 rounded text-sm bg-blue-50 font-bold"
                      >
                        <option value="">-- Seleccione club --</option>
                        {clubesDisponibles
                          .filter(
                            (club) =>
                              // 🛡️ LÓGICA: Si es Regional, mostramos todos los clubes (para elegir el Staff).
                              // Si es Director, ocultamos los clubes que ya tienen director.
                              altaDir.rol === "REGIONAL" ||
                              !listaDirectores.some(
                                (user) =>
                                  user.rol === "DIRECTOR" &&
                                  user.clubId === club.id,
                              ),
                          )
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nombre}
                            </option>
                          ))}
                      </select>
                    </div>
                  </div>

                  <hr className="border-gray-200" />

                  {/* 2. VINCULACIÓN DE IDENTIDAD UNIFICADA */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">
                      Vincular a{" "}
                      {altaDir.rol === "DIRECTOR" ? "Director" : "Regional"}{" "}
                      Existente *
                    </label>
                    <select
                      required
                      value={altaDir.integranteId}
                      onChange={(e) => {
                        const idSeleccionado = e.target.value;
                        const integrante = listaIntegrantes.find(
                          (i: any) => String(i.id) === idSeleccionado,
                        );
                        setAltaDir({
                          ...altaDir,
                          integranteId: idSeleccionado,
                          nombre: integrante
                            ? `${integrante.nombre} ${integrante.apellido}`
                            : "",
                        });
                      }}
                      className="w-full p-2 border border-blue-400 rounded bg-white text-xs font-bold"
                    >
                      <option value="">
                        -- Elija al integrante en nómina --
                      </option>
                      {listaIntegrantes
                        .filter(
                          (int: any) =>
                            // 🛡️ LÓGICA: Si buscamos un Director, filtramos por función.
                            // Si es Regional, traemos a todos los del "Staff Regional" cargados.
                            altaDir.rol === "REGIONAL" ||
                            int.funcion === "DIRECTOR",
                        )
                        .map((int: any) => (
                          <option key={int.id} value={int.id}>
                            {int.nombre} {int.apellido} - DNI: {int.dni}
                          </option>
                        ))}
                    </select>
                    <p className="text-[9px] text-gray-500 mt-1 italic">
                      * Primero debe cargar a la persona en el panel de la
                      izquierda.
                    </p>
                  </div>
                  <hr className="border-gray-200" />

                  {/* 3. DATOS DE ACCESO AL SISTEMA */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">
                        Email (Usuario) *
                      </label>
                      <input
                        type="email"
                        required
                        value={altaDir.email}
                        onChange={(e) =>
                          setAltaDir({ ...altaDir, email: e.target.value })
                        }
                        className="w-full p-2 border border-gray-300 rounded text-sm bg-white"
                        placeholder="correo@ejemplo.com"
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <label className="block text-[10px] font-bold text-gray-700 uppercase mb-1">
                        Contraseña *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={altaDir.password}
                        onChange={(e) =>
                          setAltaDir({ ...altaDir, password: e.target.value })
                        }
                        className="w-full p-2 border border-gray-300 rounded text-sm bg-white"
                        placeholder="Mínimo 8 caracteres"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 mt-4 bg-blue-600 text-white font-black rounded hover:bg-blue-700 shadow-md"
                  >
                    CREAR ACCESO
                  </button>
                </form>
              </div>
            )}

            {/* 🛡️ RESTRICCIÓN: Solo SYSADMIN crea Zonas */}
            {localStorage.getItem("rolConquis") === "SYSADMIN" && (
              <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-indigo-500">
                <h2 className="text-xl font-black text-gray-800 mb-6 uppercase">
                  Agregar Región (Zona)
                </h2>
                <form onSubmit={handleAltaRegion} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Nombre de la Región *
                    </label>
                    <input
                      required
                      type="text"
                      value={altaRegion.nombre}
                      onChange={(e) =>
                        setAltaRegion({ ...altaRegion, nombre: e.target.value })
                      }
                      placeholder="Ej: Zona Capital"
                      className="w-full p-2 border rounded bg-gray-50 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 mt-4 bg-indigo-600 text-white font-black rounded hover:bg-indigo-700 shadow-md"
                  >
                    REGISTRAR ZONA
                  </button>
                </form>
              </div>
            )}

            {/* 🛡️ RESTRICCIÓN: Solo SYSADMIN puede crear infraestructura (Clubes) */}
            {localStorage.getItem("rolConquis") === "SYSADMIN" && (
              <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-yellow-500">
                <h2 className="text-xl font-black text-gray-800 mb-6 uppercase">
                  Agregar Club
                </h2>
                <form onSubmit={handleAltaClub} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Nombre del Club *
                    </label>
                    <input
                      required
                      type="text"
                      value={altaClub.nombre}
                      onChange={(e) =>
                        setAltaClub({ ...altaClub, nombre: e.target.value })
                      }
                      className="w-full p-2 border rounded bg-gray-50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Iglesia *
                    </label>
                    <input
                      required
                      type="text"
                      value={altaClub.iglesia}
                      onChange={(e) =>
                        setAltaClub({ ...altaClub, iglesia: e.target.value })
                      }
                      className="w-full p-2 border rounded bg-gray-50 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Distrito
                    </label>
                    <input
                      type="text"
                      value={altaClub.distrito}
                      onChange={(e) =>
                        setAltaClub({ ...altaClub, distrito: e.target.value })
                      }
                      className="w-full p-2 border rounded bg-gray-50 text-sm"
                    />
                  </div>

                  {/* 👇 NUEVO CAMPO: ASIGNAR EL CLUB A UNA REGIÓN */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Asignar a Región (Zona) *
                    </label>
                    <select
                      required
                      value={altaClub.regionId}
                      onChange={(e) =>
                        setAltaClub({ ...altaClub, regionId: e.target.value })
                      }
                      className="w-full p-2 border border-yellow-300 rounded bg-yellow-50 text-sm font-bold text-gray-700"
                    >
                      <option value="">
                        -- Seleccione a qué Región pertenece --
                      </option>
                      {regionesDisponibles.map((reg) => (
                        <option key={reg.id} value={reg.id}>
                          {reg.nombre}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 mt-4 bg-yellow-500 text-yellow-900 font-black rounded hover:bg-yellow-600 shadow-md"
                  >
                    REGISTRAR Y ASIGNAR CLUB
                  </button>
                </form>
              </div>
            )}

            {/* 🛡️ PANEL DE CONTROL DE INFRAESTRUCTURA (Solo Sysadmin) */}
            {localStorage.getItem("rolConquis") === "SYSADMIN" && (
              <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-gray-800 col-span-1 md:col-span-2 mt-4">
                <h2 className="text-xl font-black text-gray-800 mb-4 uppercase">
                  Mapa de Infraestructura (Clubes y Zonas)
                </h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 text-gray-700 text-xs uppercase">
                        <th className="p-3 border-b">Club</th>
                        <th className="p-3 border-b">Iglesia</th>
                        <th className="p-3 border-b">Zona Asignada</th>
                        <th className="p-3 border-b text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clubesDisponibles.map((club) => (
                        <tr key={club.id} className="border-b hover:bg-gray-50">
                          {clubEditando?.id === club.id ? (
                            <>
                              <td className="p-2">
                                <input
                                  value={clubEditando.nombre}
                                  onChange={(e) =>
                                    setClubEditando({
                                      ...clubEditando,
                                      nombre: e.target.value,
                                    })
                                  }
                                  className="border p-1 w-full text-xs font-bold"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  value={clubEditando.iglesia}
                                  onChange={(e) =>
                                    setClubEditando({
                                      ...clubEditando,
                                      iglesia: e.target.value,
                                    })
                                  }
                                  className="border p-1 w-full text-xs"
                                />
                              </td>
                              <td className="p-2">
                                <select
                                  value={clubEditando.regionId || ""}
                                  onChange={(e) =>
                                    setClubEditando({
                                      ...clubEditando,
                                      regionId: e.target.value,
                                    })
                                  }
                                  className="border p-1 w-full text-xs font-bold bg-purple-50"
                                >
                                  <option value="">-- Sin Zona --</option>
                                  {regionesDisponibles.map((r) => (
                                    <option key={r.id} value={r.id}>
                                      {r.nombre}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-2 flex gap-1 justify-center">
                                <button
                                  onClick={async () => {
                                    try {
                                      await api.put(
                                        `/api/clubes/${clubEditando.id}`,
                                        clubEditando,
                                      );
                                      setClubEditando(null);
                                      cargarCatalogosFormularios();
                                    } catch (e: any) {
                                      alert("Error al actualizar");
                                    }
                                  }}
                                  className="bg-green-600 text-white px-2 py-1 rounded text-xs font-bold"
                                >
                                  💾
                                </button>
                                <button
                                  onClick={() => setClubEditando(null)}
                                  className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold"
                                >
                                  ❌
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              {/* COLUMNA NOMBRE CON INDICADOR DE ESTADO */}
                              <td className="p-3 font-bold text-gray-800">
                                <span
                                  className={
                                    club.activo === false
                                      ? "line-through text-gray-400"
                                      : ""
                                  }
                                >
                                  {club.nombre}
                                </span>
                                {club.activo === false && (
                                  <span className="ml-2 bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded font-black">
                                    INACTIVO
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-xs text-gray-600">
                                {club.iglesia}
                              </td>
                              <td className="p-3">
                                <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-1 rounded">
                                  {regionesDisponibles.find(
                                    (r) => r.id === club.regionId,
                                  )?.nombre || "⚠️ Sin Asignar"}
                                </span>
                              </td>

                              {/* COLUMNA ACCIONES */}
                              <td className="p-3 flex gap-2 justify-center">
                                {/* Botón Editar original */}
                                <button
                                  onClick={() => setClubEditando({ ...club })}
                                  className="text-blue-600 hover:text-blue-800 text-xs font-bold bg-blue-50 px-2 py-1 rounded"
                                >
                                  ✏️ Editar
                                </button>

                                {/* 👇 NUEVO BOTÓN DE BAJA LÓGICA */}
                                <button
                                  onClick={() => cambiarEstadoClub(club.id)}
                                  className={`text-xs font-bold px-2 py-1 rounded shadow-sm ${club.activo !== false ? "bg-red-100 text-red-700 hover:bg-red-200" : "bg-green-100 text-green-700 hover:bg-green-200"}`}
                                  title={
                                    club.activo !== false
                                      ? "Inactivar Club"
                                      : "Reactivar Club"
                                  }
                                >
                                  {club.activo !== false
                                    ? "🚫 Inactivar"
                                    : "✅ Activar"}
                                </button>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-emerald-500 flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-black text-gray-800 mb-2 uppercase">
                  Importar Nómina (Excel)
                </h2>
                <p className="text-xs text-gray-500 font-bold mb-4">
                  Descargá la plantilla, completala y subila para alistar
                  integrantes de una sola vez.
                </p>
                <button
                  type="button"
                  onClick={handleDescargarPlantillaIntegrantes}
                  className="w-full py-2 mb-4 text-xs font-black tracking-widest text-emerald-800 bg-emerald-100 border border-emerald-300 rounded hover:bg-emerald-200 uppercase transition-colors"
                >
                  📥 Bajar Plantilla Inteligente
                </button>
                <label className="block w-full py-3 bg-gray-50 border-2 border-dashed border-gray-400 text-gray-700 font-black text-center rounded cursor-pointer hover:bg-gray-200 transition-colors">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleSubirExcelIntegrantes}
                    className="hidden"
                  />
                  🚀 CARGAR EXCEL
                </label>
              </div>
            </div>

            {/* 🛡️ RESTRICCIÓN MÁXIMA: Solo el SYSADMIN puede tocar la base matriz */}
            {localStorage.getItem("rolConquis") === "SYSADMIN" && (
              <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-purple-500 flex flex-col justify-between">
                <div>
                  <h2 className="text-xl font-black text-gray-800 mb-2 uppercase">
                    Cargar Requisitos (CSV)
                  </h2>
                  <p className="text-xs text-gray-500 font-bold mb-4">
                    Guardá tu Excel como "CSV (delimitado por comas)" antes de
                    subirlo.
                  </p>
                  <label className="block w-full py-3 bg-purple-100 border-2 border-dashed border-purple-400 text-purple-700 font-black text-center rounded cursor-pointer hover:bg-purple-200 transition-colors">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleSubirCSV}
                      className="hidden"
                    />
                    📂 SELECCIONAR ARCHIVO MATRIZ
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleLimpiarManuales}
                  className="w-full py-2 mt-4 text-xs font-black tracking-widest text-red-700 bg-red-100 border border-red-300 rounded hover:bg-red-200 uppercase transition-colors"
                >
                  ⚠️ Purgar Base de Datos (Reset)
                </button>
                <button
                  type="button"
                  onClick={handleBackupSeguridad}
                  className="w-full py-2 mt-2 text-xs font-black tracking-widest text-blue-700 bg-blue-100 border border-blue-300 rounded hover:bg-blue-200 uppercase transition-colors"
                >
                  💾 Descargar Backup de Seguridad
                </button>
              </div>
            )}

            {localStorage.getItem("rolConquis") === "SYSADMIN" && (
              <div className="bg-gray-900 rounded-xl shadow-lg p-6 border-t-4 border-red-500 flex flex-col justify-between">
                <div>
                  <h2 className="text-xl font-black text-red-500 mb-2 uppercase flex items-center gap-2">
                    🛠️ Setup Inicial (Solo Admin)
                  </h2>
                  <p className="text-xs text-gray-400 font-bold mb-4">
                    Carga la base oficial de Especialidades y Maestrías. Solo
                    ejecutar al inicializar el servidor.
                  </p>
                  <label className="block w-full py-3 bg-red-900/30 border-2 border-dashed border-red-500 text-red-400 font-black text-center rounded cursor-pointer hover:bg-red-900/50 transition-colors">
                    <input
                      type="file"
                      accept=".xlsx, .xls"
                      onChange={handleSubirEspecialidades}
                      className="hidden"
                    />
                    🔥 SUBIR DICCIONARIO OFICIAL (EXCEL)
                  </label>
                </div>
              </div>
            )}

            <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white rounded-xl shadow-lg p-6 border-t-4 border-gray-800 mt-4">
              <h2 className="text-xl font-black text-gray-800 mb-4 uppercase">
                Nómina de Accesos (Directores y Regionales)
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-bold">
                    <tr className="divide-x">
                      <th className="p-3">Nombre</th>
                      <th className="p-3">Email (Login)</th>
                      <th className="p-3">Rol</th>
                      <th className="p-3">Club Asignado</th>
                      <th className="p-3 text-center">Acción</th>
                      <th className="p-2 text-left text-xs uppercase text-gray-500">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {listaDirectores.map((dir) => (
                      <tr
                        key={dir.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        {dirEditando?.id === dir.id ? (
                          <>
                            {/* COLUMNA NOMBRE */}
                            <td className="p-2 align-top">
                              <input
                                value={dirEditando.nombre}
                                onChange={(e) =>
                                  setDirEditando({
                                    ...dirEditando,
                                    nombre: e.target.value,
                                  })
                                }
                                className="border border-gray-300 rounded p-2 w-full text-xs font-bold"
                              />
                            </td>

                            {/* COLUMNA EMAIL Y PASSWORD */}
                            <td className="p-2 align-top">
                              <input
                                value={dirEditando.email}
                                onChange={(e) =>
                                  setDirEditando({
                                    ...dirEditando,
                                    email: e.target.value,
                                  })
                                }
                                className="border border-gray-300 rounded p-2 w-full text-xs font-bold mb-1"
                              />
                              <input
                                type="password"
                                placeholder="Nueva clave (opcional)"
                                onChange={(e) =>
                                  setDirEditando({
                                    ...dirEditando,
                                    password: e.target.value,
                                  })
                                }
                                className="border border-blue-400 bg-blue-50 rounded p-2 w-full text-xs"
                              />
                            </td>

                            {/* COLUMNA ROL (Solo Sysadmin puede cambiar roles, los demás ven el suyo fijo) */}
                            <td className="p-2 align-top">
                              {localStorage.getItem("rolConquis") ===
                              "SYSADMIN" ? (
                                <select
                                  value={dirEditando.rol}
                                  onChange={(e) =>
                                    setDirEditando({
                                      ...dirEditando,
                                      rol: e.target.value,
                                    })
                                  }
                                  className="border border-gray-300 rounded p-2 w-full text-xs font-bold bg-white"
                                >
                                  <option value="DIRECTOR">Director</option>
                                  <option value="REGIONAL">Regional</option>
                                  <option value="SYSADMIN">Sysadmin</option>
                                </select>
                              ) : (
                                <span className="text-xs font-bold px-2 py-1 bg-gray-200 rounded">
                                  {dirEditando.rol}
                                </span>
                              )}
                            </td>

                            {/* COLUMNA CLUB / REGION */}
                            <td className="p-2 align-top">
                              {dirEditando.rol === "REGIONAL" ? (
                                // 🛡️ Si es SYSADMIN le mostramos el desplegable. Si no, texto fijo.
                                localStorage.getItem("rolConquis") ===
                                "SYSADMIN" ? (
                                  <select
                                    value={dirEditando.regionId || ""}
                                    onChange={(e) =>
                                      setDirEditando({
                                        ...dirEditando,
                                        regionId: e.target.value,
                                      })
                                    }
                                    className="border border-purple-300 rounded p-2 w-full text-xs font-bold bg-purple-50"
                                  >
                                    <option value="">
                                      -- Sin Zona Definida --
                                    </option>
                                    {regionesDisponibles.map((r) => (
                                      <option key={r.id} value={r.id}>
                                        {r.nombre}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-2 border rounded block w-full text-center">
                                    Zona Bloqueada
                                  </span>
                                )
                              ) : dirEditando.rol === "SYSADMIN" ? (
                                <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded block text-center">
                                  Acceso Global
                                </span>
                              ) : // 🛡️ Lo mismo para el Director con su club
                              localStorage.getItem("rolConquis") ===
                                "SYSADMIN" ? (
                                <select
                                  value={dirEditando.clubId || ""}
                                  onChange={(e) =>
                                    setDirEditando({
                                      ...dirEditando,
                                      clubId: e.target.value,
                                    })
                                  }
                                  className="border border-gray-300 rounded p-2 w-full text-xs font-bold bg-white"
                                >
                                  <option value="">-- Sin Club --</option>
                                  {clubesDisponibles
                                    .filter((c: any) => c.activo !== false) // 🛡️ BARRERA: Solo mostramos los activos
                                    .map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.nombre}
                                      </option>
                                    ))}
                                </select>
                              ) : (
                                <span className="text-xs font-bold text-gray-500 bg-gray-100 px-2 py-2 border rounded block w-full text-center">
                                  Club Bloqueado
                                </span>
                              )}
                            </td>

                            {/* COLUMNA ACCIONES */}
                            <td className="p-2 flex gap-2 justify-center align-top">
                              <button
                                onClick={async () => {
                                  try {
                                    await api.put(
                                      `/api/auth/usuarios/${dirEditando.id}`,
                                      dirEditando,
                                    );
                                    setDirEditando(null);
                                    cargarCatalogosFormularios();
                                    alert("✅ Perfil actualizado.");
                                  } catch (e: any) {
                                    alert(
                                      `Error al guardar: ${e.response?.data?.message || "Revisá la consola"}`,
                                    );
                                  }
                                }}
                                className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded shadow font-bold"
                              >
                                💾
                              </button>
                              <button
                                onClick={() => setDirEditando(null)}
                                className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded shadow font-bold"
                              >
                                ❌
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            {/* Vista Normal de la tabla */}
                            <td className="p-3 font-bold text-gray-800">
                              {dir.nombre}
                            </td>
                            <td className="p-3 text-blue-600">{dir.email}</td>
                            <td className="p-3">
                              <span
                                className={`px-2 py-1 text-[10px] font-black rounded ${dir.rol === "SYSADMIN" ? "bg-red-100 text-red-800" : dir.rol === "REGIONAL" ? "bg-purple-100 text-purple-800" : "bg-blue-100 text-blue-800"}`}
                              >
                                {dir.rol}
                              </span>
                            </td>
                            <td className="p-3 font-semibold text-gray-600">
                              {dir.rol === "REGIONAL" ? (
                                <span className="text-purple-700 font-bold">
                                  🌎 {dir.region?.nombre || "Zona no asignada"}
                                </span>
                              ) : dir.rol === "SYSADMIN" ? (
                                <span className="text-red-700 font-bold">
                                  🛡️ Sistema
                                </span>
                              ) : (
                                dir.club?.nombre || "⚠️ SIN CLUB"
                              )}
                            </td>

                            <td className="p-2 flex gap-2">
                              {/* Botón Resetear */}
                              <button
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `¿Resetear clave de ${dir.nombre}? Quedará como: Conquis2026`,
                                    )
                                  ) {
                                    api
                                      .put(`/api/auth/usuario/reset/${dir.id}`)
                                      .then(() => alert("Clave reseteada"))
                                      .catch(() => alert("Error al resetear"));
                                  }
                                }}
                                className="p-1.5 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200"
                                title="Resetear Contraseña"
                              >
                                🔑
                              </button>

                              {/* Botón Eliminar */}
                              <button
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `¿Estás seguro de eliminar el acceso de ${dir.nombre}?`,
                                    )
                                  ) {
                                    api
                                      .delete(`/api/auth/usuario/${dir.id}`)
                                      .then(() => {
                                        alert("Acceso eliminado");
                                        cargarCatalogosFormularios(); // Recargamos la lista
                                      })
                                      .catch(() => alert("Error al eliminar"));
                                  }
                                }}
                                className="p-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200"
                                title="Eliminar Acceso"
                              >
                                🗑️
                              </button>
                            </td>

                            <td className="p-3 text-center">
                              <button
                                onClick={() =>
                                  setDirEditando({
                                    ...dir,
                                    clubId: dir.clubId?.toString() || "",
                                  })
                                }
                                className="text-yellow-600 hover:text-yellow-700 font-bold bg-yellow-100 px-3 py-1 rounded"
                              >
                                ✏️ Editar
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VISTA 4: AUDITORÍA */}
        {vista === "auditoria" && (
          <div className="max-w-7xl mx-auto p-4 animate-fade-in">
            <div className="bg-gray-900 rounded-xl shadow-2xl p-6 border-t-4 border-red-500">
              <h2 className="text-2xl font-black text-red-500 mb-2 uppercase flex items-center gap-2">
                🛡️ Monitoreo de Tráfico y Auditoría (SOC)
              </h2>
              <p className="text-gray-400 text-sm font-bold mb-4">
                Registro automático de interceptación de peticiones de red.
              </p>
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="🔍 Buscar por IP, Usuario, Ruta o Método..."
                  className="w-full p-3 bg-gray-800 border border-gray-700 rounded text-gray-300 text-sm font-bold focus:border-red-500 outline-none"
                  value={filtroAudit}
                  onChange={(e) => setFiltroAudit(e.target.value)}
                />
              </div>
              <div className="overflow-x-auto rounded border border-gray-700">
                <table className="w-full text-left text-sm text-gray-300">
                  <thead className="bg-gray-800 text-gray-400 uppercase text-xs font-bold">
                    <tr className="divide-x divide-gray-700">
                      <th className="p-3">Fecha y Hora</th>
                      <th className="p-3 text-red-400">Método</th>
                      <th className="p-3">Ruta</th>
                      <th className="p-3">Cuerpo</th>
                      <th className="p-3">Usuario</th>
                      <th className="p-3 text-blue-400">IP Origen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 font-mono text-[11px]">
                    {logsAuditoria
                      .filter(
                        (log) =>
                          log.ruta
                            .toLowerCase()
                            .includes(filtroAudit.toLowerCase()) ||
                          log.metodo
                            .toLowerCase()
                            .includes(filtroAudit.toLowerCase()) ||
                          (log.usuario?.nombre || "")
                            .toLowerCase()
                            .includes(filtroAudit.toLowerCase()) ||
                          log.ip.includes(filtroAudit),
                      )
                      .map((log: any) => (
                        <tr
                          key={log.id}
                          className="hover:bg-gray-800 transition-colors"
                        >
                          <td className="p-3 text-green-400 whitespace-nowrap">
                            {new Date(log.fecha).toLocaleString("es-AR")}
                          </td>
                          <td className="p-3 font-bold">
                            <span
                              className={`px-2 py-1 rounded text-black ${log.metodo === "DELETE" ? "bg-red-500" : log.metodo === "PUT" || log.metodo === "PATCH" ? "bg-yellow-500" : "bg-blue-500"}`}
                            >
                              {log.metodo}
                            </span>
                          </td>
                          <td className="p-3 text-yellow-300">{log.ruta}</td>
                          <td
                            className="p-3 text-gray-400 max-w-xs truncate"
                            title={log.cuerpoPeticion}
                          >
                            {log.cuerpoPeticion || "N/A"}
                          </td>
                          <td className="p-3 text-purple-400">
                            {log.usuario
                              ? log.usuario.nombre
                              : "Anónimo/Sistema"}
                          </td>
                          <td className="p-3 text-blue-400">{log.ip}</td>
                        </tr>
                      ))}
                    {logsAuditoria.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-4 text-center text-gray-500"
                        >
                          No hay tráfico interceptado.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VISTA 5: AGENDA */}
        {vista === "agenda" && (
          <div className="animate-fade-in grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-purple-500 md:col-span-1 h-fit">
              <h2 className="text-xl font-black text-gray-800 mb-6 uppercase">
                Planificador
              </h2>
              <form onSubmit={handleCrearEvento} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Título del Evento *
                  </label>
                  <input
                    required
                    type="text"
                    value={nuevoEvento.titulo}
                    onChange={(e) =>
                      setNuevoEvento({ ...nuevoEvento, titulo: e.target.value })
                    }
                    placeholder="Ej: Inspección Club Orión"
                    className="w-full p-2 border rounded bg-gray-50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Fecha *
                  </label>
                  <input
                    required
                    type="date"
                    value={nuevoEvento.fecha}
                    onChange={(e) =>
                      setNuevoEvento({ ...nuevoEvento, fecha: e.target.value })
                    }
                    className="w-full p-2 border rounded bg-gray-50 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Club a Visitar (Opcional)
                  </label>
                  <select
                    value={nuevoEvento.clubId}
                    onChange={(e) =>
                      setNuevoEvento({ ...nuevoEvento, clubId: e.target.value })
                    }
                    className="w-full p-2 border rounded bg-white text-sm"
                  >
                    <option value="">-- Evento General --</option>
                    {clubesDisponibles
                      .filter((c: any) => c.activo !== false) // 🛡️ BARRERA: Solo mostramos los activos
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Notas / Detalles
                  </label>
                  <textarea
                    value={nuevoEvento.descripcion}
                    onChange={(e) =>
                      setNuevoEvento({
                        ...nuevoEvento,
                        descripcion: e.target.value,
                      })
                    }
                    rows={3}
                    className="w-full p-2 border rounded bg-gray-50 text-sm"
                  ></textarea>
                </div>
                <button
                  type="submit"
                  className="w-full py-3 mt-4 bg-purple-600 text-white font-black rounded hover:bg-purple-700 shadow-md"
                >
                  AGENDAR
                </button>
              </form>
            </div>
            <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-gray-800 md:col-span-2">
              <h2 className="text-xl font-black text-gray-800 mb-6 uppercase">
                Próximos Compromisos
              </h2>
              {eventosAgenda.length === 0 ? (
                <div className="text-center p-8 bg-gray-50 rounded border border-dashed border-gray-300">
                  <span className="text-4xl">🗓️</span>
                  <p className="text-gray-500 font-bold mt-4">
                    No hay eventos planificados.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {eventosAgenda.map((evento: any) => {
                    const esPasado = new Date(evento.fecha) < new Date();
                    return (
                      <div
                        key={evento.id}
                        className={`flex items-start gap-4 p-4 rounded-lg border shadow-sm ${esPasado ? "bg-gray-100 border-gray-300 opacity-70" : "bg-blue-50 border-blue-200"}`}
                      >
                        <div
                          className={`flex flex-col items-center justify-center p-3 rounded-lg min-w-[70px] ${esPasado ? "bg-gray-300 text-gray-600" : "bg-blue-600 text-white shadow"}`}
                        >
                          <span className="text-xs font-bold uppercase">
                            {new Date(evento.fecha).toLocaleString("es-AR", {
                              month: "short",
                            })}
                          </span>
                          <span className="text-2xl font-black leading-none">
                            {new Date(evento.fecha).getDate() + 1}
                          </span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-black text-lg text-gray-800 uppercase">
                            {evento.titulo}
                          </h3>
                          <p className="text-sm text-gray-600 font-bold mb-1">
                            {evento.clubId
                              ? `📍 Club Asignado (ID: ${evento.clubId})`
                              : "🌐 Evento Regional General"}
                          </p>
                          {evento.descripcion && (
                            <p className="text-sm text-gray-500 italic border-l-2 border-gray-300 pl-2 mt-2">
                              {evento.descripcion}
                            </p>
                          )}
                        </div>
                        <div className="text-right flex flex-col items-end justify-between">
                          <span
                            className={`px-2 py-1 text-[10px] font-black uppercase rounded mb-2 ${esPasado ? "bg-gray-300 text-gray-600" : "bg-green-100 text-green-800"}`}
                          >
                            {esPasado ? "Finalizado" : evento.estado}
                          </span>
                          <button
                            onClick={() => handleEliminarEvento(evento.id)}
                            className="text-xs text-red-500 font-bold hover:text-red-700 hover:underline"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VISTA 6: PERFIL */}
        {vista === "perfil" && integranteSeleccionado && (
          <div className="animate-fade-in bg-white print:bg-white rounded-xl shadow print:shadow-none p-8">
            <div className="flex flex-wrap gap-2 justify-between items-center mb-6 print:hidden border-b pb-4">
              <button
                onClick={() => setVista("directorio")}
                className="px-4 py-2 bg-gray-200 text-gray-800 font-bold rounded hover:bg-gray-300 transition-colors"
              >
                ← Volver
              </button>
              <div className="space-x-2 flex flex-wrap gap-2 mt-2 md:mt-0">
                <button
                  onClick={handleImprimirExpediente}
                  className="px-3 py-2 bg-purple-600 text-white font-bold rounded shadow hover:bg-purple-700 transition-colors"
                >
                  🖨️ Exportar PDF
                </button>
                <button
                  onClick={abrirPanelEdicion}
                  className="px-3 py-2 bg-yellow-500 text-yellow-900 font-bold rounded shadow hover:bg-yellow-600 transition-colors"
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={handleEliminarIntegrante}
                  className="px-3 py-2 bg-red-600 text-white font-bold rounded shadow hover:bg-red-700 transition-colors"
                >
                  🗑️ Dar de Baja
                </button>
                <button
                  onClick={() => setMostrarFormFirma(!mostrarFormFirma)}
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-700 transition-colors"
                >
                  {mostrarFormFirma
                    ? "Ocultar Paneles"
                    : "⚙️ Acciones Regionales"}
                </button>
              </div>
            </div>

            {modoEdicion && (
              <form
                onSubmit={guardarEdicionIntegrante}
                className="mb-6 p-6 bg-yellow-50 border-2 border-yellow-400 rounded-xl print:hidden shadow-lg"
              >
                <h3 className="font-black text-yellow-900 mb-4 uppercase border-b border-yellow-300 pb-2">
                  Actualizar Datos y Tarjeta
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700">
                      Nombre
                    </label>
                    <input
                      required
                      type="text"
                      value={datosEdicion.nombre}
                      onChange={(e) =>
                        setDatosEdicion({
                          ...datosEdicion,
                          nombre: e.target.value,
                        })
                      }
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700">
                      Apellido
                    </label>
                    <input
                      required
                      type="text"
                      value={datosEdicion.apellido}
                      onChange={(e) =>
                        setDatosEdicion({
                          ...datosEdicion,
                          apellido: e.target.value,
                        })
                      }
                      className="w-full p-2 border rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700">
                      Función
                    </label>
                    <select
                      value={datosEdicion.funcion}
                      onChange={(e) =>
                        setDatosEdicion({
                          ...datosEdicion,
                          funcion: e.target.value,
                        })
                      }
                      className="w-full p-2 border rounded bg-white"
                    >
                      <option value="CONQUISTADOR">Conquistador</option>
                      <option value="CONQUIS+">Conquis+</option>
                      <option value="CONSEJERO">Consejero</option>
                      <option value="INSTRUCTOR">Instructor</option>
                      <option value="SUBDIRECTOR">Subdirector</option>
                      <option value="DIRECTOR">Director</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700">
                      Tarjeta (Clase)
                    </label>
                    <select
                      value={datosEdicion.claseId}
                      onChange={(e) =>
                        setDatosEdicion({
                          ...datosEdicion,
                          claseId: e.target.value,
                        })
                      }
                      className="w-full p-2 border rounded bg-white"
                    >
                      <option value="">-- Sin Asignar --</option>
                      {clasesDisponibles.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-yellow-500 text-yellow-900 font-bold rounded hover:bg-yellow-600"
                  >
                    💾 Guardar Cambios
                  </button>
                  <button
                    type="button"
                    onClick={() => setModoEdicion(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-800 font-bold rounded hover:bg-gray-400"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            <div className="border-b pb-6 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-6">
                <div className="relative group">
                  {integranteSeleccionado.avatarUrl ? (
                    <img
                      src={`${API_BASE}${integranteSeleccionado.avatarUrl}`}
                      className="w-32 h-32 rounded-full object-cover shadow-lg border-4 border-gray-100"
                      alt="avatar"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center shadow-lg border-4 border-gray-100">
                      <span className="text-4xl text-gray-400">📷</span>
                    </div>
                  )}
                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 shadow-md print:hidden">
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleSubirAvatar}
                    />{" "}
                    ✏️
                  </label>
                </div>
                <div>
                  <h2 className="text-3xl font-black text-gray-900 uppercase">
                    {integranteSeleccionado.nombre}{" "}
                    {integranteSeleccionado.apellido}
                  </h2>
                  <p className="text-gray-500 text-lg font-semibold">
                    {integranteSeleccionado.funcion} •{" "}
                    {integranteSeleccionado.club?.nombre || "Sin Club"}
                  </p>
                </div>
              </div>
              <div className="text-center bg-blue-900 text-white p-4 rounded-lg shadow-inner min-w-[120px] print:bg-gray-100 print:text-black print:border-2 print:border-black">
                <span className="block text-4xl font-black text-yellow-400 drop-shadow print:text-black">
                  {integranteSeleccionado.xp}
                </span>
                <span className="text-xs font-bold uppercase tracking-widest text-blue-200 print:text-gray-600">
                  XP Totales
                </span>
              </div>
            </div>

            <div className="mb-8 bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-inner print:border-black print:shadow-none">
              <div className="flex justify-between items-end mb-3">
                <div>
                  <h3 className="font-black text-gray-800 uppercase tracking-wide">
                    Progreso: {estadisticasClase.clase}
                  </h3>
                  <p className="text-sm text-gray-500 font-bold">
                    {estadisticasClase.aprobados} de {estadisticasClase.total}{" "}
                    requisitos
                  </p>
                </div>
                <span className="text-3xl font-black text-green-600 print:text-black">
                  {estadisticasClase.porcentaje}%
                </span>
              </div>
              <div className="w-full bg-gray-300 rounded-full h-5 overflow-hidden shadow-inner">
                <div
                  className="bg-green-500 h-5 rounded-full transition-all flex items-center justify-end pr-2"
                  style={{
                    width: `${Math.max(estadisticasClase.porcentaje, 5)}%`,
                  }}
                >
                  {estadisticasClase.porcentaje > 10 && (
                    <span className="text-[10px] text-white font-black">
                      {estadisticasClase.porcentaje}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {mostrarFormFirma && (
              <div className="grid md:grid-cols-2 gap-6 mb-8 print:hidden">
                <form
                  onSubmit={handleFirmarRequisito}
                  className="p-6 bg-gray-50 border border-gray-200 rounded shadow-inner"
                >
                  <h3 className="text-lg font-black text-gray-800 mb-4 uppercase text-center border-b pb-2">
                    Aprobar Requisito
                  </h3>
                  <div className="space-y-4 mb-4">
                    <select
                      required
                      value={reqId}
                      onChange={(e) => {
                        setReqId(e.target.value);
                        setEspElegidaId("");
                        setOpcionSeleccionada("");
                        setOpcionesMultiples([]);
                      }}
                      className="w-full p-3 border rounded text-sm font-bold text-gray-700"
                    >
                      <option value="">
                        -- Seleccione requisito a firmar --
                      </option>
                      {requisitosPendientes.map((req) => (
                        <option key={req.id} value={req.id}>
                          [{req.seccion}] {req.numero} -{" "}
                          {req.descripcion.substring(0, 60)}...
                        </option>
                      ))}
                    </select>

                    {(() => {
                      const reqActivo = requisitosPendientes.find(
                        (r) => r.id.toString() === reqId,
                      );
                      if (!reqActivo || !reqActivo.opcionesExtra) return null;
                      const normalizar = (texto: string) =>
                        texto
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")
                          .trim()
                          .toLowerCase();
                      const stringOriginal = reqActivo.opcionesExtra.trim();
                      const comandoExtra = stringOriginal.toUpperCase();

                      if (comandoExtra.startsWith("CHECKBOX:")) {
                        const partes = stringOriginal.split(":");
                        if (partes.length < 3)
                          return (
                            <p className="text-red-500 font-bold text-xs p-2 bg-red-50 border border-red-200">
                              ⚠️ Formato de CHECKBOX incorrecto.
                            </p>
                          );
                        const cantidadRequerida = parseInt(
                          partes[1].trim(),
                          10,
                        );
                        const opciones = partes
                          .slice(2)
                          .join(":")
                          .split("|")
                          .map((o) => o.trim());
                        return (
                          <div className="bg-white p-3 border rounded shadow-sm">
                            <label className="block text-xs font-bold text-blue-800 mb-2 uppercase">
                              Seleccione {cantidadRequerida} opciones cumplidas:
                            </label>
                            {opciones.map((opc: string, i: number) => {
                              const estaSeleccionado =
                                opcionesMultiples.includes(opc);
                              const limiteAlcanzado =
                                opcionesMultiples.length >= cantidadRequerida;
                              return (
                                <label
                                  key={i}
                                  className={`flex items-center gap-2 mb-2 text-sm cursor-pointer p-2 rounded border ${estaSeleccionado ? "bg-blue-50 border-blue-400 font-bold text-blue-900" : "bg-gray-50 border-gray-200 text-gray-700"}`}
                                >
                                  <input
                                    type="checkbox"
                                    value={opc}
                                    checked={estaSeleccionado}
                                    onChange={(e) => {
                                      if (e.target.checked)
                                        setOpcionesMultiples((prev) => [
                                          ...prev,
                                          opc,
                                        ]);
                                      else
                                        setOpcionesMultiples((prev) =>
                                          prev.filter((item) => item !== opc),
                                        );
                                    }}
                                    disabled={
                                      !estaSeleccionado && limiteAlcanzado
                                    }
                                    className="w-4 h-4 text-blue-600 rounded"
                                  />{" "}
                                  {opc}
                                </label>
                              );
                            })}
                            {opcionesMultiples.length < cantidadRequerida && (
                              <p className="text-[10px] text-red-500 mt-2 font-black uppercase text-right">
                                ⚠️ Faltan{" "}
                                {cantidadRequerida - opcionesMultiples.length}
                              </p>
                            )}
                          </div>
                        );
                      }
                      if (
                        comandoExtra.startsWith("CATEGORIA:") ||
                        comandoExtra.startsWith("CATEGORIAS:")
                      ) {
                        const categoriasPermitidas = stringOriginal
                          .split(":")[1]
                          .split(/[,|]/)
                          .map(normalizar);
                        const especialidadesFiltradas =
                          catalogoEspecialidades.filter((esp) =>
                            categoriasPermitidas.includes(
                              normalizar(esp.categoria),
                            ),
                          );
                        return (
                          <select
                            required
                            value={espElegidaId}
                            onChange={(e) => setEspElegidaId(e.target.value)}
                            className="w-full p-3 border rounded text-sm bg-blue-50 border-blue-300 font-bold text-gray-700"
                          >
                            <option value="">
                              -- Seleccione Especialidad Permitida --
                            </option>
                            {especialidadesFiltradas.map((esp) => (
                              <option key={esp.id} value={esp.id}>
                                {esp.nombre} [{esp.categoria}]
                              </option>
                            ))}
                          </select>
                        );
                      }
                      if (
                        comandoExtra.startsWith("ESPECIALIDAD:") ||
                        comandoExtra.startsWith("ESPECIALIDADES:")
                      ) {
                        const nombresPermitidos = stringOriginal
                          .split(":")[1]
                          .split(",")
                          .map(normalizar);
                        const especialidadesFiltradas =
                          catalogoEspecialidades.filter((esp) =>
                            nombresPermitidos.includes(normalizar(esp.nombre)),
                          );
                        return (
                          <select
                            required
                            value={espElegidaId}
                            onChange={(e) => setEspElegidaId(e.target.value)}
                            className="w-full p-3 border rounded text-sm bg-yellow-50 border-yellow-300 font-bold text-gray-700"
                          >
                            <option value="">
                              -- Seleccione la Especialidad Obligatoria --
                            </option>
                            {especialidadesFiltradas.map((esp) => (
                              <option key={esp.id} value={esp.id}>
                                {esp.nombre}
                              </option>
                            ))}
                          </select>
                        );
                      }
                      if (comandoExtra.startsWith("OPCIONES:")) {
                        const opciones = stringOriginal
                          .split(":")[1]
                          .split("|")
                          .map((o) => o.trim());
                        return (
                          <div className="bg-white p-3 border rounded shadow-sm">
                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">
                              Seleccione la opción cumplida:
                            </label>
                            {opciones.map((opc: string, i: number) => (
                              <label
                                key={i}
                                className="flex items-center gap-2 mb-1 text-sm text-gray-700 cursor-pointer p-1 hover:bg-gray-50 rounded"
                              >
                                <input
                                  type="radio"
                                  name="opcionRequisito"
                                  value={opc}
                                  required
                                  onChange={(e) =>
                                    setOpcionSeleccionada(e.target.value)
                                  }
                                  className="w-4 h-4 text-blue-600"
                                />{" "}
                                {opc}
                              </label>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {(() => {
                      const reqActivo = requisitosPendientes.find(
                        (r) => r.id.toString() === reqId,
                      );
                      if (
                        reqActivo?.esEspecialidad &&
                        !reqActivo.opcionesExtra
                      ) {
                        return (
                          <select
                            required
                            value={espElegidaId}
                            onChange={(e) => setEspElegidaId(e.target.value)}
                            className="w-full p-3 border rounded text-sm bg-white"
                          >
                            <option value="">
                              -- Seleccione la Especialidad --
                            </option>
                            {catalogoEspecialidades.map((esp) => (
                              <option key={esp.id} value={esp.id}>
                                {esp.nombre}
                              </option>
                            ))}
                          </select>
                        );
                      }
                    })()}

                    <div className="mt-2">
                      <label className="block text-xs font-bold text-gray-500 mb-1">
                        Evidencia Fotográfica (Opcional)
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) =>
                          setFotoRespaldo(e.target.files?.[0] || null)
                        }
                        className="w-full p-2 border rounded bg-white text-sm"
                      />
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 rounded font-black uppercase text-white bg-blue-600 hover:bg-blue-700 shadow-md"
                  >
                    Firmar Cuadernillo
                  </button>
                </form>

                <form
                  onSubmit={handleOtorgarMaestria}
                  className="p-6 bg-yellow-50 border border-yellow-200 rounded shadow-inner flex flex-col justify-between"
                >
                  <div>
                    <h3 className="text-lg font-black text-yellow-900 mb-4 uppercase text-center border-b border-yellow-300 pb-2">
                      Otorgar Maestría
                    </h3>
                    <select
                      required
                      value={maestriaAOtorgarId}
                      onChange={(e) => setMaestriaAOtorgarId(e.target.value)}
                      className="w-full p-3 border border-yellow-300 rounded text-sm bg-white font-bold text-gray-700"
                    >
                      <option value="">
                        -- Seleccione Maestría a otorgar --
                      </option>
                      {catalogoMaestrias.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 mt-4 rounded font-black uppercase text-yellow-900 bg-yellow-400 hover:bg-yellow-500 shadow"
                  >
                    Condecorar 👑
                  </button>
                </form>
              </div>
            )}

            {!bandaVirtual ? (
              <p className="text-gray-500 font-bold">
                Cargando Banda Virtual...
              </p>
            ) : (
              <>
                {bandaVirtual.totalMaestrias > 0 && (
                  <div className="mb-8 break-inside-avoid">
                    <h3 className="text-lg font-black text-gray-800 mb-4 border-b-2 border-yellow-500 inline-block pb-1 uppercase">
                      Maestrías ({bandaVirtual.totalMaestrias})
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {bandaVirtual.maestrias.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-50 to-amber-100 border border-yellow-300 rounded-lg"
                        >
                          <div className="w-14 h-14 rounded shadow flex items-center justify-center bg-yellow-500 border-2 border-yellow-600">
                            <span className="text-2xl">👑</span>
                          </div>
                          <div>
                            <p className="font-black text-yellow-900 leading-tight">
                              {m.maestria.nombre}
                            </p>
                            <p className="text-[10px] font-bold text-yellow-700 uppercase mt-1">
                              Otorgada:{" "}
                              {new Date(m.fechaAprobacion).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="break-inside-avoid">
                  <h3 className="text-lg font-black text-gray-800 mb-4 border-b-2 border-green-500 inline-block pb-1 uppercase">
                    Especialidades ({bandaVirtual.totalEspecialidades})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                    {bandaVirtual.especialidades.map((item) => (
                      <div
                        key={item.id}
                        className="flex flex-col items-center justify-center p-4 bg-gray-50 border border-gray-200 rounded"
                      >
                        <div
                          className="w-14 h-14 rounded-full flex items-center justify-center shadow-inner mb-2 border-4 border-white"
                          style={{
                            backgroundColor:
                              item.especialidad.colorFondo || "#3B82F6",
                          }}
                        >
                          <span className="text-white font-black text-xl">
                            {item.especialidad.nombre.charAt(0)}
                          </span>
                        </div>
                        <p className="text-center font-bold text-gray-800 text-[10px] uppercase leading-tight">
                          {item.especialidad.nombre}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* VISTA 7: MENSAJERÍA */}
        {vista === "mensajes" && (
          <Mensajeria alActualizar={descontarNotificacion} />
        )}
      </main>
    </div>
  );
}

export default App;
