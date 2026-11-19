const axios = require('axios')

async function askOllama(prompt) {

  try {

    const response =
    await axios.post(
      'http://localhost:11434/api/generate',
      {

        model: 'qwen2.5:3b',

        prompt,

        stream: false

      }
    )

    return response.data.response

  } catch (err) {

    console.log(
      'Erro Ollama:',
      err.message
    )

    return 'Erro ao consultar IA.'

  }

}

module.exports = {
  askOllama
}