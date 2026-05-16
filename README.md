# YSIM — Your Secret Is Mine 🔐

> Self-destructing encrypted messaging web app

![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white)
![AES-256](https://img.shields.io/badge/AES--256--GCM-red?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

**Built by Fashipe Oluwadamilare Ayoola**  
CS/Cybersecurity · MIVA Open University

---

## Features

- 🔒 **AES-256-GCM** encryption (strongest)
- 🔑 **XOR** and **Vigenère** cipher support
- 💣 **Self-destructing messages** — deleted after one read
- ⏱️ **Expiry timer** — auto-delete after set time
- 🔐 **Passphrase lock** — reader needs a separate passphrase
- 🤖 **AI Assistant** tab powered by Claude
- 🌑 Terminal-style dark UI

---

## Quick Start

```bash
git clone https://github.com/MarceloMiva/YSIM.git
cd YSIM
npm install
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env
node server.js
```

Open `http://localhost:3000`

---

## How It Works

1. **Sender** types a message, picks an algorithm, sets expiry + optional passphrase
2. Message is **encrypted client-side** before being sent to server
3. Server stores the ciphertext and returns a **unique link**
4. **Recipient** opens the link, enters the key (and passphrase if set)
5. Message is **decrypted client-side** and **permanently deleted** from server

---

## Deploy Free

**Render:**
- Connect GitHub repo → New Web Service → `node server.js`
- Add `ANTHROPIC_API_KEY` in environment variables

**Vercel:**
- Not ideal (serverless loses in-memory store) — use Render instead

---

**Fashipe Oluwadamilare Ayoola** · MIVA Open University · Lagos, Nigeria
