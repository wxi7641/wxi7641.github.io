(function () {
  'use strict';

  function onReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  onReady(function () {
    var root = document.documentElement;
    var systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
    var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var pageBody = document.querySelector('.l_body');
    var article = document.querySelector('article.md-text.content');
    var layout = pageBody ? pageBody.getAttribute('layout') : '';
    var hasWikiLocation = Boolean(document.querySelector('.widget-wrapper.doc-tree .link.active'));
    var isReadingPage = Boolean(article && (layout === 'post' || hasWikiLocation || document.getElementById('read-next')));
    var scrollFrame = 0;

    function currentTheme() {
      var explicit = root.getAttribute('data-theme');
      if (explicit === 'dark' || explicit === 'light') {
        return explicit;
      }
      return systemTheme.matches ? 'dark' : 'light';
    }

    function createThemeTransition() {
      var wash = document.createElement('div');
      wash.className = 'theme-transition-wash';
      wash.setAttribute('aria-hidden', 'true');
      document.body.appendChild(wash);

      var previousTheme = currentTheme();
      var timer = 0;

      function playTransition() {
        var nextTheme = currentTheme();
        if (nextTheme === previousTheme) {
          return;
        }
        previousTheme = nextTheme;
        window.clearTimeout(timer);
        wash.className = 'theme-transition-wash';
        void wash.offsetWidth;
        wash.classList.add(nextTheme === 'dark' ? 'to-dark' : 'to-light');
        timer = window.setTimeout(function () {
          wash.className = 'theme-transition-wash';
        }, 560);
      }

      new MutationObserver(playTransition).observe(root, {
        attributes: true,
        attributeFilter: ['data-theme']
      });

      if (typeof systemTheme.addEventListener === 'function') {
        systemTheme.addEventListener('change', function () {
          if (!root.hasAttribute('data-theme')) {
            playTransition();
          }
        });
      }
    }

    function lotusMarkup() {
      return [
        '<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">',
        '<ellipse class="lotus-halo" cx="32" cy="34" rx="25" ry="22"></ellipse>',
        '<ellipse class="lotus-water" cx="32" cy="52" rx="22" ry="4"></ellipse>',
        '<path class="lotus-leaf lotus-leaf-left" d="M31 48 C22 45 14 46 9 52 C17 55 26 55 32 50 Z"></path>',
        '<path class="lotus-leaf lotus-leaf-right" d="M33 48 C42 45 50 46 55 52 C47 55 38 55 32 50 Z"></path>',
        '<path class="lotus-petal lotus-petal-soft lotus-petal-outer lotus-petal-left" d="M31 47 C20 46 11 38 9 27 C20 27 29 35 31 47 Z"></path>',
        '<path class="lotus-petal lotus-petal-soft lotus-petal-outer lotus-petal-right" d="M33 47 C44 46 53 38 55 27 C44 27 35 35 33 47 Z"></path>',
        '<path class="lotus-petal lotus-petal-middle lotus-petal-left" d="M32 47 C23 43 18 32 21 19 C30 24 34 36 32 47 Z"></path>',
        '<path class="lotus-petal lotus-petal-middle lotus-petal-right" d="M32 47 C41 43 46 32 43 19 C34 24 30 36 32 47 Z"></path>',
        '<path class="lotus-petal lotus-petal-light lotus-petal-center" d="M32 45 C24 37 25 22 32 10 C39 22 40 37 32 45 Z"></path>',
        '<path class="lotus-petal lotus-petal-light lotus-petal-front" d="M32 49 C26 44 26 34 32 26 C38 34 38 44 32 49 Z"></path>',
        '<circle class="lotus-core" cx="32" cy="43" r="3.2"></circle>',
        '</svg>'
      ].join('');
    }

    function createReadingControl() {
      var progressLine = null;
      if (isReadingPage) {
        progressLine = document.createElement('div');
        progressLine.className = 'reading-progress-line';
        progressLine.setAttribute('aria-hidden', 'true');
        progressLine.innerHTML = '<span class="reading-progress-line__bar"></span>';
        document.body.appendChild(progressLine);
      }

      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'lotus-progress-control ' + (isReadingPage ? 'is-reading' : 'is-listing');
      button.dataset.stage = '0';
      button.innerHTML = lotusMarkup();
      button.setAttribute('aria-label', '返回顶部');
      button.title = '返回顶部';
      document.body.appendChild(button);

      var wasComplete = false;

      function readingProgress() {
        if (!isReadingPage || !article) {
          var documentRange = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
          return clamp(window.scrollY / documentRange, 0, 1);
        }

        var articleTop = article.getBoundingClientRect().top + window.scrollY;
        var start = Math.max(0, articleTop - 96);
        var finish = Math.max(start + 1, articleTop + article.offsetHeight - window.innerHeight * 0.68);
        return clamp((window.scrollY - start) / (finish - start), 0, 1);
      }

      function progressStage(progress) {
        if (progress < 0.16) return 0;
        if (progress < 0.4) return 1;
        if (progress < 0.65) return 2;
        if (progress < 0.88) return 3;
        return 4;
      }

      function update() {
        scrollFrame = 0;
        var progress = readingProgress();
        var percent = Math.round(progress * 100);
        var pageScrollable = document.documentElement.scrollHeight > window.innerHeight * 1.18;
        var shouldShow = pageScrollable && window.scrollY > Math.min(420, window.innerHeight * 0.55);

        root.style.setProperty('--reading-progress', progress.toFixed(4));
        button.style.setProperty('--reading-progress', progress.toFixed(4));
        button.style.setProperty('--lotus-water-opacity', (0.22 + progress * 0.45).toFixed(3));
        button.style.setProperty('--lotus-water-offset', (58 - progress * 58).toFixed(2));
        button.style.setProperty('--lotus-core-opacity', (0.22 + progress * 0.78).toFixed(3));
        button.dataset.stage = String(progressStage(progress));
        button.classList.toggle('is-visible', shouldShow);

        if (isReadingPage) {
          button.setAttribute('aria-label', '阅读进度 ' + percent + '%，点击返回顶部');
          button.title = '阅读进度 ' + percent + '% · 返回顶部';
          progressLine.classList.toggle('is-visible', progress > 0.005 && progress < 0.999);
        }

        if (progress >= 0.985 && !wasComplete) {
          button.classList.remove('is-complete');
          void button.offsetWidth;
          button.classList.add('is-complete');
          wasComplete = true;
        } else if (progress < 0.94) {
          button.classList.remove('is-complete');
          wasComplete = false;
        }
      }

      function scheduleUpdate() {
        if (!scrollFrame) {
          scrollFrame = window.requestAnimationFrame(update);
        }
      }

      button.addEventListener('click', function () {
        if (typeof util !== 'undefined' && util.scrollTop) {
          util.scrollTop();
        } else {
          window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
        }
      });

      window.addEventListener('scroll', scheduleUpdate, { passive: true });
      window.addEventListener('resize', scheduleUpdate, { passive: true });
      update();
    }

    function enhanceHeadings() {
      if (!isReadingPage || !article) {
        return;
      }

      article.querySelectorAll('h2[id], h3[id], h4[id]').forEach(function (heading) {
        if (heading.querySelector(':scope > .heading-anchor')) {
          return;
        }
        var anchor = document.createElement('a');
        anchor.className = 'heading-anchor';
        anchor.href = '#' + encodeURIComponent(heading.id);
        anchor.textContent = '#';
        anchor.setAttribute('aria-label', '定位到 ' + heading.textContent.trim());
        anchor.title = '定位到此标题';
        heading.appendChild(anchor);
      });

      function highlightTarget() {
        article.querySelectorAll('.is-target-heading').forEach(function (heading) {
          heading.classList.remove('is-target-heading');
        });
        if (!window.location.hash) {
          return;
        }
        var id;
        try {
          id = decodeURIComponent(window.location.hash.slice(1));
        } catch (error) {
          id = window.location.hash.slice(1);
        }
        var target = document.getElementById(id);
        if (target && target.matches('h2, h3, h4')) {
          target.classList.add('is-target-heading');
          window.setTimeout(function () {
            target.classList.remove('is-target-heading');
          }, 1050);
        }
      }

      window.addEventListener('hashchange', highlightTarget);
      highlightTarget();
    }

    function enhanceWikiTree() {
      var tree = document.querySelector('.widget-wrapper.doc-tree');
      if (!tree) {
        return;
      }

      var links = Array.prototype.slice.call(tree.querySelectorAll('.widget-body .link'));
      var activeIndex = links.findIndex(function (link) {
        return link.classList.contains('active');
      });
      if (activeIndex < 0) {
        return;
      }

      links.forEach(function (link, index) {
        link.classList.toggle('is-before-active', index < activeIndex);
      });

      var meter = document.createElement('div');
      meter.className = 'wiki-tree-meter';
      meter.innerHTML = '<span>' + (activeIndex + 1) + ' / ' + links.length + '</span><span class="wiki-tree-meter__track"><i class="wiki-tree-meter__bar"></i></span>';
      tree.style.setProperty('--wiki-progress', ((activeIndex + 1) / links.length).toFixed(4));
      tree.insertBefore(meter, tree.firstChild);

      function updatePath() {
        tree.querySelectorAll('.widget-body').forEach(function (body) {
          body.classList.add('wiki-path');
          var active = body.querySelector('.link.active');
          if (active) {
            var height = active.offsetTop + active.offsetHeight / 2 - 7;
            body.style.setProperty('--wiki-path-height', Math.max(0, height) + 'px');
          } else if (body.querySelector('.link.is-before-active')) {
            body.style.setProperty('--wiki-path-height', 'calc(100% - 14px)');
          }
        });
      }

      function revealActiveLink() {
        var active = tree.querySelector('.link.active');
        var scroller = tree.closest('.widgets');
        if (!active || !scroller || scroller.scrollHeight <= scroller.clientHeight) {
          return;
        }

        var activeRect = active.getBoundingClientRect();
        var scrollerRect = scroller.getBoundingClientRect();
        var treeRect = tree.getBoundingClientRect();
        var viewportHeight = scroller.clientHeight;
        var currentScroll = scroller.scrollTop;
        var topPadding = 16;
        var bottomPadding = 24;

        var treeTop = currentScroll + treeRect.top - scrollerRect.top;
        var treeBottom = currentScroll + treeRect.bottom - scrollerRect.top;
        var activeCenter = currentScroll + activeRect.top - scrollerRect.top + activeRect.height / 2;
        var desiredScroll = activeCenter - viewportHeight * 0.3;

        var activeBody = active.closest('.widget-body');
        var sectionHeader = activeBody && activeBody.previousElementSibling;
        if (sectionHeader && sectionHeader.classList.contains('widget-header')) {
          var headerRect = sectionHeader.getBoundingClientRect();
          var headerDistance = activeRect.top - headerRect.bottom;
          if (headerDistance <= activeRect.height * 2.2) {
            var headerTop = currentScroll + headerRect.top - scrollerRect.top;
            desiredScroll = Math.min(desiredScroll, headerTop - topPadding);
          }
        }

        var minimumScroll = Math.max(0, treeTop - topPadding);
        var treeEndScroll = Math.max(minimumScroll, treeBottom - viewportHeight + bottomPadding);
        var maximumScroll = Math.max(0, scroller.scrollHeight - viewportHeight);
        var targetScroll = clamp(desiredScroll, minimumScroll, treeEndScroll);

        scroller.scrollTop = Math.round(clamp(targetScroll, 0, maximumScroll));
      }

      updatePath();
      revealActiveLink();
      window.addEventListener('load', function () {
        updatePath();
        revealActiveLink();
      }, { once: true });
      window.addEventListener('resize', updatePath, { passive: true });
    }

    function enhanceSearch() {
      var wrapper = document.getElementById('search-wrapper');
      var input = document.getElementById('search-input');
      var result = document.getElementById('search-result');
      if (!wrapper || !input || !result) {
        return;
      }

      var selectedIndex = -1;
      var decorateFrame = 0;

      function highlightTitle(title, query) {
        if (!title.dataset.rawTitle) {
          title.dataset.rawTitle = title.textContent || '';
        }
        if (title.dataset.highlightQuery === query) {
          return;
        }

        var rawTitle = title.dataset.rawTitle;
        title.dataset.highlightQuery = query;
        title.textContent = '';
        if (!query) {
          title.textContent = rawTitle;
          return;
        }

        var keywords = query.split(/\s+/).filter(Boolean).map(escapeRegExp);
        if (!keywords.length) {
          title.textContent = rawTitle;
          return;
        }

        var regex = new RegExp('(' + keywords.join('|') + ')', 'gi');
        rawTitle.split(regex).forEach(function (part) {
          if (part && regex.test(part)) {
            var mark = document.createElement('mark');
            mark.className = 'search-keyword';
            mark.textContent = part;
            title.appendChild(mark);
          } else if (part) {
            title.appendChild(document.createTextNode(part));
          }
          regex.lastIndex = 0;
        });
      }

      function decorateResults() {
        decorateFrame = 0;
        var query = input.value.trim().toLowerCase();
        var anchors = Array.prototype.slice.call(result.querySelectorAll('.search-result-list li a'));
        var count = String(anchors.length);
        if (!query) {
          result.removeAttribute('data-result-count');
        } else if (result.getAttribute('data-result-count') !== count) {
          result.setAttribute('data-result-count', count);
        }

        anchors.forEach(function (anchor, index) {
          var title = anchor.querySelector('.search-result-title');
          if (title) {
            highlightTitle(title, query);
          }
          anchor.classList.toggle('is-selected', index === selectedIndex);
        });

        if (selectedIndex >= anchors.length) {
          selectedIndex = anchors.length - 1;
        }
      }

      function scheduleDecorate() {
        if (!decorateFrame) {
          decorateFrame = window.requestAnimationFrame(decorateResults);
        }
      }

      new MutationObserver(scheduleDecorate).observe(result, {
        childList: true,
        subtree: true
      });

      input.addEventListener('input', function () {
        selectedIndex = -1;
        scheduleDecorate();
      });

      input.addEventListener('keydown', function (event) {
        var anchors = Array.prototype.slice.call(result.querySelectorAll('.search-result-list li a'));
        if (!anchors.length) {
          return;
        }

        if (event.key === 'ArrowDown') {
          event.preventDefault();
          selectedIndex = (selectedIndex + 1) % anchors.length;
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          selectedIndex = selectedIndex <= 0 ? anchors.length - 1 : selectedIndex - 1;
        } else if (event.key === 'Enter' && selectedIndex >= 0) {
          event.preventDefault();
          window.location.href = anchors[selectedIndex].href;
          return;
        } else {
          return;
        }

        anchors.forEach(function (anchor, index) {
          anchor.classList.toggle('is-selected', index === selectedIndex);
        });
        anchors[selectedIndex].scrollIntoView({ block: 'nearest' });
      });

      scheduleDecorate();
    }

    createThemeTransition();
    createReadingControl();
    enhanceHeadings();
    enhanceWikiTree();
    enhanceSearch();
  });
})();
