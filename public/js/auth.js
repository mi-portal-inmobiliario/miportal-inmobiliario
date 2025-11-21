const API = "/auth";

// ===============================
// LOGIN
// ===============================
async function login() {
    const email = document.getElementById("email").value;
    const pass = document.getElementById("pass").value;

    if (!email || !pass) {
        alert("Completa todos los campos");
        return;
    }

    const res = await fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, pass })
    });

    const data = await res.json();

    if (!res.ok) {
        alert(data.error || "Error al iniciar sesión");
        return;
    }

    // Guardamos token y usuario
    localStorage.setItem("token", data.token);
    localStorage.setItem("usuario", JSON.stringify(data.usuario));

    // Redirigir al HOME
    window.location.href = "index.html";
}

// ===============================
// REGISTRO
// ===============================
async function registro() {
    const nombre = document.getElementById("nombre").value;
    const email = document.getElementById("email").value;
    const pass = document.getElementById("pass").value;

    if (!nombre || !email || !pass) {
        alert("Completa todos los campos");
        return;
    }

    const res = await fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, email, pass })
    });

    const data = await res.json();

    if (!res.ok) {
        alert(data.error || "Error al registrarse");
        return;
    }

    alert("Cuenta creada. Ahora inicia sesión.");
    window.location.href = "login.html";
}
