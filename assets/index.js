const CONTENT_PREFIX = '/contents/'
var dirtree, currentNode
var sortOptions = { by: 'name', order: 1, si: false }

window.onload = () => {
  const req = new XMLHttpRequest()
  req.open('GET', '/assets/dirtree.json?'+Date.now, true) // tree -fsDJ --timefmt=%s --noreport -o ../assets/dirtree.json
  req.onload = (event) => {
    dirtree = JSON.parse(event.target.response)[0]
    router()
  }
  req.send()
  document.getElementById('body').onclick = actionClick
  document.getElementById('search-input').oninput = searchInput
  document.getElementById('search-input').onsubmit = searchInput
  document.getElementById('search-do').onclick = () => search((currentNode || dirtree).name, document.getElementById('search-input').value)
  document.getElementById('sort-select').onchange = sortSelect
  document.getElementById('sort-order').onclick = sortOrder
  document.getElementById('keyboard-show').onclick = () => keyboard()
  document.getElementById('keyboard-close').onclick = () => keyboard(false)
  window.onpopstate = router
  window.onkeydown = keyboardShortcut
}

const router = () => {
  if (history.state) {
    var { action, path, query } = (JSON.parse(history.state) || {})
  } else {
    var [, action, path] = /\/(\w+)?\/?(.+)?/.exec(decodeURI(location.pathname))
    var query = decodeURI(location.search.substring(location.search.indexOf('=')+1))
  }
  path = path ? (history.state ? path : ('./' + path)) : '.'
  switch (action) {
    case undefined:
      goto('browse', '.')
      break
    case 'browse':
      browse(findNode(path, dirtree))
      break
    case 'get':
      goto('get', path)
      break
    case 'search':
      goto('browse', path)
      document.getElementById('search-input').value = query
      goto('search', path, query)
      break
    case '404':
      goto(action)
      break
    default:
      err404()
      break
  }
}

const goto = (action, path, query) => {
  switch (action) {
    case 'browse':
      history.pushState(JSON.stringify({ action: action, path: path }), null, '/browse/' + path)
      router()
      break
    case 'get':
      let a = document.createElement('a')
      a.href = CONTENT_PREFIX + path
      a.click()
      break
    case 'search':
      history.pushState(JSON.stringify({ action: action, path: path, query: query }), null, '/search/' + path + '?query=' + query)
      search(path, query)
      break
  }
}

const browse = (tree) => {
  currentNode = tree
  if (!tree.contents) {
    goto('browse', '.')
  } else {
    breadcrumbs(tree.name)
    let listing = document.getElementById('listing')
    listing.innerHTML = null
    tree.contents.slice().sort(treeSort).forEach(node => {
      item(node)
    })
  }
}

