# wizzywid

This is a very simple UI Designer for HTML, Custom Elements, and Polymer.

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
Add an element you want to the `devDependencies` section of this
project's `bower.json` file, then run `bower install`. This element _has_
to be a Polymer 2 element.
