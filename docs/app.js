const SimplePeer = window.SimplePeer;

let peer;

function log(msg) {
  const logArea = document.getElementById('log');
  logArea.value += msg + '\n';
  logArea.scrollTop = logArea.scrollHeight;
}

document.getElementById('start').onclick = () => {
  peer = new SimplePeer({ initiator: true, trickle: false });

  peer.on('signal', data => {
    document.getElementById('offer').value = JSON.stringify(data);
  });

  peer.on('data', async data => {
    const decrypted = await decryptMessage(data);
    log(`> ${decrypted}`);
  });
};

document.getElementById('connect').onclick = () => {
  const offer = JSON.parse(document.getElementById('offer').value);
  peer = new SimplePeer({ initiator: false, trickle: false });

  peer.signal(offer);

  peer.on('signal', data => {
    document.getElementById('answer').value = JSON.stringify(data);
  });

  peer.on('data', async data => {
    const decrypted = await decryptMessage(data);
    log(`> ${decrypted}`);
  });
};

document.getElementById('send').onclick = async () => {
  const msg = document.getElementById('message').value;
  const encrypted = await encryptMessage(msg);
  peer.send(encrypted);
  log(`Tú: ${msg}`);
  document.getElementById('message').value = '';
};

const key = await window.crypto.subtle.generateKey(
  { name: 'AES-GCM', length: 256 },
  true,
  ['encrypt', 'decrypt']
);

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
    return '[Mensaje no pudo ser desencriptado]';
  }
}