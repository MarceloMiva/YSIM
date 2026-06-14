// ═══════════════════════════════════════════════════
//  YSIM — Frontend App Logic
// ═══════════════════════════════════════════════════

// ── Tab switching ────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
  });
});

// ── Check if on /read/:id URL ────────────────────
const pathParts = window.location.pathname.split('/');
if (pathParts[1] === 'read' && pathParts[2]) {
  // Auto-switch to decrypt tab
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
  document.querySelector('[data-tab="decrypt"]').classList.add('active');
  document.getElementById('tab-decrypt').classList.add('active');
  document.getElementById('msg-id-input').value = pathParts[2];
}

// ── ENCRYPT ──────────────────────────────────────
document.getElementById('btn-encrypt').addEventListener('click', async () => {
  const plaintext = document.getElementById('plaintext').value.trim();
  const key       = document.getElementById('enc-key').value.trim();
  const algo      = document.getElementById('algo').value;
  const expiry    = document.getElementById('expiry').value;
  const pass      = document.getElementById('enc-pass').value.trim();

  if (!plaintext) return showAlert('Enter a message to encrypt.');
  if (!key)       return showAlert('Enter an encryption key.');

  const btn = document.getElementById('btn-encrypt');
  btn.textContent = '🔐 ENCRYPTING...';
  btn.disabled = true;

  try {
    const { ciphertext, iv, salt, algo: usedAlgo } = await YSIM_Crypto.encrypt(plaintext, key, algo);
    const passHash = await YSIM_Crypto.hashPassphrase(pass || null);

    const body = {
      ciphertext,
      iv,
      salt,
      algo: usedAlgo,
      expiryMinutes: expiry ? parseInt(expiry) : null,
      passHash,
    };

    const res  = await fetch('/api/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (data.error) throw new Error(data.error);

    document.getElementById('secret-link').value = data.link;
    document.getElementById('cipher-text').textContent = ciphertext.substring(0, 120) + '...';
    document.getElementById('encrypt-result').classList.remove('hidden');

    // Scroll to result
    document.getElementById('encrypt-result').scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    showAlert('Encryption failed: ' + err.message);
  } finally {
    btn.textContent = '🔐 ENCRYPT & GENERATE LINK';
    btn.disabled = false;
  }
});

// ── COPY LINK ────────────────────────────────────
document.getElementById('btn-copy').addEventListener('click', () => {
  const link = document.getElementById('secret-link');
  link.select();
  navigator.clipboard.writeText(link.value).then(() => {
    const btn = document.getElementById('btn-copy');
    btn.textContent = 'COPIED!';
    setTimeout(() => btn.textContent = 'COPY', 2000);
  });
});

// ── DECRYPT ──────────────────────────────────────
document.getElementById('btn-decrypt').addEventListener('click', async () => {
  let msgId = document.getElementById('msg-id-input').value.trim();
  const key = document.getElementById('dec-key').value.trim();
  const pass = document.getElementById('dec-pass').value.trim();

  // Extract ID from full URL if pasted
  if (msgId.includes('/read/')) {
    msgId = msgId.split('/read/')[1].split('?')[0];
  }

  if (!msgId) return showAlert('Enter a message ID or link.');
  if (!key)   return showAlert('Enter the decryption key.');

  const btn = document.getElementById('btn-decrypt');
  btn.textContent = '🔓 DECRYPTING...';
  btn.disabled = true;

  hideError();

  try {
    const passHash = await YSIM_Crypto.hashPassphrase(pass || null);
    const url = `/api/message/${msgId}${passHash ? `?passHash=${passHash}` : ''}`;

    const res  = await fetch(url);
    const data = await res.json();

    if (data.error) {
      showError(data.error);
      return;
    }

    const plaintext = await YSIM_Crypto.decrypt(
      data.ciphertext, data.iv, data.salt, key, data.algo
    );

    activateSecurityMode(plaintext);
    document.getElementById('decrypt-result').classList.remove('hidden');
    document.getElementById('decrypt-result').scrollIntoView({ behavior: 'smooth' });

  } catch (err) {
    showError('Decryption failed. Wrong key or corrupted message.');
  } finally {
    btn.textContent = '🔓 DECRYPT MESSAGE';
    btn.disabled = false;
  }
});

// ── CLEAR DECRYPTED ──────────────────────────────
document.getElementById('btn-clear-decrypt').addEventListener('click', () => {
  document.getElementById('decrypted-text').textContent = '';
  document.getElementById('decrypt-result').classList.add('hidden');
  document.getElementById('msg-id-input').value = '';
  document.getElementById('dec-key').value = '';
  document.getElementById('dec-pass').value = '';
});

// ── AI CHAT ──────────────────────────────────────
const chatHistory = [];

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const text  = input.value.trim();
  if (!text) return;

  input.value = '';

  // Add user message
  appendMessage('user', text);
  chatHistory.push({ role: 'user', content: text });

  // Typing indicator
  const typingEl = appendMessage('ai', '...', true);

  document.getElementById('btn-send').disabled = true;

  try {
    const res  = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: chatHistory }),
    });
    const data = await res.json();

    const reply = data.content?.[0]?.text || 'No response received.';
    chatHistory.push({ role: 'assistant', content: reply });

    typingEl.classList.remove('typing');
    typingEl.querySelector('.msg-text').textContent = reply;

  } catch (err) {
    typingEl.querySelector('.msg-text').textContent = 'AI assistant unavailable. Check your API key configuration.';
    typingEl.classList.remove('typing');
  } finally {
    document.getElementById('btn-send').disabled = false;
  }
}

