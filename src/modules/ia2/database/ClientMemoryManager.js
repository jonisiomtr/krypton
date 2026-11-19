const fs = require('fs')
const path = require('path')

const filePath =
path.join(
  __dirname,
  '../data/memory.json'
)

function load() {

  if (!fs.existsSync(filePath)) {

    fs.writeFileSync(
      filePath,
      '{}'
    )

  }

  return JSON.parse(
    fs.readFileSync(
      filePath,
      'utf8'
    )
  )

}

function save(data) {

  fs.writeFileSync(
    filePath,
    JSON.stringify(
      data,
      null,
      2
    )
  )

}

module.exports = {

  get(sender) {

    const data = load()

    return data[sender] || {}

  },

  set(sender, key, value) {

    const data = load()

    if (!data[sender]) {

      data[sender] = {}

    }

    data[sender][key] = value

    save(data)

  }

}