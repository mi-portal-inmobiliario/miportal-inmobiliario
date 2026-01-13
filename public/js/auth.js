// ================================
// CONFIG AUTO: LOCAL o PRODUCCIÓN
// ================================
const API_BASE = location.hostname.includes("localhost")
  ? "http://localhost:3000"
  : "https://miportal-inmobiliario-server.onrender.com";

// ================================
// REGISTRO
// ================================
async function registro() {
  const nombre = document.getElementById("nombre").value.trim();
  const email = document.getElementById("email").value.trim();
  const pass = document.getElementById("pass").value.trim();

  if (!nombre || !email || !pass) {
    alert("Rellena todos los campos");
    return;
  }

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
  location.href = "login.html";
}

// ================================
// LOGIN (FIX CLAVE)
// ================================
async function login() {
  const email = document.getElementById("email").value.trim();
  const pass = document.getElementById("pass").value.trim();

  if (!email || !pass) {
    alert("Rellena todos los campos");
    return;
  }

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: pass })
  });

  const data = await res.json();

  if (!res.ok) {
    alert(data.error || "Error al iniciar sesión");
    return;
  }

  // ✅ GUARDAMOS _id (NO id)
  localStorage.setItem("token", data.token);
  localStorage.setItem("usuario", JSON.stringify({
    _id: data.usuario._id,
    nombre: data.usuario.nombre,
    email: data.usuario.email
  }));

  location.href = "perfil.html";
}
