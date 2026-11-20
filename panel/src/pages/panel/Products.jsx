import { useEffect, useState } from 'react'
import '../../styles/botao-upload-image.css'

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'http://localhost:4177'

export default function Products() {

  const [products, setProducts] =
  useState([])

  //pesquisa de produtos
  const [search, setSearch] =
useState('')

const [selectedProduct, setSelectedProduct] =
useState(null)

const [editingProduct, setEditingProduct] =
useState(null)

const [showAll, setShowAll] = useState(false)

  const [form, setForm] =
  useState({

    code: '',

    name: '',

    description: '',

    price: '',

    stock: 1,

    image: '',

    category: ''

  })

  const [customCategory, setCustomCategory] = useState('')

  const defaultCategories = ['bebidas', 'comidas', 'acessórios', 'açai', 'peixe frito', 'frango frito', 'refeições', 'sobremesas']

  const token =
  localStorage.getItem('token')

  // =========================
  // LOAD
  // =========================
  async function loadProducts() {

    const res = await fetch(
      `${API_BASE_URL}/api/products`,
      {

        headers: {

          Authorization:
          `Bearer ${token}`

        }

      }
    )

    const data =
    await res.json()

    setProducts(data)

  }

  // =========================
  // UPLOAD IMAGE
  // =========================

  async function uploadImage(event) {

  const file =
  event.target.files[0]

  if (!file) return

  const formData =
  new FormData()

  formData.append(
    'image',
    file
  )

  const res =
  await fetch(

    `${API_BASE_URL}/api/upload`,

    {

      method: 'POST',

      body: formData

    }

  )

  const data =
  await res.json()

  setForm({

    ...form,

    image:
    data.url

  })

}


  // =========================
  // ADD PRODUCT
  // =========================
  async function addProduct() {

    if (
      !form.name ||
      !form.price
    ) {

      alert(
        'Nome e preço são obrigatórios'
      )

      return
    }

    const res = await fetch(

      `${API_BASE_URL}/api/products`,

      {

        method: 'POST',

        headers: {

          'Content-Type':
          'application/json',

          Authorization:
          `Bearer ${token}`

        },

        body: JSON.stringify({

          code: form.code,

          name: form.name,

          description:
          form.description,

          price:
          Number(form.price),

          stock:
          Number(form.stock),

          image:
          form.image,

          category: form.category

        })

      }

    )

    const data =
    await res.json()

    if (!res.ok) {

      alert(data.error)

      return
    }

    setProducts(data)

    setForm({

      code: '',

      name: '',

      description: '',

      price: '',

      stock: 1,

      image: '',

      category: ''

    })

    setCustomCategory('')

  }

  // =========================
  // REMOVE
  // =========================
  async function removeProduct(id) {
    console.log('🗑️ Removendo produto ID:', id, 'Tipo:', typeof id)

    const res = await fetch(

      `${API_BASE_URL}/api/products/${id}`,

      {

        method: 'DELETE',

        headers: {

          Authorization:
          `Bearer ${token}`

        }

      }

    )

    const data =
    await res.json()

    console.log('Resposta do backend:', data)

    setProducts(data)

  }

  // =========================
  // START EDIT
  // =========================
  function startEdit(product) {
    setEditingProduct(product)
    setForm({
      code: product.code,
      name: product.name,
      description: product.description,
      price: product.price,
      stock: product.stock,
      image: product.image,
      category: product.category || ''
    })
    setCustomCategory(product.category || '')
  }

  // =========================
  // UPDATE PRODUCT
  // =========================
  async function updateProduct() {
    if (!editingProduct) return

    if (!form.name || !form.price) {
      alert('Nome e preço são obrigatórios')
      return
    }

    const res = await fetch(
      `${API_BASE_URL}/api/products/${editingProduct.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          code: form.code,
          name: form.name,
          description: form.description,
          price: Number(form.price),
          stock: Number(form.stock),
          image: form.image,
          category: form.category
        })
      }
    )

    const data = await res.json()

    if (!res.ok) {
      alert(data.error)
      return
    }

    setProducts(data)
    setEditingProduct(null)
    setForm({
      code: '',
      name: '',
      description: '',
      price: '',
      stock: 1,
      image: ''
    })
    alert('Produto atualizado com sucesso!')
  }

  // =========================
  // CANCEL EDIT
  // =========================
  function cancelEdit() {
    setEditingProduct(null)
    setForm({
      code: '',
      name: '',
      description: '',
      price: '',
      stock: 1,
      image: '',
      category: ''
    })
    setCustomCategory('')
  }

  // =========================
  // DOWNLOAD BACKUP
  // =========================
  async function downloadBackup() {
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/products/backup`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      )

      const data = await res.json()

      if (!res.ok) {
        alert(data.error)
        return
      }

      // Criar arquivo JSON para download
      const backupData = {
        backupDate: data.backupDate,
        companyId: data.companyId,
        products: data.products
      }

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `backup_produtos_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      alert(`Backup salvo! ${data.products.length} produtos exportados.`)
    } catch (err) {
      alert('Erro ao fazer backup: ' + err.message)
    }
  }

  // =========================
  // RESTAURAR BACKUP
  // =========================
  async function restoreBackup(event) {
    const file = event.target.files[0]
    if (!file) return

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const backupData = JSON.parse(e.target.result)

          if (!backupData.products || !Array.isArray(backupData.products)) {
            alert('Formato de backup inválido!')
            return
          }

          const confirmed = confirm(`Deseja restaurar ${backupData.products.length} produtos? Isso substituirá todos os produtos atuais.`)
          if (!confirmed) return

          const res = await fetch(
            `${API_BASE_URL}/api/products/restore`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                products: backupData.products
              })
            }
          )

          const data = await res.json()

          if (!res.ok) {
            alert(data.error)
            return
          }

          setProducts(data.products)
          alert(data.message)
        } catch (err) {
          alert('Erro ao ler arquivo de backup: ' + err.message)
        }
      }
      reader.readAsText(file)
    } catch (err) {
      alert('Erro ao restaurar backup: ' + err.message)
    }

    // Limpar input
    event.target.value = ''
  }

  // =========================
  // IMPORTAR CSV
  // =========================
  async function importCSV(event) {
    const file = event.target.files[0]
    if (!file) return

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const csvData = e.target.result

          const confirmed = confirm('Deseja importar produtos do CSV? Os produtos serão adicionados aos existentes.')
          if (!confirmed) return

          const res = await fetch(
            `${API_BASE_URL}/api/products/import-csv`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                csvData: csvData
              })
            }
          )

          const data = await res.json()

          if (!res.ok) {
            alert(data.error)
            return
          }

          setProducts(data.products)
          alert(data.message)
        } catch (err) {
          alert('Erro ao ler arquivo CSV: ' + err.message)
        }
      }
      reader.readAsText(file)
    } catch (err) {
      alert('Erro ao importar CSV: ' + err.message)
    }

    // Limpar input
    event.target.value = ''
  }

  useEffect(() => {

    loadProducts()

  }, [])

  

  //pesquisar produtos
  const filteredProducts = showAll
  ? products
  : search.trim()
    ? products.filter(product => {
        const term = search.toLowerCase().trim()

        return (
          product.name?.toLowerCase().includes(term) ||
          String(product.code).toLowerCase().includes(term)
        )
      })
    : []

  return (

    <div className='services-page'>

      <div className='services-header'>

        <div>

          <h2>
            📦 Produtos
          </h2>

          <p>
            Gerencie os produtos da sua empresa
          </p>

        </div>

      </div>

      {/* FORM */}

      <div className='service-form-card' style={{
        border: editingProduct ? '2px solid #3b82f6' : undefined
      }}>

        {/* BOTOES DE AÇÃO */}
        <div className='backup-actions'>
          <button onClick={downloadBackup} className='backup-btn'>
            💾 Backup (Exportar)
          </button>
          <label className='backup-btn'>
            📥 Importar CSV
            <input
              type='file'
              accept='.csv'
              onChange={importCSV}
              style={{ display: 'none' }}
            />
          </label>
          <label className='backup-btn'>
            📂 Restaurar Backup
            <input
              type='file'
              accept='.json'
              onChange={restoreBackup}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        <input
          placeholder='Código do produto'
          value={form.code}
          onChange={e =>

            setForm({

              ...form,

              code: e.target.value

            })

          }
        />

        <input
          placeholder='Nome do produto'
          value={form.name}
          onChange={e =>

            setForm({

              ...form,

              name: e.target.value

            })

          }
        />

        <input
          placeholder='Preço'
          value={form.price}
          onChange={e =>

            setForm({

              ...form,

              price: e.target.value

            })

          }
        />

        <input
          type='number'
          placeholder='Quantidade em estoque'
          value={form.stock}
          onChange={e =>

            setForm({

              ...form,

              stock: e.target.value

            })

          }
        />

        <select
          value={form.category}
          onChange={e => {
            const value = e.target.value
            if (value === 'custom') {
              setForm({ ...form, category: customCategory })
            } else {
              setForm({ ...form, category: value })
            }
          }}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '8px',
            border: '1px solid #ddd',
            marginBottom: '12px'
          }}
        >
          <option value="">Selecione uma categoria</option>
          {defaultCategories.map(cat => (
            <option key={cat} value={cat}>{cat.charAt(0).toUpperCase() + cat.slice(1)}</option>
          ))}
          <option value="custom">➕ Outra categoria (digite abaixo)</option>
        </select>

        {form.category === customCategory || !defaultCategories.includes(form.category) ? (
          <input
            placeholder='Digite a categoria personalizada'
            value={customCategory}
            onChange={e => {
              setCustomCategory(e.target.value)
              setForm({ ...form, category: e.target.value })
            }}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid #ddd',
              marginBottom: '12px'
            }}
          />
        ) : null}

        <input
  id="imageUpload"
  type="file"
  accept="image/*"
  onChange={uploadImage}
  style={{ display: 'none' }}
/>
<label htmlFor="imageUpload" className="gallery-btn">
  📷 Adicionar imagem
</label>

        {
  form.image && (

    <img

      src={form.image}

      alt="preview"

      style={{

        width: '150px',

        borderRadius: '12px',

        marginTop: '10px'

      }}

    />

  )
}






        <textarea
          placeholder='Descrição do produto'
          value={form.description}
          onChange={e =>

            setForm({

              ...form,

              description:
              e.target.value

            })

          }
        />

        <button onClick={editingProduct ? updateProduct : addProduct}>

          {editingProduct ? '💾 Salvar Alterações' : '+ Adicionar Produto'}

        </button>

        {editingProduct && (
          <button
            onClick={cancelEdit}
            style={{
              background: '#ef4444',
              marginLeft: '10px'
            }}
          >
            ❌ Cancelar
          </button>
        )}

      </div>

      <button
  onClick={() => {
  setShowAll(!showAll)
  setSearch('')
}}
  style={{
    marginBottom: 10,
    padding: '10px 14px',
    borderRadius: 10,
    border: '1px solid #ccc',
    cursor: 'pointer'
  }}
>
  {showAll ? '🔍 Voltar para busca' : '📦 Ver todos os produtos'}
</button>

      <div
  style={{
    marginBottom: '20px'
  }}
>

  <input

    placeholder='🔍 Pesquisar por código ou nome'


    value={search}

    onChange={e =>

      setSearch(
        e.target.value
      )

    }

    style={{

      width: '100%',

      padding: '14px',

      borderRadius: '12px',

      border:
      '1px solid #ddd'

    }}

  />

 {!showAll && !search && (
  <p style={{ marginTop: 20 }}>
    Digite um nome ou código para buscar produtos
  </p>
)}

{showAll && (
  <p style={{ marginTop: 20 }}>
    📦 Mostrando todos os produtos
  </p>
)}

</div>

      {/* GRID */}

      <div className='services-grid'>

        {

          filteredProducts.map(product => (

            <div
  className='service-card'
  key={product.id}

  onClick={() =>

    setSelectedProduct(
      product
    )

  }

  style={{
    cursor: 'pointer'
  }}
>

              <div className='service-top'>

                <div className='service-icon'>

                  📦

                </div>

                <div className='service-actions'>
                  <button
                    className='edit-btn'
                    onClick={(e) => {
                      e.stopPropagation()
                      startEdit(product)
                    }}
                    title="Editar produto"
                  >
                    ✏️
                  </button>
                  <button
                    className='remove-btn'
                    onClick={(e) => {
                      e.stopPropagation()
                      removeProduct(product.id)
                    }}
                    title="Remover produto"
                  >
                    🗑️
                  </button>
                </div>

              </div>

              

              <h3>

                {product.name}

              </h3>

              <span className='product-code'>

                Código:
                {product.code || product.id}

              </span>

              <p className='product-price'>

                R$ {product.price}

              </p>

              <p className='product-stock'>

                Estoque:
                {product.stock}

              </p>

              {

                product.description && (

                  <p className='product-description'>

                    {product.description}

                  </p>

                )

              }

            </div>

          ))

        }

      </div>

      {
selectedProduct && (

<div className='modal'>

  <div
    className='modal-content'
    style={{
    background: '#fff',
    color: '#222',
    padding: '24px',
    borderRadius: '16px',
    maxWidth: '500px',
    width: '100%'
  }}
  >

    <h2
    style={{
    fontSize: '28px',
    fontWeight: '700',
    marginBottom: '20px',
    color: '#111'
  }}
    >

      {selectedProduct.name}

    </h2>

    {

      selectedProduct.image && (

        <img

          src={
            selectedProduct.image
          }

          alt={
            selectedProduct.name
          }

          style={{

            width: '100%',

            maxHeight: '250px',

            objectFit:
            'cover',

            borderRadius:
            '12px'

          }}

        />

      )

    }

    <p
    style={{
    fontSize: '16px',
    color: '#333',
    marginBottom: '10px'
  }}
    >

      <strong>
        Código:
      </strong>

      {' '}

      {
        selectedProduct.code
      }

    </p>

    <p
    style={{
    fontSize: '22px',
    fontWeight: 'bold',
    color: '#16a34a'
  }}
    >

      <strong>
        Preço:
      </strong>

      {' '}
      R$

      {
        selectedProduct.price
      }

    </p>

    <p>

      <strong>
        Estoque:
      </strong>

      {' '}

      {
        selectedProduct.stock
      }

    </p>

    <p>

      <strong>
        Descrição:
      </strong>

      {' '}

      {
        selectedProduct.description ||
        'Sem descrição'
      }

    </p>

    <button

      onClick={() =>

        setSelectedProduct(
          null
        )

      }

    >

      Fechar

    </button>

  </div>

</div>

)
}

    </div>

  )

}