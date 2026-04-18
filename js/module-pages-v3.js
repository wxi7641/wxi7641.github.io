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

    function setHidden(node, hidden) {
      node.classList.toggle('is-hidden', hidden)
    }

    function updateMeta(query) {
      if (!meta) return

      var visibleCount = searchTargets.filter(function (node) {
        return !node.classList.contains('is-hidden')
      }).length

      if (!query) {
        meta.textContent = '输入关键词，实时筛选专题目录。'
        return
      }

      meta.textContent = '当前匹配 ' + visibleCount + ' 篇文章。'
    }

    function filterAll(query) {
      var keyword = normalize(query)
      searchTargets.forEach(function (node) {
        var haystack = normalize(node.getAttribute('data-module-search-text'))
        setHidden(node, !!keyword && haystack.indexOf(keyword) === -1)
      })
      updateMeta(keyword)
    }

    if (input) {
      input.addEventListener('input', function (event) {
        filterAll(event.target.value)
      })
    }

    filterAll('')
  })
})()
