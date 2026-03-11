import { useEffect, useMemo, useRef, useState } from 'react';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  writeBatch
} from "firebase/firestore";
import { db } from "./firebase";
import { auth } from "./firebase";
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import Spinner from "./components/Spinner";
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
  { id: 1, objeto: 'Banco', cantidad: 12, ubicacion: 'Iglesia', medida: '2 m de largo', foto: '', descripcion: '' },
  { id: 2, objeto: 'Maceta', cantidad: 8, ubicacion: 'Patio', medida: '40 cm de alto', foto: '', descripcion: '' },
  { id: 3, objeto: 'Escoba', cantidad: 3, ubicacion: 'Limpieza', medida: '1,2 m', foto: '', descripcion: '' },
  { id: 4, objeto: 'Mesa', cantidad: 2, ubicacion: 'Sala parroquial', medida: '1,5 m x 80 cm', foto: '', descripcion: '' },
  { id: 5, objeto: 'Silla', cantidad: 20, ubicacion: 'Salón', medida: '45 cm de alto', foto: '', descripcion: '' },
  { id: 6, objeto: 'Atril', cantidad: 1, ubicacion: 'Altar', medida: '1,3 m de alto', foto: '', descripcion: '' },
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
  foto: '',
  descripcion: '',
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
  const [zonaAEliminar, setZonaAEliminar] = useState("");
  const [tipoMensaje, setTipoMensaje] = useState('success');
  const timeoutMensajeRef = useRef(null);
  const [usuario, setUsuario] = useState(null);
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [mostrarPassword, setMostrarPassword] = useState(false);
const [cargando, setCargando] = useState(true);
const [visible, setVisible] = useState(false);
const [authCargando, setAuthCargando] = useState(true);
const [loginCargando, setLoginCargando] = useState(false);
  console.log("APP CARGADA");


 useEffect(() => {
  const unsubscribe = onAuthStateChanged(auth, (user) => {
    setUsuario(user);
    setAuthCargando(false);
  });

  return () => unsubscribe();
}, []);

  
  const iniciarSesion = async () => {
  try {

    setLoginCargando(true);

    await signInWithEmailAndPassword(auth, email, password);

  } catch (error) {

    alert("Error al iniciar sesión: " + error.message);

  } finally {

    setLoginCargando(false);

  }
};

const cerrarSesion = async () => {
  await signOut(auth);
};



 



