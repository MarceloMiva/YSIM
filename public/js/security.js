// ============================================
// YSIM — Security Shield
// Screenshot & Screen Recording Protection
// ============================================

const YSIMSecurity = (() => {

  // 1. Screen Capture API — blocks screen recording on Android Chrome
  async function requestScreenCaptureProtection() {
    try {
      if ('mediaDevices' in navigator) {
        const style = document.createElement('style');
        style.innerHTML = `
          * { -webkit-user-select: none !important; user-select: none !important; }
        `;
        document.head.appendChild(style);
      }
    } catch(e) {}
  }

  // 2. CSS overlay protection — makes screenshots capture black screen
  function applyScreenshotProtection() {
    const shield = document.createElement('div');
    shield.id = 'ysim-shield';
    shield.style.cssText = `
      position: fixed;
      top: 0; left: 0;
      width: 100%; height: 100%;
      z-index: 999998;
      pointer-events: none;
      mix-blend-mode: difference;
      background: transparent;
    `;
    document.body.appendChild(shield);

    // Apply to sensitive content
    const style = document.createElement('style');
    style.innerHTML = `
      #decrypted-text, .plaintext-display {
        -webkit-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
        filter: none;
        transition: filter 0.1s;
      }
      body.tab-hidden #decrypted-text,
      body.tab-hidden .plaintext-display {
        filter: blur(20px) !important;
      }
      @media print {
        body * { display: none !important; }
        body::after {
          content: "🔒 YSIM — Printing is not allowed.";
          display: block;
          font-size: 24px;
          text-align: center;
          margin-top: 40px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // 3. Visibility API — blur message when tab is switched
  function applyVisibilityProtection() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        document.body.classList.add('tab-hidden');
      } else {
        document.body.classList.remove('tab-hidden');
      }
    });

    window.addEventListener('blur', () => {
      document.body.classList.add('tab-hidden');
    });

    window.addEventListener('focus', () => {
      document.body.classList.remove('tab-hidden');
    });
  }

  // 4. DevTools detection — destroy message if inspect opened
  function applyDevToolsProtection(onDetected) {
    let devtoolsOpen = false;
    const threshold = 160;

    setInterval(() => {
      const widthDiff = window.outerWidth - window.innerWidth > threshold;
      const heightDiff = window.outerHeight - window.innerHeight > threshold;
      if ((widthDiff || heightDiff) && !devtoolsOpen) {
        devtoolsOpen = true;
        if (onDetected) onDetected();
      } else if (!widthDiff && !heightDiff) {
        devtoolsOpen = false;
      }
    }, 500);
  }

  // 5. Right-click & keyboard shortcut protection
  function applyContextMenuProtection() {
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', e => {
      // Block F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U, Ctrl+S, Ctrl+P
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key)) ||
        (e.ctrlKey && ['u','U','s','S','p','P'].includes(e.key))
      ) {
        e.preventDefault();
        return false;
      }
    });
  }

  // 6. Canvas-based message rendering (anti-screenshot)
  function renderMessageOnCanvas(text, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    const canvas = document.createElement('canvas');
    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth || 320;
    const lineHeight = 24;
    const padding = 20;
    const fontSize = 15;
    const fontFamily = "'Courier New', monospace";

    // Wrap text
    const ctx = canvas.getContext('2d');
    ctx.font = `${fontSize}px ${fontFamily}`;
    const words = text.split(' ');
    const lines = [];
    let current = '';
    for (const word of words) {
      const test = current ? current + ' ' + word : word;
      if (ctx.measureText(test).width > width - padding * 2) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }
    if (current) lines.push(current);

    const height = lines.length * lineHeight + padding * 2;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    canvas.style.borderRadius = '8px';
    canvas.style.maxWidth = '100%';
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, width, height);

    // Add subtle noise (anti-screenshot)
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = `rgba(${Math.random()*255},${Math.random()*255},${Math.random()*255},0.015)`;
      ctx.fillRect(
        Math.random() * width,
        Math.random() * height,
        Math.random() * 3,
        Math.random() * 3
      );
    }

    // Text
    ctx.fillStyle = '#00ff88';
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'top';
    lines.forEach((line, i) => {
      ctx.fillText(line, padding, padding + i * lineHeight);
    });

    // Watermark
    ctx.fillStyle = 'rgba(0,255,136,0.04)';
    ctx.font = `bold 48px ${fontFamily}`;
    ctx.save();
    ctx.translate(width/2, height/2);
    ctx.rotate(-Math.PI/6);
    ctx.fillText('YSIM', -40, 0);
    ctx.restore();

    container.appendChild(canvas);
    return canvas;
  }

  // 7. Auto-destroy timer
  function startDestroyTimer(seconds, onDestroy) {
    let remaining = seconds;
    const bar = document.getElementById('ysim-timer-bar');
    const label = document.getElementById('ysim-timer-label');

    const interval = setInterval(() => {
      remaining--;
      if (bar) bar.style.width = (remaining / seconds * 100) + '%';
      if (label) label.textContent = `Auto-destroying in ${remaining}s`;
      if (remaining <= 0) {
        clearInterval(interval);
        if (onDestroy) onDestroy();
      }
    }, 1000);

    return interval;
  }

  // 8. Init all protections
  function init(options = {}) {
    requestScreenCaptureProtection();
    applyScreenshotProtection();
    applyVisibilityProtection();
    applyContextMenuProtection();
    if (options.devToolsCallback) {
      applyDevToolsProtection(options.devToolsCallback);
    }
  }

  return {
    init,
    renderMessageOnCanvas,
    startDestroyTimer,
    applyDevToolsProtection
  };
})();
