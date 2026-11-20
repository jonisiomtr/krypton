import {
  useState,
  useEffect
} from 'react'
import api from '../../services/api'

import '../../styles/painelEmpresas/configuracoes.css'

export default function Settings({ onUpdate, onNotification }) {

  // MODAIS
  const [showProfile, setShowProfile] =
  useState(false)

  const [showPassword, setShowPassword] =
  useState(false)

  const [showCNPJ, setShowCNPJ] =
  useState(false)

  // SENHA
  const [newPassword, setNewPassword] =
  useState('')

  const [confirmPassword, setConfirmPassword] =
  useState('')

  const companyId =
  localStorage.getItem(
    'companyId'
  )

  const [displayName, setDisplayName] =
useState('')

const [name, setName] =
useState('')

const [phone, setPhone] =
useState('')

const [email, setEmail] =
useState('')

const [address, setAddress] =
useState('')

const [description, setDescription] =
useState('')

  const [logo, setLogo] =
  useState(null)

  // CNPJ
  const [cnpj, setCNPJ] =
  useState('')

  const [savedCNPJ, setSavedCNPJ] =
  useState('')

  const [cnpjLoading, setCNPJLoading] =
  useState(false)

  const [cnpjStatus, setCNPJStatus] =
  useState('')

  const [cnpjData, setCNPJData] =
  useState(null)

  const [preview, setPreview] =
useState(
  'https://placehold.co/150'
)

  const API_BASE_URL =
    import.meta.env.VITE_API_URL ||
    'http://localhost:4177'

  const [loading, setLoading] =
  useState(false)

  const [uploadStatus, setUploadStatus] =
  useState('')



  //aqui

  async function loadSettings() {

  try {

    const response =
    await api.get(
      `/company/${companyId}`
    )

    const config =
    response.data

    setDisplayName(
      config.displayName || ''
    )

    setName(
  config.name || ''
)

    setPhone(
  config.phone || ''
)

    setEmail(
  config.email || ''
)

    setAddress(
  config.address || ''
)

    setDescription(
  config.description || ''
)

    setSavedCNPJ(
      config.cnpj || ''
)

    if (config.logo) {

      setPreview(
        `${API_BASE_URL}${config.logo}?t=${Date.now()}`
      )

    }

  } catch (err) {

    console.log(err)

  }

}

  // =========================
  // SALVAR CONFIG
  // =========================
  async function saveSettings() {

    try {

      setLoading(true)
      setUploadStatus('💾 Salvando configurações...')

      const formData =
      new FormData()

      formData.append(
        'companyId',
        companyId
      )

      formData.append(
        'displayName',
        displayName
      )

      formData.append(
  'name',
  name
)

      formData.append(
  'phone',
  phone
)

      formData.append(
  'email',
  email
)

      formData.append(
  'address',
  address
)

      formData.append(
  'description',
  description
)

      formData.append(
  'cnpj',
  savedCNPJ
)

      if (logo) {

        formData.append(
          'logo',
          logo
        )

      }

      const response =
      await api.post(

        '/company/settings',

        formData,

        {

          headers: {

            'Content-Type':
            'multipart/form-data'

          }

        }

      )

      await new Promise(resolve =>
  setTimeout(resolve, 500)
)

      setLogo(null)

      if (
        response.data.config.logo
      ) {

        const logoUrl =
        `${API_BASE_URL}${response.data.config.logo}?t=${Date.now()}`

        console.log(
  'Nova logo:',
  logoUrl
)

        setPreview(logoUrl)
        setUploadStatus('✅ Logo atualizada com sucesso!')

      } else {
        setUploadStatus('✅ Configurações salvas com sucesso!')
      }

      setShowProfile(false)

      if (onUpdate) {
  onUpdate()
}

      if (onNotification) {
        onNotification('profile', 'Perfil Atualizado', 'Suas configurações de perfil foram salvas com sucesso!')
      }


    } catch (err) {

      console.log(err)

      const errorMessage = err.response?.data?.error || 'Erro ao salvar configurações'
      setUploadStatus('❌ ' + errorMessage)
      alert(errorMessage)

    } finally {

      setLoading(false)

    }

  }

  // =========================
  // ALTERAR SENHA
  // =========================
  async function changePassword() {

    if (
      !newPassword ||
      !confirmPassword
    ) {

      return alert(
        'Preencha todos os campos'
      )

    }

    if (
      newPassword !==
      confirmPassword
    ) {

      return alert(
        'As senhas não coincidem'
      )

    }

    try {

      await api.post(

        '/company/password',

        {

          companyId,

          password:
          newPassword

        }

      )
/*
      alert(
        'Senha alterada com sucesso!'
      )*/

      setNewPassword('')
      setConfirmPassword('')

      setShowPassword(false)

    } catch (err) {

      console.log(err)

      alert(
        'Erro ao alterar senha'
      )

    }

  }

  // =========================
  // PREVIEW LOGO
  // =========================
  function handleLogo(e) {

    const file =
    e.target.files[0]

    if (!file) return

    // Validação de tipo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/svg+xml', 'image/x-icon', 'image/tiff']
    if (!allowedTypes.includes(file.type)) {
      alert('Formato de imagem não suportado. Use: JPG, PNG, GIF, WEBP, SVG, BMP, ICO, TIFF')
      return
    }

    // Validação de tamanho (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Imagem muito grande. Máximo 5MB')
      return
    }

    setLogo(file)

    setPreview(
      URL.createObjectURL(file)
    )

    setUploadStatus('📁 Imagem selecionada: ' + file.name)

  }

  // =========================
  // BUSCAR CNPJ
  // =========================
  async function searchCNPJ() {
    // Limpar CNPJ (apenas números)
    const cleanCNPJ = cnpj.replace(/\D/g, '')

    if (cleanCNPJ.length !== 14) {
      setCNPJStatus('❌ CNPJ deve ter 14 dígitos')
      return
    }

    setCNPJLoading(true)
    setCNPJStatus('🔍 Buscando dados do CNPJ...')

    try {
      // Usar API gratuita BrasilAPI (sem CORS issues)
      const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCNPJ}`)

      if (!response.ok) {
        throw new Error(`API retornou status ${response.status}`)
      }

      const data = await response.json()

      console.log('Dados CNPJ recebidos:', data)

      // Verificar se há erro na resposta
      if (data.erro) {
        setCNPJStatus('❌ CNPJ não encontrado ou inválido')
        return
      }

      // Armazenar dados para visualização
      setCNPJData(data)

      // Preencher campos com dados encontrados
      if (data.razao_social) {
        setName(data.razao_social)
      }

      if (data.nome_fantasia) {
        setDisplayName(data.nome_fantasia)
      }

      if (data.ddd_telefone_1) {
        setPhone(`${data.ddd_telefone_1}${data.telefone_1}`)
      }

      if (data.email) {
        setEmail(data.email)
      }

      if (data.logradouro) {
        const addressParts = [data.logradouro]
        if (data.numero) addressParts.push(data.numero)
        if (data.complemento) addressParts.push(data.complemento)
        if (data.bairro) addressParts.push(data.bairro)
        if (data.municipio) addressParts.push(data.municipio)
        if (data.uf) addressParts.push(data.uf)
        setAddress(addressParts.join(', '))
      }

      setCNPJStatus('✅ Dados preenchidos automaticamente! Verifique os campos abaixo.')

    } catch (err) {
      console.error('Erro ao buscar CNPJ:', err)
      setCNPJStatus('❌ Erro ao buscar CNPJ. Verifique o CNPJ ou tente novamente.')
    } finally {
      setCNPJLoading(false)
    }
  }

  // =========================
  // SALVAR CNPJ ENCONTRADO
  // =========================
  function saveCNPJData() {
    setSavedCNPJ(cnpj)
    setCNPJStatus('✅ CNPJ salvo nas configurações!')
    setCNPJData(null)
    setCNPJ('')

    setTimeout(() => {
      setCNPJStatus('')
    }, 2000)
  }

  // =========================
  // APAGAR CNPJ SALVO
  // =========================
  function deleteCNPJ() {
    setSavedCNPJ('')
    setCNPJStatus('✅ CNPJ removido das configurações.')

    setTimeout(() => {
      setCNPJStatus('')
    }, 2000)
  }

  useEffect(() => {

  loadSettings()

}, [])

  // Carregar CNPJ salvo ao abrir modal
  useEffect(() => {
    if (showCNPJ) {
      loadSettings()
    }
  }, [showCNPJ])



  return (

    <div className='settings-page'>

      {/* CABEÇALHO COM NOME DA EMPRESA */}
      <div className='settings-header'>
        <h1>{displayName || name || 'Configurações'} - Pesquisa</h1>
      </div>

      {/* BOTÕES */}
      <div className='settings-actions'>

        <button

          className='open-button'

          onClick={() => {

            setShowProfile(true)
            setShowPassword(false)

          }}

        >

          Editar Perfil

        </button>

        <button

          className='open-button password'

          onClick={() => {

            setShowPassword(true)
            setShowProfile(false)

          }}

        >

          Alterar Senha

        </button>

        <button

          className='open-button cnpj'

          onClick={() => {

            setShowCNPJ(true)
            setShowProfile(false)
            setShowPassword(false)

          }}

        >

          CNPJ

        </button>

      </div>

      {/* PERFIL */}
      {

        showProfile && (

          <div className='settings-card'>

            <button

              className='close-button'

              onClick={() =>

                setShowProfile(false)

              }

            >

              ✕

            </button>

            <h2>
              Configurações
            </h2>

            <div className='logo-preview'>

              <img

                src={preview}

                alt='logo'

                className='settings-logo'

              />

            </div>

            <label
              className='upload-button'
            >

              Alterar Logo

              <input

                type='file'

                accept='image/*'

                onChange={handleLogo}

                hidden

              />

            </label>

            {uploadStatus && (
              <div className='upload-status'>
                {uploadStatus}
              </div>
            )}

            <div className='input-group'>

  <label>
    Nome Da Empresa
  </label>

  <input

    type='text'

    placeholder='Ex: acai'

    value={name}

    onChange={(e) =>

      setName(
        e.target.value
      )

    }

  />

</div>
            
            <div className='input-group'>

              <label>
                Seu Nome de Perfil
              </label>

              <input

                type='text'

                placeholder='Digite o nome'

                value={displayName}

                onChange={(e) =>

                  setDisplayName(
                    e.target.value
                  )

                }

              />

            </div>

            <div className='input-group'>

              <label>
                Telefone
              </label>

              <input

                type='text'

                placeholder='Ex: (11) 99999-9999'

                value={phone}

                onChange={(e) =>

                  setPhone(

                    e.target.value

                  )

                }

              />

            </div>

            <div className='input-group'>

              <label>
                Email
              </label>

              <input

                type='email'

                placeholder='Ex: contato@empresa.com'

                value={email}

                onChange={(e) =>

                  setEmail(

                    e.target.value

                  )

                }

              />

            </div>

            <div className='input-group'>

              <label>
                Endereço
              </label>

              <input

                type='text'

                placeholder='Ex: Rua Example, 123'

                value={address}

                onChange={(e) =>

                  setAddress(

                    e.target.value

                  )

                }

              />

            </div>

            <div className='input-group'>

              <label>
                CNPJ
              </label>

              <input

                type='text'

                placeholder='Ex: 00000000000191'

                value={savedCNPJ}

                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '')
                  setSavedCNPJ(value)
                }}

                maxLength={14}

              />

            </div>

            <div className='input-group'>

              <label>
                Descrição
              </label>

              <textarea

                placeholder='Descreva sua empresa...'

                value={description}

                onChange={(e) =>

                  setDescription(

                    e.target.value

                  )

                }

                rows={3}

              />

            </div>

            <button

              className='save-button'

              onClick={saveSettings}

              disabled={loading}

            >

              {

                loading

                ? 'Salvando...'

                : 'Salvar Configurações'

              }

            </button>

          </div>

        )

      }

      {/* SENHA */}
      {

        showPassword && (

          <div className='settings-card'>

            <button

              className='close-button'

              onClick={() =>

                setShowPassword(false)

              }

            >

              ✕

            </button>

            <h2>
              Alterar Senha
            </h2>

            <div className='input-group'>

              <label>
                Nova senha
              </label>

              <input

                type='password'

                value={newPassword}

                onChange={(e) =>

                  setNewPassword(
                    e.target.value
                  )

                }

              />

            </div>

            <div className='input-group'>

              <label>
                Confirmar senha
              </label>

              <input

                type='password'

                value={confirmPassword}

                onChange={(e) =>

                  setConfirmPassword(
                    e.target.value
                  )

                }

              />

            </div>

            <button

              className='save-button'

              onClick={changePassword}

            >

              Salvar Nova Senha

            </button>

          </div>

        )

      }

      {/* CNPJ */}
      {

        showCNPJ && (

          <div className='settings-card'>

            <button

              className='close-button'

              onClick={() =>

                setShowCNPJ(false)

              }

            >

              ✕

            </button>

            <h2>
              {savedCNPJ ? 'CNPJ Salvo' : 'Buscar CNPJ'}
            </h2>

            {savedCNPJ ? (
              <>
                <div className='cnpj-saved-display'>
                  <p className='cnpj-label'>CNPJ da Empresa:</p>
                  <p className='cnpj-value'>{savedCNPJ}</p>
                </div>

                {cnpjStatus && (
                  <div className='upload-status'>
                    {cnpjStatus}
                  </div>
                )}

                <button

                  className='save-button delete'

                  onClick={deleteCNPJ}

                >

                  Apagar CNPJ

                </button>
              </>
            ) : (
              <>
                <p className='cnpj-description'>
                  Digite o CNPJ da empresa para preencher automaticamente os dados disponíveis (nome, telefone, email, endereço).
                </p>

                <div className='input-group'>

                  <label>
                    CNPJ (apenas números)
                  </label>

                  <input

                    type='text'

                    placeholder='Ex: 00000000000191'

                    value={cnpj}

                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '')
                      setCNPJ(value)
                    }}

                    maxLength={14}

                  />

                </div>

                {cnpjStatus && (
                  <div className='upload-status'>
                    {cnpjStatus}
                  </div>
                )}

                {cnpjData && (
                  <div className='cnpj-data-preview'>
                    <h3>Dados Encontrados:</h3>
                    <div className='cnpj-data-item'>
                      <strong>Razão Social:</strong>
                      <span>{cnpjData.razao_social || '-'}</span>
                    </div>
                    <div className='cnpj-data-item'>
                      <strong>Nome Fantasia:</strong>
                      <span>{cnpjData.nome_fantasia || '-'}</span>
                    </div>
                    <div className='cnpj-data-item'>
                      <strong>Telefone:</strong>
                      <span>{cnpjData.ddd_telefone_1 ? `${cnpjData.ddd_telefone_1}${cnpjData.telefone_1}` : '-'}</span>
                    </div>
                    <div className='cnpj-data-item'>
                      <strong>Email:</strong>
                      <span>{cnpjData.email || '-'}</span>
                    </div>
                    <div className='cnpj-data-item'>
                      <strong>Endereço:</strong>
                      <span>{cnpjData.logradouro ? `${cnpjData.logradouro}, ${cnpjData.numero || ''} - ${cnpjData.bairro || ''}, ${cnpjData.municipio || ''} - ${cnpjData.uf || ''}` : '-'}</span>
                    </div>
                  </div>
                )}

                <div className='cnpj-buttons'>
                  <button

                    className='save-button'

                    onClick={searchCNPJ}

                    disabled={cnpjLoading}

                  >

                    {
                      cnpjLoading
                      ? 'Buscando...'
                      : 'Buscar Dados'
                    }

                  </button>

                  {cnpjData && (
                    <button

                      className='save-button'

                      onClick={saveCNPJData}

                    >

                      Salvar Dados

                    </button>
                  )}
                </div>
              </>
            )}

          </div>

        )

      }

    </div>

  )

}