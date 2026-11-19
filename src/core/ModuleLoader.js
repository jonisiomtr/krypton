const path = require('path')

// Módulos que não são do bot WhatsApp (apenas painel web)
const WEB_ONLY_MODULES = ['pdv_caixa', 'messages', 'qrcode']

module.exports =
function loadModules(
   moduleNames = []
) {

   const loadedModules = []

   for (const moduleName of moduleNames) {

      // Ignorar módulos que são apenas do painel web
      if (WEB_ONLY_MODULES.includes(moduleName)) {
         console.log(
            `Módulo web-only ignorado: ${moduleName}`
         )
         continue
      }

      try {

         const modulePath =
         path.join(
            __dirname,
            `../modules/${moduleName}`
         )

         delete require.cache[
  require.resolve(modulePath)
]

const mod =
require(modulePath)

loadedModules.push(mod)

         console.log(
            `Módulo carregado: ${moduleName}`
         )

      } catch (err) {

         console.log(
            `Erro ao carregar módulo ${moduleName}`,
   err
         )

      }

   }

   return loadedModules

}