useEffect(() => {

  if (!usuario) return; // ⬅️ ESTA ES LA LÍNEA IMPORTANTE

const cargarDatos = async () => {
  try {
    setCargando(true);

    console.log("1. Empieza cargarDatos");

    // Cargar objetos nuevos
    const snapshot = await getDocs(collection(db, "inventario_items"));
    let items = snapshot.docs.map((docItem) => ({
      id: docItem.id,
      ...docItem.data(),
    }));

    console.log("2. Objetos en inventario_items:", items.length);

    // Cargar zonas nuevas
    const referenciaZonas = doc(db, "inventario_config", "zonas");
    const snapZonas = await getDoc(referenciaZonas);

    let zonasCargadas = [];

    if (snapZonas.exists()) {
      const dataZonas = snapZonas.data();
      zonasCargadas = Array.isArray(dataZonas.lista) ? dataZonas.lista : [];
    }

    console.log("3. Zonas en inventario_config:", zonasCargadas.length);

    // Si todavía no hay datos en la nueva estructura, intentar migrar desde la antigua
    if (items.length === 0 && zonasCargadas.length === 0) {
      console.log("4. Se va a ejecutar la migración");

      const referenciaAntigua = doc(db, "inventario", "InventarioParroquia");
      const snapAntiguo = await getDoc(referenciaAntigua);

      if (snapAntiguo.exists()) {
        const dataAntigua = snapAntiguo.data();
        const itemsAntiguos = Array.isArray(dataAntigua.items) ? dataAntigua.items : [];
        const zonasAntiguas = Array.isArray(dataAntigua.zonas) ? dataAntigua.zonas : [];

        console.log("5. Objetos antiguos encontrados:", itemsAntiguos.length);
        console.log("6. Zonas antiguas encontradas:", zonasAntiguas.length);

        for (const item of itemsAntiguos) {
          const { id, ...resto } = item;
          await addDoc(collection(db, "inventario_items"), resto);
        }

        console.log("7. Objetos migrados a inventario_items");

        await setDoc(doc(db, "inventario_config", "zonas"), {
          lista: zonasAntiguas,
        });

        console.log("8. Zonas migradas a inventario_config");

        const snapshotMigrado = await getDocs(collection(db, "inventario_items"));
        items = snapshotMigrado.docs.map((docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        }));

        zonasCargadas = zonasAntiguas;

        console.log("9. Objetos tras migración:", items.length);
      }
    }

    setInventario(items);
    setZonas(zonasCargadas);

  } catch (error) {
    console.error("Error al cargar Firebase:", error);
    alert("Error al cargar Firebase: " + error.message);
  } finally {
    setCargando(false);

    setTimeout(() => {
      setVisible(true);
    }, 50);
  }
};

  cargarDatos();

}, [usuario]);



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

    if (filaActual && String(idActual).startsWith("temp-") && esFilaVacia(filaActual)) {
      setInventario((prev) => prev.filter((item) => item.id !== idActual));
      mostrarMensajeTemporal('El nuevo objeto vacío se ha cancelado.', 'warning');
    }

    setEditandoId(null);
    setFormulario(crearFilaVacia(Date.now(), filtroUbicacion !== 'Todas' ? filtroUbicacion : ''));
  };

  const guardarEdicion = async () => {
  const objetoLimpio = formulario.objeto.trim();
  const ubicacionLimpia = formatUbicacion(formulario.ubicacion);
  const esNuevo = String(editandoId).startsWith("temp-");

  if (!objetoLimpio || !ubicacionLimpia) {
    mostrarMensajeTemporal("Debes indicar al menos el objeto y la ubicación.", "warning");
    return;
  }

  const datosObjeto = {
    ...formulario,
    objeto: objetoLimpio,
    ubicacion: ubicacionLimpia,
    cantidad: Math.max(0, Number(formulario.cantidad) || 0),
    medida: formulario.medida.trim(),
    descripcion: (formulario.descripcion || "").trim(),
    foto: formulario.foto || "",
  };

  try {
    if (esNuevo) {
      const docRef = await addDoc(collection(db, "inventario_items"), datosObjeto);

      setInventario((prev) =>
        prev.map((item) =>
          item.id === editandoId ? { ...datosObjeto, id: docRef.id } : item
        )
      );

      mostrarMensajeTemporal(`Nuevo objeto ${objetoLimpio} añadido correctamente.`, "success");
    } else {
      await updateDoc(doc(db, "inventario_items", String(editandoId)), datosObjeto);

      setInventario((prev) =>
        prev.map((item) =>
          item.id === editandoId ? { ...datosObjeto, id: editandoId } : item
        )
      );

      mostrarMensajeTemporal(`${objetoLimpio} actualizado correctamente.`, "success");
    }

    setEditandoId(null);
    setFormulario(
      crearFilaVacia(
        `temp-${Date.now()}`,
        filtroUbicacion !== "Todas" ? filtroUbicacion : ""
      )
    );
  } catch (error) {
    console.error("Error al guardar objeto:", error);
    alert("Error al guardar objeto: " + error.message);
  }
};

  const eliminarFila = (id) => {
    setObjetoAEliminar(id);
  };

 const confirmarEliminacion = async () => {
  if (objetoAEliminar === null) return;

  const itemEliminado = inventario.find((item) => item.id === objetoAEliminar);

  try {
    if (!String(objetoAEliminar).startsWith("temp-")) {
      await deleteDoc(doc(db, "inventario_items", String(objetoAEliminar)));
    }

    setInventario((prev) => prev.filter((item) => item.id !== objetoAEliminar));

    if (editandoId === objetoAEliminar) {
      setEditandoId(null);
      setFormulario(
        crearFilaVacia(
          `temp-${Date.now()}`,
          filtroUbicacion !== "Todas" ? filtroUbicacion : ""
        )
      );
    }

    setObjetoAEliminar(null);
    mostrarMensajeTemporal(`Objeto ${itemEliminado?.objeto || ""} eliminado correctamente.`, "success");
  } catch (error) {
    console.error("Error al eliminar objeto:", error);
    alert("Error al eliminar objeto: " + error.message);
  }
};

  const cancelarEliminacion = () => {
    setObjetoAEliminar(null);
  };

  const agregarNuevoObjeto = () => {
  const nuevoId = `temp-${Date.now()}`;
  const ubicacionInicial = filtroUbicacion !== "Todas" ? filtroUbicacion : "";
  const nuevaFila = crearFilaVacia(nuevoId, ubicacionInicial);

  setInventario((prev) => [nuevaFila, ...prev]);
  setEditandoId(nuevoId);
  setFormulario(nuevaFila);
};

  const actualizarCampo = (campo, valor) => {
    setFormulario((prev) => ({ ...prev, [campo]: valor }));
  };

  const anadirUbicacion = async () => {
  const texto = nuevaUbicacion.trim();
  if (!texto) return;

  const ubicacionBonita = formatUbicacion(texto);

  const existe = zonas.some(
    (z) => normalizeUbicacion(z) === normalizeUbicacion(ubicacionBonita)
  );

  if (existe) {
    mostrarMensajeTemporal(`La zona ${ubicacionBonita} ya existe.`, "warning");
    return;
  }

  const nuevasZonas = [...zonas, ubicacionBonita];

  try {
    await setDoc(doc(db, "inventario_config", "zonas"), {
      lista: nuevasZonas,
    });

    setZonas(nuevasZonas);
    setFiltroUbicacion(ubicacionBonita);
    setNuevaUbicacion("");

    if (editandoId !== null) {
      setFormulario((prev) => ({ ...prev, ubicacion: ubicacionBonita }));
    }

    mostrarMensajeTemporal(`Ubicación ${ubicacionBonita} preparada para usar.`, "success");
  } catch (error) {
    console.error("Error al guardar zonas:", error);
    alert("Error al guardar zonas: " + error.message);
  }
};

