const { crearRespuesta, nombreTecnico } = window.Encuestas;

const CFG = window.CONFIG;
const params = new URLSearchParams(location.search);

let puntaje = 0;
let carita = 0;

function $(id) {
  return document.getElementById(id);
}

function iniciar() {
  document.getElementById("empresa").textContent = CFG.empresa;

  const selTecnico = $("sel-tecnico");
  selTecnico.innerHTML = CFG.tecnicos
    .map((t) => `<option value="${t.id}">${t.nombre}</option>`)
    .join("");

  const tecnicoUrl = params.get("t");
  if (tecnicoUrl && CFG.tecnicos.some((t) => t.id === tecnicoUrl)) {
    selTecnico.value = tecnicoUrl;
  }

  const ticketUrl = params.get("tk");
  if (ticketUrl) $("ticket").value = ticketUrl;

  pintarSaludo();
  pintarPuntajes();
  pintarCaritas();

  selTecnico.addEventListener("change", pintarSaludo);
  $("formulario").addEventListener("submit", enviar);

  $("cargando").classList.add("oculto");
  $("formulario").classList.remove("oculto");
}

function pintarSaludo() {
  const tecnico = nombreTecnico($("sel-tecnico").value);
  $("saludo").textContent = `¿Cómo fue tu atención con ${tecnico}?`;
  document.title = `Encuesta · ${tecnico}`;
}

function pintarPuntajes() {
  const caja = $("puntajes");
  caja.innerHTML = "";
  for (let n = 1; n <= 10; n++) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "puntaje";
    b.textContent = n;
    b.addEventListener("click", () => {
      puntaje = n;
      [...caja.children].forEach((c) => c.classList.remove("activo"));
      b.classList.add("activo");
      $("aviso-puntaje").classList.add("oculto");
    });
    caja.appendChild(b);
  }
}

function pintarCaritas() {
  const caja = $("caritas");
  caja.innerHTML = "";
  CFG.caritas.forEach((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "carita";
    b.innerHTML = `${c.emoji}<span>${c.nombre}</span>`;
    b.addEventListener("click", () => {
      carita = c.valor;
      [...caja.children].forEach((x) => x.classList.remove("activa"));
      b.classList.add("activa");
    });
    caja.appendChild(b);
  });
}

async function enviar(e) {
  e.preventDefault();
  const aviso = $("aviso-general");
  aviso.classList.add("oculto");

  if (!puntaje) {
    $("aviso-puntaje").classList.remove("oculto");
    document.querySelector(".puntajes").scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }
  if (!carita) {
    aviso.textContent = "Por favor selecciona una carita según cómo te sentiste.";
    aviso.classList.remove("oculto");
    document.querySelector(".caritas").scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const boton = $("btn-enviar");
  boton.disabled = true;
  boton.textContent = "Enviando...";

  try {
    await crearRespuesta({
      tecnico_id: $("sel-tecnico").value,
      puntaje,
      carita,
      comentario: $("comentario").value.trim(),
      cliente: $("cliente").value.trim(),
      ticket: $("ticket").value.trim()
    });
    $("formulario").classList.add("oculto");
    $("gracias").classList.remove("oculto");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (err) {
    aviso.textContent = "No se pudo enviar: " + err.message;
    aviso.classList.remove("oculto");
    boton.disabled = false;
    boton.textContent = "Enviar encuesta";
  }
}

iniciar();