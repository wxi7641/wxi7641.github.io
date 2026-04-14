(function () {
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true })
    } else {
      fn()
    }
  }

  function normalize(value) {
    return String(value || '').trim().toLowerCase()
  }

  ready(function () {
    var page = document.querySelector('[data-module-page]')
    if (!page) return

    var input = document.getElementById('module-search-input')
    var meta = document.getElementById('module-search-meta')
    var treeLinks = Array.from(document.querySelectorAll('.module-tree-link'))
    var searchTargets = Array.from(document.querySelectorAll('[data-module-search-target]'))
    var groups = Array.from(document.querySelectorAll('[data-module-search-group]'))
    var toggles = Array.from(document.querySelectorAll('[data-module-tree-toggle]'))
    var mapAnchors = Array.from(document.querySelectorAll('.module-map-anchor[data-module-target]'))

    function setHidden(node, hidden) {
      node.classList.toggle('is-hidden', hidden)
    }

    function syncGroups() {
      groups.forEach(function (group) {
        var visibleChildren = Array.from(group.querySelectorAll('[data-module-search-target]')).filter(function (node) {
          return !node.classList.contains('is-hidden')
        })
        var emptyBlock = group.querySelector('.module-tree-empty, .module-topic-empty')
        var hasStaticContent = emptyBlock && !emptyBlock.classList.contains('is-hidden')
        setHidden(group, visibleChildren.length === 0 && !hasStaticContent)
      })
    }

    function updateMeta(query) {
      var visibleCount = treeLinks.filter(function (link) {
        return !link.classList.contains('is-hidden')
      }).length
      if (!meta) return
      if (!query) {
        meta.textContent = '输入关键词，实时筛选模块目录、快速开始和知识节点。'
        return
      }
      meta.textContent = '当前匹配 ' + visibleCount + ' 篇文章'
    }

    function filterAll(query) {
      var keyword = normalize(query)
      searchTargets.forEach(function (node) {
        var haystack = normalize(node.getAttribute('data-module-search-text'))
        setHidden(node, !!keyword && haystack.indexOf(keyword) === -1)
      })
      groups.forEach(function (group) {
        group.classList.remove('is-collapsed')
        var toggle = group.querySelector('[data-module-tree-toggle]')
        if (toggle) {
          toggle.setAttribute('aria-expanded', 'true')
        }
      })
      syncGroups()
      updateMeta(keyword)
    }

    if (input) {
      input.addEventListener('input', function (event) {
        filterAll(event.target.value)
      })
    }

    toggles.forEach(function (toggle) {
      toggle.addEventListener('click', function () {
        var group = toggle.closest('.module-tree-section')
        if (!group) return
        var collapsed = group.classList.toggle('is-collapsed')
        toggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true')
      })
    })

    mapAnchors.forEach(function (button) {
      button.addEventListener('click', function () {
        var target = button.getAttribute('data-module-target')
        if (!target) return
        var section = document.getElementById('module-section-' + target)
        if (!section) return
        section.scrollIntoView({ behavior: 'smooth', block: 'start' })
        section.classList.add('is-focused')
        window.setTimeout(function () {
          section.classList.remove('is-focused')
        }, 1400)
      })
    })

    filterAll('')
  })
})()
