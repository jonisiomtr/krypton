const express =
require('express')

const multer =
require('multer')

const fs =
require('fs')

const cloudinary =
require('../services/cloudinary')

const router =
express.Router()

const upload =
multer({

  dest: 'tmp/'

})

router.post(

  '/',

  upload.single('image'),

  async (req, res) => {

    try {

      const result =
      await cloudinary.uploader.upload(

        req.file.path,

        {

          folder:
          'products'

        }

      )

      fs.unlinkSync(
        req.file.path
      )

      return res.json({

        url:
        result.secure_url

      })

    } catch (err) {

      console.log(err)

      return res.status(500)
      .json({

        error:
        'Erro upload'

      })

    }

  }

)

module.exports =
router