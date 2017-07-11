window.undoHistory = [];
window.redoHistory = [];

window.addEventListener('WebComponentsReady', function() {
  updateActiveElement(viewContainer.target);

  // Focus an element.
  viewContainer.addEventListener('click', function() {
    updateActiveElement(event.target);
  });

  // New/Delete/Edit an element.
  document.addEventListener('new-element', addNewElement);
  document.addEventListener('delete-element', displayElement);
  document.addEventListener('element-updated', elementWasUpdated);

  document.addEventListener('update-code', function(event) {
    codeView.dump(viewContainer);
  }, true);

  Polymer.Gestures.addListener(viewContainer, 'track', trackElement);
});

function updateHistory(action, node, type, name, newValue, oldValue) {
  // Don't try to add two identical items since that looks weird.
  // TODO: figure out why you get double actions sometimes.
  var item = {
    action: action,
    node: node,
    type: type,
    name: name,
    oldValue: oldValue,
    newValue: newValue
  };

  var topItem = undoHistory[undoHistory.length - 1];

  if (topItem && item.action === topItem.action &&
      item.type === topItem.type &&
      item.name === topItem.name &&
      item.oldValue === topItem.oldValue &&
      item.newValue === topItem.newValue) {
    console.log('choosing not to add a dupe');
    return;
  }

  undoHistory.push(item);
  // A new item in the undo stack means you have nothing to redo.
  redoHistory = [];
  updateButtons();
}

function updateButtons() {
  console.log('undo', undoHistory);
  console.log('redo', redoHistory);
  shell.updateUndoButton(undoHistory.length);
  shell.updateRedoButton(redoHistory.length);
}

function undoAction() {
  // Take the top action off the undo stack and move it to the redo stack.
  var item = undoHistory.pop();
  redoHistory.push(item);

  if (item.action === 'update') {
    shell.updateActiveElementValues(item.type, item.name, item.oldValue);
    displayElement();
    updateButtons();
  } else if (item.action === 'new') {
    // Delete the item.
    viewContainer.removeChild(item.node);
    updateActiveElement(viewContainer);
    updateButtons();
  }
}

function redoAction() {
  // Take the top action off the redo stack and move it to the undo stack.
  var item = redoHistory.pop();
  undoHistory.push(item);

  if (item.action === 'update') {
    shell.updateActiveElementValues(item.type, item.name, item.newValue);
    displayElement();
    updateButtons();
  } else if (item.action === 'new') {
    // Readd the item to the parent.
    viewContainer.appendChild(item.node);
    updateActiveElement(item.node);
    updateButtons();
  }
}

function addNewElement(event) {
  var el = event.detail.target;
  // Give it a unique ID.
  var tag = el.tagName.toLowerCase();
  var newId = makeUniqueId(el, tag.replace('-', '_'));
  el.id = newId;
  viewContainer.appendChild(el);
  // You need the item to render first.
  requestAnimationFrame(function() {
    el.click();
  });
  updateHistory('new', el);
}

function makeUniqueId(node, id, suffix) {
  var uId = id + (suffix || '');
  return viewContainer.querySelector('#' + uId) ?
    this.makeUniqueId(node, id, suffix ? ++suffix : 1) :
      uId;
}

function elementWasUpdated(event) {
  var detail = event.detail;
  var oldValue = shell.updateActiveElementValues(detail.type, detail.name, detail.value);
  treeView.recomputeTree(viewContainer, shell.activeElement);
  updateHistory('update', shell.activeElement, detail.type, detail.name, detail.value, oldValue);
}

function updateActiveElement(el) {
  if (el !== shell.activeElement) {
    shell.updateActiveElement(el);
  }
  displayElement();
}

function displayElement() {
  var el = shell.activeElement ? shell.activeElement : viewContainer;

  // Display its properties.
  propertiesContainer.display(el);
  stylesContainer.display(window.getComputedStyle(el));
  flexContainer.display(window.getComputedStyle(el));

  // Highlight it in the tree.
  treeView.recomputeTree(viewContainer, shell.activeElement);
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
      // Grid is 10.
      window._trackx = Math.round(event.detail.dx / 10) * 10;
      window._tracky = Math.round(event.detail.dy / 10) * 10;
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
  updateActiveElement(el);
  var size = el.getBoundingClientRect();
  stylesContainer.display({top: size.top + 'px', left: size.left + 'px'});
}