document.getElementById('btn-send').addEventListener('click', sendMessage);
document.getElementById('chat-input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

function appendMessage(role, text, isTyping = false) {
  const win = document.getElementById('chat-window');
  const div = document.createElement('div');
  div.className = `chat-msg ${role}${isTyping ? ' typing' : ''}`;
  div.innerHTML = `
    <span class="msg-label">${role === 'ai' ? 'YSIM·AI' : 'YOU'}</span>
    <span class="msg-text">${text}</span>
  `;
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;
  return div;
}

// ── Helpers ──────────────────────────────────────
function showAlert(msg) {
  alert(msg); // Simple for now — can be replaced with custom modal
}

function showError(msg) {
  const el = document.getElementById('decrypt-error');
  document.getElementById('decrypt-error-msg').textContent = '⚠ ' + msg;
  el.classList.remove('hidden');
}

function hideError() {
  document.getElementById('decrypt-error').classList.add('hidden');
}

// ============================================
// YSIM Security Integration
// ============================================

function activateSecurityMode(plaintext) {
  // Init all protections
  YSIMSecurity.init({
    devToolsCallback: () => {
      // Destroy message if devtools opened
      document.getElementById('decrypted-text').innerHTML = '';
      const el = document.getElementById('decrypt-result');
      if (el) el.classList.add('hidden');
      showError('decrypt-error', 'decrypt-error-msg',
        '🔒 Security violation detected. Message destroyed.');
    }
  });

  // Render message on canvas instead of plain HTML
  const container = document.getElementById('decrypted-text');
  if (container) {
    YSIMSecurity.renderMessageOnCanvas(plaintext, 'decrypted-text');
  }

  // Show and start timer (30 seconds)
  const timerEl = document.getElementById('ysim-timer');
  if (timerEl) timerEl.style.display = 'block';

  YSIMSecurity.startDestroyTimer(30, () => {
    // Auto destroy after 30 seconds
    if (container) container.innerHTML =
      '<span style="color:#ff4444;font-family:monospace">🔥 Message auto-destroyed.</span>';
    const timerEl = document.getElementById('ysim-timer');
    if (timerEl) timerEl.style.display = 'none';
  });
}