const eliminarZona = async (zona) => {
  const zonaNormalizada = normalizeUbicacion(zona);

  const objetosEnZona = inventario.filter(
    (item) => normalizeUbicacion(item.ubicacion) === zonaNormalizada
  );

  let mensaje = "";

  if (objetosEnZona.length > 0) {
    mensaje = `La zona "${zona}" tiene ${objetosEnZona.length} objetos asignados.

Si la eliminas también se eliminarán esos objetos.

¿Estás seguro?`;
  } else {
    mensaje = `¿Seguro que quieres eliminar la zona "${zona}"?`;
  }

  const confirmar = window.confirm(mensaje);
  if (!confirmar) return;

  try {
    const batch = writeBatch(db);

    objetosEnZona.forEach((item) => {
      if (!String(item.id).startsWith("temp-")) {
        batch.delete(doc(db, "inventario_items", String(item.id)));
      }
    });

    const nuevasZonas = zonas.filter(
      (z) => normalizeUbicacion(z) !== zonaNormalizada
    );

    batch.set(doc(db, "inventario_config", "zonas"), {
      lista: nuevasZonas,
    });

    await batch.commit();

    setZonas(nuevasZonas);
    setInventario((prev) =>
      prev.filter((item) => normalizeUbicacion(item.ubicacion) !== zonaNormalizada)
    );

    mostrarMensajeTemporal(`Zona "${zona}" eliminada correctamente.`, "success");
  } catch (error) {
    console.error("Error al eliminar zona:", error);
    alert("Error al eliminar zona: " + error.message);
  }
};

  const obtenerClaseUbicacion = (ubicacion = '') => {

  const colores = [
    'bg-blue-50 text-blue-700',
    'bg-emerald-50 text-emerald-700',
    'bg-amber-50 text-amber-700',
    'bg-rose-50 text-rose-700',
    'bg-violet-50 text-violet-700',
    'bg-indigo-50 text-indigo-700',
    'bg-cyan-50 text-cyan-700'
  ];

  const valor = normalizeUbicacion(ubicacion);

  let hash = 0;

  for (let i = 0; i < valor.length; i++) {
    hash = valor.charCodeAt(i) + ((hash << 5) - hash);
  }

  const indice = Math.abs(hash) % colores.length;

  return colores[indice];
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
        <td>${item.foto ? `<img src="${item.foto}" style="height:30px; width:30px; object-fit:cover;">` : '—'}</td>
        <td>${escaparHtml(item.descripcion || '')}</td>
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
            <title>Inventario de la Parroquia San José y Santa Maria</title>
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
            <h1>Inventario de la Parroquia San José y Santa Maria</h1>
            <p>Fecha del inventario: ${new Date().toLocaleDateString()}</p>
            <p>Listado actual del inventario.</p>
            <table>
              <thead>
                <tr>
                  <th>Objeto</th>
                    <th>Cantidad</th>
                    <th>Ubicación</th>
                    <th>Medida</th>
                    <th>Foto</th>
                    <th>Descripción</th>
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

if (!usuario) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
       <form
  onSubmit={(e) => {
    e.preventDefault();
    iniciarSesion();
  }}
  className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl"
>
        <h2 className="mb-6 text-center text-2xl font-bold">Acceso al inventario</h2>

        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-3 w-full rounded-lg border px-3 py-2"
        />

       <div className="relative">
  <input
    type={mostrarPassword ? "text" : "password"}
    placeholder="Contraseña"
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    className="mb-4 w-full rounded-lg border px-3 py-2 pr-10"
  />

  <button
    type="button"
    onClick={() => setMostrarPassword(!mostrarPassword)}
    className="absolute right-2 top-2 text-slate-500"
  >
    {mostrarPassword ? "🙈" : "👁"}
  </button>
</div>

     <button
  type="submit"
  disabled={loginCargando}
  className="w-full rounded-xl bg-red-700 px-4 py-3 text-white font-semibold hover:bg-red-600 disabled:opacity-60"
>
  {loginCargando ? "Iniciando sesión..." : "Iniciar sesión"}
</button>
        </form>
      </div>
    
  );
}




