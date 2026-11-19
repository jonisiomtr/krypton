const fs = require('fs')
const path = require('path')

const filePath =
path.join(
  __dirname,
  '../data/conversations.json'
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

  getHistory(sender) {

    const data = load()

    return data[sender] || []

  },

  addMessage(
    sender,
    role,
    content
  ) {

    const data = load()

    if (!data[sender]) {

      data[sender] = []

    }

    data[sender].push({

      role,

      content,

      createdAt:
      Date.now()

    })

    // máximo 20 mensagens

    data[sender] =
    data[sender].slice(-20)

    save(data)

  },

  clear(sender) {

    const data = load()

    delete data[sender]

    save(data)

  }

}