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
      label.textContent = currentMode() === 'dark' ? '澶滈棿 路 鏌斿拰绱噾' : '鏃ラ棿 路 缁挎剰';
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

    if (window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0) {
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
    const pointer = { x: window.innerWidth / 2, y: window.innerHeight / 2, active: false };
    const nodes = [];
    let width = 0;
    let height = 0;
    let animationId = 0;

    function palette() {
      if (currentMode() === 'dark') {
        glow.style.background =
          'radial-gradient(circle, rgba(214,192,152,0.18), rgba(164,146,203,0.14) 42%, rgba(18,12,28,0) 76%)';
        return {
          node: 'rgba(190, 176, 214, 0.58)',
          line: 'rgba(201, 183, 146, 0.10)',
          cursor: 'rgba(211, 197, 168, 0.14)'
        };
      }

      glow.style.background =
        'radial-gradient(circle, rgba(166,232,182,0.22), rgba(91,166,112,0.14) 44%, rgba(255,255,255,0) 74%)';
      return {
        node: 'rgba(82, 156, 107, 0.72)',
        line: 'rgba(86, 144, 108, 0.13)',
        cursor: 'rgba(145, 219, 169, 0.18)'
      };
    }

    function createNodes() {
      const count = Math.max(24, Math.min(60, Math.round((width * height) / 42000)));
      nodes.length = 0;
      for (let i = 0; i < count; i += 1) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.28,
          vy: (Math.random() - 0.5) * 0.28,
          r: Math.random() * 1.4 + 0.8
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

    function drawLine(x1, y1, x2, y2, color, alphaScale) {
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.strokeStyle = color.replace(/[\d.]+\)$/u, String(alphaScale) + ')');
      context.stroke();
    }

    function step() {
      const colors = palette();
      context.clearRect(0, 0, width, height);
      context.lineWidth = 1;

      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < -40 || node.x > width + 40) node.vx *= -1;
        if (node.y < -40 || node.y > height + 40) node.vy *= -1;

        context.beginPath();
        context.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        context.fillStyle = colors.node;
        context.fill();

        for (let j = i + 1; j < nodes.length; j += 1) {
          const other = nodes[j];
          const dx = node.x - other.x;
          const dy = node.y - other.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 130) {
            const alpha = (1 - distance / 130) * 0.22;
            drawLine(node.x, node.y, other.x, other.y, colors.line, alpha);
          }
        }

        if (pointer.active) {
          const dx = node.x - pointer.x;
          const dy = node.y - pointer.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 170) {
            const alpha = (1 - distance / 170) * 0.34;
            drawLine(node.x, node.y, pointer.x, pointer.y, colors.cursor, alpha);
          }
        }
      }

      animationId = window.requestAnimationFrame(step);
    }

    window.addEventListener('mousemove', function (event) {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.active = true;
      glow.style.opacity = '0.95';
      glow.style.transform = 'translate3d(' + pointer.x + 'px, ' + pointer.y + 'px, 0)';
    });

    window.addEventListener('mousedown', function () {
      glow.style.opacity = '1';
    });

    window.addEventListener('mouseup', function () {
      glow.style.opacity = pointer.active ? '0.95' : '0';
    });

    window.addEventListener('mouseleave', function () {
      pointer.active = false;
      glow.style.opacity = '0';
    });

    window.addEventListener('resize', resize);

    resize();
    step();

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        window.cancelAnimationFrame(animationId);
        animationId = 0;
      } else if (!animationId) {
        step();
      }
    });
  });
})();

