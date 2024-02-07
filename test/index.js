/* eslint-env node,mocha */
import assert from 'node:assert'
import { resolve, dirname } from 'node:path'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import equals from 'assert-dir-equal'
import Metalsmith from 'metalsmith'
import layouts from '@metalsmith/layouts'
import inPlace from '@metalsmith/in-place'
import plugin from '../src/index.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const { name } = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'))

function fixture(p) {
  return resolve(__dirname, 'fixtures', p)
}

function patchDebug() {
  const output = []
  const Debugger = (...args) => {
    output.push(['log', ...args])
  }
  Object.assign(Debugger, {
    info: (...args) => {
      output.push(['info', ...args])
    },
    warn: (...args) => {
      output.push(['warn', ...args])
    },
    error: (...args) => {
      output.push(['error', ...args])
    }
  })
  return function patchDebug(files, ms) {
    ms.debug = () => Debugger
    ms.metadata({ logs: output })
  }
}

describe('@metalsmith/slots', function () {
  /** @type {Map} */
  let ms, singleBuild
  before(async () => {
    ms = Metalsmith(fixture('default')).env('DEBUG', process.env.DEBUG)
    singleBuild = new Map(Object.entries(await ms.use(patchDebug()).use(plugin()).process()))
    return singleBuild
  })

  it('should export a named plugin function matching package.json name', function () {
    const namechars = name.split('/')[1]
    const camelCased = namechars.split('').reduce((str, char, i) => {
      str += namechars[i - 1] === '-' ? char.toUpperCase() : char === '-' ? '' : char
      return str
    }, '')
    assert.strictEqual(plugin().name, camelCased.replace(/~/g, ''))
  })

  it('should not crash the metalsmith build when using default options', function (done) {
    Metalsmith(fixture('none'))
      .use(plugin())
      .build((err) => {
        if (err) done(err)
        assert.strictEqual(err, null)
        equals(fixture('none/build'), fixture('none/expected'))
        done()
      })
  })

  it('only adds a "slots" property to the files that are matched by pattern', function () {
    assert.strictEqual(Object.prototype.hasOwnProperty.call(singleBuild.get('default.html'), 'slots'), false)
    assert.strictEqual(Object.prototype.hasOwnProperty.call(singleBuild.get('default.md'), 'slots'), true)
  })

  it('parses multiple slots as expected', function () {
    assert.deepStrictEqual(singleBuild.get('multiple-slots.md').slots, {
      footer: {
        name: 'footer',
        contents: '<footer></footer>'
      },
      aside: {
        name: 'aside',
        contents: '<aside></aside>'
      },
      header: {
        name: 'header',
        contents: '<header></header>'
      }
    })
    assert.strictEqual(singleBuild.get('multiple-slots.md').contents.toString(), 'Contents')
  })

  it('assigns parsed slots to an existing file.slots object', function () {
    assert.deepStrictEqual(singleBuild.get('already_has_slots_data.md').slots, {
      footer: {
        name: 'footer',
        contents: '<footer></footer>'
      },
      header: {
        name: 'header',
        contents: '<header id="default-header"></header>'
      }
    })
  })

  it('overwrites a non-object slots property and logs a warning', function () {
    assert.deepStrictEqual(singleBuild.get('already_has_non_object_slots_prop.md').slots, {
      footer: {
        name: 'footer',
        contents: '<footer></footer>'
      }
    })
    assert(
      ms
        .metadata()
        .logs.find(
          ([channel, msg, type, path]) =>
            channel === 'warn' &&
            msg === 'Overwriting incompatible slots property of type "%s" in file "%s"' &&
            type === 'array' &&
            path.endsWith('already_has_non_object_slots_prop.md')
        )
    )
  })

  it('works with frontmatter turned off', function (done) {
    Metalsmith(fixture('frontmatter-off'))
      .frontmatter(false)
      .env('DEBUG', process.env.DEBUG)
      .use(plugin())
      .build((err) => {
        if (err) done(err)
        else {
          try {
            //assert.strictEqual(files['multiple-slots.md'].slots)
            equals(fixture('frontmatter-off/build'), fixture('frontmatter-off/expected'))
            done()
          } catch (err) {
            done(err)
          }
        }
      })
  })

  it('render as slot.contents when toStringed (eg in templates)', function (done) {
    Metalsmith(fixture('slot_tostring'))
      .env('DEBUG', process.env.DEBUG)
      .use(plugin({ pattern: '**/*.njk' }))
      .use(inPlace({ transform: 'nunjucks' }))
      .build((err) => {
        if (err) done(err)
        else {
          try {
            equals(fixture('slot_tostring/build'), fixture('slot_tostring/expected'))
            done()
          } catch (err) {
            done(err)
          }
        }
      })
  })

  it('can be rendered in file.contents with @metalsmith/in-place', function (done) {
    Metalsmith(fixture('in-place'))
      .env('DEBUG', process.env.DEBUG)
      .use(plugin({ pattern: '**/*.njk' }))
      .use(inPlace({ transform: 'nunjucks' }))
      .build((err) => {
        if (err) done(err)
        else {
          try {
            equals(fixture('in-place/build'), fixture('in-place/expected'))
            done()
          } catch (err) {
            done(err)
          }
        }
      })
  })

  it('can be rendered in layouts with @metalsmith/layouts', function (done) {
    Metalsmith(fixture('layouts'))
      .env('DEBUG', process.env.DEBUG)
      .use(plugin({ pattern: '**/*.html' }))
      .use(layouts({ pattern: '**/*.html' }))
      .build((err) => {
        if (err) done(err)
        else {
          try {
            equals(fixture('layouts/build'), fixture('layouts/expected'))
            done()
          } catch (err) {
            done(err)
          }
        }
      })
  })
})
