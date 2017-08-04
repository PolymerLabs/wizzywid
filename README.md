# wizzywid

This is a very simple UI getting-started-tool for HTML, Custom Elements, and Polymer.

It does not have all of the features that a full UI [designer app](https://github.com/polymer/designer)
should -- making that kind of app is really hard, and requires a lot of work and maintenance.

👉 I've built this with the idea that if you want to customize it (i.e. add
  your own custom elements to it, or very specific features), you should be
  able to clone it, make changes, and deploy it somewhere. Bug fixes are
  always appreciated ❤️.

<img width="985" alt="screenshot of wizzywid" src="https://user-images.githubusercontent.com/1369170/28957547-22175752-78a7-11e7-8770-49df35698e55.png">

## Developing

  * Install dependencies
```
  $ npm install -g bower
  $ bower install
```

  * Run the app in a local server
```
  $ python3 -m http.server --bind localhost 8000
```

  * Navigate Chrome to [localhost:8000]() to see the app.

## Configuring
**Disclaimer**: to configure the app to have other elements than the ones it
already has, you should clone it, build it, and make one of the changes below.
I don't want to add a "anyone should add any element to this exact deployed app"
feature because that invites a database and a bunch of XSS opportunities in the
house, and that's not really the point of this project. That being said, I would
like the steps below to be as easy as possible. ❤️

Also, start all of the sentences below with "In theory, ...". 😅

### Adding another native element

Add another entry to the `elements-native.json` file. If this is a weird
native element, you might have to do some code changes:
  - if it doesn't have a closing tag (like `<input>` or `<img>`), update `dumpElementEndTag`
  in `code-view.html`
  - if it doesn't have a "slot", i.e. you shouldn't be able to drop children
  in it (like `<input>`), you need to make 1 change each in `app-shell.html`.
  `canvas-view.html` and `canvas-controls.html` (just search for `input`, you'll find it.).
  Yes I should probably make this only exist in one place, but you know what,
  communicating between siblings is hard.

### Adding another custom element

Add the element you want to the `devDependencies` section of this
project's `bower.json` file, then run `bower install`. This element needs
to use HTML Imports for it to work. If the import isn't of the form
`element-name/element-name.html`, you'll have to hand craft `dumpImports()` in
`code-view.html`.

### Adding another sample

Add the name of the sample in `elements-samples.json`, and create a file in the
`samples` directory with the same name. This file should contain a `<template>`,
and in the template the contents of your new sample. Note that this template
obviously has no shadow DOM (unless you add just a custom element), so if in it
you add a `<style> div {color: red}</style>`, this will, of course, style
all the divs in the app, and you'll have a hard time removing that code :(

### Adding a new theme
To reskin the app, you need to define a set of custom properties. Check the `retheme`
method in `app.js` for the list.
