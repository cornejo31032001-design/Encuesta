const {
  usandoNube,
  listarRespuestas,
  eliminarRespuesta,
  iniciarSesion,
  sesionActual,
  cerrarSesion,
  nombreTecnico
} = window.Encuestas;

const CFG = window.CONFIG;
let sesion = null;
let respuestas = [];
let graficoTecnicos = null;
let graficoPuntajes = null;

function $(id) {
  return document.getElementById(id);
}

function emojiDe(valor) {
  const c = CFG.caritas.find((x) => Number(x.valor) === Number(valor));
  return c ? c.emoji : "—";
}

function clasePuntaje(p) {
  if (p >= 8) return "bueno";
  if (p >= 6) return "medio";
  return "malo";
}

function formatoFecha(iso) {
  const d = new Date(iso);
  return d.toLocaleString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

async function arrancar() {
  $("panel-empresa").textContent = CFG.empresa + " · Resultados";
  $("login-empresa").textContent = CFG.empresa;
  $("demo-admin").textContent = CFG.admins[0] || "jefe@empresa.com";
  if (!usandoNube()) $("aviso-demo").classList.remove("oculto");

  llenarFiltros();
  $("form-login").addEventListener("submit", entrar);
  $("btn-salir").addEventListener("click", salir);
  $("btn-limpiar").addEventListener("click", limpiarFiltros);
  $("btn-exportar").addEventListener("click", exportarCSV);
  ["f-tecnico", "f-modo", "f-dia", "f-desde", "f-hasta"].forEach((id) =>
    $(id).addEventListener("change", render)
  );
  $("f-modo").addEventListener("change", cambiarModo);

  const actual = await sesionActual();
  if (actual) {
    sesion = actual;
    mostrarPanel();
  } else {
    mostrarLogin();
  }
}

function mostrarLogin() {
  $("vista-login").classList.remove("oculto");
  $("vista-panel").classList.add("oculto");
}

async function mostrarPanel() {
  $("vista-login").classList.add("oculto");
  $("vista-panel").classList.remove("oculto");
  $("panel-usuario").textContent = sesion.email + " · " + (sesion.rol === "admin" ? "Jefe" : "Técnico");

  const esAdmin = sesion.rol === "admin";
  document.querySelectorAll(".solo-admin").forEach((el) => el.classList.toggle("oculto", !esAdmin));
  $("aviso-rol").classList.toggle("oculto", esAdmin);
  if (!esAdmin) {
    $("aviso-rol").textContent =
      "Ingresaste como técnico: puedes ver los resultados, pero no modificar ni eliminar.";
  }

  await cargar();
}

async function entrar(e) {
  e.preventDefault();
  const aviso = $("aviso-login");
  aviso.classList.add("oculto");
  const boton = $("btn-login");
  boton.disabled = true;
  boton.textContent = "Ingresando...";
  try {
    sesion = await iniciarSesion($("login-email").value.trim(), $("login-password").value);
    await mostrarPanel();
  } catch (err) {
    aviso.textContent = err.message;
    aviso.classList.remove("oculto");
  } finally {
    boton.disabled = false;
    boton.textContent = "Ingresar";
  }
}

async function salir() {
  await cerrarSesion();
  sesion = null;
  respuestas = [];
  $("login-password").value = "";
  mostrarLogin();
}

async function cargar() {
  const aviso = $("aviso-panel");
  aviso.classList.add("oculto");
  try {
    respuestas = await listarRespuestas();
    render();
  } catch (err) {
    aviso.textContent = "No se pudieron cargar las respuestas: " + err.message;
    aviso.classList.remove("oculto");
  }
}

function llenarFiltros() {
  $("f-tecnico").innerHTML =
    `<option value="">Todos los técnicos</option>` +
    CFG.tecnicos.map((t) => `<option value="${t.id}">${t.nombre}</option>`).join("");
}

function cambiarModo() {
  const rango = $("f-modo").value === "rango";
  $("campo-dia").classList.toggle("oculto", rango);
  $("campos-rango").classList.toggle("oculto", !rango);
  render();
}

function limpiarFiltros() {
  $("f-tecnico").value = "";
  $("f-modo").value = "dia";
  cambiarModo();
  $("f-dia").value = "";
  $("f-desde").value = "";
  $("f-hasta").value = "";
  render();
}

function filtradas() {
  const tec = $("f-tecnico").value;
  const modo = $("f-modo").value;

  return respuestas.filter((r) => {
    if (tec && r.tecnico_id !== tec) return false;

    const f = new Date(r.creado_en);
    if (modo === "dia") {
      const d = $("f-dia").value;
      if (d) {
        const inicio = new Date(d + "T00:00:00");
        const fin = new Date(d + "T23:59:59");
        if (f < inicio || f > fin) return false;
      }
    } else {
      const desde = $("f-desde").value ? new Date($("f-desde").value + "T00:00:00") : null;
      const hasta = $("f-hasta").value ? new Date($("f-hasta").value + "T23:59:59") : null;
      if (desde && f < desde) return false;
      if (hasta && f > hasta) return false;
    }
    return true;
  });
}

function render() {
  const datos = filtradas();
  pintarKPIs(datos);
  pintarGraficoTecnicos(datos);
  pintarGraficoPuntajes(datos);
  pintarTabla(datos);
}

function pintarKPIs(datos) {
  const total = datos.length;
  const promedio = total ? datos.reduce((s, r) => s + Number(r.puntaje), 0) / total : 0;
  const satisf = total ? Math.round((datos.filter((r) => r.puntaje >= 8).length / total) * 100) : 0;
  const bajas = datos.filter((r) => r.puntaje <= 5).length;

  $("k-promedio").textContent = total ? promedio.toFixed(1) : "—";
  $("k-total").textContent = total;
  $("k-satisf").textContent = total ? satisf + "%" : "—";
  $("k-alerta").textContent = bajas;
}

function pintarGraficoTecnicos(datos) {
  if (!window.Chart) return;  
  const etiquetas = CFG.tecnicos.map((t) => t.nombre);
  const promedios = CFG.tecnicos.map((t) => {
    const suyos = datos.filter((r) => r.tecnico_id === t.id);
    return suyos.length ? suyos.reduce((s, r) => s + Number(r.puntaje), 0) / suyos.length : 0;
  });
  const conteos = CFG.tecnicos.map((t) => datos.filter((r) => r.tecnico_id === t.id).length);

  if (graficoTecnicos) graficoTecnicos.destroy();
  graficoTecnicos = new Chart($("g-tecnicos"), {
    type: "bar",
    data: {
      labels: etiquetas,
      datasets: [
        {
          label: "Promedio",
          data: promedios,
          backgroundColor: promedios.map((p) =>
            p >= 8 ? "#16a34a" : p >= 6 ? "#f59e0b" : p > 0 ? "#dc2626" : "#cbd5e1"
          ),
          borderRadius: 8,
          maxBarThickness: 60
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, max: 10 } },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            afterLabel: (ctx) => "Encuestas: " + conteos[ctx.dataIndex]
          }
        }
      }
    }
  });
}

