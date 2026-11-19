const axios =
require('axios')

const QRCode =
require('qrcode')

const Database =
require('../../../database/Database')

module.exports = {

  async createPix(data) {

    const {

      clientId,
      apiKey,
      value,
      description,
      customer,
      externalReference

    } = data

    try {

      // ====================================
      // CRIAR COBRANÇA PIX
      // ====================================

      const response =
      await axios.post(

        'https://api-sandbox.asaas.com/v3/payments',

        {

          billingType: 'PIX',

          customer,

          value,

          description,

          externalReference

        },

        {

          headers: {

            access_token:
            apiKey,

            'Content-Type':
            'application/json'

          }

        }

      )

      const payment =
      response.data

      // ====================================
      // BUSCAR QR CODE
      // ====================================

      const pixResponse =
      await axios.get(

        `https://api-sandbox.asaas.com/v3/payments/${payment.id}/pixQrCode`,

        {

          headers: {

            access_token:
            apiKey

          }

        }

      )

      const pixData =
      pixResponse.data

      // ====================================
      // GERAR BASE64 QR
      // ====================================

      const qrCode =
      await QRCode.toDataURL(
        pixData.payload
      )

      // ====================================
      // SALVAR
      // ====================================

      Database.create(

        clientId,

        'payments',

        {

          paymentId:
          payment.id,

          gateway:
          'asaas',

          status:
          'pending',

          value,

          description,

          customer,

          externalReference,

          pixCode:
          pixData.payload,

          createdAt:
          Date.now()

        }

      )

      // ====================================
      // RETORNO
      // ====================================

      return {

        success: true,

        paymentId:
        payment.id,

        pixCode:
        pixData.payload,

        qrCode,

        expiresAt:
        payment.dateCreated

      }

    } catch (err) {

      console.log(
        '❌ ERRO ASAAS PIX:',
        err.response?.data || err.message
      )

      return {

        success: false

      }

    }

  },

  async verifyPayment(data) {

    const {

      apiKey,
      paymentId

    } = data

    try {

      const response =
      await axios.get(

        `https://api-sandbox.asaas.com/v3/payments/${paymentId}`,

        {

          headers: {

            access_token:
            apiKey

          }

        }

      )

      return response.data

    } catch (err) {

      console.log(err)

      return null

    }

  },

  async cancelPayment(data) {

    const {

      apiKey,
      paymentId

    } = data

    try {

      await axios.delete(

        `https://api-sandbox.asaas.com/v3/payments/${paymentId}`,

        {

          headers: {

            access_token:
            apiKey

          }

        }

      )

      return true

    } catch (err) {

      console.log(err)

      return false

    }

  }

}