// TODO: ugh. refactor this.
window.aceEditor = ace.edit("editor");
window.aceEditor.setReadOnly(true);
window.aceEditor.setTheme("ace/theme/monokai");
window.aceEditor.getSession().setMode("ace/mode/html");
window.aceEditor.$blockScrolling = Infinity;
window.aceEditor.setOptions({fontSize: "14px"});

var grid = 10;
var nativeElementsWhitelist = ['div', 'input', 'button'];

window.addEventListener('WebComponentsReady', function() {
  shell.activeElement = viewContainer;
  recomputeTree();

  // Add a new element
  elementsContainer.addEventListener('click', addElement);

  // Focus an element
  viewContainer.addEventListener('click', function() {
    shell.updateActiveElement(event.target);
    displayElement();
  });

  document.addEventListener('element-updated', elementWasUpdated);
  Polymer.Gestures.addListener(viewContainer, 'track', trackElement);
});

function addElement(event) {
  var kind = event.target.textContent;
  if (event.target.tagName !== 'BUTTON') {
    return;
  }
  // TODO: use some kind of whitelist here
  if (nativeElementsWhitelist.indexOf(kind) === -1) {
    Polymer.Base.importHref(`bower_components/${kind}/${kind}.html`, function(e) {
      finishCreatingElement(kind);
    });
  } else {
    var el = finishCreatingElement(kind);
    if (kind === 'div') {
      el.style.height = el.style.width = '200px';
      el.style.backgroundColor = '#CDDC39';
    }
  }
}

function finishCreatingElement(kind) {
  var el = document.createElement(kind);
  viewContainer.appendChild(el);
  el.style.position = 'absolute';
  el.style.left = el.style.top = '20px';
  el.style.backgroundColor = 'white';
  el.textContent = kind;
  shell.updateActiveElement(el);
  recomputeTree();
  displayElement();
  return el;
}

function elementWasUpdated(event) {
  var detail = event.detail;
  shell.updateActiveElementValues(detail.type, detail.name, detail.value);
  recomputeTree();
}

function displayElement() {
  var el = shell.activeElement ? shell.activeElement : viewContainer;

  propertiesContainer.display(el);
  stylesContainer.display(window.getComputedStyle(el));
  flexContainer.display(window.getComputedStyle(el));

  // Find it in the tree.
  var nodes = recomputeTree();
  var buttons = treeContainer.querySelectorAll('button');
  if (buttons.length !== nodes.length) {
    return;
  }

  for (var i = 0; i < nodes.length; i++) {
    if (nodes[i].ref === el) {
      selectTreeElement(buttons[i]);
      return;
    }
  }
}

function recomputeTree() {
  var nodes = getChildren(viewContainer, 0);
  repeater.items = nodes;
  return nodes;
}

function getChildren(parent, level) {
  var isViewContainer = parent.id === 'viewContainer';
  var nodes = [
    { tag: isViewContainer ? 'main-app': parent.tagName.toLowerCase(),
      id: isViewContainer ? '' : (parent.id ? '#' + parent.id : ''),
      text: isViewContainer ? '' : '"' + parent.textContent + '"',
      level: level,
      ref: parent}
    ];
  for (var i = 0; i < parent.children.length; i++) {
    var child = parent.children[i];
    nodes = nodes.concat(getChildren(child, level + 1));
  }
  return nodes;
}

function findElement(event) {
  selectTreeElement(event.currentTarget);

  var index = event.currentTarget.dataset.index;
  var el = repeater.items[index].ref;
  shell.updateActiveElement(el);
  displayElement();
}

function selectTreeElement(element) {
  var previouslySelected = document.querySelector('.selected');
  if (previouslySelected) {
    previouslySelected.classList.remove('selected');
  }
  element.classList.add('selected');
}

function trackElement(event) {
  var el = event.target;
  if (el.id === 'viewContainer') {
    return;
  }
  switch(event.detail.state) {
    case 'start':
      el.style.position = 'absolute';
      el.classList.add('dragging');
      el.classList.add('active');
      break;
    case 'track':
      window._trackx = Math.round(event.detail.dx / grid) * grid;
      window._tracky = Math.round(event.detail.dy / grid) * grid;
      el.style.transform = el.style.webkitTransform =
        'translate(' + _trackx + 'px, ' + _tracky + 'px)';

      // See if it's over anything.
      window._dropTarget = null;
      var targets = viewContainer.children;
      var me = el.getBoundingClientRect();

      for (var i = 0; i < targets.length; i++) {
        var t = targets[i];
        t.classList.remove('over');
        var b = t.getBoundingClientRect();
        if (me.left > b.left && me.left < b.left + b.width &&
            me.top > b.top && me.top < b.top + b.height) {
          t.classList.add('over');
          window._dropTarget = t;
        }
      }
      break;
    case 'end':
      // Save the position before we might reparent the item.
      var local = el.getBoundingClientRect();

      // Does this need to be added to a new parent?
      if (window._dropTarget) {
        el.parentElement.removeChild(el);
        window._dropTarget.appendChild(el);
        window._dropTarget.classList.remove('over');
        window._dropTarget = null;
        recomputeTree();
      } else if (el.parentElement) {
        // If there's no drop target and the el used to be in a different
        // parent, move it to the main view.
        el.parentElement.removeChild(el);
        viewContainer.appendChild(el);
      }
      var parent = el.parentElement.getBoundingClientRect();
      el.style.left = local.left - parent.left + 'px';
      el.style.top = local.top - parent.top + 'px';

      el.classList.remove('dragging');
      el.style.transform = el.style.webkitTransform = 'none';
      break;
  }
  if (el !== shell.activeElement) {
    shell.updateActiveElement(el);
  }
  displayElement();
  var size = el.getBoundingClientRect();
  stylesContainer.display({top: size.top + 'px', left: size.left + 'px'});
}

function updateCode(code) {
  window.aceEditor.setValue(code);
  window.aceEditor.clearSelection();
}
