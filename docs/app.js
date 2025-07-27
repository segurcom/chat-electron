const SimplePeer = window.SimplePeer;

let peer;
let key;

async function initCrypto() {
  const password = prompt("🔐 Ingresá la misma contraseña en ambos navegadores:");

  const encoder = new TextEncoder();
  const salt = encoder.encode("chat-segurito-salt");
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  key = await crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 100000,
      hash: "SHA-256"
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

function log(msg) {
  const logArea = document.getElementById('log');
  logArea.value += msg + '\n';
  logArea.scrollTop = logArea.scrollHeight;
}

function setConnected(connected) {
  document.getElementById('send').disabled = !connected;
}

document.getElementById('send').disabled = true;

// Configuración WebRTC con STUN público
const rtcConfig = {
  initiator: true, // o false según el caso
  trickle: false,
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' } // STUN público de Google
    ]
  }
};

document.getElementById('start').onclick = () => {
  peer = new SimplePeer({ ...rtcConfig, initiator: true });

  peer.on('signal', data => {
    document.getElementById('offer').value = JSON.stringify(data);
  });

  peer.on('connect', () => {
    log('✅ Conectado (initiator)');
    setConnected(true);
  });

  peer.on('data', async data => {
    const decrypted = await decryptMessage(data);
    log(`👤 ${decrypted}`);
  });

  peer.on('error', err => {
    log(`❌ Error: ${err.message}`);
  });
};

document.getElementById('connect').onclick = () => {
  const offerText = document.getElementById('offer').value;
  if (!offerText) return alert('Pegá el offer antes de conectar.');

  peer = new SimplePeer({ ...rtcConfig, initiator: false });

  peer.signal(JSON.parse(offerText));

  peer.on('signal', data => {
    document.getElementById('answer').value = JSON.stringify(data);
  });

  peer.on('connect', () => {
    log('✅ Conectado (receptor)');
    setConnected(true);
  });

  peer.on('data', async data => {
    const decrypted = await decryptMessage(data);
    log(`👤 ${decrypted}`);
  });

  peer.on('error', err => {
    log(`❌ Error: ${err.message}`);
  });
};

document.getElementById('finish').onclick = () => {
  const answerText = document.getElementById('answer').value;
  if (!answerText) return alert('Pegá el answer antes de finalizar la conexión.');

  try {
    peer.signal(JSON.parse(answerText));
    log('✅ Answer procesado. Conexión en curso...');
  } catch (e) {
    log('❌ Error al procesar el answer');
  }
};

document.getElementById('send').onclick = async () => {
  if (!peer || peer._channel?.readyState !== 'open') {
    log('⛔ La conexión aún no está lista.');
    return;
  }

  const msg = document.getElementById('message').value;
  const encrypted = await encryptMessage(msg);
  peer.send(encrypted);
  log(`🧑‍💻 Tú: ${msg}`);
  document.getElementById('message').value = '';
};

async function encryptMessage(msg) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(msg);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const combined = new Uint8Array(iv.byteLength + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.byteLength);
  return combined;
}

async function decryptMessage(data) {
  const iv = data.slice(0, 12);
  const ciphertext = data.slice(12);
  try {
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
    return new TextDecoder().decode(decrypted);
  } catch {
    return '[❌ No se pudo desencriptar el mensaje]';
  }
}

// Inicializar clave al cargar
initCrypto();
