import { useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';

// --- INTERFACES ---
interface Integrante { id: number; nombre: string; apellido: string; xp: number; funcion: string; avatarUrl?: string; club: { nombre: string }; clase?: { nombre: string }; claseId?: number; }
interface EspecialidadGanada { id: number; fechaAprobacion: string; especialidad: { nombre: string; categoria: string; colorFondo: string; }; }
interface MaestriaGanada { id: number; fechaAprobacion: string; maestria: { nombre: string; requisitos: string; }; }
interface BandaVirtual { totalEspecialidades: number; especialidades: EspecialidadGanada[]; totalMaestrias: number; maestrias: MaestriaGanada[]; }
interface RequisitoPendiente { id: number; numero: string; descripcion: string; seccion: string; esEspecialidad: boolean; puntosXp: number; opcionesExtra?: string; }
interface LogAuditoria { id: number; metodo: string; ruta: string; ip: string; fecha: string; usuario?: { nombre: string; email: string; }; }
interface MaestriaCatalogo { id: number; nombre: string; requisitos: string; }
interface Metricas { totalIntegrantes: number; totalInvestidos: number; topXP: string; porcentaje: number; }
interface OpcionLista { id: number; nombre: string; } 

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('tokenConquis'));
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [errorLogin, setErrorLogin] = useState('');

  const [vista, setVista] = useState<'dashboard' | 'directorio' | 'perfil' | 'auditoria' | 'gestion' | 'agenda'>('dashboard');
  // Estados para la Agenda Regional
  const [eventosAgenda, setEventosAgenda] = useState<any[]>([]);
  const [nuevoEvento, setNuevoEvento] = useState({ titulo: '', descripcion: '', fecha: '', clubId: '' });
  const [ranking, setRanking] = useState<Integrante[]>([]);
  const [directorio, setDirectorio] = useState<Integrante[]>([]);
  const [clubSeleccionadoDirectorio, setClubSeleccionadoDirectorio] = useState<string>('');
  const [logsAuditoria, setLogsAuditoria] = useState<LogAuditoria[]>([]);
  const [filtroAudit, setFiltroAudit] = useState("");
  const [metricas, setMetricas] = useState<Metricas>({ totalIntegrantes: 0, totalInvestidos: 0, topXP: '-', porcentaje: 0 });
  const [catalogoMaestrias, setCatalogoMaestrias] = useState<MaestriaCatalogo[]>([]);
  const [catalogoEspecialidades, setCatalogoEspecialidades] = useState<any[]>([]); 
  const [clubesDisponibles, setClubesDisponibles] = useState<OpcionLista[]>([]); 
  const [clasesDisponibles, setClasesDisponibles] = useState<OpcionLista[]>([]); 
  const [listaDirectores, setListaDirectores] = useState<any[]>([]);
  const [modoEdicion, setModoEdicion] = useState(false);
  const [datosEdicion, setDatosEdicion] = useState({ nombre: '', apellido: '', funcion: '', claseId: '' });
  const [opcionesMultiples, setOpcionesMultiples] = useState<string[]>([]);
  const [cargando, setCargando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  const [dirEditando, setDirEditando] = useState<any>(null);
  
  const [integranteSeleccionado, setIntegranteSeleccionado] = useState<Integrante | null>(null);
  const [bandaVirtual, setBandaVirtual] = useState<BandaVirtual | null>(null);
  const [requisitosPendientes, setRequisitosPendientes] = useState<RequisitoPendiente[]>([]);
  const [estadisticasClase, setEstadisticasClase] = useState({ total: 0, aprobados: 0, porcentaje: 0, clase: '' });
  
  const [mostrarFormFirma, setMostrarFormFirma] = useState(false);
  const [reqId, setReqId] = useState('');
  const [espElegidaId, setEspElegidaId] = useState('');
  const [fotoRespaldo, setFotoRespaldo] = useState<File | null>(null);
  const [maestriaAOtorgarId, setMaestriaAOtorgarId] = useState('');
  const [opcionSeleccionada, setOpcionSeleccionada] = useState<string>(''); 
    
  const [altaConqui, setAltaConqui] = useState({ dni: '', nombre: '', apellido: '', fechaNacimiento: '', funcion: 'CONQUISTADOR', claseId: '', clubId: '' });
  const [altaDir, setAltaDir] = useState({ nombre: '', email: '', password: '', rol: 'DIRECTOR', clubId: '' }); 
  const [altaClub, setAltaClub] = useState({ nombre: '', iglesia: '', distrito: '' }); 

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      cargarCatalogoMaestrias(); cargarRankingYMetricas(); cargarCatalogosFormularios(); 
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault(); setErrorLogin('');
    try {
      const res = await axios.post('http://localhost:3000/api/auth/login', { email: loginEmail, password: loginPass });
      const tokenReal = res.data.token;
      // 👇 AGREGAMOS ESTA LÍNEA 👇
      localStorage.setItem('rolConquis', res.data.usuario.rol); // Guardamos el rol al entrar
      localStorage.setItem('tokenConquis', tokenReal); setToken(tokenReal);
    } catch (error: any) { setErrorLogin(error.response?.data?.message || 'Error de conexión.'); }
  };

  const cerrarSesion = () => { localStorage.removeItem('tokenConquis'); setToken(null); setVista('dashboard'); };

  const cargarRankingYMetricas = () => {
    setCargando(true);
    axios.get('http://localhost:3000/api/integrantes/ranking').then(res => setRanking(res.data.data)).catch(console.error);
    axios.get('http://localhost:3000/api/integrantes/metricas').then(res => setMetricas(res.data.data)).catch(console.error).finally(() => setCargando(false));
  };

  const cargarCatalogoMaestrias = () => { axios.get('http://localhost:3000/api/especialidades/maestrias').then(res => setCatalogoMaestrias(res.data.data)).catch(console.error); };

  const cargarCatalogosFormularios = () => { 
    axios.get('http://localhost:3000/api/integrantes/clubes/lista').then(res => {
      setClubesDisponibles(res.data.data);
      if(res.data.data.length > 0) setClubSeleccionadoDirectorio(res.data.data[0].id.toString());
    }).catch(console.error); 
    axios.get('http://localhost:3000/api/integrantes/clases/lista').then(res => setClasesDisponibles(res.data.data)).catch(console.error);
    axios.get('http://localhost:3000/api/especialidades').then(res => setCatalogoEspecialidades(res.data.data)).catch(console.error);
    axios.get('http://localhost:3000/api/auth/usuarios').then(res => setListaDirectores(res.data.data)).catch(console.error);
  };

  const cargarAuditoria = async () => {
    try {
      // Axios ya tiene el 'Authorization' seteado globalmente en el useEffect
      const respuesta = await axios.get('http://localhost:3000/api/auditoria');
      setLogsAuditoria(respuesta.data.data);
    } catch (error) {
      console.error("Error cargando bitácora:", error);
    }
  };

  // --- FUNCIONES DE AGENDA ---
  const cargarAgenda = async () => {
    try {
      const res = await axios.get('http://localhost:3000/api/agenda');
      setEventosAgenda(res.data.data);
    } catch (error) { console.error("Error cargando agenda", error); }
  };

  const handleCrearEvento = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3000/api/agenda', nuevoEvento);
      alert('📅 Evento agendado con éxito.');
      setNuevoEvento({ titulo: '', descripcion: '', fecha: '', clubId: '' });
      cargarAgenda(); // Recargamos la lista
    } catch (error: any) { alert(`Error al agendar: ${error.response?.data?.message}`); }
  };

  const handleEliminarEvento = async (id: number) => {
    if (window.confirm('⚠️ ¿Estás seguro de que querés eliminar este evento de la agenda regional?')) {
      try {
        await axios.delete(`http://localhost:3000/api/agenda/${id}`);
        cargarAgenda(); // Recargamos la lista
      } catch (error: any) {
        alert(`Error al eliminar: ${error.response?.data?.message}`);
      }
    }
  };

  const handleBackupSeguridad = () => {
    alert("Iniciando volcado de Base de Datos cifrada... (Módulo en construcción para la Fase 4)");
    // Acá luego conectaremos la API que hace el pg_dump
  };

  // --- CONTROLADOR DE VISTAS ---
  useEffect(() => {
    if (vista === 'directorio' && clubSeleccionadoDirectorio) {
      setCargando(true);
      axios.get(`http://localhost:3000/api/integrantes/club/${clubSeleccionadoDirectorio}?limit=100`)
        .then(res => setDirectorio(res.data.data)).catch(console.error).finally(() => setCargando(false));
    }
    if (vista === 'auditoria') cargarAuditoria();
    if (vista === 'agenda') cargarAgenda(); // <-- Inyectamos la llamada acá
  }, [vista, clubSeleccionadoDirectorio]);

  const verPerfil = async (integrante: Integrante) => {
    setIntegranteSeleccionado(integrante); setVista('perfil'); setBandaVirtual(null); setMostrarFormFirma(false);
    try {
      const resBanda = await axios.get(`http://localhost:3000/api/integrantes/${integrante.id}/banda-virtual`); setBandaVirtual(resBanda.data.data);
      const resPendientes = await axios.get(`http://localhost:3000/api/progresos/integrante/${integrante.id}/pendientes`); setRequisitosPendientes(resPendientes.data.data);
      const resStats = await axios.get(`http://localhost:3000/api/progresos/integrante/${integrante.id}/estadisticas`); setEstadisticasClase(resStats.data.data);
    } catch (error) { console.error(error); }
  };

  const handleSubirAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!integranteSeleccionado || !e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const formData = new FormData(); formData.append('foto', file);
    try {
      const res = await axios.post(`http://localhost:3000/api/integrantes/${integranteSeleccionado.id}/avatar`, formData, { headers: { 'Content-Type': 'multipart/form-data' }});
      alert('Foto de perfil actualizada.'); verPerfil({...integranteSeleccionado, avatarUrl: res.data.data.avatarUrl}); 
    } catch (error: any) { alert(`Error al subir foto: ${error.response?.data?.message}`); }
  };

  const handleFirmarRequisito = async (e: FormEvent) => {
    e.preventDefault(); if (!integranteSeleccionado || !reqId) return;
    
    const reqActivo = requisitosPendientes.find(r => r.id.toString() === reqId);
    
    // Validación del nuevo comodín
    if (reqActivo?.opcionesExtra?.startsWith('CHECKBOX:')) {
      const cantidadRequerida = parseInt(reqActivo.opcionesExtra.split(':')[1], 10);
      if (opcionesMultiples.length < cantidadRequerida) {
        alert(`Debés tildar al menos ${cantidadRequerida} opciones para cumplir este requisito.`);
        return; // Frenamos la firma si no cumple
      }
    }
    const formData = new FormData(); formData.append('integranteId', integranteSeleccionado.id.toString()); formData.append('requisitoId', reqId);
    if (espElegidaId) formData.append('especialidadElegidaId', espElegidaId); if (fotoRespaldo) formData.append('foto', fotoRespaldo);
    try {
      const res = await axios.post('http://localhost:3000/api/progresos/firmar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert(`¡Éxito! ${res.data.message}`); setReqId(''); setEspElegidaId(''); setFotoRespaldo(null); setMostrarFormFirma(false); verPerfil(integranteSeleccionado);
      if (opcionSeleccionada) formData.append('notas', opcionSeleccionada);
    } catch (error: any) { alert(`Error al firmar: ${error.response?.data?.message}`); }
    if (opcionesMultiples.length > 0) formData.append('notas', opcionesMultiples.join(' | '));
  };

  const handleOtorgarMaestria = async (e: FormEvent) => {
    e.preventDefault(); if (!integranteSeleccionado || !maestriaAOtorgarId) return;
    try {
      await axios.post('http://localhost:3000/api/especialidades/maestria/otorgar', { integranteId: integranteSeleccionado.id, maestriaId: maestriaAOtorgarId });
      alert('¡Maestría otorgada con honor!'); setMaestriaAOtorgarId(''); verPerfil(integranteSeleccionado);
    } catch (error: any) { alert(`Error: ${error.response?.data?.message}`); }
  };

  const handleEliminarIntegrante = async () => {
    if (!integranteSeleccionado) return;
    const confirmacion = window.confirm(`⚠️ ADVERTENCIA DE SEGURIDAD ⚠️\n¿Eliminar a ${integranteSeleccionado.nombre} ${integranteSeleccionado.apellido} de forma IRREVERSIBLE?`);
    if (confirmacion) {
      try {
        await axios.delete(`http://localhost:3000/api/integrantes/${integranteSeleccionado.id}`);
        alert('Expediente eliminado permanentemente.'); setVista('dashboard');
      } catch (error: any) { alert(`Error al eliminar: ${error.response?.data?.message}`); }
    }
  };

  const guardarEdicionIntegrante = async (e: FormEvent) => {
    e.preventDefault();
    if (!integranteSeleccionado) return;
    try {
      const res = await axios.put(`http://localhost:3000/api/integrantes/${integranteSeleccionado.id}`, datosEdicion);
      alert('¡Expediente actualizado!');
      setModoEdicion(false);
      verPerfil(res.data.data);
    } catch (error) {
      alert("Error al editar el expediente.");
    }
  };

  const abrirPanelEdicion = () => {
    setDatosEdicion({
      nombre: integranteSeleccionado?.nombre || '',
      apellido: integranteSeleccionado?.apellido || '',
      funcion: integranteSeleccionado?.funcion || '',
      claseId: integranteSeleccionado?.claseId?.toString() || ''
    });
    setModoEdicion(true);
  };

  const handleImprimirExpediente = () => { window.print(); };

  const handleAltaConquistador = async (e: FormEvent) => {
    e.preventDefault(); if (!altaConqui.clubId) { alert("Debes seleccionar un club."); return; }
    try {
      await axios.post('http://localhost:3000/api/integrantes', altaConqui);
      alert("¡Integrante alistado exitosamente!"); setAltaConqui({ dni: '', nombre: '', apellido: '', fechaNacimiento: '', funcion: 'CONQUISTADOR', claseId: '', clubId: ''  });
    } catch (error: any) { alert(`Error: ${error.response?.data?.message}`); }
  };

  const handleAltaDirector = async (e: FormEvent) => {
    e.preventDefault(); if (!altaDir.clubId) { alert("Debés asignarle un club al Director."); return; }
    try {
      await axios.post('http://localhost:3000/api/auth/registro', altaDir);
      alert("¡Director registrado exitosamente!"); setAltaDir({ nombre: '', email: '', password: '', rol: 'DIRECTOR', clubId: '' });
    } catch (error: any) { alert(`Error: ${error.response?.data?.message}`); }
  };

  const handleAltaClub = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:3000/api/integrantes/clubes', altaClub);
      alert("¡Club fundado exitosamente!"); setAltaClub({ nombre: '', iglesia: '', distrito: '' }); cargarCatalogosFormularios(); 
    } catch (error: any) { alert(`Error: ${error.response?.data?.message}`); }
  };

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
          console.log("Datos leídos del Excel:", results.data); 
          await axios.post('http://localhost:3000/api/progresos/carga-masiva', { requisitos: results.data });
          alert(`¡Ingesta exitosa! Se cargaron ${results.data.length} requisitos.`);
          e.target.value = ''; 
        } catch (error: any) {
          console.error("Error del servidor:", error.response?.data);
          alert(`Error al cargar: ${error.response?.data?.message || 'Mirá la consola (F12) para más detalles.'}`);
        }
      }
    });
  };

  // --- INGESTA INICIAL DE ESPECIALIDADES ---
  const handleSubirEspecialidades = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('archivo', file);

    try {
      const res = await axios.post('http://localhost:3000/api/especialidades/importar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(`✅ ¡Base Maestra Cargada!\n${res.data.message}`);
      e.target.value = ''; // Limpiar el input
      cargarCatalogosFormularios(); // Recargar los menús desplegables
    } catch (error: any) {
      alert(`❌ Error en la ingesta: ${error.response?.data?.message || 'Revisá la consola.'}`);
    }
  };

  const handleLimpiarManuales = async () => {
    const confirmacion = window.confirm("⚠️ ADVERTENCIA CRÍTICA ⚠️\n¿Estás seguro de que querés ELIMINAR TODOS los requisitos y manuales cargados en el sistema? Esto no se puede deshacer.");
    if (confirmacion) {
      try {
        await axios.delete('http://localhost:3000/api/progresos/carga-masiva/limpiar');
        alert("¡Base de datos limpiada con éxito! Ya podés subir el CSV corregido.");
      } catch (error: any) {
        alert(`Error al limpiar: ${error.response?.data?.message || 'Revisá la consola.'}`);
      }
    }
  };

  const descargarExcel = async () => {
    setDescargando(true);
    try {
      const clubParaExportar = clubesDisponibles.length > 0 ? clubesDisponibles[0].id : 1;
      const response = await axios.get(`http://localhost:3000/api/reportes/investidura/club/${clubParaExportar}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a'); link.href = url; link.setAttribute('download', `Investidura_Club.xlsx`);
      document.body.appendChild(link); link.click(); link.parentNode?.removeChild(link);
    } catch { alert("Error al descargar el archivo Excel."); } finally { setDescargando(false); }
  };

  // --- CARGA MASIVA DE INTEGRANTES (EXCEL) ---
  const handleDescargarPlantillaIntegrantes = async () => {
    try {
      // Pedimos el archivo Excel generado al vuelo por el backend
      const response = await axios.get('http://localhost:3000/api/integrantes/plantilla', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a'); link.href = url; link.setAttribute('download', `Plantilla_Alta_Masiva.xlsx`);
      document.body.appendChild(link); link.click(); link.parentNode?.removeChild(link);
    } catch (error) { 
      alert("Error al descargar la plantilla. Verificá la consola."); 
    }
  };

  const handleSubirExcelIntegrantes = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('archivo', file); // ATENCIÓN: El backend (Multer) tiene que buscar 'archivo'

    try {
      const res = await axios.post('http://localhost:3000/api/integrantes/importar', formData, { 
        headers: { 'Content-Type': 'multipart/form-data' } 
      });
      alert(`¡Éxito! ${res.data.message}`);
      e.target.value = ''; // Limpiamos el input
      cargarCatalogosFormularios(); // Recargamos para que aparezcan en el directorio
    } catch (error: any) {
      alert(`Error en la importación: ${error.response?.data?.message || 'Revisá la consola.'}`);
    }
  };

  // --- DATOS PARA GRÁFICOS ---
  const dataTorta = [
    { name: 'Investidos', value: metricas.totalInvestidos },
    { name: 'En Proceso', value: metricas.totalIntegrantes - metricas.totalInvestidos }
  ];
  const COLORES_TORTA = ['#10B981', '#E5E7EB']; 
  const dataBarras = ranking.map(int => ({ nombre: int.nombre, xp: int.xp }));

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 to-gray-900 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
          <div className="text-center mb-8"><span className="text-5xl">🛡️</span><h1 className="text-2xl font-black text-gray-800 mt-4 tracking-wider uppercase">SG Conquis Pro</h1><p className="text-gray-500 font-semibold">Acceso Autorizado</p></div>
          {errorLogin && <div className="bg-red-100 text-red-800 p-3 rounded mb-4 text-sm font-bold border border-red-200">{errorLogin}</div>}
          <form onSubmit={handleLogin} className="space-y-5">
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Correo Electrónico</label><input type="email" required value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="w-full mt-1 p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none" /></div>
            <div><label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Contraseña Segura</label><input type="password" required value={loginPass} onChange={e => setLoginPass(e.target.value)} className="w-full mt-1 p-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 outline-none" /></div>
            <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-lg shadow-lg uppercase tracking-widest">Iniciar Sesión</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <nav className="bg-blue-900 text-white shadow-md p-4 print:hidden">
        <div className="max-w-6xl mx-auto flex flex-wrap justify-between items-center gap-4">
          <div className="font-black text-xl tracking-wider flex items-center gap-2">🛡️ <span className="hidden sm:inline">SG Conquis Pro</span></div>
          <div className="space-x-1 sm:space-x-2 text-sm sm:text-base flex flex-wrap">
            <button onClick={() => setVista('dashboard')} className={`px-3 py-2 rounded font-bold transition-colors ${vista === 'dashboard' ? 'bg-blue-700' : 'hover:bg-blue-800'}`}>Tablero</button>
            <button onClick={() => setVista('directorio')} className={`px-3 py-2 rounded font-bold transition-colors ${vista === 'directorio' ? 'bg-yellow-600' : 'hover:bg-blue-800'}`}>Directorio</button>
            <button onClick={() => setVista('gestion')} className={`px-3 py-2 rounded font-bold transition-colors ${vista === 'gestion' ? 'bg-green-700' : 'hover:bg-blue-800'}`}>Gestión</button>
            <button onClick={() => setVista('agenda')} className={`px-3 py-2 rounded font-bold transition-colors ${vista === 'agenda' ? 'bg-purple-600' : 'hover:bg-blue-800'}`}>Agenda</button>
            <button onClick={() => setVista('auditoria')} className={`px-3 py-2 rounded font-bold transition-colors ${vista === 'auditoria' ? 'bg-red-700' : 'hover:bg-blue-800'}`}>Auditoría</button>
            <button onClick={cerrarSesion} className="px-3 py-2 bg-red-600 rounded font-bold hover:bg-red-700 transition-colors ml-4 border border-red-500">Salir</button>
          </div>
        </div>
      </nav>

      <main className="flex-1 p-4 sm:p-8 max-w-6xl mx-auto w-full">
        
        {/* VISTA 1: DASHBOARD CON GRÁFICOS (RECHARTS) */}
        {vista === 'dashboard' && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-3xl font-bold text-gray-800 border-b-4 border-yellow-500 pb-2 inline-block">Tablero Gerencial</h1>
              <button onClick={descargarExcel} disabled={descargando} className={`px-4 py-2 rounded shadow text-white font-bold transition-colors ${descargando ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>{descargando ? 'Generando...' : '📥 Exportar Excel'}</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500"><p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Plantilla Activa</p><p className="text-3xl font-black text-blue-900 mt-2">{metricas.totalIntegrantes}</p></div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500"><p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Investidos</p><p className="text-3xl font-black text-green-600 mt-2">{metricas.totalInvestidos}</p></div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-yellow-500"><p className="text-sm font-bold text-gray-500 uppercase tracking-wide">% Efectividad</p><p className="text-3xl font-black text-yellow-600 mt-2">{metricas.porcentaje}%</p></div>
              <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500"><p className="text-sm font-bold text-gray-500 uppercase tracking-wide">Top Regional</p><p className="text-lg font-black text-purple-900 mt-2 truncate">{metricas.topXP}</p></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center justify-center">
                <h2 className="text-lg font-black text-gray-800 mb-2 uppercase">Efectividad de Investidura</h2>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={dataTorta} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {dataTorta.map((_, index) => <Cell key={`cell-${index}`} fill={COLORES_TORTA[index % COLORES_TORTA.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col items-center justify-center">
                <h2 className="text-lg font-black text-gray-800 mb-2 uppercase">Distribución de Experiencia (Top 5)</h2>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dataBarras.slice(0, 5)} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                      <XAxis dataKey="nombre" tick={{fontSize: 12}} />
                      <YAxis /> 
                      <Tooltip cursor={{fill: 'transparent'}} />
                      <Bar dataKey="xp" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-black text-gray-800 mb-4 uppercase">Ranking Conquis+ (Top 10)</h2>
              {cargando ? <p className="text-gray-500 font-bold animate-pulse">Cargando datos...</p> : (
                <div className="grid gap-3">
                  {ranking.map((int, idx) => (
                    <div key={int.id} onClick={() => verPerfil(int)} className="flex items-center justify-between p-4 bg-gray-50 rounded border cursor-pointer hover:border-blue-300 hover:shadow-md transition-all">
                      <div className="flex items-center gap-4">
                        {int.avatarUrl ? 
                          <img src={`http://localhost:3000${int.avatarUrl}`} className={`w-10 h-10 rounded-full object-cover border-2 ${idx === 0 ? 'border-yellow-500' : 'border-gray-300'}`} alt="Avatar"/> :
                          <div className={`w-10 h-10 flex items-center justify-center rounded-full font-black text-white ${idx === 0 ? 'bg-yellow-500' : 'bg-gray-400'}`}>{idx + 1}</div>
                        }
                        <div><h3 className="font-bold text-lg text-gray-800">{int.nombre} {int.apellido}</h3><p className="text-sm text-gray-500">{int.club?.nombre} • Ver expediente</p></div>
                      </div>
                      <div className="bg-blue-100 px-4 py-2 rounded border border-blue-200 text-blue-900 font-black tracking-widest">{int.xp} XP</div>
                    </div>
                  ))}
                  {ranking.length === 0 && <p className="text-gray-500 text-center py-4">No hay integrantes con XP registrados.</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VISTA 2: DIRECTORIO COMPLETO */}
        {vista === 'directorio' && (
          <div className="animate-fade-in">
             <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
               <h1 className="text-3xl font-bold text-gray-800 border-b-4 border-yellow-500 pb-2">Directorio Regional</h1>
               <div className="w-full md:w-1/3">
                 <label className="block text-xs font-bold text-gray-500 uppercase">Seleccionar Club</label>
                 <select value={clubSeleccionadoDirectorio} onChange={(e) => setClubSeleccionadoDirectorio(e.target.value)} className="w-full p-2 border-2 border-gray-300 rounded font-bold">
                   {clubesDisponibles.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                 </select>
               </div>
             </div>

             {cargando ? <p className="animate-pulse font-bold text-gray-500">Cargando nómina...</p> : (
               <div className="bg-white rounded-xl shadow-lg overflow-x-auto border border-gray-200">
                 <table className="w-full text-left text-sm">
                   <thead className="bg-gray-800 text-white uppercase text-xs"><tr className="divide-x divide-gray-700"><th className="p-4">Integrante</th><th className="p-4">Función</th><th className="p-4">Clase Actual</th><th className="p-4 text-center">Acción</th></tr></thead>
                   <tbody className="divide-y divide-gray-200">
                     {directorio.map((int) => (
                       <tr key={int.id} className="hover:bg-blue-50">
                         <td className="p-4 flex items-center gap-3">
                           {int.avatarUrl ? <img src={`http://localhost:3000${int.avatarUrl}`} className="w-8 h-8 rounded-full object-cover shadow" /> : <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white font-bold">{int.nombre.charAt(0)}</div>}
                           <span className="font-bold text-gray-800">{int.nombre} {int.apellido}</span>
                         </td>
                         <td className="p-4 text-gray-600 font-semibold">{int.funcion}</td>
                         <td className="p-4"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-bold">{int.clase?.nombre || 'Sin Asignar'}</span></td>
                         <td className="p-4 text-center"><button onClick={() => verPerfil(int)} className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700">Ver Perfil</button></td>
                       </tr>
                     ))}
                     {directorio.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-gray-500 font-bold">No hay integrantes en este club.</td></tr>}
                   </tbody>
                 </table>
               </div>
             )}
          </div>
        )}

        {/* VISTA 3: GESTIÓN DE ALTAS */}
        {vista === 'gestion' && (
          <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-green-500">
              <h2 className="text-xl font-black text-gray-800 mb-6 uppercase">Agregar Integrante</h2>
              <form onSubmit={handleAltaConquistador} className="space-y-4">
                {/* NUEVO: Campo DNI */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">DNI (Sin puntos) *</label>
                  <input required type="number" value={altaConqui.dni} onChange={e=>setAltaConqui({...altaConqui, dni: e.target.value})} className="w-full p-2 border rounded bg-gray-50 text-sm" placeholder="Ej: 45123456" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-gray-700 mb-1">Nombre *</label><input required type="text" value={altaConqui.nombre} onChange={e=>setAltaConqui({...altaConqui, nombre: e.target.value})} className="w-full p-2 border rounded bg-gray-50 text-sm" /></div>
                  <div><label className="block text-xs font-bold text-gray-700 mb-1">Apellido *</label><input required type="text" value={altaConqui.apellido} onChange={e=>setAltaConqui({...altaConqui, apellido: e.target.value})} className="w-full p-2 border rounded bg-gray-50 text-sm" /></div>
                </div>
                
                <div><label className="block text-xs font-bold text-gray-700 mb-1">Club *</label><select required value={altaConqui.clubId} onChange={e=>setAltaConqui({...altaConqui, clubId: e.target.value})} className="w-full p-2 border rounded bg-white text-sm"><option value="">-- Seleccione club --</option>{clubesDisponibles.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
                <div><label className="block text-xs font-bold text-gray-700 mb-1">Nacimiento</label><input required type="date" value={altaConqui.fechaNacimiento} onChange={e=>setAltaConqui({...altaConqui, fechaNacimiento: e.target.value})} className="w-full p-2 border rounded bg-gray-50 text-sm" /></div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-gray-700 mb-1">Función</label><select value={altaConqui.funcion} onChange={e=>setAltaConqui({...altaConqui, funcion: e.target.value})} className="w-full p-2 border rounded bg-white text-sm"><option value="CONQUISTADOR">Conquistador</option><option value="CONQUIS+">Conquis+</option><option value="CONSEJERO">Consejero</option><option value="INSTRUCTOR">Instructor</option><option value="SUBDIRECTOR">Subdirector</option><option value="DIRECTOR">Director</option></select></div>
                  <div><label className="block text-xs font-bold text-gray-700 mb-1">Clase Inicial</label><select value={altaConqui.claseId} onChange={e=>setAltaConqui({...altaConqui, claseId: e.target.value})} className="w-full p-2 border rounded bg-white text-sm"><option value="">-- Ninguna --</option>{clasesDisponibles.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
                </div>
                
                <button type="submit" className="w-full py-3 mt-4 bg-green-600 text-white font-black rounded hover:bg-green-700">REGISTRAR MANUALMENTE</button>
              </form>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-500">
              <h2 className="text-xl font-black text-gray-800 mb-6 uppercase">Agregar Director</h2>
              <form onSubmit={handleAltaDirector} className="space-y-4">
                <div><label className="block text-xs font-bold text-gray-700 mb-1">Nombre</label><input required type="text" value={altaDir.nombre} onChange={e=>setAltaDir({...altaDir, nombre: e.target.value})} className="w-full p-2 border rounded bg-gray-50 text-sm" /></div>
                <div><label className="block text-xs font-bold text-gray-700 mb-1">Email</label><input required type="email" value={altaDir.email} onChange={e=>setAltaDir({...altaDir, email: e.target.value})} className="w-full p-2 border rounded bg-gray-50 text-sm" /></div>
                <div><label className="block text-xs font-bold text-gray-700 mb-1">Contraseña</label><input required type="password" value={altaDir.password} onChange={e=>setAltaDir({...altaDir, password: e.target.value})} className="w-full p-2 border rounded bg-gray-50 text-sm" /></div>
                <div><label className="block text-xs font-bold text-gray-700 mb-1">Asignar a Club *</label><select required value={altaDir.clubId} onChange={e=>setAltaDir({...altaDir, clubId: e.target.value})} className="w-full p-2 border rounded text-sm bg-blue-50"><option value="">-- Seleccionar Club --</option>{clubesDisponibles.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
                <button type="submit" className="w-full py-3 mt-4 bg-blue-600 text-white font-black rounded hover:bg-blue-700">CREAR ACCESO</button>
              </form>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-yellow-500">
              <h2 className="text-xl font-black text-gray-800 mb-6 uppercase">Agregar Club</h2>
              <form onSubmit={handleAltaClub} className="space-y-4">
                <div><label className="block text-xs font-bold text-gray-700 mb-1">Nombre del Club *</label><input required type="text" value={altaClub.nombre} onChange={e=>setAltaClub({...altaClub, nombre: e.target.value})} className="w-full p-2 border rounded bg-gray-50 text-sm" /></div>
                <div><label className="block text-xs font-bold text-gray-700 mb-1">Iglesia</label><input type="text" value={altaClub.iglesia} onChange={e=>setAltaClub({...altaClub, iglesia: e.target.value})} className="w-full p-2 border rounded bg-gray-50 text-sm" /></div>
                <div><label className="block text-xs font-bold text-gray-700 mb-1">Distrito</label><input type="text" value={altaClub.distrito} onChange={e=>setAltaClub({...altaClub, distrito: e.target.value})} className="w-full p-2 border rounded bg-gray-50 text-sm" /></div>
                <button type="submit" className="w-full py-3 mt-4 bg-yellow-500 text-yellow-900 font-black rounded hover:bg-yellow-600">REGISTRAR CLUB</button>
              </form>
            </div>

            {/* CARGA MASIVA DE INTEGRANTES (EXCEL) */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-emerald-500 flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-black text-gray-800 mb-2 uppercase">Importar Nómina (Excel)</h2>
                <p className="text-xs text-gray-500 font-bold mb-4">Descargá la plantilla, completala con los datos del club y subila para alistarlos de una sola vez.</p>
                
                <button type="button" onClick={handleDescargarPlantillaIntegrantes} className="w-full py-2 mb-4 text-xs font-black tracking-widest text-emerald-800 bg-emerald-100 border border-emerald-300 rounded hover:bg-emerald-200 uppercase transition-colors">
                  📥 Bajar Plantilla Inteligente
                </button>
                
                <label className="block w-full py-3 bg-gray-50 border-2 border-dashed border-gray-400 text-gray-700 font-black text-center rounded cursor-pointer hover:bg-gray-200 transition-colors">
                  <input type="file" accept=".xlsx, .xls" onChange={handleSubirExcelIntegrantes} className="hidden" />
                  🚀 SUBIR EXCEL LLENO
                </label>
              </div>
            </div>

            {/* INGESTA DE MANUALES (EXCEL/CSV) */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-purple-500 flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-black text-gray-800 mb-2 uppercase">Cargar Requisitos (CSV)</h2>
                <p className="text-xs text-gray-500 font-bold mb-4">Guardá tu Excel como formato "CSV (delimitado por comas)" antes de subirlo.</p>
                <label className="block w-full py-3 bg-purple-100 border-2 border-dashed border-purple-400 text-purple-700 font-black text-center rounded cursor-pointer hover:bg-purple-200 transition-colors">
                  <input type="file" accept=".csv" onChange={handleSubirCSV} className="hidden" />
                  📂 SELECCIONAR ARCHIVO MATRIZ
                </label>
              </div>
              <button type="button" onClick={handleLimpiarManuales} className="w-full py-2 mt-4 text-xs font-black tracking-widest text-red-700 bg-red-100 border border-red-300 rounded hover:bg-red-200 uppercase transition-colors">
                ⚠️ Purgar Base de Datos (Reset)
              </button>
              <button type="button" onClick={handleBackupSeguridad} className="w-full py-2 mt-2 text-xs font-black tracking-widest text-blue-700 bg-blue-100 border border-blue-300 rounded hover:bg-blue-200 uppercase transition-colors">
                💾 Descargar Backup de Seguridad
              </button>
            </div>

            {/* INGESTA MAESTRA (SOLO SYSADMIN / REGIONAL) */}
            {localStorage.getItem('rolConquis') === 'REGIONAL' && (
              <div className="bg-gray-900 rounded-xl shadow-lg p-6 border-t-4 border-red-500 flex flex-col justify-between">
                <div>
                  <h2 className="text-xl font-black text-red-500 mb-2 uppercase flex items-center gap-2">🛠️ Setup Inicial (Solo Admin)</h2>
                  <p className="text-xs text-gray-400 font-bold mb-4">Carga la base oficial de Especialidades y Maestrías (Excel de 500+ items). Solo debe ejecutarse al inicializar el servidor.</p>
                  
                  <label className="block w-full py-3 bg-red-900/30 border-2 border-dashed border-red-500 text-red-400 font-black text-center rounded cursor-pointer hover:bg-red-900/50 transition-colors">
                    <input type="file" accept=".xlsx, .xls" onChange={handleSubirEspecialidades} className="hidden" />
                    🔥 SUBIR DICCIONARIO OFICIAL (EXCEL)
                  </label>
                </div>
              </div>
            )}

            {/* TORRE DE CONTROL: USUARIOS Y DIRECTORES */}
            <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-white rounded-xl shadow-lg p-6 border-t-4 border-gray-800 mt-4">
              <h2 className="text-xl font-black text-gray-800 mb-4 uppercase">Nómina de Accesos (Directores y Regionales)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-100 text-gray-600 uppercase text-xs font-bold"><tr className="divide-x"><th className="p-3">Nombre</th><th className="p-3">Email (Login)</th><th className="p-3">Rol</th><th className="p-3">Club Asignado</th><th className="p-3 text-center">Acción</th></tr></thead>
               <tbody className="divide-y">
                    {listaDirectores.map(dir => (
                      <tr key={dir.id} className="hover:bg-gray-50 transition-colors">
                        {dirEditando?.id === dir.id ? (
                          <>
                            <td className="p-2"><input value={dirEditando.nombre} onChange={e=>setDirEditando({...dirEditando, nombre: e.target.value})} className="border border-gray-300 rounded p-2 w-full text-xs font-bold"/></td>
                            <td className="p-2"><input value={dirEditando.email} onChange={e=>setDirEditando({...dirEditando, email: e.target.value})} className="border border-gray-300 rounded p-2 w-full text-xs font-bold"/></td>
                            <td className="p-2">
                              <select value={dirEditando.rol} onChange={e=>setDirEditando({...dirEditando, rol: e.target.value})} className="border border-gray-300 rounded p-2 w-full text-xs font-bold bg-white">
                                <option value="DIRECTOR">Director</option>
                                <option value="REGIONAL">Regional</option>
                              </select>
                            </td>
                            <td className="p-2">
                              {/* MAGIA ACÁ: Si es REGIONAL, no mostramos el selector de clubes */}
                              {dirEditando.rol === 'REGIONAL' ? (
                                <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded block text-center">Múltiples (Región)</span>
                              ) : (
                                <select value={dirEditando.clubId || ''} onChange={e=>setDirEditando({...dirEditando, clubId: e.target.value})} className="border border-gray-300 rounded p-2 w-full text-xs font-bold bg-white">
                                  <option value="">-- Sin Club --</option>
                                  {clubesDisponibles.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                                </select>
                              )}
                            </td>
                            <td className="p-2 flex gap-2 justify-center">
                              <button onClick={async () => {
                                try {
                                  await axios.put(`http://localhost:3000/api/auth/usuarios/${dirEditando.id}`, dirEditando);
                                  setDirEditando(null);
                                  cargarCatalogosFormularios();
                                  alert('✅ Perfil actualizado.');
                                } catch (e: any) { alert(`Error al guardar: ${e.response?.data?.message || 'Revisá la consola'}`); }
                              }} className="bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded shadow font-bold">💾</button>
                              <button onClick={() => setDirEditando(null)} className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded shadow font-bold">❌</button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="p-3 font-bold text-gray-800">{dir.nombre}</td>
                            <td className="p-3 text-blue-600">{dir.email}</td>
                            <td className="p-3"><span className={`px-2 py-1 text-[10px] font-black rounded ${dir.rol === 'REGIONAL' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{dir.rol}</span></td>
                            <td className="p-3 font-semibold text-gray-600">
                              {/* MAGIA ACÁ: Mostramos el texto correcto según el rol */}
                              {dir.rol === 'REGIONAL' ? <span className="text-purple-700 font-bold">🌎 Región Completa</span> : (dir.club?.nombre || '⚠️ SIN CLUB')}
                            </td>
                            <td className="p-3 text-center"><button onClick={() => setDirEditando({ ...dir, clubId: dir.clubId?.toString() || '' })} className="text-yellow-600 hover:text-yellow-700 font-bold bg-yellow-100 px-3 py-1 rounded">✏️ Editar</button></td>
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

   {/* VISTA 4: AUDITORÍA FORENSE (SOC) */}
        {vista === 'auditoria' && (
          <div className="max-w-7xl mx-auto p-4 animate-fade-in">
            <div className="bg-gray-900 rounded-xl shadow-2xl p-6 border-t-4 border-red-500">
              <h2 className="text-2xl font-black text-red-500 mb-2 uppercase flex items-center gap-2">
                🛡️ Monitoreo de Tráfico y Auditoría (SOC)
              </h2>
              <p className="text-gray-400 text-sm font-bold mb-4">Registro automático de interceptación de peticiones de red.</p>
              
              {/* MAGIA ACÁ: El buscador que arregla tu advertencia */}
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
                    <tr className="divide-x divide-gray-700"><th className="p-3">Fecha y Hora</th><th className="p-3 text-red-400">Método</th><th className="p-3">Ruta (Endpoint)</th><th className="p-3">Cuerpo (Carga útil)</th><th className="p-3">Usuario (Autor)</th><th className="p-3 text-blue-400">IP Origen</th></tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 font-mono text-[11px]">
                    {logsAuditoria
                      .filter(log => // Aplicamos el filtro antes de dibujar la tabla
                        log.ruta.toLowerCase().includes(filtroAudit.toLowerCase()) ||
                        log.metodo.toLowerCase().includes(filtroAudit.toLowerCase()) ||
                        (log.usuario?.nombre || "").toLowerCase().includes(filtroAudit.toLowerCase()) ||
                        log.ip.includes(filtroAudit)
                      )
                      .map((log: any) => (
                        <tr key={log.id} className="hover:bg-gray-800 transition-colors">
                          <td className="p-3 text-green-400 whitespace-nowrap">{new Date(log.fecha).toLocaleString('es-AR')}</td>
                          <td className="p-3 font-bold"><span className={`px-2 py-1 rounded text-black ${log.metodo === 'DELETE' ? 'bg-red-500' : log.metodo === 'PUT' || log.metodo === 'PATCH' ? 'bg-yellow-500' : 'bg-blue-500'}`}>{log.metodo}</span></td>
                          <td className="p-3 text-yellow-300">{log.ruta}</td>
                          <td className="p-3 text-gray-400 max-w-xs truncate" title={log.cuerpoPeticion}>{log.cuerpoPeticion ? log.cuerpoPeticion : 'N/A'}</td>
                          <td className="p-3 text-purple-400">{log.usuario ? log.usuario.nombre : 'Anónimo/Sistema'}</td>
                          <td className="p-3 text-blue-400">{log.ip}</td>
                        </tr>
                      ))
                    }
                    {logsAuditoria.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-gray-500">No hay tráfico interceptado.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* VISTA 5: AGENDA REGIONAL */}
        {vista === 'agenda' && (
          <div className="animate-fade-in grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Formulario para agendar */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-purple-500 md:col-span-1 h-fit">
              <h2 className="text-xl font-black text-gray-800 mb-6 uppercase">Planificador</h2>
              <form onSubmit={handleCrearEvento} className="space-y-4">
                <div><label className="block text-xs font-bold text-gray-700 mb-1">Título del Evento *</label><input required type="text" value={nuevoEvento.titulo} onChange={e=>setNuevoEvento({...nuevoEvento, titulo: e.target.value})} placeholder="Ej: Inspección Club Orión" className="w-full p-2 border rounded bg-gray-50 text-sm" /></div>
                <div><label className="block text-xs font-bold text-gray-700 mb-1">Fecha *</label><input required type="date" value={nuevoEvento.fecha} onChange={e=>setNuevoEvento({...nuevoEvento, fecha: e.target.value})} className="w-full p-2 border rounded bg-gray-50 text-sm" /></div>
                <div><label className="block text-xs font-bold text-gray-700 mb-1">Club a Visitar (Opcional)</label><select value={nuevoEvento.clubId} onChange={e=>setNuevoEvento({...nuevoEvento, clubId: e.target.value})} className="w-full p-2 border rounded bg-white text-sm"><option value="">-- Evento General --</option>{clubesDisponibles.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
                <div><label className="block text-xs font-bold text-gray-700 mb-1">Notas / Detalles</label><textarea value={nuevoEvento.descripcion} onChange={e=>setNuevoEvento({...nuevoEvento, descripcion: e.target.value})} rows={3} className="w-full p-2 border rounded bg-gray-50 text-sm"></textarea></div>
                <button type="submit" className="w-full py-3 mt-4 bg-purple-600 text-white font-black rounded hover:bg-purple-700 shadow-md">AGENDAR</button>
              </form>
            </div>

            {/* Calendario / Lista de Eventos */}
            <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-gray-800 md:col-span-2">
              <h2 className="text-xl font-black text-gray-800 mb-6 uppercase">Próximos Compromisos</h2>
              {eventosAgenda.length === 0 ? (
                <div className="text-center p-8 bg-gray-50 rounded border border-dashed border-gray-300">
                  <span className="text-4xl">🗓️</span>
                  <p className="text-gray-500 font-bold mt-4">No hay eventos planificados en la agenda.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {eventosAgenda.map((evento: any) => {
                    const esPasado = new Date(evento.fecha) < new Date();
                    return (
                      <div key={evento.id} className={`flex items-start gap-4 p-4 rounded-lg border shadow-sm ${esPasado ? 'bg-gray-100 border-gray-300 opacity-70' : 'bg-blue-50 border-blue-200'}`}>
                        <div className={`flex flex-col items-center justify-center p-3 rounded-lg min-w-[70px] ${esPasado ? 'bg-gray-300 text-gray-600' : 'bg-blue-600 text-white shadow'}`}>
                          <span className="text-xs font-bold uppercase">{new Date(evento.fecha).toLocaleString('es-AR', { month: 'short' })}</span>
                          <span className="text-2xl font-black leading-none">{new Date(evento.fecha).getDate() + 1}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-black text-lg text-gray-800 uppercase">{evento.titulo}</h3>
                          <p className="text-sm text-gray-600 font-bold mb-1">{evento.clubId ? `📍 Club Asignado (ID: ${evento.clubId})` : '🌐 Evento Regional General'}</p>
                          {evento.descripcion && <p className="text-sm text-gray-500 italic border-l-2 border-gray-300 pl-2 mt-2">{evento.descripcion}</p>}
                        </div>
                        <div className="text-right flex flex-col items-end justify-between">
                          <span className={`px-2 py-1 text-[10px] font-black uppercase rounded mb-2 ${esPasado ? 'bg-gray-300 text-gray-600' : 'bg-green-100 text-green-800'}`}>
                            {esPasado ? 'Finalizado' : evento.estado}
                          </span>
                          <button 
                            onClick={() => handleEliminarEvento(evento.id)} 
                            className="text-xs text-red-500 font-bold hover:text-red-700 hover:underline"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* VISTA 6: PERFIL DEL CONQUISTADOR (EXPEDIENTE) */}
        {vista === 'perfil' && integranteSeleccionado && (
          <div className="animate-fade-in bg-white print:bg-white rounded-xl shadow print:shadow-none p-8">
            <div className="flex flex-wrap gap-2 justify-between items-center mb-6 print:hidden border-b pb-4">
              <button onClick={() => setVista('directorio')} className="px-4 py-2 bg-gray-200 text-gray-800 font-bold rounded hover:bg-gray-300 transition-colors">← Volver</button>
              <div className="space-x-2 flex flex-wrap gap-2 mt-2 md:mt-0">
                <button onClick={handleImprimirExpediente} className="px-3 py-2 bg-purple-600 text-white font-bold rounded shadow hover:bg-purple-700 transition-colors">🖨️ Exportar PDF</button>
                <button onClick={abrirPanelEdicion} className="px-3 py-2 bg-yellow-500 text-yellow-900 font-bold rounded shadow hover:bg-yellow-600 transition-colors">✏️ Editar</button>
                <button onClick={handleEliminarIntegrante} className="px-3 py-2 bg-red-600 text-white font-bold rounded shadow hover:bg-red-700 transition-colors">🗑️ Dar de Baja</button>
                <button onClick={() => setMostrarFormFirma(!mostrarFormFirma)} className="px-4 py-2 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-700 transition-colors">{mostrarFormFirma ? 'Ocultar Paneles' : '⚙️ Acciones Regionales'}</button>
              </div>
            </div>
            
          {/* PANEL DE EDICIÓN FLOTANTE */}
            {modoEdicion && (
              <form onSubmit={guardarEdicionIntegrante} className="mb-6 p-6 bg-yellow-50 border-2 border-yellow-400 rounded-xl print:hidden shadow-lg">
                <h3 className="font-black text-yellow-900 mb-4 uppercase border-b border-yellow-300 pb-2">Actualizar Datos y Tarjeta</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700">Nombre</label>
                    <input required type="text" value={datosEdicion.nombre} onChange={e => setDatosEdicion({...datosEdicion, nombre: e.target.value})} className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700">Apellido</label>
                    <input required type="text" value={datosEdicion.apellido} onChange={e => setDatosEdicion({...datosEdicion, apellido: e.target.value})} className="w-full p-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700">Función</label>
                    <select value={datosEdicion.funcion} onChange={e => setDatosEdicion({...datosEdicion, funcion: e.target.value})} className="w-full p-2 border rounded bg-white">
                      <option value="CONQUISTADOR">Conquistador</option>
                      <option value="CONQUIS+">Conquis+</option>
                      <option value="CONSEJERO">Consejero</option>
                      <option value="INSTRUCTOR">Instructor</option>
                      <option value="SUBDIRECTOR">Subdirector</option>
                      <option value="DIRECTOR">Director</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700">Tarjeta (Clase)</label>
                    <select value={datosEdicion.claseId} onChange={e => setDatosEdicion({...datosEdicion, claseId: e.target.value})} className="w-full p-2 border rounded bg-white">
                      <option value="">-- Sin Asignar --</option>
                      {clasesDisponibles.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button type="submit" className="px-4 py-2 bg-yellow-500 text-yellow-900 font-bold rounded hover:bg-yellow-600">💾 Guardar Cambios</button>
                  <button type="button" onClick={() => setModoEdicion(false)} className="px-4 py-2 bg-gray-300 text-gray-800 font-bold rounded hover:bg-gray-400">Cancelar</button>
                </div>
              </form>
            )}

            <div className="border-b pb-6 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex items-center gap-6">
                <div className="relative group">
                  {integranteSeleccionado.avatarUrl ? 
                    <img src={`http://localhost:3000${integranteSeleccionado.avatarUrl}`} className="w-32 h-32 rounded-full object-cover shadow-lg border-4 border-gray-100" /> :
                    <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center shadow-lg border-4 border-gray-100"><span className="text-4xl text-gray-400">📷</span></div>
                  }
                  <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 shadow-md print:hidden">
                    <input type="file" className="hidden" accept="image/*" onChange={handleSubirAvatar}/> ✏️
                  </label>
                </div>
                <div>
                  <h2 className="text-3xl font-black text-gray-900 uppercase">{integranteSeleccionado.nombre} {integranteSeleccionado.apellido}</h2>
                  <p className="text-gray-500 text-lg font-semibold">{integranteSeleccionado.funcion} • {integranteSeleccionado.club?.nombre || 'Sin Club'}</p>
                </div>
              </div>
              <div className="text-center bg-blue-900 text-white p-4 rounded-lg shadow-inner min-w-[120px] print:bg-gray-100 print:text-black print:border-2 print:border-black">
                <span className="block text-4xl font-black text-yellow-400 drop-shadow print:text-black">{integranteSeleccionado.xp}</span>
                <span className="text-xs font-bold uppercase tracking-widest text-blue-200 print:text-gray-600">XP Totales</span>
              </div>
            </div>

            <div className="mb-8 bg-gray-50 p-6 rounded-xl border border-gray-200 shadow-inner print:border-black print:shadow-none">
              <div className="flex justify-between items-end mb-3">
                <div><h3 className="font-black text-gray-800 uppercase tracking-wide">Progreso: {estadisticasClase.clase}</h3><p className="text-sm text-gray-500 font-bold">{estadisticasClase.aprobados} de {estadisticasClase.total} requisitos</p></div>
                <span className="text-3xl font-black text-green-600 print:text-black">{estadisticasClase.porcentaje}%</span>
              </div>
              <div className="w-full bg-gray-300 rounded-full h-5 overflow-hidden shadow-inner print:border print:border-black print:bg-white">
                <div className="bg-green-500 h-5 rounded-full transition-all flex items-center justify-end pr-2 print:bg-gray-500" style={{ width: `${Math.max(estadisticasClase.porcentaje, 5)}%` }}>
                  {estadisticasClase.porcentaje > 10 && <span className="text-[10px] text-white font-black">{estadisticasClase.porcentaje}%</span>}
                </div>
              </div>
            </div>

            {mostrarFormFirma && (
              <div className="grid md:grid-cols-2 gap-6 mb-8 print:hidden">
                <form onSubmit={handleFirmarRequisito} className="p-6 bg-gray-50 border border-gray-200 rounded shadow-inner">
                  <h3 className="text-lg font-black text-gray-800 mb-4 uppercase text-center border-b pb-2">Aprobar Requisito</h3>
                  <div className="space-y-4 mb-4">
                    
                    <select required value={reqId} onChange={e => {
                        setReqId(e.target.value); 
                        setEspElegidaId(''); 
                        setOpcionSeleccionada('');
                        setOpcionesMultiples([]);
                      }} 
                      className="w-full p-3 border rounded text-sm font-bold text-gray-700"
                    >
                      <option value="">-- Seleccione requisito a firmar --</option>
                      {requisitosPendientes.map(req => (
                        <option key={req.id} value={req.id}>[{req.seccion}] {req.numero} - {req.descripcion.substring(0, 60)}...</option>
                      ))}
                    </select>

                    {/* 2. El Motor de Comodines (Renderizado Condicional Blindado) */}
                    {(() => {
                      const reqActivo = requisitosPendientes.find(r => r.id.toString() === reqId);
                      if (!reqActivo || !reqActivo.opcionesExtra) return null;

                      // 🥷 ACÁ ESTÁ LA HERRAMIENTA: Borra tildes, espacios y pasa todo a minúscula
                      const normalizar = (texto: string) => texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

                      const stringOriginal = reqActivo.opcionesExtra.trim();
                      const comandoExtra = stringOriginal.toUpperCase();

                      // CASO A: CHECKBOX (Selección Múltiple)
                      if (comandoExtra.startsWith('CHECKBOX:')) {
                        const partes = stringOriginal.split(':');
                        if (partes.length < 3) return <p className="text-red-500 font-bold text-xs p-2 bg-red-50 border border-red-200">⚠️ Error: Formato de CHECKBOX incorrecto.</p>;

                        const cantidadRequerida = parseInt(partes[1].trim(), 10);
                        const opciones = partes.slice(2).join(':').split('|').map(o => o.trim());

                        return (
                          <div className="bg-white p-3 border rounded shadow-sm">
                            <label className="block text-xs font-bold text-blue-800 mb-2 uppercase">
                              Seleccione {cantidadRequerida} opciones cumplidas:
                            </label>
                            {opciones.map((opc: string, i: number) => {
                              const estaSeleccionado = opcionesMultiples.includes(opc);
                              const limiteAlcanzado = opcionesMultiples.length >= cantidadRequerida;

                              return (
                                <label key={i} className={`flex items-center gap-2 mb-2 text-sm cursor-pointer p-2 rounded border ${estaSeleccionado ? 'bg-blue-50 border-blue-400 font-bold text-blue-900' : 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                                  <input 
                                    type="checkbox" 
                                    value={opc}
                                    checked={estaSeleccionado}
                                    onChange={(e) => {
                                      if (e.target.checked) setOpcionesMultiples(prev => [...prev, opc]);
                                      else setOpcionesMultiples(prev => prev.filter(item => item !== opc));
                                    }}
                                    disabled={!estaSeleccionado && limiteAlcanzado}
                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                  /> 
                                  {opc}
                                </label>
                              );
                            })}
                            {opcionesMultiples.length < cantidadRequerida && (
                              <p className="text-[10px] text-red-500 mt-2 font-black uppercase text-right">⚠️ Faltan {cantidadRequerida - opcionesMultiples.length}</p>
                            )}
                          </div>
                        );
                      }

                      // CASO B: CATEGORIAS (Filtro normalizado y multi-separador)
                      if (comandoExtra.startsWith('CATEGORIA:') || comandoExtra.startsWith('CATEGORIAS:')) {
                        // Magia acá: Usamos /[,|]/ para decirle que corte el texto si encuentra una coma O una barra vertical
                        const categoriasPermitidas = stringOriginal.split(':')[1].split(/[,|]/).map(normalizar);
                        
                        const especialidadesFiltradas = catalogoEspecialidades.filter(esp => 
                          categoriasPermitidas.includes(normalizar(esp.categoria))
                        );
                        
                        return (
                          <select required value={espElegidaId} onChange={e => setEspElegidaId(e.target.value)} className="w-full p-3 border rounded text-sm bg-blue-50 border-blue-300 font-bold text-gray-700">
                            <option value="">-- Seleccione Especialidad Permitida --</option>
                            {especialidadesFiltradas.map(esp => (
                              // Mostramos el nombre y al lado la categoría a la que pertenece
                              <option key={esp.id} value={esp.id}>{esp.nombre} [{esp.categoria}]</option>
                            ))}
                          </select>
                        );
                      }

                      // CASO C: ESPECIALIDADES ESPECÍFICAS (Filtro normalizado, soluciona el error de Natación 1)
                      if (comandoExtra.startsWith('ESPECIALIDAD:') || comandoExtra.startsWith('ESPECIALIDADES:')) {
                        // Agarramos lo que pusiste en el Excel y lo "normalizamos"
                        const nombresPermitidos = stringOriginal.split(':')[1].split(',').map(normalizar);
                        
                        // Buscamos en la base de datos comparando las versiones "normalizadas"
                        const especialidadesFiltradas = catalogoEspecialidades.filter(esp => 
                          nombresPermitidos.includes(normalizar(esp.nombre))
                        );
                        
                        return (
                          <select required value={espElegidaId} onChange={e => setEspElegidaId(e.target.value)} className="w-full p-3 border rounded text-sm bg-yellow-50 border-yellow-300 font-bold text-gray-700">
                            <option value="">-- Seleccione la Especialidad Obligatoria --</option>
                            {especialidadesFiltradas.map(esp => <option key={esp.id} value={esp.id}>{esp.nombre}</option>)}
                          </select>
                        );
                      }

                      // CASO D: OPCIONES SIMPLES CERRADAS (a, b, c)
                      if (comandoExtra.startsWith('OPCIONES:')) {
                        const opciones = stringOriginal.split(':')[1].split('|').map(o => o.trim());
                        return (
                          <div className="bg-white p-3 border rounded shadow-sm">
                            <label className="block text-xs font-bold text-gray-500 mb-2 uppercase">Seleccione la opción cumplida:</label>
                            {opciones.map((opc: string, i: number) => (
                              <label key={i} className="flex items-center gap-2 mb-1 text-sm text-gray-700 cursor-pointer p-1 hover:bg-gray-50 rounded">
                                <input type="radio" name="opcionRequisito" value={opc} required onChange={(e) => setOpcionSeleccionada(e.target.value)} className="w-4 h-4 text-blue-600" /> {opc}
                              </label>
                            ))}
                          </div>
                        );
                      }
                      
                      return null;
                    })()}
                    {(() => {
                        const reqActivo = requisitosPendientes.find(r => r.id.toString() === reqId);
                        if (reqActivo?.esEspecialidad && !reqActivo.opcionesExtra) {
                            return (
                              <select required value={espElegidaId} onChange={e => setEspElegidaId(e.target.value)} className="w-full p-3 border rounded text-sm bg-white">
                                <option value="">-- Seleccione la Especialidad --</option>
                                {catalogoEspecialidades.map(esp => <option key={esp.id} value={esp.id}>{esp.nombre}</option>)}
                              </select>
                            )
                        }
                    })()}

                    <div className="mt-2">
                       <label className="block text-xs font-bold text-gray-500 mb-1">Evidencia Fotográfica (Opcional)</label>
                       <input type="file" accept="image/*" onChange={e => setFotoRespaldo(e.target.files?.[0] || null)} className="w-full p-2 border rounded bg-white text-sm" />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-3 rounded font-black uppercase text-white bg-blue-600 hover:bg-blue-700 shadow-md">Firmar Cuadernillo</button>
                </form>

                <form onSubmit={handleOtorgarMaestria} className="p-6 bg-yellow-50 border border-yellow-200 rounded shadow-inner flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-black text-yellow-900 mb-4 uppercase text-center border-b border-yellow-300 pb-2">Otorgar Maestría</h3>
                    <select required value={maestriaAOtorgarId} onChange={e => setMaestriaAOtorgarId(e.target.value)} className="w-full p-3 border border-yellow-300 rounded text-sm bg-white font-bold text-gray-700">
                      <option value="">-- Seleccione Maestría a otorgar --</option>
                      {catalogoMaestrias.map(m => (<option key={m.id} value={m.id}>{m.nombre}</option>))}
                    </select>
                  </div>
                  <button type="submit" className="w-full py-3 mt-4 rounded font-black uppercase text-yellow-900 bg-yellow-400 hover:bg-yellow-500 shadow">Condecorar 👑</button>
                </form>
              </div>
            )}

            {!bandaVirtual ? <p className="text-gray-500 font-bold">Cargando Banda Virtual...</p> : (
              <>
                {bandaVirtual.totalMaestrias > 0 && (
                  <div className="mb-8 break-inside-avoid"><h3 className="text-lg font-black text-gray-800 mb-4 border-b-2 border-yellow-500 inline-block pb-1 uppercase">Maestrías ({bandaVirtual.totalMaestrias})</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {bandaVirtual.maestrias.map((m) => (
                        <div key={m.id} className="flex items-center gap-3 p-3 bg-gradient-to-r from-yellow-50 to-amber-100 border border-yellow-300 rounded-lg print:border-black print:bg-none">
                          <div className="w-14 h-14 rounded shadow flex items-center justify-center bg-yellow-500 border-2 border-yellow-600 print:bg-gray-200 print:border-black"><span className="text-2xl">👑</span></div>
                          <div><p className="font-black text-yellow-900 leading-tight print:text-black">{m.maestria.nombre}</p><p className="text-[10px] font-bold text-yellow-700 uppercase mt-1 print:text-gray-600">Otorgada: {new Date(m.fechaAprobacion).toLocaleDateString()}</p></div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="break-inside-avoid">
                  <h3 className="text-lg font-black text-gray-800 mb-4 border-b-2 border-green-500 inline-block pb-1 uppercase">Especialidades ({bandaVirtual.totalEspecialidades})</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
                    {bandaVirtual.especialidades.map((item) => (
                      <div key={item.id} className="flex flex-col items-center justify-center p-4 bg-gray-50 border border-gray-200 rounded print:border-black print:shadow-none">
                        <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-inner mb-2 border-4 border-white print:border-gray-300" style={{ backgroundColor: item.especialidad.colorFondo || '#3B82F6' }}><span className="text-white font-black text-xl print:text-black">{item.especialidad.nombre.charAt(0)}</span></div>
                        <p className="text-center font-bold text-gray-800 text-[10px] uppercase leading-tight">{item.especialidad.nombre}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;