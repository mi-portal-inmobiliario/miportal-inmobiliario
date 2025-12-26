let currentConv = null;
let interval = null;

export async function abrirChat(propiedadId, anuncianteId) {
  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");
  if (!usuario._id) {
    alert("Debes iniciar sesión para escribir");
    location.href = "login.html";
    return;
  }

  const res = await fetch("/chat/conversaciones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      propiedadId,
      compradorId: usuario._id,
      anuncianteId,
    }),
  });

  currentConv = await res.json();
  mostrarChatUI();
  cargarMensajes();

  interval = setInterval(cargarMensajes, 2000);
}

async function cargarMensajes() {
  if (!currentConv) return;

  const res = await fetch(
    `/chat/conversaciones/${currentConv._id}/mensajes`
  );
  const msgs = await res.json();

  const cont = document.getElementById("chatMensajes");
  cont.innerHTML = "";

  const usuario = JSON.parse(localStorage.getItem("usuario"));

  msgs.forEach((m) => {
    const div = document.createElement("div");
    div.className = "msg " + (m.userId === usuario._id ? "me" : "them");
    div.textContent = m.texto;
    cont.appendChild(div);
  });

  cont.scrollTop = cont.scrollHeight;
}

async function enviarMensaje() {
  const input = document.getElementById("chatTexto");
  const texto = input.value.trim();
  if (!texto) return;

  const usuario = JSON.parse(localStorage.getItem("usuario"));

  await fetch(`/chat/conversaciones/${currentConv._id}/mensajes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: usuario._id,
      texto,
    }),
  });

  input.value = "";
  cargarMensajes();
}

function mostrarChatUI() {
  document.getElementById("chatBox").style.display = "block";
}

window.enviarMensaje = enviarMensaje;
