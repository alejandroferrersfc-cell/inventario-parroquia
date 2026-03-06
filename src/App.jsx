import { useEffect, useMemo, useRef, useState } from 'react';
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  Pencil,
  Trash2,
  Plus,
  Save,
  X,
  Search,
  Package,
  Download,
  Church,
  MapPin,
  Ruler,
  FolderPlus,
} from 'lucide-react';

const STORAGE_KEY = 'inventario-iglesia';

const datosIniciales = [
  { id: 1, objeto: 'Banco', cantidad: 12, ubicacion: 'Iglesia', medida: '2 m de largo' },
  { id: 2, objeto: 'Maceta', cantidad: 8, ubicacion: 'Patio', medida: '40 cm de alto' },
  { id: 3, objeto: 'Escoba', cantidad: 3, ubicacion: 'Limpieza', medida: '1,2 m' },
  { id: 4, objeto: 'Mesa', cantidad: 2, ubicacion: 'Sala parroquial', medida: '1,5 m x 80 cm' },
  { id: 5, objeto: 'Silla', cantidad: 20, ubicacion: 'Salón', medida: '45 cm de alto' },
  { id: 6, objeto: 'Atril', cantidad: 1, ubicacion: 'Altar', medida: '1,3 m de alto' },
];

const normalizeUbicacion = (valor = '') => valor.trim().toLowerCase();

const formatUbicacion = (valor = '') => {
  const limpio = valor.trim();
  if (!limpio) return '';
  return limpio.charAt(0).toUpperCase() + limpio.slice(1).toLowerCase();
};

const escaparHtml = (valor = '') =>
  String(valor)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const crearFilaVacia = (id, ubicacionPorDefecto = '') => ({
  id,
  objeto: '',
  cantidad: 1,
  ubicacion: ubicacionPorDefecto,
  medida: '',
});

function esFilaVacia(item) {
  return !item.objeto.trim() && !item.ubicacion.trim() && !item.medida.trim() && Number(item.cantidad) === 1;
}

function runInlineTests() {
  console.assert(normalizeUbicacion(' Iglesia ') === 'iglesia', 'Debe normalizar espacios y mayúsculas');
  console.assert(formatUbicacion('pAtIo') === 'Patio', 'Debe formatear ubicación con mayúscula inicial');
  console.assert(formatUbicacion('') === '', 'Debe aceptar cadenas vacías');
  console.assert(escaparHtml('<b>Banco</b>') === '&lt;b&gt;Banco&lt;/b&gt;', 'Debe escapar HTML peligroso');
  console.assert(crearFilaVacia(99, 'Patio').ubicacion === 'Patio', 'Debe crear fila vacía con ubicación');
  console.assert(esFilaVacia(crearFilaVacia(7)) === true, 'Una fila recién creada debe considerarse vacía');
  console.assert(
    esFilaVacia({ id: 8, objeto: 'Banco', cantidad: 1, ubicacion: '', medida: '' }) === false,
    'Una fila con objeto no debe considerarse vacía'
  );
}

runInlineTests();

export default function InventarioIglesiaApp() {
  const [inventario, setInventario] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroUbicacion, setFiltroUbicacion] = useState('Todas');
  const [editandoId, setEditandoId] = useState(null);
  const [formulario, setFormulario] = useState(crearFilaVacia(Date.now()));
  const [nuevaUbicacion, setNuevaUbicacion] = useState('');
  const [objetoAEliminar, setObjetoAEliminar] = useState(null);
  const [mensajeAccion, setMensajeAccion] = useState('');
  const [zonas, setZonas] = useState([]);
  const [tipoMensaje, setTipoMensaje] = useState('success');
  const timeoutMensajeRef = useRef(null);
  console.log("APP CARGADA");


