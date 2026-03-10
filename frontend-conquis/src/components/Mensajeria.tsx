import { useState, useEffect } from "react";
import { mensajeService } from "../services/mensaje.service";
import type { Mensaje, UsuarioContacto } from "../types/mensaje.types";

// 🛡️ Agregamos la interfaz para recibir la función desde App.tsx
interface MensajeriaProps {
  alActualizar?: () => void;
}

export default function Mensajeria({ alActualizar }: MensajeriaProps) {
  const [pestañaActual, setPestañaActual] = useState<"entrada" | "salida">(
    "entrada",
  );
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [cargando, setCargando] = useState(false);

  const [mostrandoRedaccion, setMostrandoRedaccion] = useState(false);
  const [mensajeViendo, setMensajeViendo] = useState<Mensaje | null>(null);

  const [contactos, setContactos] = useState<UsuarioContacto[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [nuevoMensaje, setNuevoMensaje] = useState({
    destinatarioId: "",
    asunto: "",
    cuerpo: "",
  });

  useEffect(() => {
    if (!mostrandoRedaccion && !mensajeViendo) {
      cargarMensajes();
    }
  }, [pestañaActual, mostrandoRedaccion, mensajeViendo]);

  const cargarMensajes = async () => {
    setCargando(true);
    try {
      if (pestañaActual === "entrada") {
        const data = await mensajeService.obtenerBandejaEntrada();
        setMensajes(data);
      } else {
        const data = await mensajeService.obtenerBandejaSalida();
        setMensajes(data);
      }
    } catch (error: any) {
      console.error("Error al cargar mensajes:", error);
    } finally {
      setCargando(false);
    }
  };

  const cargarDirectorioYAbrir = async () => {
    try {
      const listaContactos = await mensajeService.obtenerContactos();
      setContactos(listaContactos);
      setMostrandoRedaccion(true);
      setMensajeViendo(null);
    } catch (error) {
      alert("Error al cargar la libreta de direcciones.");
    }
  };

  const handleAbrirRedaccionLimpia = () => {
    setNuevoMensaje({ destinatarioId: "", asunto: "", cuerpo: "" });
    cargarDirectorioYAbrir();
  };

  // 🛡️ LÓGICA DE RESPUESTA INTELIGENTE
  const handleResponder = () => {
    if (!mensajeViendo || !mensajeViendo.remitente) return;

    // Armamos el prefijo Re: solo si no lo tiene ya
    const prefijoAsunto = mensajeViendo.asunto.startsWith("Re:")
      ? mensajeViendo.asunto
      : `Re: ${mensajeViendo.asunto}`;

    setNuevoMensaje({
      destinatarioId: String(mensajeViendo.remitente.id),
      asunto: prefijoAsunto,
      cuerpo: `\n\n\n--- Mensaje original de ${mensajeViendo.remitente.nombre} ---\n${mensajeViendo.cuerpo}`,
    });

    cargarDirectorioYAbrir();
  };

  // 🛡️ LÓGICA DE LECTURA OPTIMIZADA
  const handleAbrirMensaje = async (msg: Mensaje) => {
    setMensajeViendo(msg);
    
    if (pestañaActual === "entrada" && !msg.leido) {
      // 1. Actualización Optimista: Lo marcamos leído localmente al instante
      setMensajes(prevMensajes => 
        prevMensajes.map(m => m.id === msg.id ? { ...m, leido: true } : m)
      );
      
      // 2. Le avisamos a la App principal que descuente 1 del globo rojo
      if (alActualizar) alActualizar();

      // 3. Enviamos la petición al backend en segundo plano
      try {
        await mensajeService.marcarLeido(msg.id);
      } catch (error) {
        console.error("Error al marcar como leído en el servidor", error);
      }
    }
  };

  const handleEnviarMensaje = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoMensaje.destinatarioId) return;

    setEnviando(true);
    try {
      await mensajeService.enviarMensaje({
        destinatarioId: Number(nuevoMensaje.destinatarioId),
        asunto: nuevoMensaje.asunto,
        cuerpo: nuevoMensaje.cuerpo,
      });
      alert("¡Mensaje enviado con éxito!");
      setNuevoMensaje({ destinatarioId: "", asunto: "", cuerpo: "" });
      setMostrandoRedaccion(false);
      setPestañaActual("salida");
    } catch (error: any) {
      alert(`Error: ${error.response?.data?.message || "Error al enviar."}`);
    } finally {
      setEnviando(false);
    }
  };

  const formatearFecha = (fechaIso: string) => {
    const fecha = new Date(fechaIso);
    return fecha.toLocaleString("es-AR", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ==========================================
  // VISTA 1: REDACCIÓN
  // ==========================================
  if (mostrandoRedaccion) {
    return (
      <div className="animate-fade-in bg-white rounded-xl shadow-lg p-6 border-t-4 border-teal-500 max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-xl font-black text-gray-800 uppercase flex items-center gap-2">
            ✏️ Redactar Mensaje
          </h2>
          <button
            onClick={() => setMostrandoRedaccion(false)}
            className="text-gray-500 hover:text-red-500 font-bold px-3 py-1 rounded bg-gray-100 hover:bg-red-50 transition-colors"
          >
            ❌ Cancelar
          </button>
        </div>
        <form onSubmit={handleEnviarMensaje} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Para *
            </label>
            <select
              required
              value={nuevoMensaje.destinatarioId}
              onChange={(e) =>
                setNuevoMensaje({
                  ...nuevoMensaje,
                  destinatarioId: e.target.value,
                })
              }
              className="w-full p-3 border rounded font-bold text-gray-800 bg-gray-50"
            >
              <option value="">-- Seleccione un contacto --</option>
              {contactos.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre} ({c.rol})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Asunto *
            </label>
            <input
              required
              type="text"
              value={nuevoMensaje.asunto}
              onChange={(e) =>
                setNuevoMensaje({ ...nuevoMensaje, asunto: e.target.value })
              }
              className="w-full p-3 border rounded font-semibold text-gray-800 bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Mensaje *
            </label>
            <textarea
              required
              rows={8}
              value={nuevoMensaje.cuerpo}
              onChange={(e) =>
                setNuevoMensaje({ ...nuevoMensaje, cuerpo: e.target.value })
              }
              className="w-full p-3 border rounded text-gray-800 resize-none bg-gray-50"
            ></textarea>
          </div>
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={enviando}
              className={`px-6 py-3 font-black rounded shadow uppercase text-white tracking-widest transition-colors ${enviando ? "bg-gray-400" : "bg-teal-600 hover:bg-teal-700"}`}
            >
              {enviando ? "Procesando..." : "📤 Enviar Mensaje"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ==========================================
  // VISTA 2: LECTURA DEL MENSAJE (CON RESPUESTA)
  // ==========================================
  if (mensajeViendo) {
    return (
      <div className="animate-fade-in bg-white rounded-xl shadow-lg p-8 border-t-4 border-teal-500 max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <button
            onClick={() => setMensajeViendo(null)}
            className="px-4 py-2 bg-gray-200 text-gray-800 font-bold rounded hover:bg-gray-300 transition-colors"
          >
            ← Volver a la Bandeja
          </button>

          {/* 🛡️ Botón Responder (Solo en bandeja de entrada) */}
          {pestañaActual === "entrada" && (
            <button
              onClick={handleResponder}
              className="px-4 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700 shadow flex items-center gap-2 transition-colors"
            >
              ↩️ Responder
            </button>
          )}
        </div>

        <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <h2 className="text-2xl font-black text-gray-900 mb-2">
              {mensajeViendo.asunto}
            </h2>
            <span className="text-xs font-bold text-gray-500 uppercase bg-gray-200 px-2 py-1 rounded">
              {formatearFecha(mensajeViendo.fechaEnvio)}
            </span>
          </div>
          <div className="flex flex-col text-sm text-gray-600 mt-2 border-t pt-2">
            <p>
              <strong className="text-gray-800 uppercase text-xs tracking-wider">
                De:
              </strong>{" "}
              {mensajeViendo.remitente?.nombre || "Usuario Eliminado"}{" "}
              <span className="text-gray-400">
                ({mensajeViendo.remitente?.rol || "-"})
              </span>
            </p>
            <p>
              <strong className="text-gray-800 uppercase text-xs tracking-wider">
                Para:
              </strong>{" "}
              {mensajeViendo.destinatario?.nombre || "Usuario Eliminado"}{" "}
              <span className="text-gray-400">
                ({mensajeViendo.destinatario?.rol || "-"})
              </span>
            </p>
          </div>
        </div>

        <div className="bg-white p-6 border border-gray-100 shadow-inner rounded-lg min-h-[250px] text-gray-800 whitespace-pre-wrap font-medium leading-relaxed">
          {mensajeViendo.cuerpo}
        </div>
      </div>
    );
  }

  // ==========================================
  // VISTA 3: BANDEJAS (TABLA)
  // ==========================================
  return (
    <div className="animate-fade-in bg-white rounded-xl shadow-lg p-6 border-t-4 border-teal-500">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4 border-b pb-4">
        <h2 className="text-2xl font-black text-gray-800 uppercase flex items-center gap-2">
          ✉️ Centro de Comunicaciones
        </h2>
        <button
          onClick={handleAbrirRedaccionLimpia}
          className="px-4 py-2 bg-teal-600 text-white font-bold rounded shadow hover:bg-teal-700 transition-colors"
        >
          + Redactar Nuevo
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setPestañaActual("entrada")}
          className={`px-4 py-2 font-bold rounded transition-colors ${pestañaActual === "entrada" ? "bg-teal-100 text-teal-800 border-b-2 border-teal-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
        >
          📥 Bandeja de Entrada
        </button>
        <button
          onClick={() => setPestañaActual("salida")}
          className={`px-4 py-2 font-bold rounded transition-colors ${pestañaActual === "salida" ? "bg-teal-100 text-teal-800 border-b-2 border-teal-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
        >
          📤 Elementos Enviados
        </button>
      </div>

      {cargando ? (
        <p className="text-gray-500 font-bold animate-pulse p-4 text-center">
          Sincronizando comunicaciones...
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-800 text-white uppercase text-xs">
              <tr>
                <th className="p-3">
                  {pestañaActual === "entrada" ? "De" : "Para"}
                </th>
                <th className="p-3">Asunto</th>
                <th className="p-3">Fecha</th>
                <th className="p-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {mensajes.map((msg) => (
                <tr
                  key={msg.id}
                  onClick={() => handleAbrirMensaje(msg)}
                  className={`hover:bg-teal-50 cursor-pointer transition-colors ${!msg.leido && pestañaActual === "entrada" ? "bg-blue-50 font-bold border-l-4 border-blue-500" : ""}`}
                >
                  <td className="p-3">
                    {pestañaActual === "entrada"
                      ? `${msg.remitente?.nombre || "Desconocido"}`
                      : `${msg.destinatario?.nombre || "Desconocido"}`}
                  </td>
                  <td className="p-3 text-gray-800">{msg.asunto}</td>
                  <td className="p-3 text-gray-500 text-xs">
                    {formatearFecha(msg.fechaEnvio)}
                  </td>
                  <td className="p-3 text-center">
                    {msg.leido ? (
                      <span className="bg-gray-200 text-gray-600 px-2 py-1 rounded text-[10px] font-black uppercase">
                        Leído
                      </span>
                    ) : (
                      <span className="bg-blue-600 text-white px-2 py-1 rounded text-[10px] font-black uppercase shadow-sm">
                        Nuevo
                      </span>
                    )}
                  </td>
                </tr>
              ))}
              {mensajes.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="p-8 text-center text-gray-500 font-bold bg-gray-50 border border-dashed border-gray-300"
                  >
                    No hay comunicaciones.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
