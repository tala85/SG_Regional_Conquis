import { useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';
// NUEVO: Importamos los gráficos de Recharts
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

// --- INTERFACES ---
interface Integrante { id: number; nombre: string; apellido: string; xp: number; funcion: string; avatarUrl?: string; club: { nombre: string }; clase?: { nombre: string }; }
interface EspecialidadGanada { id: number; fechaAprobacion: string; especialidad: { nombre: string; categoria: string; colorFondo: string; }; }
interface MaestriaGanada { id: number; fechaAprobacion: string; maestria: { nombre: string; requisitos: string; }; }
interface BandaVirtual { totalEspecialidades: number; especialidades: EspecialidadGanada[]; totalMaestrias: number; maestrias: MaestriaGanada[]; }
interface RequisitoPendiente { id: number; numero: string; descripcion: string; seccion: string; esEspecialidad: boolean; puntosXp: number; }
interface LogAuditoria { id: number; metodo: string; ruta: string; ip: string; fecha: string; usuario?: { nombre: string; email: string; }; }
interface MaestriaCatalogo { id: number; nombre: string; requisitos: string; }
interface Metricas { totalIntegrantes: number; totalInvestidos: number; topXP: string; porcentaje: number; }
interface OpcionLista { id: number; nombre: string; } 

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('tokenConquis'));
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [errorLogin, setErrorLogin] = useState('');

  const [vista, setVista] = useState<'dashboard' | 'directorio' | 'perfil' | 'auditoria' | 'gestion'>('dashboard');
  
  const [ranking, setRanking] = useState<Integrante[]>([]);
  const [directorio, setDirectorio] = useState<Integrante[]>([]);
  const [clubSeleccionadoDirectorio, setClubSeleccionadoDirectorio] = useState<string>('');
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [filtroAudit, setFiltroAudit] = useState(''); 
  const [metricas, setMetricas] = useState<Metricas>({ totalIntegrantes: 0, totalInvestidos: 0, topXP: '-', porcentaje: 0 });
  const [catalogoMaestrias, setCatalogoMaestrias] = useState<MaestriaCatalogo[]>([]);
  const [catalogoEspecialidades, setCatalogoEspecialidades] = useState<any[]>([]); // <-- NUEVO ESTADO
  const [clubesDisponibles, setClubesDisponibles] = useState<OpcionLista[]>([]); 
  const [clasesDisponibles, setClasesDisponibles] = useState<OpcionLista[]>([]); 
  
  
  const [cargando, setCargando] = useState(false);
  const [descargando, setDescargando] = useState(false);
  
  const [integranteSeleccionado, setIntegranteSeleccionado] = useState<Integrante | null>(null);
  const [bandaVirtual, setBandaVirtual] = useState<BandaVirtual | null>(null);
  const [requisitosPendientes, setRequisitosPendientes] = useState<RequisitoPendiente[]>([]);
  const [estadisticasClase, setEstadisticasClase] = useState({ total: 0, aprobados: 0, porcentaje: 0, clase: '' });
  
  const [mostrarFormFirma, setMostrarFormFirma] = useState(false);
  const [reqId, setReqId] = useState('');
  const [espElegidaId, setEspElegidaId] = useState('');
  const [fotoRespaldo, setFotoRespaldo] = useState<File | null>(null);
  const [maestriaAOtorgarId, setMaestriaAOtorgarId] = useState('');
  
  const [altaConqui, setAltaConqui] = useState({ nombre: '', apellido: '', fechaNacimiento: '', funcion: 'CONQUISTADOR', claseId: '', clubId: '' });
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
    axios.get('http://localhost:3000/api/especialidades').then(res => setCatalogoEspecialidades(res.data.data)).catch(console.error); // <-- NUEVA LÍNEA
  };

  const cargarAuditoria = () => {
    setCargando(true);
    axios.get('http://localhost:3000/api/auditoria').then(res => setLogs(res.data.data)).catch(console.error).finally(() => setCargando(false));
  };

  useEffect(() => {
    if (vista === 'directorio' && clubSeleccionadoDirectorio) {
      setCargando(true);
      axios.get(`http://localhost:3000/api/integrantes/club/${clubSeleccionadoDirectorio}?limit=100`)
        .then(res => setDirectorio(res.data.data)).catch(console.error).finally(() => setCargando(false));
    }
    if (vista === 'auditoria') cargarAuditoria();
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
    const formData = new FormData(); formData.append('integranteId', integranteSeleccionado.id.toString()); formData.append('requisitoId', reqId);
    if (espElegidaId) formData.append('especialidadElegidaId', espElegidaId); if (fotoRespaldo) formData.append('foto', fotoRespaldo);
    try {
      const res = await axios.post('http://localhost:3000/api/progresos/firmar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      alert(`¡Éxito! ${res.data.message}`); setReqId(''); setEspElegidaId(''); setFotoRespaldo(null); setMostrarFormFirma(false); verPerfil(integranteSeleccionado);
    } catch (error: any) { alert(`Error al firmar: ${error.response?.data?.message}`); }
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

  const handleEditarIntegrante = () => {
    if (!integranteSeleccionado) return;
    const nuevoNombre = window.prompt("Editar Nombre:", integranteSeleccionado.nombre);
    const nuevoApellido = window.prompt("Editar Apellido:", integranteSeleccionado.apellido);
    if (nuevoNombre && nuevoApellido) {
      axios.put(`http://localhost:3000/api/integrantes/${integranteSeleccionado.id}`, { nombre: nuevoNombre, apellido: nuevoApellido })
      .then(() => { alert('Datos actualizados.'); verPerfil({ ...integranteSeleccionado, nombre: nuevoNombre, apellido: nuevoApellido }); })
      .catch(() => alert("Error al editar."));
    }
  };

  const handleImprimirExpediente = () => { window.print(); };

  const handleAltaConquistador = async (e: FormEvent) => {
    e.preventDefault(); if (!altaConqui.clubId) { alert("Debes seleccionar un club."); return; }
    try {
      await axios.post('http://localhost:3000/api/integrantes', altaConqui);
      alert("¡Integrante alistado exitosamente!"); setAltaConqui({ nombre: '', apellido: '', fechaNacimiento: '', funcion: 'CONQUISTADOR', claseId: '', clubId: '' });
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

  // --- DATOS PARA GRÁFICOS ---
  const dataTorta = [
    { name: 'Investidos', value: metricas.totalInvestidos },
    { name: 'En Proceso', value: metricas.totalIntegrantes - metricas.totalInvestidos }
  ];
  const COLORES_TORTA = ['#10B981', '#E5E7EB']; // Verde y Gris claro
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

            {/* GRÁFICOS DE BI (BUSINESS INTELLIGENCE) */}
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
                      <YAxis /> {/* <-- ACÁ USAMOS LA VARIABLE PARA VER LA ESCALA NUMÉRICA */}
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

        {/* ... (El resto de las vistas se mantienen EXACTAMENTE igual que en mi mensaje anterior) ... */}
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
              <h2 className="text-xl font-black text-gray-800 mb-6 uppercase">Alistar Integrante</h2>
              <form onSubmit={handleAltaConquistador} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-gray-700 mb-1">Nombre</label><input required type="text" value={altaConqui.nombre} onChange={e=>setAltaConqui({...altaConqui, nombre: e.target.value})} className="w-full p-2 border rounded bg-gray-50 text-sm" /></div>
                  <div><label className="block text-xs font-bold text-gray-700 mb-1">Apellido</label><input required type="text" value={altaConqui.apellido} onChange={e=>setAltaConqui({...altaConqui, apellido: e.target.value})} className="w-full p-2 border rounded bg-gray-50 text-sm" /></div>
                </div>
                <div><label className="block text-xs font-bold text-gray-700 mb-1">Club *</label><select required value={altaConqui.clubId} onChange={e=>setAltaConqui({...altaConqui, clubId: e.target.value})} className="w-full p-2 border rounded bg-white text-sm"><option value="">-- Seleccione club --</option>{clubesDisponibles.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
                <div><label className="block text-xs font-bold text-gray-700 mb-1">Nacimiento</label><input required type="date" value={altaConqui.fechaNacimiento} onChange={e=>setAltaConqui({...altaConqui, fechaNacimiento: e.target.value})} className="w-full p-2 border rounded bg-gray-50 text-sm" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-gray-700 mb-1">Función</label><select value={altaConqui.funcion} onChange={e=>setAltaConqui({...altaConqui, funcion: e.target.value})} className="w-full p-2 border rounded bg-white text-sm"><option value="CONQUISTADOR">Conquistador</option><option value="CONQUIS+">Conquis+</option><option value="CONSEJERO">Consejero</option><option value="INSTRUCTOR">Instructor</option><option value="SUBDIRECTOR">Subdirector</option><option value="DIRECTOR">Director</option></select></div>
                  <div><label className="block text-xs font-bold text-gray-700 mb-1">Clase Inicial</label><select value={altaConqui.claseId} onChange={e=>setAltaConqui({...altaConqui, claseId: e.target.value})} className="w-full p-2 border rounded bg-white text-sm"><option value="">-- Ninguna --</option>{clasesDisponibles.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
                </div>
                <button type="submit" className="w-full py-3 mt-4 bg-green-600 text-white font-black rounded hover:bg-green-700">REGISTRAR</button>
              </form>
            </div>
            
            <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-blue-500">
              <h2 className="text-xl font-black text-gray-800 mb-6 uppercase">Crear Director</h2>
              <form onSubmit={handleAltaDirector} className="space-y-4">
                <div><label className="block text-xs font-bold text-gray-700 mb-1">Nombre</label><input required type="text" value={altaDir.nombre} onChange={e=>setAltaDir({...altaDir, nombre: e.target.value})} className="w-full p-2 border rounded bg-gray-50 text-sm" /></div>
                <div><label className="block text-xs font-bold text-gray-700 mb-1">Email</label><input required type="email" value={altaDir.email} onChange={e=>setAltaDir({...altaDir, email: e.target.value})} className="w-full p-2 border rounded bg-gray-50 text-sm" /></div>
                <div><label className="block text-xs font-bold text-gray-700 mb-1">Contraseña</label><input required type="password" value={altaDir.password} onChange={e=>setAltaDir({...altaDir, password: e.target.value})} className="w-full p-2 border rounded bg-gray-50 text-sm" /></div>
                <div><label className="block text-xs font-bold text-gray-700 mb-1">Asignar a Club *</label><select required value={altaDir.clubId} onChange={e=>setAltaDir({...altaDir, clubId: e.target.value})} className="w-full p-2 border rounded text-sm bg-blue-50"><option value="">-- Seleccionar Club --</option>{clubesDisponibles.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
                <button type="submit" className="w-full py-3 mt-4 bg-blue-600 text-white font-black rounded hover:bg-blue-700">CREAR ACCESO</button>
              </form>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border-t-4 border-yellow-500">
              <h2 className="text-xl font-black text-gray-800 mb-6 uppercase">Fundar Club</h2>
              <form onSubmit={handleAltaClub} className="space-y-4">
                <div><label className="block text-xs font-bold text-gray-700 mb-1">Nombre del Club *</label><input required type="text" value={altaClub.nombre} onChange={e=>setAltaClub({...altaClub, nombre: e.target.value})} className="w-full p-2 border rounded bg-gray-50 text-sm" /></div>
                <div><label className="block text-xs font-bold text-gray-700 mb-1">Iglesia</label><input type="text" value={altaClub.iglesia} onChange={e=>setAltaClub({...altaClub, iglesia: e.target.value})} className="w-full p-2 border rounded bg-gray-50 text-sm" /></div>
                <div><label className="block text-xs font-bold text-gray-700 mb-1">Distrito</label><input type="text" value={altaClub.distrito} onChange={e=>setAltaClub({...altaClub, distrito: e.target.value})} className="w-full p-2 border rounded bg-gray-50 text-sm" /></div>
                <button type="submit" className="w-full py-3 mt-4 bg-yellow-500 text-yellow-900 font-black rounded hover:bg-yellow-600">REGISTRAR CLUB</button>
              </form>
            </div>

          </div>
        )}

        {/* VISTA 4: AUDITORÍA FORENSE */}
        {vista === 'auditoria' && (
           <div className="animate-fade-in">
             <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
               <h1 className="text-3xl font-black text-gray-800 border-b-4 border-red-600 pb-2 uppercase">Monitoreo</h1>
               <div className="w-full md:w-1/3">
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Filtrar Tráfico</label>
                 <input type="text" placeholder="Buscar..." value={filtroAudit} onChange={(e) => setFiltroAudit(e.target.value)} className="w-full p-2 border-2 border-gray-300 rounded focus:border-red-500 outline-none" />
               </div>
             </div>
           {cargando ? <p className="text-xl text-gray-500">Recuperando bitácora...</p> : (
             <div className="bg-white rounded shadow-lg overflow-x-auto border border-gray-200">
               <table className="w-full text-left text-sm text-gray-600">
                 <thead className="bg-gray-800 text-white uppercase font-bold text-xs"><tr className="divide-x divide-gray-700"><th className="p-4">Fecha</th><th className="p-4">Acción</th><th className="p-4">Usuario</th><th className="p-4">Origen IP</th></tr></thead>
                 <tbody className="divide-y divide-gray-200">
                   {logs.filter(log => log.ip.includes(filtroAudit) || log.ruta.toLowerCase().includes(filtroAudit.toLowerCase()) || log.metodo.toLowerCase().includes(filtroAudit.toLowerCase()) || (log.usuario?.nombre || '').toLowerCase().includes(filtroAudit.toLowerCase())).map((log) => (
                     <tr key={log.id} className="hover:bg-red-50">
                        <td className="p-4 font-mono text-xs">{new Date(log.fecha).toLocaleString()}</td>
                        <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold mr-2 ${log.metodo==='POST'?'bg-green-100 text-green-800':'bg-blue-100 text-blue-800'}`}>{log.metodo}</span> <span className="font-mono text-xs">{log.ruta}</span></td>
                        <td className="p-4 font-bold">{log.usuario ? `${log.usuario.nombre}` : 'Sistema / API'}</td>
                        <td className="p-4 font-mono text-xs text-red-600 font-bold tracking-wider">{log.ip}</td>
                      </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           )}
         </div>
        )}

        {/* VISTA 5: PERFIL DEL CONQUISTADOR (EXPEDIENTE) */}
        {vista === 'perfil' && integranteSeleccionado && (
          <div className="animate-fade-in bg-white print:bg-white rounded-xl shadow print:shadow-none p-8">
            <div className="flex flex-wrap gap-2 justify-between items-center mb-6 print:hidden border-b pb-4">
              <button onClick={() => setVista('directorio')} className="px-4 py-2 bg-gray-200 text-gray-800 font-bold rounded hover:bg-gray-300 transition-colors">← Volver</button>
              <div className="space-x-2 flex flex-wrap gap-2 mt-2 md:mt-0">
                <button onClick={handleImprimirExpediente} className="px-3 py-2 bg-purple-600 text-white font-bold rounded shadow hover:bg-purple-700 transition-colors">🖨️ Exportar PDF</button>
                <button onClick={handleEditarIntegrante} className="px-3 py-2 bg-yellow-500 text-yellow-900 font-bold rounded shadow hover:bg-yellow-600 transition-colors">✏️ Editar</button>
                <button onClick={handleEliminarIntegrante} className="px-3 py-2 bg-red-600 text-white font-bold rounded shadow hover:bg-red-700 transition-colors">🗑️ Dar de Baja</button>
                <button onClick={() => setMostrarFormFirma(!mostrarFormFirma)} className="px-4 py-2 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-700 transition-colors">{mostrarFormFirma ? 'Ocultar Paneles' : '⚙️ Acciones Regionales'}</button>
              </div>
            </div>
            
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
                    <select required value={reqId} onChange={e => setReqId(e.target.value)} className="w-full p-3 border rounded text-sm"><option value="">-- Seleccione requisito --</option>{requisitosPendientes.map(req => (<option key={req.id} value={req.id}>[{req.seccion}] {req.numero} - {req.descripcion.substring(0, 50)}...</option>))}</select>
                    {requisitosPendientes.find(r => r.id.toString() === reqId)?.esEspecialidad && (
  <select required value={espElegidaId} onChange={e => setEspElegidaId(e.target.value)} className="w-full p-3 border rounded text-sm bg-white">
    <option value="">-- Seleccione la Especialidad requerida --</option>
    {catalogoEspecialidades.map(esp => (
      <option key={esp.id} value={esp.id}>{esp.nombre}</option>
    ))}
  </select>
)}
                    <input type="file" accept="image/*" onChange={e => setFotoRespaldo(e.target.files?.[0] || null)} className="w-full p-2 border rounded bg-white text-sm" />
                  </div>
                  <button type="submit" className="w-full py-3 rounded font-black uppercase text-white bg-blue-600 hover:bg-blue-700">Firmar Cuadernillo</button>
                </form>

                <form onSubmit={handleOtorgarMaestria} className="p-6 bg-yellow-50 border border-yellow-200 rounded shadow-inner flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-black text-yellow-900 mb-4 uppercase text-center border-b border-yellow-300 pb-2">Otorgar Maestría</h3>
                    <select required value={maestriaAOtorgarId} onChange={e => setMaestriaAOtorgarId(e.target.value)} className="w-full p-3 border border-yellow-300 rounded text-sm bg-white font-bold text-gray-700"><option value="">-- Seleccione Maestría a otorgar --</option>{catalogoMaestrias.map(m => (<option key={m.id} value={m.id}>{m.nombre}</option>))}</select>
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