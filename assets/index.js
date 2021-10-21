const CONTENT_PREFIX = '/contents/'

var dirtree, currentNode

window.onload = () => {
  const req = new XMLHttpRequest()
  req.open('GET', '/assets/dirtree.json', true) // tree -fhJ --noreport --dirsfirst --sort=name -o dirtree.json
  req.onload = (event) => {
    dirtree = JSON.parse(event.target.response)[0]
    router()
  }
  req.send()
  document.getElementById('body').onclick = actionClick
  document.getElementById('search-input').oninput = searchInput
  window.onpopstate = router
  window.onkeydown = keyboardShortcut
}

const router = () => {
  if (history.state) {
    var { action, path } = (JSON.parse(history.state) || {})
  } else {
    var [ , action, path ] = /\/(\w+)?\/?(.+)?/.exec(decodeURI(location.pathname))
  }
  switch (action) {
    case undefined:
      goto('browse', '.')
      break
    case 'browse':
      browse(findNode(path ? (history.state ? path : ('./' + path)) : '.', dirtree))
      break
    case 'get':
    case 'search':
        goto(action, path)
      break
    default:
      err404()
      break
  }
}

const goto = (action, path) => {
  switch (action) {
    case 'browse':
      history.pushState(JSON.stringify({action: action, path: path}), null, '/'+action+'/'+path)
      router()
      break
    case 'get':
      let a = document.createElement('a')
      a.href = CONTENT_PREFIX + path
      a.click()
      break
    case 'search':
      history.pushState(JSON.stringify({action: action, path: path}), null, '/'+action+'/'+path)
      search(path)
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

const item = (node, fullPath) => {
  let name = decode(node.name)
  let action = (node.type === 'directory' ? 'browse' : 'get')
  let itemWrapper = document.createElement('div')
  itemWrapper.classList.add('item-wrapper')

  let iconItem = document.createElement('i')
  iconItem.classList.add('item', 'item-icon', 'fas', 'fa-fw', node.type === 'directory' ? 'fa-folder' : 'fa-file', 'text-small', 'text-muted')
  iconItem.setAttribute('data-type', node.type)
  iconItem.setAttribute('data-action', action)
  iconItem.setAttribute('data-name', name)
  itemWrapper.appendChild(iconItem)

  let nameItem = document.createElement('a')
  nameItem.classList.add('item', 'item-name')
  nameItem.href = '/' + action + '/' + name
  nameItem.setAttribute('data-action', action)
  nameItem.setAttribute('data-name', name)
  nameItem.innerHTML = fullPath ? name : name.split('/').pop()
  itemWrapper.appendChild(nameItem)

  let sizeItem = document.createElement('span')
  sizeItem.classList.add('item', 'item-size', 'item-right', 'text-small', 'text-muted')
  sizeItem.setAttribute('data-size', node.size)
  sizeItem.setAttribute('data-action', action)
  sizeItem.setAttribute('data-name', name)
  sizeItem.innerHTML = node.type === 'file' ? humanFileSize(node.size) : '&nbsp;'
  itemWrapper.appendChild(sizeItem)

  let modifiedItem = document.createElement('span')
  modifiedItem.classList.add('item', 'item-modified', 'item-right', 'text-small', 'text-muted')
  modifiedItem.setAttribute('data-time', node.time)
  modifiedItem.setAttribute('data-action', action)
  modifiedItem.setAttribute('data-name', name)
  modifiedItem.innerHTML = new Date(node.time*1000).toLocaleString()
  itemWrapper.appendChild(modifiedItem)

  let listing = document.getElementById('listing')
  listing.appendChild(itemWrapper)
}

const breadcrumbs = (name, search) => {
  let crumbs = []
  let names = decode(search ? (currentNode || dirtree).name : name).split('/')
  let max = names.length
  for (let i = 0; i < max; i++) {
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
    let query = document.createElement('span')
    query.innerHTML = name
    query.classList.add('breadcrumb')
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
    for (i = 0; i < contents.length; i ++) {
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
  document.searchTimeout = setTimeout(() => goto('search', event.target.value), 500)
}

const search = (input = '') => {
  if (input.length > 2) {
    let results = searchNodes(input, currentNode || dirtree)
    listSearch(input, results)
  } else {
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
  for (i = 0; i < contents.length; i ++) {
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
const humanFileSize = (bytes, si=false, dp=1) => {
  const thresh = si ? 1000 : 1024;
  if (Math.abs(bytes) < thresh) {
    return bytes + ' B';
  }
  const units = si 
    ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] 
    : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
  let u = -1;
  const r = 10**dp;
  do {
    bytes /= thresh;
    ++u;
  } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);
  return bytes.toFixed(dp) + ' ' + units[u];
}

const keyboardShortcut = (event) => {
  console.log(event.code, document.activeElement)
  switch (event.code) {
    case 'Backspace':
      if (!document.activeElement || document.activeElement.id !== 'search-input') {
        let crumb = [...document.getElementsByClassName('breadcrumb')].slice(-2, -1)[0]
        crumb && crumb.click()
        event.preventDefault()
      }
      break
    case 'ArrowUp':
      if (!document.activeElement || !document.activeElement.classList.contains('item-name')) {
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
      if (!document.activeElement || !document.activeElement.classList.contains('item-name')) {
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
    case 'Slash':
      if (!document.activeElement || document.activeElement.id !== 'search-input') {
        document.getElementById('search-input').focus()
        document.getElementById('search-input').select()
        event.preventDefault()
      }
      break      
  }
}

const treeSort = (a, b) => {
  let { by, order } = (document.sortOptions || { by: 'name', order: 1 })
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
  return  ret * order
}

const err404 = () => {
  console.error('err404')
}