if (authCargando || cargando || loginCargando) {
  return <Spinner />;
}
  return (
    <>
    <div
  className={`transition-opacity duration-700 ${
    visible ? "opacity-100" : "opacity-0"
  }`}
> 
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
                <div className="mt-3">
  <button
    onClick={cerrarSesion}
    className="rounded-xl bg-white/20 px-4 py-2 text-sm hover:bg-white/30"
  >
    Cerrar sesión
  </button>
</div>
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
                    <div className="flex gap-2">
  <select
    value={zonaAEliminar}
    onChange={(e) => setZonaAEliminar(e.target.value)}
    className="rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-slate-500"
  >
    <option value="">Seleccionar zona</option>

    {ubicaciones
      .filter((zona) => zona !== "Todas")
      .map((zona) => (
        <option key={zona} value={zona}>
          {zona}
        </option>
      ))}
  </select>

  <button
    onClick={() => {
      if (!zonaAEliminar) {
        mostrarMensajeTemporal("Selecciona una zona primero.", "warning");
        return;
      }

      eliminarZona(zonaAEliminar);
      setZonaAEliminar("");
    }}
    className="flex items-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white hover:bg-rose-500"
  >
    <Trash2 className="h-4 w-4" />
    Eliminar zona
  </button>
</div>
                   
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
                    <th className="p-4 text-sm font-semibold">Foto</th>
                    <th className="p-4 text-sm font-semibold">Descripción</th>
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

    <td className="border-b border-slate-200 p-3 align-middle">

  {enEdicion ? (

    <div className="flex items-center gap-3">

      {formulario.foto && (
        <img
          src={formulario.foto}
          alt="preview"
          className="h-12 w-12 rounded-lg object-cover border"
        />
      )}

      <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200">

        📷 {formulario.foto ? "Cambiar foto" : "Subir foto"}

        <input
          type="file"
          accept="image/*"
          className="hidden"
         onChange={(e) => {
  const archivo = e.target.files[0];
  if (!archivo) return;

  const reader = new FileReader();

  reader.onload = (evento) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement("canvas");
      const maxWidth = 800;
      const escala = img.width > maxWidth ? maxWidth / img.width : 1;

      canvas.width = img.width * escala;
      canvas.height = img.height * escala;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const base64Optimizado = canvas.toDataURL("image/jpeg", 0.7);
      actualizarCampo("foto", base64Optimizado);
    };

    img.src = evento.target.result;
  };

  reader.readAsDataURL(archivo);
}}
        />

      </label>

    </div>

  ) : (
    item.foto ? (
  <img
    src={item.foto}
    alt={item.objeto}
    className="h-14 w-14 rounded-lg object-cover shadow-sm cursor-pointer"
   onClick={() => {
  const nuevaVentana = window.open();
  nuevaVentana.document.write(`<img src="${item.foto}" style="max-width:100%">`);
}}
  />
) : (
  <span className="text-slate-400">Sin foto</span>
)
  )}

</td>

<td className="border-b border-slate-200 p-3 align-middle">
  {enEdicion ? (
    <input
      type="text"
      value={formulario.descripcion}
      onChange={(e) => actualizarCampo("descripcion", e.target.value)}
      placeholder="Descripción del objeto"
      className="w-full rounded-xl border border-slate-300 px-3 py-2 outline-none"
    />
  ) : (
    <span className="text-slate-700">{item.descripcion}</span>
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
      </div>
    </>
  );
}
