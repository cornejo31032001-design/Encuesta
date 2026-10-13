(function () {
  const CFG = window.CONFIG;
  const CLAVE_DEMO = "encuesta_respuestas_demo";
  const CLAVE_SESION_DEMO = "encuesta_sesion_demo";

  const nube = Boolean(CFG.supabase.url && CFG.supabase.anonKey);
  let sb = null;
  let cargando = null;

  async function cliente() {
    if (!nube) return null;
    if (sb) return sb;
    if (!cargando) {
      cargando = import("https://esm.sh/@supabase/supabase-js@2").then((m) => {
        sb = m.createClient(CFG.supabase.url, CFG.supabase.anonKey);
        return sb;
      });
    }
    return cargando;
  }

  function usandoNube() {
    return nube;
  }

  function nombreTecnico(id) {
    const t = CFG.tecnicos.find((x) => x.id === id);
    return t ? t.nombre : id || "Sin asignar";
  }

  function rolDe(email) {
    const correo = (email || "").toLowerCase();
    if (CFG.admins.map((a) => a.toLowerCase()).includes(correo)) return "admin";
    if (CFG.tecnicos.some((t) => (t.email || "").toLowerCase() === correo)) return "tecnico";
    return "tecnico";
  }

  async function crearRespuesta(datos) {
    const fila = {
      tecnico_id: datos.tecnico_id,
      puntaje: datos.puntaje,
      carita: datos.carita,
      comentario: datos.comentario || null,
      cliente: datos.cliente || null,
      ticket: datos.ticket || null
    };

    const db = await cliente();
    if (db) {
      const { error } = await db.from("respuestas").insert(fila);
      if (error) throw new Error(error.message);
      return true;
    }

    const lista = leerDemo();
    lista.push({ id: String(Date.now()), creado_en: new Date().toISOString(), ...fila });
    localStorage.setItem(CLAVE_DEMO, JSON.stringify(lista));
    return true;
  }

  async function listarRespuestas() {
    const db = await cliente();
    if (db) {
      const { data, error } = await db
        .from("respuestas")
        .select("*")
        .order("creado_en", { ascending: false });
      if (error) throw new Error(error.message);
      return data || [];
    }
    return leerDemo().sort((a, b) => new Date(b.creado_en) - new Date(a.creado_en));
  }

  async function eliminarRespuesta(id) {
    const db = await cliente();
    if (db) {
      const { error } = await db.from("respuestas").delete().eq("id", id);
      if (error) throw new Error(error.message);
      return true;
    }
    const lista = leerDemo().filter((r) => String(r.id) !== String(id));
    localStorage.setItem(CLAVE_DEMO, JSON.stringify(lista));
    return true;
  }

  async function iniciarSesion(email, password) {
    const db = await cliente();
    if (db) {
      const { data, error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw new Error(error.message);
      const correo = data.user?.email || email;
      return { email: correo, rol: rolDe(correo) };
    }

    if (!email || !password) throw new Error("Ingresa usuario y contraseña.");
    const sesion = { email: email.toLowerCase(), rol: rolDe(email) };
    localStorage.setItem(CLAVE_SESION_DEMO, JSON.stringify(sesion));
    return sesion;
  }

  async function sesionActual() {
    const db = await cliente();
    if (db) {
      const { data } = await db.auth.getSession();
      const user = data.session?.user;
      if (!user) return null;
      return { email: user.email, rol: rolDe(user.email) };
    }
    const guardada = localStorage.getItem(CLAVE_SESION_DEMO);
    return guardada ? JSON.parse(guardada) : null;
  }

  async function cerrarSesion() {
    const db = await cliente();
    if (db) await db.auth.signOut();
    localStorage.removeItem(CLAVE_SESION_DEMO);
  }

  function leerDemo() {
    try {
      return JSON.parse(localStorage.getItem(CLAVE_DEMO) || "[]");
    } catch {
      return [];
    }
  }

  window.Encuestas = {
    usandoNube,
    nombreTecnico,
    rolDe,
    crearRespuesta,
    listarRespuestas,
    eliminarRespuesta,
    iniciarSesion,
    sesionActual,
    cerrarSesion
  };
})();