const item = (node, search) => {
  let name = decode(node.name)
  let action = (node.type === 'directory' ? 'browse' : 'get')
  let itemWrapper = document.createElement('div')
  itemWrapper.classList.add('item-wrapper')

  let iconItem = document.createElement('i')
  let icon
  if (node.type === 'directory') {
    icon = 'fa-folder'
  } else {
    let ext = (name.includes('.') && name.split('.').pop())
    if (!ext) {
      icon = 'fa-folder'
    } else {
      for (let kind in extensions) {
        if (extensions[kind].includes(ext)) {
          icon = kind
          break
        }
      }
      !icon && (icon = 'fa-file')
    }
  }
  iconItem.classList.add('item', 'item-icon', 'fas', 'fa-fw', icon, 'text-small', 'text-muted')
  iconItem.setAttribute('data-type', node.type)
  iconItem.setAttribute('data-action', action)
  iconItem.setAttribute('data-name', name)
  itemWrapper.appendChild(iconItem)

  let nameItem = document.createElement('a')
  nameItem.classList.add('item', 'item-name')
  nameItem.href = '/' + action + '/' + name
  nameItem.setAttribute('data-action', action)
  nameItem.setAttribute('data-name', name)
  if (search) {
    let folders = name.split(/\.?\//)
    folders.shift()
    let spans = []
    let max = folders.length
    for (let i = 0; i < max; i++) {
      let span = document.createElement('span')
      span.innerHTML = folders.shift()
      spans.push(span)
      if (folders.length) {
        let ifa = document.createElement('i')
        ifa.classList.add('fas', 'fa-fw', 'fa-chevron-right', 'text-small', 'text-muted')
        spans.push(ifa)
      }
    }
    spans.forEach(s => nameItem.appendChild(s))
  } else {
    nameItem.innerHTML = name.split('/').pop()
  }
  itemWrapper.appendChild(nameItem)

  let sizeItem = document.createElement('span')
  sizeItem.classList.add('item', 'item-size', 'item-right', 'text-small', 'text-muted')
  sizeItem.setAttribute('data-size', node.size)
  sizeItem.setAttribute('data-action', action)
  sizeItem.setAttribute('data-name', name)
  sizeItem.innerHTML = (node.type === 'file' ? humanFileSize(node.size) : '&nbsp;')
  itemWrapper.appendChild(sizeItem)

  let modifiedItem = document.createElement('span')
  modifiedItem.classList.add('item', 'item-modified', 'item-right', 'text-small', 'text-muted')
  modifiedItem.setAttribute('data-time', node.time)
  modifiedItem.setAttribute('data-action', action)
  modifiedItem.setAttribute('data-name', name)
  modifiedItem.innerHTML = humanFileDate(node.time * 1000)
  itemWrapper.appendChild(modifiedItem)

  let listing = document.getElementById('listing')
  listing.appendChild(itemWrapper)
}

const breadcrumbs = (name, search) => {
  let crumbs = []
  let names = decode(search ? (currentNode || dirtree).name : name).split('/')
  let max = names.length
  for (let i = 0; i < max; i++) {
    if ((names.length && !search) || (names.length < max)) {
      let chevron = document.createElement('i')
      chevron.classList.add('chevron', 'fas', 'fa-fw', 'fa-chevron-right', 'text-small', 'text-muted')
      crumbs.unshift(chevron)
    }
    let a = document.createElement('a')
    let path = names.join('/')
    let action = 'browse'
    let lastName = names.pop()
    a.innerHTML = lastName === '.' ? null : lastName
    a.href = ('/' + action + '/' + path)
    a.setAttribute('data-action', action)
    a.setAttribute('data-name', path)
    a.classList.add('breadcrumb')
    if (lastName === '.') {
      a.classList.add('fas', 'fa-home')
    }
    crumbs.unshift(a)
  }
  if (search) {
    let glass = document.createElement('i')
    glass.classList.add('chevron', 'fas', 'fa-fw', 'fa-search', 'text-small', 'text-muted')
    crumbs.push(glass)
    let query = document.createElement('span')
    query.innerHTML = name
    query.classList.add('breadcrumb', 'nocrumb')
    crumbs.push(query)
  }
  let container = document.getElementById('breadcrumbs')
  container.innerHTML = null
  crumbs.forEach(c => container.appendChild(c))
}

const findNode = (name, current) => {
  let i, currentChild, result
  if (current.name === name) {
    return current;
  } else {
    let contents = (current.contents || [])
    for (i = 0; i < contents.length; i++) {
      currentChild = contents[i];
      result = findNode(name, currentChild);
      if (result !== false) {
        return result;
      }
    }
    return false;
  }
}

const searchInput = (event) => {
  clearTimeout(document.searchTimeout)
  document.searchTimeout = setTimeout(() => goto('search', (currentNode || dirtree).name, event.target.value), 500)
}

const search = (path, query = '') => {
  if (query.length > 2) {
    if (currentNode && (path !== currentNode.name)) {
      var searchNode = findNode(path, dirtree)
    }
    let results = searchNodes(query, searchNode || currentNode || dirtree)
    listSearch(query, results)
  } else if (query.length === 0) {
    goto('browse', '.')
  }
}

const searchNodes = (name, current) => {
  let res = []
  let i, currentChild, result
  if (current.name.split('/').pop().toLowerCase().includes(name.toLowerCase())) {
    res.push(current)
  }
  let contents = (current.contents || [])
  for (i = 0; i < contents.length; i++) {
    currentChild = contents[i];
    let results = searchNodes(name, currentChild);
    res.push(...results);
  }
  return res;
}

const listSearch = (input, data) => {
  breadcrumbs(input, true)
  let listing = document.getElementById('listing')
  listing.innerHTML = null
  data.slice().sort(treeSort).forEach(node => item(node, true))
}

const decode = (input) => {
  let doc = new DOMParser().parseFromString(input, 'text/html');
  return doc.documentElement.textContent;
}

const actionClick = (event) => {
  if (!event.ctrlKey) {
    let element = event.target
    while (element && (element.tagName.toLowerCase() !== 'a')) {
      element = element.parentElement
    }
    if (element && element.matches('[data-action]')) {
      event.preventDefault();
      goto(element.dataset.action, element.dataset.name);
    }
  }
}

/**
 * Format bytes as human-readable text.
 * 
 * @param bytes Number of bytes.
 * @param si True to use metric (SI) units, aka powers of 1000. False to use 
 *           binary (IEC), aka powers of 1024.
 * @param dp Number of decimal places to display.
 * 
 * @return Formatted string.
 */
const humanFileSize = (bytes, si = sortOptions.si, dp = 1) => {
  const thresh = si ? 1000 : 1024;
  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }
  const units = si
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  const r = 10 ** dp;
  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);
  return bytes.toFixed(dp) + ' ' + units[u];
}

