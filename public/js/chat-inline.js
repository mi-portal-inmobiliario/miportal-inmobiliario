let chatInterval = null;
let currentConv = null;

export async function openChatForProperty(propiedadId, anuncianteId) {
  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");

  const res = await fetch("/chat/conversaciones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      propiedadId,
      compradorId: usuario._id,
      anuncianteId
    })
  });

  currentConv = await res.json();
  mostrarPanel();
  cargarMensajes();

  chatInterval = setInterval(cargarMensajes, 1500);
}

async function cargarMensajes() {
  if (!currentConv) return;

  const res = await fetch(`/chat/conversaciones/${currentConv._id}/mensajes`);
  const mensajes = await res.json();

  const cont = document.getElementById("chatMensajesInline");
  cont.innerHTML = "";

  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");

  mensajes.forEach(m => {
    const div = document.createElement("div");
    div.className = "msg " + (m.userId === usuario._id ? "me" : "them");
    div.textContent = m.texto;
    cont.appendChild(div);
  });

  cont.scrollTop = cont.scrollHeight;
}

function mostrarPanel() {
  if (document.getElementById("chatPanelInline")) return;

  const panel = document.createElement("div");
  panel.id = "chatPanelInline";
  panel.className = "chat-panel";

  panel.innerHTML = `
    <div class="chat-header">
      Chat con el anunciante
      <span class="cerrar" id="cerrarChat">✕</span>
    </div>
    <div class="chat-mensajes" id="chatMensajesInline"></div>
    <div class="chat-input">
      <input id="chatInput" placeholder="Escribe un mensaje...">
      <button id="chatEnviar">Enviar</button>
    </div>
  `;

  document.getElementById("contenedor").appendChild(panel);

  document.getElementById("cerrarChat").onclick = () => {
    clearInterval(chatInterval);
    panel.remove();
  };

  document.getElementById("chatEnviar").onclick = enviarMensaje;
}

async function enviarMensaje() {
  const input = document.getElementById("chatInput");
  const texto = input.value.trim();
  if (!texto) return;

  const usuario = JSON.parse(localStorage.getItem("usuario") || "{}");

  await fetch(`/chat/conversaciones/${currentConv._id}/mensajes`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: usuario._id,
      texto
    })
  });

  input.value = "";
  cargarMensajes();
}
