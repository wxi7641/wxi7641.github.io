(function () {
  function onReady(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  function currentMode() {
    const explicit = document.documentElement.getAttribute('data-theme');
    if (explicit === 'dark' || explicit === 'light') {
      return explicit;
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function updateThemeLabel() {
    const label = document.getElementById('theme-switch-label');
    if (label) {
      label.textContent = currentMode() === 'dark' ? '夜间 · 柔和紫金' : '日间 · 绿意';
    }
  }

  function syncTheme(mode) {
    if (typeof applyTheme === 'function') {
      applyTheme(mode);
    } else {
      document.documentElement.setAttribute('data-theme', mode);
    }
    window.localStorage.setItem('Stellar.theme', mode);
    if (window.utils && utils.dark) {
      utils.dark.mode = mode;
      utils.dark.method.toggle.start();
    }
    updateThemeLabel();
  }

  window.codexToggleTheme = function () {
    syncTheme(currentMode() === 'dark' ? 'light' : 'dark');
  };

  onReady(function () {
    updateThemeLabel();

    if (window.utils && utils.dark && typeof utils.dark.push === 'function') {
      utils.dark.push(updateThemeLabel, 'codex-theme-label', false);
    }

    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    if (typeof scheme.addEventListener === 'function') {
      scheme.addEventListener('change', updateThemeLabel);
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const layer = document.createElement('div');
    layer.id = 'codex-visual-effects';

    const canvas = document.createElement('canvas');
    canvas.id = 'codex-web-canvas';

    const glow = document.createElement('div');
    glow.id = 'codex-cursor-glow';

    layer.appendChild(canvas);
    layer.appendChild(glow);
    document.body.prepend(layer);

    const context = canvas.getContext('2d');
    const prefersCoarse = window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
    const pointer = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      active: false,
      lastActiveAt: 0
    };
    const nodes = [];
    let width = 0;
    let height = 0;
    let animationId = 0;

    function palette() {
      if (currentMode() === 'dark') {
        glow.style.background =
          'radial-gradient(circle, rgba(238,205,136,0.36), rgba(181,151,244,0.3) 42%, rgba(18,12,28,0) 78%)';
        return {
          nodeFill: 'rgba(244, 231, 255, 0.95)',
          nodeGlow: 'rgba(185, 154, 246, 0.96)',
          haloInner: 'rgba(244, 210, 146, 0.34)',
          haloOuter: 'rgba(181, 151, 244, 0)'
        };
      }

      glow.style.background =
        'radial-gradient(circle, rgba(188,255,210,0.38), rgba(92,203,123,0.3) 44%, rgba(255,255,255,0) 76%)';
      return {
        nodeFill: 'rgba(230, 255, 237, 0.98)',
        nodeGlow: 'rgba(89, 202, 120, 0.94)',
        haloInner: 'rgba(165, 247, 189, 0.34)',
        haloOuter: 'rgba(104, 192, 131, 0)'
      };
    }

    function createNodes() {
      const areaPerDot = prefersCoarse ? 90000 : 52000;
      const minCount = prefersCoarse ? 10 : 18;
      const maxCount = prefersCoarse ? 24 : 46;
      const count = Math.max(minCount, Math.min(maxCount, Math.round((width * height) / areaPerDot)));

      nodes.length = 0;
      for (let i = 0; i < count; i += 1) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * (prefersCoarse ? 0.16 : 0.24),
          vy: (Math.random() - 0.5) * (prefersCoarse ? 0.12 : 0.2),
          r: Math.random() * 1.8 + 1.1,
          pulse: Math.random() * Math.PI * 2,
          sway: Math.random() * Math.PI * 2,
          strength: Math.random() * 0.7 + 0.7
        });
      }
    }

    function resize() {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      createNodes();
    }

    function pointerStrength() {
      const elapsed = performance.now() - pointer.lastActiveAt;
      if (!pointer.active && elapsed > 900) {
        return 0;
      }
      return Math.max(0, 1 - elapsed / 900);
    }

    function drawHalo(colors, strength) {
      if (strength <= 0) {
        return;
      }
      const radius = prefersCoarse ? 180 : 220;
      const gradient = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, radius);
      gradient.addColorStop(0, colors.haloInner);
      gradient.addColorStop(1, colors.haloOuter);
      context.beginPath();
      context.arc(pointer.x, pointer.y, radius, 0, Math.PI * 2);
      context.fillStyle = gradient;
      context.globalAlpha = Math.min(1, 0.68 + strength * 0.22);
      context.fill();
      context.globalAlpha = 1;
    }

    function drawParticle(node, colors, glowBoost) {
      const radius = node.r + glowBoost * 0.7;
      context.beginPath();
      context.arc(node.x, node.y, radius, 0, Math.PI * 2);
      context.fillStyle = colors.nodeFill;
      context.shadowBlur = 10 + glowBoost * 22;
      context.shadowColor = colors.nodeGlow;
      context.fill();
      context.shadowBlur = 0;
    }

    function activatePointer(x, y) {
      pointer.x = x;
      pointer.y = y;
      pointer.active = true;
      pointer.lastActiveAt = performance.now();
      glow.style.opacity = '1';
      glow.style.transform = 'translate3d(' + pointer.x + 'px, ' + pointer.y + 'px, 0)';
    }

    function step(now) {
      const colors = palette();
      const strength = pointerStrength();
      context.clearRect(0, 0, width, height);
      drawHalo(colors, strength);

      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        const pulse = (Math.sin(now * 0.0012 + node.pulse) + 1) / 2;
        const drift = Math.sin(now * 0.0007 + node.sway) * 0.08;

        node.x += node.vx;
        node.y += node.vy + drift;

        if (node.x < -40 || node.x > width + 40) node.vx *= -1;
        if (node.y < -40 || node.y > height + 40) node.vy *= -1;

        let glowBoost = pulse * 0.55;
        if (strength > 0) {
          const dx = pointer.x - node.x;
          const dy = pointer.y - node.y;
          const distance = Math.hypot(dx, dy);
          const radius = prefersCoarse ? 180 : 220;
          if (distance < radius) {
            const force = (1 - distance / radius) * node.strength * strength;
            node.vx += (dx / Math.max(distance, 1)) * force * 0.012;
            node.vy += (dy / Math.max(distance, 1)) * force * 0.012;
            glowBoost += force * 2.6;
          }
        }

        node.vx = Math.max(-0.5, Math.min(0.5, node.vx * 0.995));
        node.vy = Math.max(-0.5, Math.min(0.5, node.vy * 0.995));
        drawParticle(node, colors, glowBoost);
      }

      animationId = window.requestAnimationFrame(step);
    }

    window.addEventListener('mousemove', function (event) {
      activatePointer(event.clientX, event.clientY);
    });

    window.addEventListener('mousedown', function () {
      glow.style.opacity = '1';
    });

    window.addEventListener('mouseup', function () {
      glow.style.opacity = pointer.active ? '1' : '0';
    });

    window.addEventListener('mouseleave', function () {
      pointer.active = false;
      pointer.lastActiveAt = performance.now();
      glow.style.opacity = '0.42';
    });

    window.addEventListener('touchstart', function (event) {
      const touch = event.touches[0];
      if (touch) {
        activatePointer(touch.clientX, touch.clientY);
      }
    }, { passive: true });

    window.addEventListener('touchmove', function (event) {
      const touch = event.touches[0];
      if (touch) {
        activatePointer(touch.clientX, touch.clientY);
      }
    }, { passive: true });

    window.addEventListener('touchend', function () {
      pointer.active = false;
      pointer.lastActiveAt = performance.now();
      glow.style.opacity = '0';
    }, { passive: true });

    window.addEventListener('resize', resize);

    resize();
    animationId = window.requestAnimationFrame(step);

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        window.cancelAnimationFrame(animationId);
        animationId = 0;
      } else if (!animationId) {
        animationId = window.requestAnimationFrame(step);
      }
    });
  });
})();
