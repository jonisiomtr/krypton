module.exports = {

  parse(text) {

    const msg = text.toLowerCase()

    // DELIVERY
    if (
      msg.includes('comprar') ||
      msg.includes('pedido') ||
      msg.includes('entrega')
    ) {

      return {

        intent: 'delivery'

      }

    }

    // CATÁLOGO
    if (
      msg.includes('produto') ||
      msg.includes('cardapio') ||
      msg.includes('catálogo') ||
      msg.includes('catalogo')
    ) {

      return {

        intent: 'catalog'

      }

    }

    // AGENDAMENTO
    if (
      msg.includes('agendar') ||
      msg.includes('agendamento') ||
      msg.includes('horário') ||
      msg.includes('horario')
    ) {

      return {

        intent: 'scheduling'

      }

    }

    return {

      intent: 'assistant'

    }

  }

}