function pintarGraficoPuntajes(datos) {
  if (!window.Chart) return;
  const etiquetas = Array.from({ length: 10 }, (_, i) => String(i + 1));
  const valores = etiquetas.map((n) => datos.filter((r) => Number(r.puntaje) === Number(n)).length);

  if (graficoPuntajes) graficoPuntajes.destroy();
  graficoPuntajes = new Chart($("g-puntajes"), {
    type: "bar",
    data: {
      labels: etiquetas,
      datasets: [
        {
          label: "Cantidad",
          data: valores,
          backgroundColor: etiquetas.map((n) =>
            Number(n) >= 8 ? "#16a34a" : Number(n) >= 6 ? "#f59e0b" : "#dc2626"
          ),
          borderRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      plugins: { legend: { display: false } }
    }
  });
}

function pintarTabla(datos) {
  const cuerpo = $("cuerpo-tabla");
  cuerpo.innerHTML = "";
  const esAdmin = sesion && sesion.rol === "admin";
  $("contador-tabla").textContent = datos.length + " respuesta(s)";

  if (!datos.length) {
    $("tabla-vacia").classList.remove("oculto");
    return;
  }
  $("tabla-vacia").classList.add("oculto");

  datos.forEach((r) => {
    const fila = document.createElement("tr");

    const clienteTicket = [r.cliente, r.ticket].filter(Boolean).join(" · ") || "—";

    fila.innerHTML = `
      <td>${formatoFecha(r.creado_en)}</td>
      <td>${nombreTecnico(r.tecnico_id)}</td>
      <td><span class="insignia ${clasePuntaje(Number(r.puntaje))}">${r.puntaje}/10</span></td>
      <td style="font-size:1.3rem;">${emojiDe(r.carita)}</td>
      <td class="comentario-celda">${r.comentario ? escapar(r.comentario) : "<em style='color:#94a3b8'>Sin comentario</em>"}</td>
      <td>${escapar(clienteTicket)}</td>
    `;

    const celdaAccion = document.createElement("td");
    if (esAdmin) {
      const b = document.createElement("button");
      b.className = "boton peligro pequeno";
      b.textContent = "Eliminar";
      b.addEventListener("click", () => borrar(r.id));
      celdaAccion.appendChild(b);
    }
    fila.appendChild(celdaAccion);

    cuerpo.appendChild(fila);
  });
}

async function borrar(id) {
  if (!confirm("¿Eliminar esta respuesta? Esta acción no se puede deshacer.")) return;
  try {
    await eliminarRespuesta(id);
    await cargar();
  } catch (err) {
    const aviso = $("aviso-panel");
    aviso.textContent = "No se pudo eliminar: " + err.message;
    aviso.classList.remove("oculto");
  }
}

function exportarCSV() {
  const datos = filtradas();
  if (!datos.length) {
    alert("No hay datos para exportar.");
    return;
  }
  const cab = ["fecha", "tecnico", "puntaje", "carita", "comentario", "cliente", "ticket"];
  const filas = datos.map((r) =>
    [
      new Date(r.creado_en).toISOString(),
      nombreTecnico(r.tecnico_id),
      r.puntaje,
      r.carita,
      r.comentario || "",
      r.cliente || "",
      r.ticket || ""
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = "\uFEFF" + [cab.join(","), ...filas].join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "reporte-encuestas.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function escapar(t) {
  return String(t)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

arrancar();
