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
    var input = document.getElementById('module-search-input')
    var meta = document.getElementById('module-search-meta')
    var searchTargets = Array.from(document.querySelectorAll('[data-module-search-target]'))
    var groups = Array.from(document.querySelectorAll('[data-module-search-group]'))
    var toggles = Array.from(document.querySelectorAll('[data-module-tree-toggle]'))

    function setHidden(node, hidden) {
      node.classList.toggle('is-hidden', hidden)
    }

    function updateMeta(query) {
      if (!meta) return
      var visibleCount = searchTargets.filter(function (node) {
        return !node.classList.contains('is-hidden')
      }).length

      if (!query) {
        meta.textContent = '输入关键词，实时筛选模块目录和快速开始。'
        return
      }

      meta.textContent = '当前匹配 ' + visibleCount + ' 条结果。'
    }

    function syncGroups() {
      groups.forEach(function (group) {
        var visibleChildren = Array.from(group.querySelectorAll('[data-module-search-target]')).filter(function (node) {
          return !node.classList.contains('is-hidden')
        })
        setHidden(group, visibleChildren.length === 0)
      })
    }

    function filterAll(query) {
      var keyword = normalize(query)
      searchTargets.forEach(function (node) {
        var haystack = normalize(node.getAttribute('data-module-search-text'))
        setHidden(node, !!keyword && haystack.indexOf(keyword) === -1)
      })

      if (keyword) {
        groups.forEach(function (group) {
          if (group.classList.contains('module-tree-section')) {
            group.classList.add('is-expanded')
            var toggle = group.querySelector('[data-module-tree-toggle]')
            if (toggle) {
              toggle.setAttribute('aria-expanded', 'true')
            }
          }
        })
      }

      syncGroups()
      updateMeta(keyword)
    }

    toggles.forEach(function (toggle) {
      toggle.addEventListener('click', function () {
        var group = toggle.closest('.module-tree-section')
        if (!group) return
        var expanded = group.classList.toggle('is-expanded')
        toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false')
      })
    })

    if (input) {
      input.addEventListener('input', function (event) {
        filterAll(event.target.value)
      })
    }

    filterAll('')
  })
})()
