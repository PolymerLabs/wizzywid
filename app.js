window.addEventListener('WebComponentsReady', function() {

  // Focus an element.
  viewContainer.addEventListener('click', function() {
    updateActiveElement(event.target);
  });

  document.addEventListener('update-code', function(event) {
    codeView.dump(viewContainer);
  }, true);

  Polymer.Gestures.addListener(viewContainer, 'track', trackElement);
});

function updateActiveElement(el) {
  if (el !== shell.activeElement) {
    shell.setActiveElement(el);
  }
  shell.refreshView();
}

function trackElement(event) {
  var el = event.target;
  if (el.id === 'viewContainer') {
    return;
  }
  var rekt = el.getBoundingClientRect();
  var shouldResize = dragShouldSize(event, rekt);

  if (shouldResize && !window._resizing) {
    window._resizing = true;
    window._initialWidth = rekt.width;
    window._initialHeight = rekt.height;
    el.classList.add('resizing');
    el.classList.add('active');
  }

  if (window._resizing) {
    resizeElement(event, el);
  } else {
    dragElement(event, el);
  }
}

function dragElement(event, el) {
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

        var slots = t.root ? t.root.querySelectorAll('slot') : [];
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
      var reparented = false;

      // Does this need to be added to a new parent?
      if (window._dropTarget) {
        reparented = true;

        var oldParent = el.parentElement;
        el.parentElement.removeChild(el);

        // If there was a textContent nuke it, or else you'll
        // never be able to again.
        if (window._dropTarget.children.length === 0) {
          window._dropTarget.textContent = '';
        }
        window._dropTarget.appendChild(el);
        window._dropTarget.classList.remove('over');
        shell.$.actionHistory.add('reparent', el, {newParent: window._dropTarget, oldParent: oldParent});
        window._dropTarget = null;
      } else if (el.parentElement && (el.parentElement !== viewContainer)) {
        // If there's no drop target and the el used to be in a different
        // parent, move it to the main view.
        shell.$.actionHistory.add('reparent', el, {newParent: viewContainer, oldParent: el.parentElement});
        el.parentElement.removeChild(el);
        viewContainer.appendChild(el);
      }
      var parent = el.parentElement.getBoundingClientRect();

      var oldLeft = el.style.left;
      var oldTop = el.style.top;
      var oldPosition = el.style.position;
      if (reparented) {
        el.style.position = 'static';
        el.style.left = el.style.top = '0px';
      } else {
        el.style.position = 'absolute';
        el.style.left = local.left - parent.left + 'px';
        el.style.top = local.top - parent.top + 'px';
      }

      shell.$.actionHistory.add('move', el,
          {newLeft: el.style.left, newTop: el.style.top, oldLeft: oldLeft, oldTop: oldTop,
          oldPosition:oldPosition, newPosition: el.style.position});
      el.classList.remove('dragging');
      el.style.transform = el.style.webkitTransform = 'none';
      break;
  }
  updateActiveElement(el);
  shell.refreshViewWhileTracking();
}

function resizeElement(event, el) {
  switch(event.detail.state) {
    case 'track':
      // Grid is 10.
      var trackX = Math.round(event.detail.dx / 10) * 10;
      var trackY = Math.round(event.detail.dy / 10) * 10;
      el.style.width = window._initialWidth + trackX + 'px';
      el.style.height = window._initialHeight + trackY + 'px';
      break;
    case 'end':
      window._resizing = false;
      shell.$.actionHistory.add('resize', el,
          {newWidth: el.style.width, newHeight: el.style.height,
           oldWidth: window._initialWidth + 'px', oldHeight: window._initialHeight + 'px'});
      el.classList.remove('resizing');
      break;
  }
  updateActiveElement(el);
}

function dragShouldSize(event, rect) {
  return (Math.abs(rect.right - event.detail.x) < 10) &&
    (Math.abs(rect.bottom - event.detail.y) < 10);
}

function getProtoProperties(target) {
  var proto = target.__proto__;
  var protoProps = {};
  while (proto.constructor.name !== 'Element') {
    Object.assign(protoProps, Object.getOwnPropertyDescriptors(proto));
    proto = proto.__proto__;
  }

  var propNames = Object.keys(protoProps).sort();

  // Skip some very specific Polymer/element properties.
  var blacklist = [
      // Polymer specific
      'isAttached',
      'constructor', 'created', 'ready', 'attached', 'detached',
      'attributeChanged', 'is', 'listeners', 'observers', 'properties',
      // Native elements ones we don't care about
      'validity', 'useMap', 'innerText', 'outerText', 'style', 'accessKey',
      'draggable', 'lang', 'spellcheck', 'tabIndex', 'translate', 'align', 'dir',
      // Spefic elements stuff
      'receivedFocusFromKeyboard', 'pointerDown', 'valueAsNumber',
      'selectionDirection', 'selectionStart', 'selectionEnd'
      ];

  var i = 0;
  while (i < propNames.length) {
    var name = propNames[i];

    // Skip everything that starts with a _ which is a Polymer private/protected
    // and you probably don't care about it.
    // Also anything in the blacklist. Or that starts with webkit.
    if (name.charAt(0) === '_' ||
        name === 'keyEventTarget' ||
        blacklist.indexOf(name) !== -1 ||
        name.indexOf('webkit') === 0 ||
        name.indexOf('on') === 0) {
      propNames.splice(i, 1);
      continue;
    }

    // Skip everything that doesn't have a setter.
    if (!protoProps[name].set) {
      propNames.splice(i, 1);
      continue;
    }
    i++;
  }
  return propNames;
}
