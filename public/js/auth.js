// ================================
// CONFIG AUTO: LOCAL o PRODUCCIÓN
// ================================

const API_BASE = location.hostname.includes("localhost")
  ? "http://localhost:3000"
  : "https://miportal-inmobiliario-server.onrender.com";

console.log("🔗 API BASE:", API_BASE);


// ================================
// REGISTRO
// ================================
async function registro() {
  const nombre = document.getElementById("nombre").value.trim();
  const email = document.getElementById("email").value.trim();
  const pass = document.getElementById("pass").value.trim();

  if (!nombre || !email || !pass) {
    alert("Rellena todos los campos.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, email, password: pass })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Error al registrarte");
      return;
    }

    alert("Cuenta creada correctamente");
    window.location.href = "login.html";

  } catch (err) {
    console.error(err);
    alert("Error al registrar");
  }
}


// ================================
// LOGIN
// ================================
async function login() {
  const email = document.getElementById("email").value.trim();
  const pass = document.getElementById("pass").value.trim();

  if (!email || !pass) {
    alert("Rellena todos los campos.");
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: pass })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error || "Error en inicio de sesión");
      return;
    }

    // Guardar token + usuario
    localStorage.setItem("token", data.token);
    localStorage.setItem("usuario", JSON.stringify(data.usuario));

    alert("Bienvenido " + data.usuario.nombre);

    // Redirigir
    window.location.href = "perfil.html";

  } catch (err) {
    console.error(err);
    alert("Error al iniciar sesión");
  }
}