const humanFileDate = (time) => {
  let now = new Date()
  let then = new Date(time)
  let toyear = (then.getFullYear() === now.getFullYear())
  let today = (toyear && (then.getMonth() === now.getMonth()) && (then.getDate() === now.getDate()))
  let options = {}
  if (!toyear) {
    options.year = 'numeric'
  }
  if (!today) {
    options.month = 'short'
    options.day = 'numeric'
  } else {
    options.hour = 'numeric'
    options.minute = '2-digit'
    options.second = '2-digit'
  }
  return then.toLocaleDateString(navigator.language, options)
}

const keyboardShortcut = (event) => {
  if (!event.ctrlKey) {
    switch (event.code) {
      case 'Backspace':
        if (document.activeElement.id !== 'search-input') {
          let crumb = [...document.getElementsByClassName('breadcrumb')].slice(-2, -1)[0]
          crumb && crumb.click()
          event.preventDefault()
        }
        break
      case 'ArrowUp':
        if (!document.activeElement.classList.contains('item-name')) {
          let last = [...document.getElementsByClassName('item-name')].pop()
          last && last.focus()
        } else {
          let sibling = document.activeElement.parentElement.previousElementSibling
          while (sibling && !sibling.childNodes[1].classList.contains('item-name')) {
            sibling = sibling.previousElementSibling
          }
          sibling && sibling.childNodes[1].focus()
        }
        event.preventDefault()
        break
      case 'ArrowDown':
        if (!document.activeElement.classList.contains('item-name')) {
          let first = [...document.getElementsByClassName('item-name')].shift()
          first && first.focus()
        } else {
          let sibling = document.activeElement.parentElement.nextElementSibling
          while (sibling && !sibling.childNodes[1].classList.contains('item-name')) {
            sibling = sibling.nextElementSibling
          }
          sibling && sibling.childNodes[1].focus()
        }
        event.preventDefault()
        break
      case 'ArrowLeft':
        if (document.activeElement.id !== 'search-input') {
          if (!document.activeElement.classList.contains('breadcrumb')) {
            let last = [...document.getElementsByClassName('breadcrumb')].filter(e => !e.classList.contains('nocrumb')).pop()
            last && last.focus()
          } else {
            let sibling = document.activeElement.previousElementSibling
            while (sibling && !sibling.classList.contains('breadcrumb')) {
              sibling = sibling.previousElementSibling
            }
            sibling && sibling.focus()
          }
          event.preventDefault()
        }
        break
      case 'ArrowRight':
        if (document.activeElement.id !== 'search-input') {
          if (!document.activeElement.classList.contains('breadcrumb')) {
            let first = [...document.getElementsByClassName('breadcrumb')].filter(e => !e.classList.contains('nocrumb')).shift()
            first && first.focus()
          } else {
            let sibling = document.activeElement.nextElementSibling
            while (sibling && !sibling.classList.contains('breadcrumb')) {
              sibling = sibling.nextElementSibling
            }
            sibling && sibling.focus()
          }
          event.preventDefault()
        }
        break
      case 'Slash':
        if (document.activeElement.id !== 'search-input') {
          if (event.shiftKey) {
            search((currentNode || dirtree).name, document.getElementById('search-input').value)
          } else {
            document.getElementById('search-input').focus()
            document.getElementById('search-input').select()
            event.preventDefault()
          }
        }
        break
      case 'KeyN':
      case 'KeyE':
      case 'KeyS':
      case 'KeyM':
        if (document.activeElement.id !== 'search-input') {
          document.getElementById('sort-select').value = sortByKey[event.code]
          sortSelect(sortByKey[event.code])
        }
        break
      case 'KeyR':
        if (document.activeElement.id !== 'search-input') {
          sortOrder()
        }
        break
      case 'KeyK':
        if (document.activeElement.id !== 'search-input') {
          keyboard()
        }
        break
      case 'Enter':
      case 'NumpadEnter':
        if (document.activeElement.id === 'search-input') {
          search((currentNode || dirtree).name, document.getElementById('search-input').value)
        }
        break
      case 'Escape':
        document.activeElement.blur()
        keyboard(false)
        break
      case 'KeyU':
        if (document.activeElement.id !== 'search-input') {
          sortOptions.si = !sortOptions.si
          router()
        }
        break
    }
  }
}

