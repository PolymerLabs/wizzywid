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
  document.addEventListener('delete-element', deleteElement);
  document.addEventListener('element-updated', elementWasUpdated);

  document.addEventListener('update-code', function(event) {
    codeView.dump(viewContainer);
  }, true);

  Polymer.Gestures.addListener(viewContainer, 'track', trackElement);
});

function updateHistory(action, node, detail) {
  // Don't try to add two identical items since that looks weird.
  // TODO: figure out why you get double actions sometimes.
  var item = {
    action: action,
    node: node,
    detail: detail
  };

  var topItem = undoHistory[undoHistory.length - 1];

  if (topItem && item.action === topItem.action &&
      JSON.stringify(item.detail) === JSON.stringify(topItem.detail)) {
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
  var detail = item.detail;
  redoHistory.push(item);
  updateButtons();

  switch(item.action) {
    case 'update':
        shell.updateActiveElementValues(detail.type, detail.name, detail.oldValue);
        displayElement();
        break;
    case 'new':
        viewContainer.removeChild(item.node);
        updateActiveElement(viewContainer);
        break;
    case 'delete':
        // If the node is the viewContainer, the `type` property contains the old innerHTML
        if (item.node.id === 'viewContainer') {
          item.node.innerHTML = detail.innerHTML;
        } else {
          // The `type` property contains the original parent.
          detail.parent.appendChild(item.node);
        }
        updateActiveElement(item.node);
        break;
    case 'move':
        item.node.style.left = detail.oldLeft;
        item.node.style.top = detail.oldTop;
        updateActiveElement(item.node);
        break;
    case 'reparent':
        detail.newParent.removeChild(item.node);
        detail.oldParent.appendChild(item.node);
        updateActiveElement(item.node);
        break;
  }
}

function redoAction() {
  // Take the top action off the redo stack and move it to the undo stack.
  var item = redoHistory.pop();
  var detail = item.detail;
  undoHistory.push(item);
  updateButtons();

  switch(item.action) {
    case 'update':
        updateActiveElement(item.node);
        shell.updateActiveElementValues(detail.type, detail.name, detail.newValue);
        updateActiveElement(item.node);
        break;
    case 'new':
        viewContainer.appendChild(item.node);
        updateActiveElement(item.node);
        break;
    case 'delete':
        // If the node is the viewContainer, clear its inner HTML.
        if (item.node.id === 'viewContainer') {
          item.node.innerHTML = '';
          updateActiveElement(viewContainer);
        } else {
          updateActiveElement(item.node.parentElement);
          item.node.parentElement.removeChild(item.node);
        }
        break;
    case 'move':
        item.node.style.left = detail.newLeft;
        item.node.style.top = detail.newTop;
        updateActiveElement(item.node);
        break;
    case 'reparent':
        detail.oldParent.removeChild(item.node);
        detail.newParent.appendChild(item.node);
        updateActiveElement(item.node);
        break;
  }
}

function addNewElement(event) {
  var tag = event.detail.type.toLowerCase();
  var el = document.createElement(tag);
  el.style.position = 'absolute';
  el.style.left = el.style.top = '20px';

  // Give it a unique ID.
  var newId = makeUniqueId(el, tag.replace('-', '_'));
  el.id = newId;
  viewContainer.appendChild(el);

  // TODO: what should happen with named slots?
  var slots = el.root ? el.root.querySelectorAll('slot:not([name])') : [];
  // TODO: fix this and make it less this and more something else.
  if (tag === 'div') {
    el.style.height = el.style.width = '200px';
    el.style.backgroundColor = '#CDDC39';
    el.textContent = 'div';
  } else if (tag === 'input') {
    el.placeholder = 'input';
  } else if (tag === 'button' || slots.length != 0) {
    el.textContent = tag;
  }

  // You need the item to render first.
  requestAnimationFrame(function() {
    el.click();
  });
  updateHistory('new', el);
}

function deleteElement(event) {
  var el = event.detail.target;

  // Deleting the whole app should remove the children I guess.
  if (el.id === 'viewContainer') {
    updateHistory('delete', el, {innerHtml: el.innerHTML});
    el.innerHTML = '';
    updateActiveElement(el);
  } else {
    var parent = el.parentElement
    parent.removeChild(el);
    updateActiveElement(parent);
    updateHistory('delete', el, {parent: parent});
  }
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
  updateHistory('update', shell.activeElement,
      {type: detail.type, name: detail.name, newValue: detail.value, oldValue: oldValue});
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

        var slots = t.root ? t.root.querySelectorAll('slot:not([name])') : [];
        var canDrop = t.tagName === 'DIV' || t.tagName === 'BUTTON' || slots.length !== 0;
        var b = t.getBoundingClientRect();
        if (canDrop &&
            me.left > b.left && me.left < b.left + b.width &&
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
        var oldParent = el.parentElement;
        el.parentElement.removeChild(el);
        window._dropTarget.appendChild(el);
        window._dropTarget.classList.remove('over');
        updateHistory('reparent', el, {newParent: window._dropTarget, oldParent: oldParent});
        window._dropTarget = null;
      } else if (el.parentElement) {
        // If there's no drop target and the el used to be in a different
        // parent, move it to the main view.
        updateHistory('reparent', el, {newParent: viewContainer, oldParent: el.parentElement});
        el.parentElement.removeChild(el);
        viewContainer.appendChild(el);
      }
      var parent = el.parentElement.getBoundingClientRect();

      var oldLeft = el.style.left;
      var oldTop = el.style.top;
      el.style.left = local.left - parent.left + 'px';
      el.style.top = local.top - parent.top + 'px';
      updateHistory('move', el,
          {newLeft: el.style.left, newTop: el.style.top, oldLeft: oldLeft, oldTop: oldTop});

      el.classList.remove('dragging');
      el.style.transform = el.style.webkitTransform = 'none';
      break;
  }
  updateActiveElement(el);
  var size = el.getBoundingClientRect();
  stylesContainer.display({top: size.top + 'px', left: size.left + 'px'});
}
