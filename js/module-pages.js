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
    var mapDetail = document.getElementById('module-map-detail')
    var mapDetailTitle = mapDetail ? mapDetail.querySelector('.module-map-detail__title') : null
    var mapDetailDesc = mapDetail ? mapDetail.querySelector('.module-map-detail__desc') : null
    var mapDetailLinks = document.getElementById('module-map-detail-links')
    var mapDetailAction = document.getElementById('module-map-detail-action')

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
        var node = button.closest('.module-map-node')
        var title = button.querySelector('.module-map-anchor__title')
        var desc = button.querySelector('.module-map-anchor__desc')
        var links = node ? Array.from(node.querySelectorAll('.module-map-links a')) : []

        if (mapDetailTitle) {
          mapDetailTitle.textContent = title ? title.textContent : '知识节点'
        }
        if (mapDetailDesc) {
          mapDetailDesc.textContent = desc ? desc.textContent : '这个节点下暂时还没有补充说明。'
        }
        if (mapDetailLinks) {
          mapDetailLinks.innerHTML = ''
          if (links.length > 0) {
            links.forEach(function (link) {
              var clone = link.cloneNode(true)
              mapDetailLinks.appendChild(clone)
            })
          } else {
            var empty = document.createElement('p')
            empty.className = 'module-map-detail__desc'
            empty.textContent = '这个节点还没有挂接具体文章，后面会继续补。'
            mapDetailLinks.appendChild(empty)
          }
        }

        if (mapDetailAction) {
          if (target) {
            mapDetailAction.classList.remove('is-hidden')
            mapDetailAction.setAttribute('href', '#module-section-' + target)
            mapDetailAction.onclick = function () {
              var section = document.getElementById('module-section-' + target)
              if (!section) return
              section.scrollIntoView({ behavior: 'smooth', block: 'start' })
              section.classList.add('is-focused')
              window.setTimeout(function () {
                section.classList.remove('is-focused')
              }, 1400)
            }
          } else {
            mapDetailAction.classList.add('is-hidden')
            mapDetailAction.removeAttribute('href')
            mapDetailAction.onclick = null
          }
        }
      })
    })

    filterAll('')
  })
})()
