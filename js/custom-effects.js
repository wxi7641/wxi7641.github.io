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
          'radial-gradient(circle, rgba(241,213,146,0.48), rgba(183,154,245,0.38) 40%, rgba(18,12,28,0) 80%)';
        return {
          nodeFill: 'rgba(252, 244, 255, 0.98)',
          nodeCore: 'rgba(236, 211, 255, 1)',
          nodeGlow: 'rgba(192, 159, 248, 1)',
          nodeAura: 'rgba(212, 176, 250, 0.34)',
          haloInner: 'rgba(244, 214, 154, 0.42)',
          haloMid: 'rgba(192, 159, 248, 0.2)',
          haloOuter: 'rgba(181, 151, 244, 0)'
        };
      }

      glow.style.background =
        'radial-gradient(circle, rgba(214,255,226,0.56), rgba(78,221,145,0.42) 38%, rgba(28,175,118,0.2) 58%, rgba(255,255,255,0) 82%)';
      return {
        nodeFill: 'rgba(248, 255, 250, 0.98)',
        nodeCore: 'rgba(201, 255, 224, 1)',
        nodeGlow: 'rgba(47, 210, 135, 1)',
        nodeAura: 'rgba(110, 245, 181, 0.38)',
        haloInner: 'rgba(196, 255, 221, 0.44)',
        haloMid: 'rgba(82, 224, 151, 0.22)',
        haloOuter: 'rgba(92, 211, 158, 0)'
      };
    }

    function createNodes() {
      const areaPerDot = prefersCoarse ? 42000 : 24000;
      const minCount = prefersCoarse ? 16 : 30;
      const maxCount = prefersCoarse ? 48 : 88;
      const count = Math.max(minCount, Math.min(maxCount, Math.round((width * height) / areaPerDot)));

      nodes.length = 0;
      for (let i = 0; i < count; i += 1) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * (prefersCoarse ? 0.14 : 0.22),
          vy: (Math.random() - 0.5) * (prefersCoarse ? 0.1 : 0.18),
          r: Math.random() * 1.9 + 1.2,
          pulse: Math.random() * Math.PI * 2,
          sway: Math.random() * Math.PI * 2,
          strength: Math.random() * 0.85 + 0.9
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
      if (!pointer.active && elapsed > 1200) {
        return 0;
      }
      return Math.max(0, 1 - elapsed / 1200);
    }

    function drawHalo(colors, strength, clusterBoost) {
      const combined = strength + clusterBoost * 0.3;
      if (combined <= 0) {
        return;
      }
      const radius = (prefersCoarse ? 210 : 260) + clusterBoost * 10;
      const gradient = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, radius);
      gradient.addColorStop(0, colors.haloInner);
      gradient.addColorStop(0.42, colors.haloMid);
      gradient.addColorStop(1, colors.haloOuter);
      context.beginPath();
      context.arc(pointer.x, pointer.y, radius, 0, Math.PI * 2);
      context.fillStyle = gradient;
      context.globalAlpha = Math.min(1, 0.34 + combined * 0.34);
      context.fill();
      context.globalAlpha = 1;
    }

    function drawParticle(node, colors, glowBoost, densityBoost) {
      const auraRadius = node.r * 2.15 + glowBoost * 1.75 + densityBoost * 0.7;
      context.beginPath();
      context.arc(node.x, node.y, auraRadius, 0, Math.PI * 2);
      context.fillStyle = colors.nodeAura;
      context.globalAlpha = Math.min(1, 0.18 + glowBoost * 0.16 + densityBoost * 0.08);
      context.shadowBlur = 16 + glowBoost * 24 + densityBoost * 8;
      context.shadowColor = colors.nodeGlow;
      context.fill();
      context.globalAlpha = 1;
      context.shadowBlur = 0;

      const coreRadius = node.r + glowBoost * 0.82 + densityBoost * 0.14;
      context.beginPath();
      context.arc(node.x, node.y, coreRadius, 0, Math.PI * 2);
      context.fillStyle = colors.nodeCore;
      context.fill();

      context.beginPath();
      context.arc(node.x, node.y, Math.max(0.95, coreRadius * 0.38), 0, Math.PI * 2);
      context.fillStyle = colors.nodeFill;
      context.fill();
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
      const influenceRadius = prefersCoarse ? 210 : 260;
      context.clearRect(0, 0, width, height);
      let clusterLight = 0;
      let attractedCount = 0;

      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        const pulse = (Math.sin(now * 0.0012 + node.pulse) + 1) / 2;
        const drift = Math.sin(now * 0.0007 + node.sway) * 0.08;

        node.x += node.vx;
        node.y += node.vy + drift;

        if (node.x < -40 || node.x > width + 40) node.vx *= -1;
        if (node.y < -40 || node.y > height + 40) node.vy *= -1;

        let attraction = 0;
        if (strength > 0) {
          const dx = pointer.x - node.x;
          const dy = pointer.y - node.y;
          const distance = Math.hypot(dx, dy);
          if (distance < influenceRadius) {
            const force = (1 - distance / influenceRadius) * node.strength * strength;
            const pull = force * (prefersCoarse ? 0.015 : 0.022);
            node.x += dx * pull;
            node.y += dy * pull;
            node.vx += (dx / Math.max(distance, 1)) * force * 0.022;
            node.vy += (dy / Math.max(distance, 1)) * force * 0.022;
            attraction = force;
            clusterLight += force;
            attractedCount += 1;
          }
        }

        node.vx = Math.max(-0.62, Math.min(0.62, node.vx * (strength > 0 ? 0.992 : 0.996)));
        node.vy = Math.max(-0.62, Math.min(0.62, node.vy * (strength > 0 ? 0.992 : 0.996)));
        node._pulse = pulse;
        node._attraction = attraction;
      }

      const densityBoost = Math.min(
        prefersCoarse ? 1.15 : 1.7,
        clusterLight * 0.14 + attractedCount / (prefersCoarse ? 10 : 14)
      );

      drawHalo(colors, strength, densityBoost);
      if (strength > 0) {
        glow.style.opacity = String(Math.min(1, 0.34 + strength * 0.34 + densityBoost * 0.16));
      } else if (!pointer.active) {
        glow.style.opacity = '0';
      }

      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        const glowBoost = node._pulse * 0.82 + node._attraction * 4.8 + densityBoost * 0.24;
        drawParticle(node, colors, glowBoost, densityBoost);
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
