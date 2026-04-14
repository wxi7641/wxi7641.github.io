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
    const runtimeUrl = new URL(window.location.href);
    const previewMode = runtimeUrl.searchParams.get('fxPreview') === '1';
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

    function resolveEffectPreset(name) {
      const presets = {
        drift: {
          id: 'drift',
          glowSize: '18rem',
          glowSizeMobile: '12rem',
          glowBlur: '18px',
          areaPerDotCoarse: 30000,
          areaPerDotFine: 20000,
          minCountCoarse: 18,
          minCountFine: 34,
          maxCountCoarse: 52,
          maxCountFine: 92,
          velocityXCoarse: 0.28,
          velocityXFine: 0.46,
          velocityYCoarse: 0.22,
          velocityYFine: 0.36,
          driftAmplitude: 0.24,
          radiusMin: 0.78,
          radiusRange: 1.05,
          strengthMin: 0.76,
          strengthRange: 0.7,
          influenceRadiusCoarse: 186,
          influenceRadiusFine: 222,
          pullScaleCoarse: 0.01,
          pullScaleFine: 0.013,
          velocityPull: 0.016,
          maxVelocity: 1.04,
          activeFriction: 0.992,
          idleFriction: 0.998,
          pointGlowScale: 0.12,
          pointDensityScale: 0.04,
          pointAlphaBase: 0.82,
          pointAlphaGlow: 0.06,
          pointAlphaDensity: 0.04,
          sparkScale: 0.28,
          pulseWeight: 0.66,
          attractionWeight: 3.55,
          densityWeight: 0.14,
          densityCapCoarse: 0.98,
          densityCapFine: 1.3,
          clusterLightWeight: 0.11,
          countDivisorCoarse: 11,
          countDivisorFine: 16,
          haloRadiusCoarse: 158,
          haloRadiusFine: 186,
          haloClusterScale: 6,
          haloOpacityBase: 0.2,
          haloOpacityScale: 0.24,
          glowOpacityBase: 0.22,
          glowOpacityStrength: 0.22,
          glowOpacityDensity: 0.12
        },
        sharp: {
          id: 'sharp',
          glowSize: '19rem',
          glowSizeMobile: '12.5rem',
          glowBlur: '19px',
          areaPerDotCoarse: 28000,
          areaPerDotFine: 18500,
          minCountCoarse: 20,
          minCountFine: 38,
          maxCountCoarse: 56,
          maxCountFine: 98,
          velocityXCoarse: 0.3,
          velocityXFine: 0.5,
          velocityYCoarse: 0.24,
          velocityYFine: 0.4,
          driftAmplitude: 0.22,
          radiusMin: 0.84,
          radiusRange: 1.08,
          strengthMin: 0.9,
          strengthRange: 0.82,
          influenceRadiusCoarse: 198,
          influenceRadiusFine: 236,
          pullScaleCoarse: 0.013,
          pullScaleFine: 0.017,
          velocityPull: 0.019,
          maxVelocity: 1.08,
          activeFriction: 0.991,
          idleFriction: 0.998,
          pointGlowScale: 0.14,
          pointDensityScale: 0.045,
          pointAlphaBase: 0.84,
          pointAlphaGlow: 0.065,
          pointAlphaDensity: 0.042,
          sparkScale: 0.3,
          pulseWeight: 0.72,
          attractionWeight: 4.1,
          densityWeight: 0.18,
          densityCapCoarse: 1.08,
          densityCapFine: 1.46,
          clusterLightWeight: 0.12,
          countDivisorCoarse: 10,
          countDivisorFine: 14,
          haloRadiusCoarse: 164,
          haloRadiusFine: 194,
          haloClusterScale: 6,
          haloOpacityBase: 0.22,
          haloOpacityScale: 0.26,
          glowOpacityBase: 0.24,
          glowOpacityStrength: 0.24,
          glowOpacityDensity: 0.13
        },
        focus: {
          id: 'focus',
          glowSize: '21rem',
          glowSizeMobile: '13.5rem',
          glowBlur: '20px',
          areaPerDotCoarse: 25000,
          areaPerDotFine: 17000,
          minCountCoarse: 22,
          minCountFine: 42,
          maxCountCoarse: 62,
          maxCountFine: 108,
          velocityXCoarse: 0.28,
          velocityXFine: 0.44,
          velocityYCoarse: 0.22,
          velocityYFine: 0.34,
          driftAmplitude: 0.18,
          radiusMin: 0.88,
          radiusRange: 1.16,
          strengthMin: 1.02,
          strengthRange: 0.94,
          influenceRadiusCoarse: 210,
          influenceRadiusFine: 248,
          pullScaleCoarse: 0.016,
          pullScaleFine: 0.02,
          velocityPull: 0.023,
          maxVelocity: 1.02,
          activeFriction: 0.99,
          idleFriction: 0.9975,
          pointGlowScale: 0.16,
          pointDensityScale: 0.05,
          pointAlphaBase: 0.86,
          pointAlphaGlow: 0.072,
          pointAlphaDensity: 0.046,
          sparkScale: 0.32,
          pulseWeight: 0.78,
          attractionWeight: 4.6,
          densityWeight: 0.22,
          densityCapCoarse: 1.15,
          densityCapFine: 1.6,
          clusterLightWeight: 0.14,
          countDivisorCoarse: 9,
          countDivisorFine: 13,
          haloRadiusCoarse: 172,
          haloRadiusFine: 202,
          haloClusterScale: 7,
          haloOpacityBase: 0.24,
          haloOpacityScale: 0.28,
          glowOpacityBase: 0.26,
          glowOpacityStrength: 0.26,
          glowOpacityDensity: 0.15
        }
      };
      return presets[name] || presets.sharp;
    }

    const effectPreset = resolveEffectPreset(runtimeUrl.searchParams.get('fx'));
    document.documentElement.dataset.codexFx = effectPreset.id;
    document.documentElement.style.setProperty('--codex-glow-size', effectPreset.glowSize);
    document.documentElement.style.setProperty('--codex-glow-size-mobile', effectPreset.glowSizeMobile);
    document.documentElement.style.setProperty('--codex-glow-blur', effectPreset.glowBlur);

    function palette() {
      if (currentMode() === 'dark') {
        glow.style.background =
          'radial-gradient(circle, rgba(241,213,146,0.48), rgba(183,154,245,0.38) 40%, rgba(18,12,28,0) 80%)';
        return {
          nodeFill: 'rgba(252, 244, 255, 0.98)',
          nodeCore: 'rgba(236, 211, 255, 1)',
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
        haloInner: 'rgba(196, 255, 221, 0.44)',
        haloMid: 'rgba(82, 224, 151, 0.22)',
        haloOuter: 'rgba(92, 211, 158, 0)'
      };
    }

    function createNodes() {
      const areaPerDot = prefersCoarse ? effectPreset.areaPerDotCoarse : effectPreset.areaPerDotFine;
      const minCount = prefersCoarse ? effectPreset.minCountCoarse : effectPreset.minCountFine;
      const maxCount = prefersCoarse ? effectPreset.maxCountCoarse : effectPreset.maxCountFine;
      const count = Math.max(minCount, Math.min(maxCount, Math.round((width * height) / areaPerDot)));

      nodes.length = 0;
      for (let i = 0; i < count; i += 1) {
        nodes.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * (prefersCoarse ? effectPreset.velocityXCoarse : effectPreset.velocityXFine),
          vy: (Math.random() - 0.5) * (prefersCoarse ? effectPreset.velocityYCoarse : effectPreset.velocityYFine),
          r: Math.random() * effectPreset.radiusRange + effectPreset.radiusMin,
          pulse: Math.random() * Math.PI * 2,
          sway: Math.random() * Math.PI * 2,
          strength: Math.random() * effectPreset.strengthRange + effectPreset.strengthMin
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
      const radius =
        (prefersCoarse ? effectPreset.haloRadiusCoarse : effectPreset.haloRadiusFine) +
        clusterBoost * effectPreset.haloClusterScale;
      const gradient = context.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, radius);
      gradient.addColorStop(0, colors.haloInner);
      gradient.addColorStop(0.42, colors.haloMid);
      gradient.addColorStop(1, colors.haloOuter);
      context.beginPath();
      context.arc(pointer.x, pointer.y, radius, 0, Math.PI * 2);
      context.fillStyle = gradient;
      context.globalAlpha = Math.min(1, effectPreset.haloOpacityBase + combined * effectPreset.haloOpacityScale);
      context.fill();
      context.globalAlpha = 1;
    }

    function drawParticle(node, colors, glowBoost, densityBoost) {
      const coreRadius =
        node.r +
        glowBoost * effectPreset.pointGlowScale +
        densityBoost * effectPreset.pointDensityScale;
      context.beginPath();
      context.arc(node.x, node.y, coreRadius, 0, Math.PI * 2);
      context.fillStyle = colors.nodeCore;
      context.globalAlpha = Math.min(
        1,
        effectPreset.pointAlphaBase +
          glowBoost * effectPreset.pointAlphaGlow +
          densityBoost * effectPreset.pointAlphaDensity
      );
      context.fill();
      context.globalAlpha = 1;

      context.beginPath();
      context.arc(node.x, node.y, Math.max(0.72, coreRadius * effectPreset.sparkScale), 0, Math.PI * 2);
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
      if (previewMode) {
        activatePointer(
          width * 0.66 + Math.cos(now * 0.00042) * width * 0.1,
          Math.min(height * 0.56, height * 0.28 + Math.sin(now * 0.00068) * height * 0.08)
        );
      }
      const colors = palette();
      const strength = pointerStrength();
      const influenceRadius = prefersCoarse ? effectPreset.influenceRadiusCoarse : effectPreset.influenceRadiusFine;
      context.clearRect(0, 0, width, height);
      let clusterLight = 0;
      let attractedCount = 0;

      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        const pulse = (Math.sin(now * 0.0012 + node.pulse) + 1) / 2;
        const drift = Math.sin(now * 0.0007 + node.sway) * effectPreset.driftAmplitude;

        if (strength === 0) {
          node.vx += Math.sin(now * 0.00031 + node.sway) * 0.0044;
          node.vy += Math.cos(now * 0.00027 + node.pulse) * 0.0036;
        }

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
            const pull = force * (prefersCoarse ? effectPreset.pullScaleCoarse : effectPreset.pullScaleFine);
            node.x += dx * pull;
            node.y += dy * pull;
            node.vx += (dx / Math.max(distance, 1)) * force * effectPreset.velocityPull;
            node.vy += (dy / Math.max(distance, 1)) * force * effectPreset.velocityPull;
            attraction = force;
            clusterLight += force;
            attractedCount += 1;
          }
        }

        node.vx = Math.max(
          -effectPreset.maxVelocity,
          Math.min(effectPreset.maxVelocity, node.vx * (strength > 0 ? effectPreset.activeFriction : effectPreset.idleFriction))
        );
        node.vy = Math.max(
          -effectPreset.maxVelocity,
          Math.min(effectPreset.maxVelocity, node.vy * (strength > 0 ? effectPreset.activeFriction : effectPreset.idleFriction))
        );
        node._pulse = pulse;
        node._attraction = attraction;
      }

      const densityBoost = Math.min(
        prefersCoarse ? effectPreset.densityCapCoarse : effectPreset.densityCapFine,
        clusterLight * effectPreset.clusterLightWeight +
          attractedCount / (prefersCoarse ? effectPreset.countDivisorCoarse : effectPreset.countDivisorFine)
      );

      drawHalo(colors, strength, densityBoost);
      if (strength > 0) {
        glow.style.opacity = String(
          Math.min(
            1,
            effectPreset.glowOpacityBase +
              strength * effectPreset.glowOpacityStrength +
              densityBoost * effectPreset.glowOpacityDensity
          )
        );
      } else if (!pointer.active) {
        glow.style.opacity = '0';
      }

      for (let i = 0; i < nodes.length; i += 1) {
        const node = nodes[i];
        const glowBoost =
          node._pulse * effectPreset.pulseWeight +
          node._attraction * effectPreset.attractionWeight +
          densityBoost * effectPreset.densityWeight;
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
