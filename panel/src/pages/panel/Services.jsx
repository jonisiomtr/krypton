import { useEffect, useState } from 'react'

import '../../styles/painelEmpresas/produtos.css'

export default function Services() {

  const [services, setServices] = useState([])

  const [name, setName] = useState('')
  const [price, setPrice] = useState('')
  const [duration, setDuration] = useState('60')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  const [editingService, setEditingService] = useState(null)

  const [open, setOpen] = useState('08:00')
const [close, setClose] = useState('18:00')
const [interval, setIntervalValue] = useState(60)

async function loadSchedule() {

  try {

    const res = await fetch(
      `${window.location.origin}/api/schedule`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    const data = await res.json()

    setOpen(data.open || '08:00')
    setClose(data.close || '18:00')
    setIntervalValue(data.interval || 60)

  } catch (err) {

    console.log(err)

  }

}

async function saveSchedule() {

  try {

    await fetch(
      `${window.location.origin}/api/schedule`,
      {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },

        body: JSON.stringify({
          open,
          close,
          interval
        })
      }
    )

    alert('Horários salvos!')

  } catch (err) {

    console.log(err)

    alert('Erro ao salvar horários')

  }

}

  const token = localStorage.getItem('token')

  async function loadServices() {

    const res = await fetch(
      `${window.location.origin}/api/services`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    const data = await res.json()

    setServices(data)
  }

  async function addService() {
    try {
      if (editingService) {
        // Editar serviço existente
        const res = await fetch(
          `${window.location.origin}/api/services/${editingService.id}`,
          {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              name,
              price,
              duration,
              description,
              category,
              imageUrl
            })
          }
        )

        const data = await res.json()

        if (!res.ok) {
          alert(data.error)
          return
        }

        setServices(data)
        setEditingService(null)
        alert('Serviço atualizado com sucesso!')
      } else {
        // Adicionar novo serviço
        const res = await fetch(
          `${window.location.origin}/api/services`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              name,
              price,
              duration,
              description,
              category,
              imageUrl
            })
          }
        )

        const data = await res.json()

        if (!res.ok) {
          alert(data.error)
          return
        }

        setServices(data)
        alert('Serviço adicionado com sucesso!')
      }

      // Limpar formulário
      setName('')
      setPrice('')
      setDuration('60')
      setDescription('')
      setCategory('')
      setImageUrl('')
    } catch (err) {
      console.log(err)
      alert('Erro ao salvar serviço')
    }
  }

  function editService(service) {
    setName(service.name)
    setPrice(service.price.toString())
    setDuration(service.duration?.toString() || '60')
    setDescription(service.description || '')
    setCategory(service.category || '')
    setImageUrl(service.imageUrl || '')
    setEditingService(service)
  }

  function cancelEdit() {
    setName('')
    setPrice('')
    setDuration('60')
    setDescription('')
    setCategory('')
    setImageUrl('')
    setEditingService(null)
  }

  function downloadBackup() {
    const backup = {
      sieServices: services,
      schedule: {
        open,
        close,
        interval
      },
      exportedAt: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `backup-servicos-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function restoreBackup(event) {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const backup = JSON.parse(e.target.result)

        // Restaurar serviços SIE
        if (backup.sieServices) {
          setServices(backup.sieServices)
        }

        // Restaurar horários
        if (backup.schedule) {
          setOpen(backup.schedule.open || '08:00')
          setClose(backup.schedule.close || '18:00')
          setIntervalValue(backup.schedule.interval || 60)
        }

        // Sincronizar com Web Agendamento
        const companyId = localStorage.getItem('companyId')
        if (companyId && backup.sieServices) {
          try {
            await fetch(
              `${window.location.origin}/api/webagendamento/${companyId}/services/sync`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                  services: backup.sieServices
                })
              }
            )
          } catch (err) {
            console.log('Erro ao sincronizar com webagendamento:', err)
          }
        }

        alert('Backup restaurado com sucesso! Serviços sincronizados com o site de agendamento.')
      } catch (err) {
        console.log(err)
        alert('Erro ao restaurar backup')
      }
    }
    reader.readAsText(file)
  }

  async function removeService(id) {

    const res = await fetch(
      `${window.location.origin}/api/services/${id}`,
      {
        method: 'DELETE',

        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    )

    const data = await res.json()

    setServices(data)
  }

 useEffect(() => {

  loadServices()
  loadSchedule()

}, [])

  return (

  <div className='services-page'>

    <div className='services-header'>

      <div>
        <h2>🧰 Serviços</h2>
        <p>
          Gerencie os serviços do seu negócio
        </p>
      </div>

    </div>

    <div className='service-form-card'>

      <div className='schedule-card'>

  <div className='schedule-header'>

    <h3>
      ⏰ Horário de Funcionamento
    </h3>

    <p>
      Configure os horários automáticos
    </p>

  </div>

  <div className='schedule-grid'>

    <div className='schedule-input'>

      <label>
        Abertura
      </label>

      <input
        type='time'
        value={open}
        onChange={e =>
          setOpen(e.target.value)
        }
      />

    </div>

    <div className='schedule-input'>

      <label>
        Fechamento
      </label>

      <input
        type='time'
        value={close}
        onChange={e =>
          setClose(e.target.value)
        }
      />

    </div>

    <div className='schedule-input'>

      <label>
        Intervalo (min)
      </label>

      <input
        type='number'
        value={interval}
        onChange={e =>
          setIntervalValue(
            e.target.value
          )
        }
      />

    </div>

  </div>

  <button
    className='save-schedule-btn'
    onClick={saveSchedule}
  >

    💾 Salvar Horários

  </button>

</div>

      <div className='service-form-content'>
        <div className='backup-actions'>
          <button className='backup-btn' onClick={downloadBackup}>
            📥 Baixar Backup
          </button>
          <label className='backup-btn'>
            📤 Restaurar Backup
            <input
              type='file'
              accept='.json'
              onChange={restoreBackup}
            />
          </label>
        </div>

        <input
          placeholder='Nome do serviço'
          value={name}
          onChange={e => setName(e.target.value)}
        />

        <input
          placeholder='Preço'
          value={price}
          onChange={e => setPrice(e.target.value)}
        />

        <input
          placeholder='Duração (minutos)'
          value={duration}
          onChange={e => setDuration(e.target.value)}
        />

        <input
          placeholder='Categoria'
          value={category}
          onChange={e => setCategory(e.target.value)}
          list='category-options'
        />
        <datalist id='category-options'>
          <option value='CORTE DE CABELO' />
          <option value='PINTURA DE CABELO' />
          <option value='HENNA' />
          <option value='SELAGEM' />
          <option value='UNHAS' />
        </datalist>

        <input
          placeholder='Link da Imagem (Opcional)'
          value={imageUrl}
          onChange={e => setImageUrl(e.target.value)}
        />

        <textarea
          placeholder='Descrição do serviço'
          value={description}
          onChange={e => setDescription(e.target.value)}
          rows={3}
        />

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={addService}>
            {editingService ? '✓ Salvar Alterações' : '+ Adicionar Serviço'}
          </button>
          {editingService && (
            <button
              onClick={cancelEdit}
              style={{ background: '#6b7280' }}
            >
              ✕ Cancelar
            </button>
          )}
        </div>
      </div>

    </div>

    <div className='services-grid'>

      {

        services.map(service => (

          <div
            className='service-card'
            key={service.id}
          >

            <div className='service-top'>

              <div className='service-icon'>
                {service.imageUrl ? (
                  <img
                    src={service.imageUrl}
                    alt={service.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '26px',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <span style={{
                    fontSize: '34px',
                    fontWeight: '700',
                    color: 'white'
                  }}>
                    {service.name ? service.name.charAt(0).toUpperCase() : 'S'}
                  </span>
                )}
              </div>

              <div className='service-actions'>
                <button
                  className='edit-btn'
                  onClick={() => editService(service)}
                  title="Editar serviço"
                >
                  ✏️
                </button>
                <button
                  className='remove-btn'
                  onClick={() =>
                    removeService(service.id)
                  }
                  title="Remover serviço"
                >
                  🗑️
                </button>
              </div>

            </div>

            <h3>
              {service.name}
            </h3>

            <p className='product-price'>
              R$ {parseFloat(service.price).toFixed(2)}
            </p>

            {service.duration && (
              <p className='product-stock'>
                ⏱️ {service.duration} min
              </p>
            )}

            {service.category && (
              <span className='product-code'>
                {service.category}
              </span>
            )}

            {service.description && (
              <p className='product-description'>
                {service.description}
              </p>
            )}

          </div>

        ))

      }

    </div>

  </div>

)

}