useEffect(() => {
  const cargarDatos = async () => {
    try {
      const referencia = doc(db, "inventario", "InventarioParroquia");
      const snap = await getDoc(referencia);

      if (snap.exists()) {
        const data = snap.data();

        setInventario(Array.isArray(data.items) ? data.items : datosIniciales);
        setZonas(Array.isArray(data.zonas) ? data.zonas : []);
      } else {
        setInventario(datosIniciales);
        setZonas([]);

        await setDoc(referencia, {
          items: datosIniciales,
          zonas: [],
        });
      }
    } catch (error) {
  console.error("Error al cargar Firebase:", error);
  alert("Error al cargar Firebase: " + error.message);
  setInventario(datosIniciales);
  setZonas([]);
}
  };

  cargarDatos();
}, []);
  console.log("ANTES DEL useEffect DE GUARDADO");
console.log("ANTES DEL useEffect DE GUARDADO");

useEffect(() => {
  console.log("ENTRANDO AL useEffect DE GUARDADO");

  if (inventario.length === 0 && zonas.length === 0) return;

  const guardarDatos = async () => {
    console.log("Guardando en Firebase", inventario);

    try {
      const referencia = doc(db, "inventario", "InventarioParroquia");

      await setDoc(referencia, {
        items: inventario,
        zonas: zonas,
      });
    } catch (error) {
      console.error("Error al guardar en Firebase:", error);
      alert("Error al guardar en Firebase: " + error.message);
    }
  };

  guardarDatos();
}, [inventario, zonas]);
  useEffect(() => {
    return () => {
      if (timeoutMensajeRef.current) {
        window.clearTimeout(timeoutMensajeRef.current);
      }
    };
  }, []);

  const ubicaciones = useMemo(() => {
    const mapa = new Map();

    inventario.forEach((item) => {
      const original = item.ubicacion?.trim();
      if (!original) return;

      const normalizada = normalizeUbicacion(original);
      if (!mapa.has(normalizada)) {
        mapa.set(normalizada, formatUbicacion(original));
      }
    });

    zonas.forEach((z) => {
      const normalizada = normalizeUbicacion(z);
      if (!mapa.has(normalizada)) {
        mapa.set(normalizada, formatUbicacion(z));
      }
    });

    return ['Todas', ...Array.from(mapa.values()).sort((a, b) => a.localeCompare(b))];
  }, [inventario,zonas]);

  const inventarioFiltrado = useMemo(() => {
    return inventario.filter((item) => {
      const texto = `${item.objeto} ${item.ubicacion} ${item.medida}`.toLowerCase();
      const coincideBusqueda = texto.includes(busqueda.toLowerCase());
      const coincideUbicacion =
        filtroUbicacion === 'Todas' ||
        normalizeUbicacion(item.ubicacion) === normalizeUbicacion(filtroUbicacion);

      return coincideBusqueda && coincideUbicacion;
    });
  }, [inventario, busqueda, filtroUbicacion]);

  const totalObjetos = inventario.reduce((acc, item) => acc + (Number(item.cantidad) || 0), 0);
  const totalTipos = inventario.length;
  const totalUbicaciones = new Set(
    inventario.map((item) => normalizeUbicacion(item.ubicacion)).filter(Boolean)
  ).size;
  const objetosConMedida = inventario.filter((item) => item.medida && item.medida.trim() !== '').length;

  const iniciarEdicion = (item) => {
    setEditandoId(item.id);
    setFormulario({ ...item, ubicacion: formatUbicacion(item.ubicacion) });
  };

  const cancelarEdicion = () => {
    const idActual = editandoId;
    const filaActual = inventario.find((item) => item.id === idActual);

    if (filaActual && esFilaVacia(filaActual)) {
      setInventario((prev) => prev.filter((item) => item.id !== idActual));
      mostrarMensajeTemporal('El nuevo objeto vacío se ha cancelado.', 'warning');
    }

    setEditandoId(null);
    setFormulario(crearFilaVacia(Date.now(), filtroUbicacion !== 'Todas' ? filtroUbicacion : ''));
  };

  const guardarEdicion = () => {
    const objetoLimpio = formulario.objeto.trim();
    const ubicacionLimpia = formatUbicacion(formulario.ubicacion);
    const esNuevo = inventario.some((item) => item.id === editandoId && esFilaVacia(item));

    if (!objetoLimpio || !ubicacionLimpia) {
      mostrarMensajeTemporal('Debes indicar al menos el objeto y la ubicación.', 'warning');
      return;
    }

    setInventario((prev) =>
      prev.map((item) =>
        item.id === editandoId
          ? {
              ...formulario,
              objeto: objetoLimpio,
              ubicacion: ubicacionLimpia,
              cantidad: Math.max(0, Number(formulario.cantidad) || 0),
              medida: formulario.medida.trim(),
            }
          : item
      )
    );

    setEditandoId(null);
    setFormulario(crearFilaVacia(Date.now(), filtroUbicacion !== 'Todas' ? filtroUbicacion : ''));
    mostrarMensajeTemporal(
      esNuevo ? `Nuevo objeto ${objetoLimpio} añadido correctamente.` : `${objetoLimpio} actualizado correctamente.`,
      'success'
    );
  };

  const eliminarFila = (id) => {
    setObjetoAEliminar(id);
  };

  const confirmarEliminacion = () => {
    if (objetoAEliminar === null) return;

    const itemEliminado = inventario.find((item) => item.id === objetoAEliminar);

    setInventario((prev) => prev.filter((item) => item.id !== objetoAEliminar));
    if (editandoId === objetoAEliminar) {
      setEditandoId(null);
      setFormulario(crearFilaVacia(Date.now(), filtroUbicacion !== 'Todas' ? filtroUbicacion : ''));
    }
    setObjetoAEliminar(null);
    mostrarMensajeTemporal(`Objeto ${itemEliminado?.objeto || ''} eliminado correctamente.`, 'success');
  };

  const cancelarEliminacion = () => {
    setObjetoAEliminar(null);
  };

  const agregarNuevoObjeto = () => {
    const nuevoId = Date.now();
    const ubicacionInicial = filtroUbicacion !== 'Todas' ? filtroUbicacion : '';
    const nuevaFila = crearFilaVacia(nuevoId, ubicacionInicial);

    setInventario((prev) => [nuevaFila, ...prev]);
    setEditandoId(nuevoId);
    setFormulario(nuevaFila);
  };

  const actualizarCampo = (campo, valor) => {
    setFormulario((prev) => ({ ...prev, [campo]: valor }));
  };

  const anadirUbicacion = () => {
    const texto = nuevaUbicacion.trim();
    if (!texto) return;

    const ubicacionBonita = formatUbicacion(texto);

    setZonas((prev) => {
      const existe = prev.some((z) => normalizeUbicacion(z) === normalizeUbicacion(ubicacionBonita));
      if (existe) return prev;
      return [...prev, ubicacionBonita];
    });

    setFiltroUbicacion(ubicacionBonita);
    setNuevaUbicacion('');

    if (editandoId !== null) {
      setFormulario((prev) => ({ ...prev, ubicacion: ubicacionBonita }));
    }

    mostrarMensajeTemporal(`Ubicación ${ubicacionBonita} preparada para usar.`, 'success');
  };

  const obtenerClaseUbicacion = (ubicacion = '') => {
    const valor = normalizeUbicacion(ubicacion);

    if (valor.includes('iglesia') || valor.includes('altar')) {
      return 'bg-blue-50 text-blue-700';
    }
    if (valor.includes('patio') || valor.includes('jard')) {
      return 'bg-emerald-50 text-emerald-700';
    }
    if (valor.includes('limpieza')) {
      return 'bg-amber-50 text-amber-700';
    }
    if (valor.includes('almac') || valor.includes('trastero')) {
      return 'bg-violet-50 text-violet-700';
    }
    if (valor.includes('sal') || valor.includes('parroquial')) {
      return 'bg-rose-50 text-rose-700';
    }

    return 'bg-slate-100 text-slate-700';
  };

  const mostrarMensajeTemporal = (mensaje, tipo = 'success') => {
    setMensajeAccion(mensaje);
    setTipoMensaje(tipo);

    if (timeoutMensajeRef.current) {
      window.clearTimeout(timeoutMensajeRef.current);
    }

    timeoutMensajeRef.current = window.setTimeout(() => {
      setMensajeAccion('');
      setTipoMensaje('success');
      timeoutMensajeRef.current = null;
    }, 3000);
  };

  const exportarCSV = () => {
    try {
      const cabecera = ['Objeto', 'Cantidad', 'Ubicación', 'Medida'];
      const filas = inventario.map((item) => [item.objeto, item.cantidad, item.ubicacion, item.medida]);

      const csv = [cabecera, ...filas]
        .map((fila) => fila.map((valor) => `"${String(valor ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n');

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = 'inventario-iglesia.csv';
      enlace.style.display = 'none';
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      URL.revokeObjectURL(url);
      mostrarMensajeTemporal('Archivo CSV preparado correctamente.', 'success');
    } catch (error) {
      console.error('Error al exportar CSV:', error);
      mostrarMensajeTemporal('No se pudo exportar el CSV.', 'error');
    }
  };

  const imprimirPDF = () => {
    try {
      const filasHtml = inventarioFiltrado
        .map(
          (item) => `
            <tr>
              <td>${escaparHtml(item.objeto || '')}</td>
              <td>${escaparHtml(item.cantidad ?? '')}</td>
              <td>${escaparHtml(item.ubicacion || '')}</td>
              <td>${escaparHtml(item.medida || '')}</td>
            </tr>
          `
        )
        .join('');

      const ventana = window.open('', '_blank', 'width=1000,height=700');

      if (!ventana) {
        mostrarMensajeTemporal('El navegador bloqueó la ventana para imprimir.', 'warning');
        return;
      }

      ventana.document.open();
      ventana.document.write(`
        <!doctype html>
        <html lang="es">
          <head>
            <meta charset="UTF-8" />
            <title>Inventario de la Iglesia</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
              h1 { margin-bottom: 8px; }
              p { margin-top: 0; color: #475569; }
              table { width: 100%; border-collapse: collapse; margin-top: 24px; }
              th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; }
              th { background: #0f172a; color: white; }
              tr:nth-child(even) { background: #f8fafc; }
            </style>
          </head>
          <body>
            <h1>Inventario de la Iglesia</h1>
            <p>Listado actual del inventario.</p>
            <table>
              <thead>
                <tr>
                  <th>Objeto</th>
                  <th>Cantidad</th>
                  <th>Ubicación</th>
                  <th>Medida</th>
                </tr>
              </thead>
              <tbody>
                ${filasHtml}
              </tbody>
            </table>
          </body>
        </html>
      `);
      ventana.document.close();
      ventana.focus();
      ventana.print();
      mostrarMensajeTemporal('Se abrió una ventana para guardar el inventario en PDF.', 'success');
    } catch (error) {
      console.error('Error al preparar PDF:', error);
      mostrarMensajeTemporal('No se pudo preparar el PDF.', 'error');
    }
  };

  return (
    <>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#fff7f7,_#f5e6e0_55%,_#e7d3c9)] p-4 md:p-8 print:bg-white print:p-0">
        <div className="mx-auto max-w-7xl print:max-w-full">
          <div className="relative mb-6 overflow-hidden rounded-[32px] bg-gradient-to-r from-red-800 via-red-700 to-amber-900 text-white shadow-2xl print:shadow-none">
            <Church className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 opacity-10" />
            <div className="grid gap-6 p-6 md:grid-cols-[1.3fr_0.7fr] md:p-8">
              <div>
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm">
                  <Church className="h-4 w-4" />
                  Gestión del inventario parroquial
                </div>
                <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Inventario de la Parroquia</h1>
                <div className="mt-3 h-1 w-32 rounded-full bg-white/70"></div>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-200 md:text-base">
                  Inventario de la iglesia de San José y Santa Maria
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-1 xl:grid-cols-2">
                <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-sm text-slate-200">Tipos de objetos</p>
                  <p className="mt-2 text-3xl font-bold">{totalTipos}</p>
                </div>
                <div className="rounded-3xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm">
                  <p className="text-sm text-slate-200">Cantidad total</p>
                  <p className="mt-2 text-3xl font-bold">{totalObjetos}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6 grid gap-4 md:grid-cols-4 print:hidden">
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-slate-100 p-3">
                  <Package className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Objetos distintos</p>
                  <h2 className="text-2xl font-bold text-slate-800">{totalTipos}</h2>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-slate-100 p-3">
                  <MapPin className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Ubicaciones</p>
                  <h2 className="text-2xl font-bold text-slate-800">{totalUbicaciones}</h2>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-slate-100 p-3">
                  <Ruler className="h-5 w-5 text-slate-700" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">Con medida indicada</p>
                  <h2 className="text-2xl font-bold text-slate-800">{objetosConMedida}</h2>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="text-sm text-slate-500">Estado del sistema</p>
              <h2 className="mt-2 text-lg font-semibold text-emerald-600">Guardado automático</h2>
              <p className="mt-1 text-sm text-slate-500">Los cambios se conservan en este navegador.</p>
            </div>
          </div>

          {mensajeAccion && (
            <div
              className={`mb-4 rounded-2xl px-4 py-3 text-sm font-medium print:hidden ${
                tipoMensaje === 'success'
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                  : tipoMensaje === 'warning'
                    ? 'border border-amber-200 bg-amber-50 text-amber-700'
                    : 'border border-rose-200 bg-rose-50 text-rose-700'
              }`}
            >
              {mensajeAccion}
            </div>
          )}

          <div className="rounded-[32px] bg-white shadow-2xl ring-1 ring-slate-200 print:rounded-none print:shadow-none print:ring-0">
            <div className="border-b border-slate-200 p-6 print:hidden">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-800">Panel de control</h2>
                  <p className="mt-1 text-slate-600">Busca, filtra, edita y exporta el inventario de forma rápida.</p>
                </div>

                <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap xl:justify-end">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                      placeholder="Buscar objeto, lugar o medida..."
                      className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-slate-500 sm:w-72"
                    />
                  </div>

                  <select
                    value={filtroUbicacion}
                    onChange={(e) => setFiltroUbicacion(e.target.value)}
                    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                  >
                    {ubicaciones.map((ubicacion) => (
                      <option key={ubicacion} value={ubicacion}>
                        {ubicacion}
                      </option>
                    ))}
                  </select>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={nuevaUbicacion}
                      onChange={(e) => setNuevaUbicacion(e.target.value)}
                      placeholder="Nueva ubicación"
                      className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
                    />
                    <button
                      onClick={anadirUbicacion}
                      className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
                    >
                      <FolderPlus className="h-4 w-4" />
                      Añadir zona
                    </button>
                  </div>

                  <button
                    onClick={agregarNuevoObjeto}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
                  >
                    <Plus className="h-4 w-4" />
                    Añadir objeto
                  </button>

                  <button
                    onClick={exportarCSV}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-amber-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700"
                  >
                    <Download className="h-4 w-4" />
                    Exportar CSV
                  </button>

                  <button
                    onClick={imprimirPDF}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-red-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-600"
                  >
                    <Download className="h-4 w-4" />
                    Guardar en PDF
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto p-4 md:p-6 print:p-0">
              <table className="w-full min-w-[980px] border-separate border-spacing-0 print:min-w-full">
                <thead>
                  <tr className="bg-red-800 text-left text-white">
                    <th className="rounded-tl-2xl p-4 text-sm font-semibold print:rounded-none">Objeto</th>
                    <th className="p-4 text-sm font-semibold">Cantidad</th>
                    <th className="p-4 text-sm font-semibold">Ubicación / Clasificación</th>
                    <th className="p-4 text-sm font-semibold">Medida</th>
                    <th className="rounded-tr-2xl p-4 text-sm font-semibold print:hidden">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {inventarioFiltrado.map((item, index) => {
                    const enEdicion = editandoId === item.id;

                    return (
                      <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="border-b border-slate-200 p-3 align-middle">
                          {enEdicion ? (
                            <input
                              type="text"
                              value={formulario.objeto}
                              onChange={(e) => actualizarCampo('objeto', e.target.value)}
                              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                              placeholder="Ej: Banco"
                            />
                          ) : (
                            <span className="font-semibold text-slate-800">{item.objeto}</span>
                          )}
                        </td>

                        <td className="border-b border-slate-200 p-3 align-middle">
                          {enEdicion ? (
                            <input
                              type="number"
                              min="0"
                              value={formulario.cantidad}
                              onChange={(e) => actualizarCampo('cantidad', e.target.value)}
                              className="w-28 rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                            />
                          ) : (
                            <span className="inline-flex min-w-14 justify-center rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                              {item.cantidad}
                            </span>
                          )}
                        </td>

                        <td className="border-b border-slate-200 p-3 align-middle">
                          {enEdicion ? (
                            <select
                              value={formulario.ubicacion}
                              onChange={(e) => actualizarCampo('ubicacion', e.target.value)}
                              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                            >
                              <option value="">Selecciona una ubicación</option>
                              {ubicaciones
                                .filter((ubicacion) => ubicacion !== 'Todas')
                                .map((ubicacion) => (
                                  <option key={ubicacion} value={ubicacion}>
                                    {ubicacion}
                                  </option>
                                ))}
                            </select>
                          ) : (
                            <span
                              className={`rounded-full px-3 py-1 text-sm font-medium ${obtenerClaseUbicacion(item.ubicacion)}`}
                            >
                              {item.ubicacion}
                            </span>
                          )}
                        </td>

                        <td className="border-b border-slate-200 p-3 align-middle">
                          {enEdicion ? (
                            <input
                              type="text"
                              value={formulario.medida}
                              onChange={(e) => actualizarCampo('medida', e.target.value)}
                              className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none focus:border-slate-500"
                              placeholder="Ej: 2 m de largo"
                            />
                          ) : (
                            <span className="text-slate-700">{item.medida || '—'}</span>
                          )}
                        </td>

                        <td className="border-b border-slate-200 p-3 align-middle print:hidden">
                          <div className="flex flex-wrap gap-2">
                            {enEdicion ? (
                              <>
                                <button
                                  onClick={guardarEdicion}
                                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                                >
                                  <Save className="h-4 w-4" />
                                  Guardar
                                </button>
                                <button
                                  onClick={cancelarEdicion}
                                  className="inline-flex items-center gap-2 rounded-xl bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
                                >
                                  <X className="h-4 w-4" />
                                  Cancelar
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => iniciarEdicion(item)}
                                  className="inline-flex items-center gap-2 rounded-xl bg-amber-100 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-200"
                                >
                                  <Pencil className="h-4 w-4" />
                                  Editar
                                </button>
                                <button
                                  onClick={() => eliminarFila(item.id)}
                                  className="inline-flex items-center gap-2 rounded-xl bg-rose-100 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-200"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Eliminar
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {inventarioFiltrado.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
                  <p className="text-lg font-semibold text-slate-700">No se han encontrado resultados</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Prueba con otra búsqueda, otro filtro o añade un nuevo objeto al inventario.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {objetoAEliminar !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
            <h3 className="text-xl font-bold text-slate-800">Confirmar eliminación</h3>
            <p className="mt-3 text-slate-600">
              ¿Seguro que quieres eliminar este objeto del inventario? Esta acción no se puede deshacer.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={cancelarEliminacion}
                className="rounded-2xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-300"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarEliminacion}
                className="rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-500"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
