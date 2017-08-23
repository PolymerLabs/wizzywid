/*
@license
Copyright (c) 2017 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

window.addEventListener('WebComponentsReady', function() {
  window.addEventListener('hashchange', retheme);
  retheme();

  document.addEventListener('update-code', function(event) {
    codeView.dump(event.detail.target);
  }, true);
});

function retheme()  {
  if (window.location.hash === '#tufte' || window.location.search === '?tufte') {
    window.shell.updateStyles({
      '--canvas-background': '#f35970',
      '--help-color': 'white',
      '--almost-black': '#594a7d',
      '--dark-grey': '#f15195',
      '--medium-grey': '#62bff7',
      '--light-grey': '#594a7d',
      '--highlight-pink': '#f5e566',
      '--highlight-blue': '#f5e566',
      '--input-border-color': '#f5e566'
    });
  } else {
    window.shell.updateStyles({
      '--canvas-background': 'white',
      '--help-color': 'black',
      '--almost-black': '#141720',
      '--dark-grey': '#232733',
      '--medium-grey': '#2f3545',
      '--light-grey': '#383f52',
      '--highlight-pink': '#e91e63',
      '--highlight-blue': '#2196f3',
      '--input-border-color': '#596c7a'
    });
  }
}
function getProtoProperties(target) {
  // If this is a custom element, you need to go up the prototype
  // chain until you get proper HTMLElement, since everything under it
  // is generated prototypes and will have propeties that are dupes (like:
  // every observedAttribute is also mirrored as a property)
  const isCustomElement = target.tagName.indexOf('-') !== -1;
  let proto = target.__proto__;
  if (isCustomElement) {
    while (proto.constructor !== window.HTMLElement.prototype.constructor) {
      proto = proto.__proto__;
    }
  }

  let protoProps = {};
  // We literally want nothing other than 'href' and 'target' from HTMLAnchorElement.
  if (proto.constructor.name === 'HTMLAnchorElement') {
    protoProps['href'] = Object.getOwnPropertyDescriptors(proto).href;
    protoProps['target'] = Object.getOwnPropertyDescriptors(proto).target;
    proto = proto.__proto__;
  }
  while (proto.constructor.name !== 'Element') {
    Object.assign(protoProps, Object.getOwnPropertyDescriptors(proto));
    proto = proto.__proto__;
  }

  let propNames = Object.keys(protoProps).sort();

  // Skip some very specific Polymer/element properties.
  let blacklist = [
      // Polymer specific
      'isAttached',
      'constructor', 'created', 'ready', 'attached', 'detached',
      'attributeChanged', 'is', 'listeners', 'observers', 'properties',
      // Native elements ones we don't care about
      'validity', 'useMap', 'innerText', 'outerText', 'style', 'accessKey',
      'draggable', 'lang', 'spellcheck', 'tabIndex', 'translate', 'align', 'dir',
      'isMap', 'useMap', 'hspace', 'vspace', 'referrerPolicy', 'crossOrigin',
      'lowsrc', 'longDesc',
      // Specific elements stuff
      'receivedFocusFromKeyboard', 'pointerDown', 'valueAsNumber',
      'selectionDirection', 'selectionStart', 'selectionEnd'
      ];

  let i = 0;
  while (i < propNames.length) {
    let name = propNames[i];

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
  return propNames || [];
}

function getAttributesIfCustomElement(target) {
  if (target.tagName.indexOf('-') !== -1) {
    return target.constructor.observedAttributes;
  } else {
    return [];
  }
}
