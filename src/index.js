/**
 * @typedef Options
 * @property {String} key
 */

/** @type {Options} */
const defaults = {
  pattern: '**/*.md'
}

let debug

/**
 * Normalize plugin options
 * @param {Options} [options]
 * @returns {Object}
 */
function normalizeOptions(options = {}) {
  return Object.assign({}, defaults, options)
}

/** 
* @param {string} contents
* @param {import('metalsmith').Metalsmith} matter
*/
function parseSlots(contents, startDelimiter, matter) {
  function recurse(raw, slots = []) {
    raw = raw.toString().trim()
    const pos = raw.indexOf(startDelimiter)

    if (pos !== -1) {
      if (pos > 0) {
        const prevContent = raw.slice(0, pos).trim()
        let prevSlot = slots.at(slots.length - 1)
        if (!slots.length) {
          prevSlot = { name: 'contents' }
          slots.push(prevSlot)
        }
        prevSlot.contents = prevContent
      }
      const parsed = matter.parse(raw.slice(pos))

      const slot = {
        contents: parsed.contents.toString().trim(),
        name: parsed.slot ? parsed.slot : 'contents'
      }
      slots.push(slot)
      slots = recurse(slot.contents, slots)
    }
    


    return slots
  }

  return recurse(contents)
}

function slotToString() {
  return this.contents.toString()
}

/**
 * A Metalsmith plugin to divide file contents in slots, associate metadata with them and process them separately
 *
 * @param {Options} options
 * @returns {import('metalsmith').Plugin}
 */
function slots(options = {}) {
  options = normalizeOptions(options)

  return function slots(files, metalsmith) {
    debug = metalsmith.debug('@metalsmith/slots')
    debug('Running with options: %O', options)

    let startDelimiter = metalsmith.matter.options().delimiters
    if (Array.isArray(startDelimiter)) startDelimiter = startDelimiter[0]
    const matches = metalsmith.match(options.pattern, Object.keys(files))
    debug('Processing %s file(s)', matches.length)
    debug.info('Matched files: %O', matches)

    matches.forEach(filepath => {
      const file = files[filepath]
      let slots = parseSlots(file.contents, startDelimiter, metalsmith.matter)

      slots = slots
        .reduce((remapped, slot, index) => {
          if (index === 0 && slot.name === 'contents') {
            file.contents = Buffer.from(slot.contents)
            return remapped
          }
          remapped[slot.name] = slot
          Object.defineProperty(slot, 'toString', { value: slotToString, enumerable: false, writable: false })
          return remapped
        }, {})

      // don't assign to arrays, it could cause confusion
      const isArray = Array.isArray(file.slots)
      if (typeof file.slots === 'object' && !isArray && file.slots !== null) {
        Object.assign(file.slots, slots)
      } else {
        if (file.slots) {
          debug.warn('Overwriting incompatible slots property of type "%s" in file "%s"', isArray ? 'array' : typeof file.slots, metalsmith.path(filepath))
        }
        file.slots = slots
      }
    })

  }
}
export default slots
