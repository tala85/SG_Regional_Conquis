import { useEffect, useState, type FormEvent } from 'react';
import axios from 'axios';

// --- INTERFACES ESTRICTAS ---
interface Integrante { id: number; nombre: string; apellido: string; xp: number; club: { nombre: string }; }
interface EspecialidadGanada { id: number; fechaAprobacion: string; especialidad: { nombre: string; categoria: string; colorFondo: string; }; }
interface MaestriaGanada { id: number; fechaAprobacion: string; maestria: { nombre: string; requisitos: string; }; }
interface BandaVirtual { totalEspecialidades: number; especialidades: EspecialidadGanada[]; totalMaestrias: number; maestrias: MaestriaGanada[]; }
interface RequisitoPendiente { id: number; numero: string; descripcion: string; seccion: string; esEspecialidad: boolean; puntosXp: number; }
interface LogAuditoria { id: number; metodo: string; ruta: string; ip: string; fecha: string; usuario?: { nombre: string; email: string; }; }

function App() {
  // --- ENRUTAMIENTO INTERNO (SPA) ---
  const [vista, setVista] = useState<'dashboard' | 'perfil' | 'auditoria'>('dashboard');
  
  // --- ESTADOS ---
  const [ranking, setRanking] = useState<Integrante[]>([]);
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [cargando, setCargando] = useState(true);
  const [descargando, setDescargando] = useState(false);
  const [integranteSeleccionado, setIntegranteSeleccionado] = useState<Integrante | null>(null);
  const [bandaVirtual, setBandaVirtual] = useState<BandaVirtual | null>(null);
  const [requisitosPendientes, setRequisitosPendientes] = useState<RequisitoPendiente[]>([]);

  // Formularios
  const [mostrarFormFirma, setMostrarFormFirma] = useState(false);
  const [reqId, setReqId] = useState('');
  const [espElegidaId, setEspElegidaId] = useState('');
  const [fotoRespaldo, setFotoRespaldo] = useState<File | null>(null);
  const [firmando, setFirmando] = useState(false);

  // --- CONFIGURACIÓN ---
  const TOKEN_DE_PRUEBA = "ACA_PEGA_TU_TOKEN"; 
  const ID_CLUB_PRUEBA = 1;

  // --- CARGA DE DATOS ---
  const cargarRanking = () => {
    setCargando(true);
    axios.get('http://localhost:3000/api/integrantes/ranking', { headers: { Authorization: `Bearer ${TOKEN_DE_PRUEBA}` } })
    .then(res => { setRanking(res.data.data); setCargando(false); })
    .catch(() => setCargando(false));
  };

  const cargarAuditoria = () => {
    setCargando(true);
    axios.get('http://localhost:3000/api/auditoria', { headers: { Authorization: `Bearer ${TOKEN_DE_PRUEBA}` } })
    .then(res => { setLogs(res.data.data); setCargando(false); })
    .catch(() => setCargando(false));
  };

  useEffect(() => {
    if (vista === 'dashboard') cargarRanking();
    if (vista === 'auditoria') cargarAuditoria();
  }, [vista]);

  // --- ACCIONES PRINCIPALES ---
  const descargarExcel = async () => {
    setDescargando(true);
    try {
      const response = await axios.get(`http://localhost:3000/api/reportes/investidura/club/${ID_CLUB_PRUEBA}`, { headers: { Authorization: `Bearer ${TOKEN_DE_PRUEBA}` }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url; link.setAttribute('download', `Investidura_Club_${ID_CLUB_PRUEBA}.xlsx`);
      document.body.appendChild(link); link.click(); link.parentNode?.removeChild(link);
    } catch { alert("Error al descargar el archivo."); } finally { setDescargando(false); }
  };

  const verPerfil = async (integrante: Integrante) => {
    setIntegranteSeleccionado(integrante); setVista('perfil'); setBandaVirtual(null); setMostrarFormFirma(false); setRequisitosPendientes([]);
    try {
      const resBanda = await axios.get(`http://localhost:3000/api/integrantes/${integrante.id}/banda-virtual`, { headers: { Authorization: `Bearer ${TOKEN_DE_PRUEBA}` } });
      setBandaVirtual(resBanda.data.data);
      const resPendientes = await axios.get(`http://localhost:3000/api/progresos/integrante/${integrante.id}/pendientes`, { headers: { Authorization: `Bearer ${TOKEN_DE_PRUEBA}` } });
      setRequisitosPendientes(resPendientes.data.data);
    } catch (error) { console.error(error); }
  };

  const handleFirmarRequisito = async (e: FormEvent) => {
    e.preventDefault();
    if (!integranteSeleccionado || !reqId) return;
    setFirmando(true);

    const formData = new FormData();
    formData.append('integranteId', integranteSeleccionado.id.toString());
    formData.append('requisitoId', reqId);
    if (espElegidaId) formData.append('especialidadElegidaId', espElegidaId);
    if (fotoRespaldo) formData.append('foto', fotoRespaldo);

    try {
      const response = await axios.post('http://localhost:3000/api/progresos/firmar', formData, { headers: { Authorization: `Bearer ${TOKEN_DE_PRUEBA}`, 'Content-Type': 'multipart/form-data' } });
      alert(`¡Éxito! ${response.data.message}`);
      setReqId(''); setEspElegidaId(''); setFotoRespaldo(null); setMostrarFormFirma(false);
      verPerfil(integranteSeleccionado);
    } catch (error: any) { alert(`Error al firmar: ${error.response?.data?.message || 'Fallo de conexión'}`); } 
    finally { setFirmando(false); }
  };

  const requisitoSeleccionado = requisitosPendientes.find(r => r.id.toString() === reqId);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* BARRA DE NAVEGACIÓN SUPERIOR */}
      <nav className="bg-blue-900 text-white shadow-md p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="font-black text-xl tracking-wider">🛡️ SG Conquis Pro</div>
          <div className="space-x-4">
            <button onClick={() => setVista('dashboard')} className={`px-4 py-2 rounded font-bold transition-colors ${vista === 'dashboard' || vista === 'perfil' ? 'bg-blue-700' : 'hover:bg-blue-800'}`}>Tablero Regional</button>
            <button onClick={() => setVista('auditoria')} className={`px-4 py-2 rounded font-bold transition-colors ${vista === 'auditoria' ? 'bg-red-700' : 'hover:bg-blue-800'}`}>Monitoreo Forense</button>
          </div>
        </div>
      </nav>

      <main className="flex-1 p-8 max-w-6xl mx-auto w-full">
        {/* VISTA 1: DASHBOARD */}
        {vista === 'dashboard' && (
          <div className="animate-fade-in">
            <header className="mb-8 flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-bold text-gray-800 border-b-4 border-yellow-500 pb-2 inline-block">Ranking de Experiencia</h1>
              </div>
              <button onClick={descargarExcel} disabled={descargando} className={`px-4 py-2 rounded shadow text-white font-bold transition-colors ${descargando ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>
                {descargando ? 'Generando...' : '📥 Exportar Investiduras'}
              </button>
            </header>

            {cargando ? <p className="text-xl text-gray-500 animate-pulse">Sincronizando con base de datos...</p> : (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="grid gap-3">
                  {ranking.map((int, idx) => (
                    <div key={int.id} onClick={() => verPerfil(int)} className="flex items-center justify-between p-4 bg-gray-50 rounded border cursor-pointer hover:border-blue-300 hover:shadow-md transition-all">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 flex items-center justify-center rounded-full font-black text-white ${idx === 0 ? 'bg-yellow-500 shadow-lg' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-amber-600' : 'bg-blue-800'}`}>{idx + 1}</div>
                        <div>
                          <h3 className="font-bold text-lg text-gray-800">{int.nombre} {int.apellido}</h3>
                          <p className="text-sm text-gray-500">{int.club?.nombre || 'Sin club'} • Clic para revisar expediente</p>
                        </div>
                      </div>
                      <div className="bg-blue-100 px-4 py-2 rounded border border-blue-200 text-blue-900 font-black tracking-widest">{int.xp} XP</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VISTA 2: PERFIL Y BANDA VIRTUAL */}
        {vista === 'perfil' && integranteSeleccionado && (
          <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <button onClick={() => setVista('dashboard')} className="px-4 py-2 bg-gray-200 text-gray-800 font-bold rounded hover:bg-gray-300 transition-colors">← Volver</button>
              <button onClick={() => setMostrarFormFirma(!mostrarFormFirma)} className="px-4 py-2 bg-blue-600 text-white font-bold rounded shadow hover:bg-blue-700 transition-colors">
                {mostrarFormFirma ? 'Ocultar Panel' : '✍️ Registrar Firma'}
              </button>
            </div>

            <div className="bg-white rounded-xl shadow p-8">
              <div className="border-b pb-6 mb-6 flex justify-between items-center">
                <div>
                  <h2 className="text-3xl font-black text-gray-900 uppercase">{integranteSeleccionado.nombre} {integranteSeleccionado.apellido}</h2>
                  <p className="text-gray-500 text-lg font-semibold">{integranteSeleccionado.club.nombre}</p>
                </div>
                <div className="text-center bg-blue-900 text-white p-4 rounded-lg shadow-inner">
                  <span className="block text-4xl font-black text-yellow-400 drop-shadow">{integranteSeleccionado.xp}</span>
                  <span className="text-xs font-bold uppercase tracking-widest text-blue-200">Puntos Totales</span>
                </div>
              </div>

              {/* Formulario de Firma */}
              {mostrarFormFirma && (
                <form onSubmit={handleFirmarRequisito} className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded shadow-inner">
                  <h3 className="text-lg font-black text-gray-800 mb-4 uppercase">Autorización de Progreso</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="col-span-1 md:col-span-2">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Requisito a Aprobar</label>
                      <select required value={reqId} onChange={e => setReqId(e.target.value)} className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                        <option value="">-- Seleccione un requisito del manual --</option>
                        {requisitosPendientes.map(req => (
                          <option key={req.id} value={req.id}>
                            [{req.seccion}] {req.numero} - {req.descripcion.substring(0, 70)}... {req.puntosXp > 0 ? `(+${req.puntosXp} XP)` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {requisitoSeleccionado?.esEspecialidad && (
                      <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">ID Especialidad Completada</label>
                        <input type="number" required value={espElegidaId} onChange={e => setEspElegidaId(e.target.value)} className="w-full p-3 border border-gray-300 rounded" placeholder="Ej: 120" />
                      </div>
                    )}
                    <div className={requisitoSeleccionado?.esEspecialidad ? '' : 'col-span-1 md:col-span-2'}>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Evidencia Fotográfica</label>
                      <input type="file" accept="image/*" onChange={e => setFotoRespaldo(e.target.files?.[0] || null)} className="w-full p-2 border border-gray-300 rounded bg-white text-sm" />
                    </div>
                  </div>
                  <button type="submit" disabled={firmando} className={`w-full py-4 rounded font-black uppercase tracking-widest text-white transition-colors ${firmando ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>
                    {firmando ? 'Procesando...' : 'Sellar y Guardar en Bitácora'}
                  </button>
                </form>
              )}

              {/* BANDA VIRTUAL (Maestrías + Especialidades) */}
              {!bandaVirtual ? <p className="text-gray-500 font-bold">Cargando Banda Virtual...</p> : (
                <>
                  {/* MAESTRÍAS */}
                  {bandaVirtual.totalMaestrias > 0 && (
                    <div className="mb-8">
                      <h3 className="text-lg font-black text-gray-800 mb-4 border-b-2 border-yellow-500 inline-block pb-1 uppercase">
                        Maestrías Alcanzadas ({bandaVirtual.totalMaestrias})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {bandaVirtual.maestrias.map((m) => (
                          <div key={m.id} className="flex items-center gap-4 p-4 bg-gradient-to-r from-yellow-50 to-amber-100 border border-yellow-300 rounded-lg shadow-sm">
                            <div className="w-16 h-16 rounded shadow flex items-center justify-center bg-yellow-500 border-2 border-yellow-600">
                              <span className="text-3xl">👑</span>
                            </div>
                            <div>
                              <p className="font-black text-yellow-900">{m.maestria.nombre}</p>
                              <p className="text-xs text-yellow-700 mt-1">Aprobada el: {new Date(m.fechaAprobacion).toLocaleDateString()}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ESPECIALIDADES NORMALES */}
                  <div>
                    <h3 className="text-lg font-black text-gray-800 mb-4 border-b-2 border-green-500 inline-block pb-1 uppercase">
                      Especialidades ({bandaVirtual.totalEspecialidades})
                    </h3>
                    {bandaVirtual.totalEspecialidades === 0 ? <p className="text-gray-500 italic">No hay parches registrados.</p> : (
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {bandaVirtual.especialidades.map((item) => (
                          <div key={item.id} className="flex flex-col items-center justify-center p-4 bg-gray-50 border border-gray-200 rounded hover:shadow-md transition-all">
                            <div className="w-16 h-16 rounded-full flex items-center justify-center shadow-inner mb-2 border-4 border-white" style={{ backgroundColor: item.especialidad.colorFondo || '#3B82F6' }}>
                              <span className="text-white font-black text-xl">{item.especialidad.nombre.charAt(0)}</span>
                            </div>
                            <p className="text-center font-bold text-gray-800 text-xs leading-tight">{item.especialidad.nombre}</p>
                            <p className="text-center text-[10px] text-gray-500 mt-1 uppercase tracking-wider">{item.especialidad.categoria}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* VISTA 3: AUDITORÍA (CIBERSEGURIDAD) */}
        {vista === 'auditoria' && (
          <div className="animate-fade-in">
            <h1 className="text-3xl font-black text-gray-800 border-b-4 border-red-600 pb-2 inline-block mb-8 uppercase tracking-wide">
              Centro de Monitoreo Forense
            </h1>
            
            {cargando ? <p className="text-xl text-gray-500">Recuperando bitácora...</p> : (
              <div className="bg-white rounded shadow-lg overflow-hidden border border-gray-200">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-800 text-white uppercase font-bold text-xs tracking-wider">
                    <tr>
                      <th className="p-4">Fecha y Hora</th>
                      <th className="p-4">Método</th>
                      <th className="p-4">Ruta (Endpoint)</th>
                      <th className="p-4">Usuario Responsable</th>
                      <th className="p-4">IP Origen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {logs.map((log) => (
                      <tr key={log.id} className="hover:bg-red-50 transition-colors">
                        <td className="p-4 whitespace-nowrap font-mono text-xs">{new Date(log.fecha).toLocaleString()}</td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${log.metodo === 'POST' ? 'bg-green-100 text-green-800' : log.metodo === 'DELETE' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                            {log.metodo}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-xs truncate max-w-xs">{log.ruta}</td>
                        <td className="p-4 font-bold text-gray-800">
                          {log.usuario ? `${log.usuario.nombre} (${log.usuario.email})` : 'Sistema / Anónimo'}
                        </td>
                        <td className="p-4 font-mono text-xs text-gray-500">{log.ip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {logs.length === 0 && <p className="p-8 text-center text-gray-500">No hay registros de auditoría aún.</p>}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;