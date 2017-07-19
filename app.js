window.addEventListener('WebComponentsReady', function() {
  document.addEventListener('update-code', function(event) {
    codeView.dump(event.detail.target);
  }, true);
});

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