const treeSort = (a, b) => {
  let { by, order } = sortOptions
  if (a.type === 'directory' && b.type === 'directory') {
    ret = a.name.localeCompare(b.name)
  } else {
    ret = (a.type === 'directory' ? -1 : (b.type === 'directory' ? 1 : 0))
  }
  if (!ret) switch (by) {
    case undefined:
      ret = 0
      break
    case 'name':
      ret = a.name.localeCompare(b.name)
      break
    case 'extension':
      let exta = (a.name.includes('.') && a.name.split('.').pop()) || ''
      let extb = (b.name.includes('.') && b.name.split('.').pop()) || ''
      ret = exta.localeCompare(extb)
      break
    case 'size':
      ret = (a.size > b.size ? 1 : (a.size < b.size ? -1 : 0))
      break
    case 'modified':
      ret = (a.time > b.time ? 1 : (a.time < b.time ? -1 : 0))
      break
  }
  return ret * order
}

const sortSelect = (event) => {
  sortOptions.by = (event.target ? event.target.value : event)
  sortIcon()
  router()
}

const sortOrder = () => {
  sortOptions.order = -sortOptions.order
  sortIcon()
  router()
}

const sortIcon = () => {
  let ifa = document.getElementById('sort-order')
  ifa.className = ''
  let icon
  if (sortOptions.order === 1) {
    switch (sortOptions.by) {
      case 'name':
      case 'extension':
        icon = 'fa-sort-alpha-down'
        break
      case 'size':
        icon = 'fa-sort-amount-down-alt'
        break
      case 'modified':
        icon = 'fa-sort-numeric-down'
        break;
    }
  } else {
    switch (sortOptions.by) {
      case 'name':
      case 'extension':
        icon = 'fa-sort-alpha-up-alt'
        break
      case 'size':
        icon = 'fa-sort-amount-up'
        break
      case 'modified':
        icon = 'fa-sort-numeric-up-alt'
        break;
    }
  }
  ifa.classList.add('fas', 'fa-fw', icon)
}

const err404 = () => {
  console.error('err404')
}

const keyboard = (show = true) => {
  if (show) {
    document.getElementById('keyboard-container').style.display = 'block'
  } else {
    document.getElementById('keyboard-container').style.display = 'none'
  }
}

const extensions = {
  'fa-file-audio': ['mp3', 'flac', 'wav'],
  'fa-file-video': ['avi', 'mp4', 'mkv'],
  'fa-file-image': ['gif', 'jpg', 'png', 'bmp'],
  'fa-file-pdf': ['pdf'],
  'fa-file-code': ['xml', 'java', 'js', 'html', 'c', 'cpp', 'css'],
  'fa-file-archive': ['zip', 'rar', '7zip', '7z', 'tar', 'gz', 'tgz']
}

const sortByKey = {
  KeyN: 'name',
  KeyE: 'extension',
  KeyS: 'size',
  KeyM: 'modified'
}