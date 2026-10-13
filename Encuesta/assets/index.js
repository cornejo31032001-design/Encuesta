const CFG = window.CONFIG;

function $(id) {
  return document.getElementById(id);
}

function baseEncuesta() {
  return new URL("encuesta.html", location.href);
}

function urlEncuesta(tecnicoId) {
  const u = baseEncuesta();
  u.search = "";
  u.searchParams.set("t", tecnicoId);
  return u.href;
}

function iniciar() {
  $("empresa").textContent = CFG.empresa;

  $("gen-tecnico").innerHTML = CFG.tecnicos
    .map((t) => `<option value="${t.id}">${t.nombre}</option>`)
    .join("");

  $("gen-tecnico").addEventListener("change", actualizar);
  $("btn-copiar").addEventListener("click", () => copiar($("gen-enlace").value));

  pintarTabla();
  actualizar();
}

function actualizar() {
  const url = urlEncuesta($("gen-tecnico").value);
  $("gen-enlace").value = url;
  $("btn-abrir").href = url;
  dibujarQR($("qr"), url);
}

function dibujarQR(canvas, texto) {
  if (!window.QRCode) {
    canvas.style.display = "none";
    return;
  }
  QRCode.toCanvas(canvas, texto, { width: 220, margin: 1, color: { dark: "#1e3a8a", light: "#ffffff" } });
}

function pintarTabla() {
  const cuerpo = $("cuerpo-enlaces");
  cuerpo.innerHTML = "";
  CFG.tecnicos.forEach((t) => {
    const url = urlEncuesta(t.id);
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${t.nombre}</td>
      <td style="font-size:.82rem; word-break:break-all;">${url}</td>
    `;
    const celda = document.createElement("td");
    const b = document.createElement("button");
    b.className = "boton secundario pequeno";
    b.textContent = "Copiar";
    b.addEventListener("click", () => copiar(url, b));
    celda.appendChild(b);
    fila.appendChild(celda);
    cuerpo.appendChild(fila);
  });
}

async function copiar(texto, boton) {
  try {
    await navigator.clipboard.writeText(texto);
  } catch {
    const temp = document.createElement("input");
    temp.value = texto;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    temp.remove();
  }
  if (boton) {
    const original = boton.textContent;
    boton.textContent = "¡Copiado!";
    setTimeout(() => (boton.textContent = original), 1500);
  } else {
    const original = $("btn-copiar").textContent;
    $("btn-copiar").textContent = "¡Copiado!";
    setTimeout(() => ($("btn-copiar").textContent = original), 1500);
  }
}

iniciar();
