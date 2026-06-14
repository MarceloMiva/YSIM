// ═══════════════════════════════════════════════════
//  YSIM — Client-side Crypto
//  AES-256-GCM | XOR | Vigenère
// ═══════════════════════════════════════════════════

const YSIM_Crypto = (() => {

  // ── Helpers ──────────────────────────────────────
  const toHex = (buf) =>
    Array.from(new Uint8Array(buf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

  const fromHex = (hex) =>
    new Uint8Array(hex.match(/.{1,2}/g).map(b => parseInt(b, 16)));

  const encode = (str) => new TextEncoder().encode(str);
  const decode = (buf) => new TextDecoder().decode(buf);

  // ── AES-256-GCM ───────────────────────────────────
  async function aesEncrypt(plaintext, password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv   = crypto.getRandomValues(new Uint8Array(12));

    const keyMaterial = await crypto.subtle.importKey(
      "raw", encode(password), "PBKDF2", false, ["deriveKey"]
    );
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"]
    );

    const cipherbuf = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      key,
      encode(plaintext)
    );

    return {
      ciphertext: toHex(cipherbuf),
      iv:   toHex(iv),
      salt: toHex(salt),
      algo: "aes",
    };
  }

  async function aesDecrypt(ciphertext, iv, salt, password) {
    const keyMaterial = await crypto.subtle.importKey(
      "raw", encode(password), "PBKDF2", false, ["deriveKey"]
    );
    const key = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: fromHex(salt), iterations: 100000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );

    const plainbuf = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromHex(iv) },
      key,
      fromHex(ciphertext)
    );

    return decode(plainbuf);
  }

  // ── XOR Cipher ───────────────────────────────────
  function xorCipher(text, key) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(
        text.charCodeAt(i) ^ key.charCodeAt(i % key.length)
      );
    }
    return result;
  }

  function xorEncrypt(plaintext, key) {
    const encrypted = xorCipher(plaintext, key);
    const hex = Array.from(encrypted)
      .map(c => c.charCodeAt(0).toString(16).padStart(2, '0'))
      .join('');
    return { ciphertext: hex, iv: null, salt: null, algo: "xor" };
  }

  function xorDecrypt(ciphertext, key) {
    const chars = ciphertext.match(/.{1,2}/g)
      .map(h => String.fromCharCode(parseInt(h, 16)))
      .join('');
    return xorCipher(chars, key);
  }

  // ── Vigenère Cipher ──────────────────────────────
  function vigEncrypt(plaintext, key) {
    key = key.toUpperCase().replace(/[^A-Z]/g, '');
    if (!key) key = "KEY";
    let result = '';
    let ki = 0;
    for (const ch of plaintext) {
      if (/[a-zA-Z]/.test(ch)) {
        const base  = ch >= 'a' ? 97 : 65;
        const shift = key.charCodeAt(ki % key.length) - 65;
        result += String.fromCharCode((ch.charCodeAt(0) - base + shift) % 26 + base);
        ki++;
      } else {
        result += ch;
      }
    }
    return { ciphertext: btoa(unescape(encodeURIComponent(result))), iv: null, salt: null, algo: "vigenere" };
  }

  function vigDecrypt(ciphertext, key) {
    key = key.toUpperCase().replace(/[^A-Z]/g, '');
    if (!key) key = "KEY";
    let encoded;
    try { encoded = decodeURIComponent(escape(atob(ciphertext))); }
    catch { encoded = ciphertext; }
    let result = '';
    let ki = 0;
    for (const ch of encoded) {
      if (/[a-zA-Z]/.test(ch)) {
        const base  = ch >= 'a' ? 97 : 65;
        const shift = key.charCodeAt(ki % key.length) - 65;
        result += String.fromCharCode((ch.charCodeAt(0) - base - shift + 26) % 26 + base);
        ki++;
      } else {
        result += ch;
      }
    }
    return result;
  }

  // ── Passphrase hash ──────────────────────────────
  async function hashPassphrase(pass) {
    if (!pass) return null;
    const enc = new TextEncoder(); const buf = await crypto.subtle.digest("SHA-256", enc.encode(pass));
    return toHex(buf);
  }

  // ── Public API ───────────────────────────────────
  return {
    encrypt: async (plaintext, key, algo) => {
      if (algo === "aes")      return await aesEncrypt(plaintext, key);
      if (algo === "xor")      return xorEncrypt(plaintext, key);
      if (algo === "vigenere") return vigEncrypt(plaintext, key);
      throw new Error("Unknown algorithm");
    },

    decrypt: async (ciphertext, iv, salt, key, algo) => {
      if (algo === "aes")      return await aesDecrypt(ciphertext, iv, salt, key);
      if (algo === "xor")      return xorDecrypt(ciphertext, key);
      if (algo === "vigenere") return vigDecrypt(ciphertext, key);
      throw new Error("Unknown algorithm");
    },

    hashPassphrase,
  };
})();
