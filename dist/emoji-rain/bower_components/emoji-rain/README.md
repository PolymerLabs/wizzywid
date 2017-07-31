# :sparkles: emoji-rain :sparkles:

`<emoji-rain>` is a Polymer element that makes it rain emoji on any page. Because it can.

<img width="500" alt="emoji rain" src="https://cloud.githubusercontent.com/assets/1369170/9401459/86c67a76-4784-11e5-8716-3300c96a7e20.gif">

☔️ The number of drops is configurable (by default it's set to 250). The `active`
attribute determines whether the emoji are raining, but you can also manually
`start()` and `stop()` the rain.

Example:
<!---
```
<custom-element-demo>
  <template>
    <script src="../webcomponentsjs/webcomponents-lite.js"></script>
    <link rel="import" href="emoji-rain.html">
    <div style="height: 200px">
      <next-code-block></next-code-block>
    </div
  </template>
</custom-element-demo>
```
-->
```html
<emoji-rain drops="50" active></emoji-rain>
```

💸️ Optionally, you can also use the Twitter emoji instead of the native ones.
`twemoji.js` and all its images will only be loaded on demand, so if you don't
want to eat the performance cost, you don't have to:
```html
  <emoji-rain use-twemoji></emoji-rain>
```

## Usage
Install with bower:
```
mkdir emoji-rain-demo && cd emoji-rain-demo
bower install emoji-rain
```
Drop it in a page, next to the newly created `bower_components` folder:
```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <title>zomg</title>
    <script src="bower_components/webcomponentsjs/webcomponents-lite.js"></script>
    <link rel="import" href="bower_components/emoji-rain/emoji-rain.html">
  </head>
  <body>
    <emoji-rain active></emoji-rain>
  </body>
</html>
```

# :sparkles::umbrella::joy_cat:
