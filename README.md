# @metalsmith/slots

A Metalsmith plugin to divide file contents into slots, associate metadata with them and process them separately

[![metalsmith: core plugin][metalsmith-badge]][metalsmith-url]
[![npm: version][npm-badge]][npm-url]
[![ci: build][ci-badge]][ci-url]
[![code coverage][codecov-badge]][codecov-url]
[![license: MIT][license-badge]][license-url]

## Installation

NPM:

```
npm install @metalsmith/slots
```

Yarn:

```
yarn add @metalsmith/slots
```

## Usage

Pass `@metalsmith/slots` to `metalsmith.use`:

```js
import slots from '@metalsmith/slots'

metalsmith.use(slots()) // defaults
metalsmith.use(
  slots({
    // explicit defaults
    pattern: '**/*.{md,html}'
  })
)
```

Now you can divide your file in parameterized logical content sections or _slots_, with their own front-matter blocks.
Just define the `slot` field for each. You can associate any metadata with the slots just like file front-matter.

```yaml
---
layout: default.njk
title: This becomes file.title
---
This becomes file.contents
--- # first slot (becomes file.slots.author)
slot: author
name: John Doe
topics: [sports, finance]
---
This becomes file.slots.author.contents
--- # second slot (becomes file.slots.ads)
slot: ads
url: https://someadprovider.com/?id=abcde1234
---
<!-- end of file -->
```

@metalsmith/slots then parses the file, removing the slots content from the main `file.contents` field and adding them to `file.slots`:

```js
const file = {
  layout: 'default.njk',
  title: 'This becomes file.title',
  contents: Buffer.from('This becomes file.contents'),
  slots: {
    author: {
      slot: 'author',
      name: 'John Doe',
      contents: 'This becomes file.slots.author.contents',
      topics: ['sports', 'finance']
    },
    ads: {
      slot: 'ads',
      contents: '<!-- end of file -->',
      url: 'https://someadprovider.com/?id=abcde1234'
    }
  }
}
```

If the file already has an existing `slots` property holding an object, the slots will be shallowly merged in with `Object.assign`.
If the file already has an existing property with another type, it will be overwritten and log a debug warning.

There is one limitation: you cannot \*interrupt\* the main content with a slot and then continue it. Because front-matter is parsed without an explicit "end" boundary, slots must always be defined at the end of the file.

### Defining default slots

You can define a _slots_ property in [metalsmith.metadata()](https://metalsmith.io/api/#Metalsmith+metadata):

```js
metalsmith.metadata({
  slots: {
    author: {
      slot: 'author',
      name: 'Anonymous',
      contents: 'This author preferred we not publish their identity'
    }
  }
})
```

This property can then be used by plugins like [@metalsmith/layouts](https://github.com/metalsmith/layouts) that merge file metadata into global metadata as rendering context.

If you rather really _set_ the defaults to the files so other plugins can access it, you can use [@metalsmith/default-values](https://github.com/metalsmith/default-values)

### Rendering slots in a layout

With the previous examples, [@metalsmith/layouts](https://github.com/metalsmith/layouts) can render slots in a layout, using slots defined inline in a file, or fall back to metalsmith.metadata:

```html
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>{{ title }}</title>
  </head>
  <body>
    <article>
      <aside>
        <iframe src="{{ slots.ads.url }}"></iframe>
      </aside>
      {{ contents | safe }}
      <footer>
        <h3>By {{ slots.author.name }}</h3>
        Writes about {{ slots.author.topics | join(', ') }}
        <p>{{ slots.author.contents }}</p>
      </footer>
    </article>
  </body>
</html>
```

Note that you can also use `{{ slots.slotname }}` as an alias for `{{ slots.slotname.contents }}` in templating languages that `toString()` the values they output.

It is not (yet) possible to render slots into their own layouts by defining a slot `layout` field.

### Rendering markdown in a slot

It is easy to render markdown in slots with [@metalsmith/markdown](https://github.com/metalsmith/markdown)'s `keys` and `wildcard` options to target slot contents of all files:

```js
metalsmith.use(
  markdown({
    wildcard: true,
    keys: ['slots.*.contents']
  })
)
```

### Rendering slots in file.contents

[@metalsmith/in-place](https://github.com/metalsmith/in-place) can be used to render slots inside the file.contents.

`index.md`

```yaml
---
layout: default.njk
title: This becomes file.title
---
<h1>{{ title }}</h1>
This becomes file.contents

By {{ slots.author.name }}.
Writes mostly about {{ slots.author.topics | join(', ') }}
<hr>{{ slots.author.contents | safe }}
---
slot: author
name: John Doe
topics: [sports, finance]
---
This becomes file.slots.author.contents.
```

### Combining plugins

An example of using all of @metalsmith layouts, in-place, markdown, default-values and slots in a common order in a metalsmith build:

```js
metalsmith
  // default slots for all files processed with @metalsmith/layouts or in-place
  .metadata({
    slots: {
      author: {
        slot: 'author',
        name: 'Anonymous',
        contents: 'This author preferred we not publish their identity'
      }
    }
  })
  // default slots by file pattern, eg no author for homepage
  .use(
    defaultValues([
      {
        pattern: 'home.md',
        defaults: { slots: (file) => ({ ...(file.slots || {}), author: false }) }
      }
    ])
  )
  .use(slots({ pattern: '**/*.md' }))
  // render markdown inside slots
  .use(markdown({ wildcard: true, keys: ['slots.*.contents'] }))
  // render slots inside file.contents
  .use(inPlace({ pattern: '**/*.html', transform: 'nunjucks' }))
  // render slots inside a file layout
  .use(layouts({ pattern: '**/*.html' }))
```

### Debug

To enable debug logs, set the `DEBUG` environment variable to `@metalsmith/slots*`:

```js
metalsmith.env('DEBUG', '@metalsmith/slots*')
```

Alternatively you can set `DEBUG` to `@metalsmith/*` to debug all Metalsmith core plugins.

### CLI usage

To use this plugin with the Metalsmith CLI, add `@metalsmith/slots` to the `plugins` key in your `metalsmith.json` file:

```json
{
  "plugins": [
    {
      "@metalsmith/slots": {}
    }
  ]
}
```

## License

[MIT](LICENSE)

[npm-badge]: https://img.shields.io/npm/v/@metalsmith/slots.svg
[npm-url]: https://www.npmjs.com/package/@metalsmith/slots
[ci-badge]: https://github.com/metalsmith/slots/actions/workflows/test.yml/badge.svg
[ci-url]: https://github.com/metalsmith/slots/actions/workflows/test.yml
[metalsmith-badge]: https://img.shields.io/badge/metalsmith-core_plugin-green.svg?longCache=true
[metalsmith-url]: https://metalsmith.io
[codecov-badge]: https://img.shields.io/coveralls/github/metalsmith/slots
[codecov-url]: https://coveralls.io/github/metalsmith/slots
[license-badge]: https://img.shields.io/github/license/metalsmith/slots
[license-url]: LICENSE
