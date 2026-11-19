import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import jsPDF from 'jspdf'
import './PDV.css'

export default function PDV({ companyId }) {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [cart, setCart] = useState([])
  const [currentProduct, setCurrentProduct] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('')
  const [amountReceived, setAmountReceived] = useState('')
  const [cashierStatus, setCashierStatus] = useState('CAIXA LIVRE')
  const [receiptData, setReceiptData] = useState(null)
  const [selectedCartItemIndex, setSelectedCartItemIndex] = useState(null)

  const searchInputRef = useRef(null)
  const barcodeBuffer = useRef('')
  const barcodeTimeout = useRef(null)

  // Carregar produtos ao montar
  useEffect(() => {
    loadProducts()
    searchInputRef.current?.focus()
  }, [companyId])

  // =========================
  // CARREGAR PRODUTOS
  // =========================
  async function loadProducts() {
    try {
      // Usar token do PDV se disponível, senão usar token normal
      const pdvToken = localStorage.getItem('pdvToken')
      const token = pdvToken || localStorage.getItem('token')

      const response = await api.get(`/api/pdv/${companyId}/products`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      setProducts(response.data)
    } catch (err) {
      console.error('Erro ao carregar produtos:', err)
    }
  }

  // =========================
  // CARREGAR DADOS DA EMPRESA
  // =========================
  async function loadCompanyData() {
    try {
      const pdvToken = localStorage.getItem('pdvToken')
      const token = pdvToken || localStorage.getItem('token')

      const response = await api.get(`/company/${companyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      console.log('Dados da empresa carregados para cupom:', response.data)
      return response.data
    } catch (err) {
      console.error('Erro ao carregar dados da empresa:', err)
      return {}
    }
  }

  // =========================
  // CAPTURA DE CÓDIGO DE BARRAS
  // =========================
  useEffect(() => {
    function handleKeyDown(e) {
      // Ignorar se estiver no modal de pagamento
      if (showPaymentModal) return

      // Ignorar se estiver digitando no input de busca
      if (document.activeElement === searchInputRef.current) return

      // Capturar teclas numéricas (leitor de código de barras)
      if (e.key >= '0' && e.key <= '9') {
        barcodeBuffer.current += e.key

        // Limpar buffer após 100ms sem input (fim da leitura do código)
        if (barcodeTimeout.current) {
          clearTimeout(barcodeTimeout.current)
        }

        barcodeTimeout.current = setTimeout(() => {
          if (barcodeBuffer.current.length >= 3) {
            searchProductByCode(barcodeBuffer.current)
          }
          barcodeBuffer.current = ''
        }, 100)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      if (barcodeTimeout.current) {
        clearTimeout(barcodeTimeout.current)
      }
    }
  }, [products, showPaymentModal])

  // =========================
  // ATALHOS DE TECLADO
  // =========================
  useEffect(() => {
    function handleKeyPress(e) {
      if (showPaymentModal) {
        if (e.key === 'Escape') {
          setShowPaymentModal(false)
          setPaymentMethod('')
          setAmountReceived('')
        }
        return
      }

      switch (e.key) {
        case 'F1':
          e.preventDefault()
          searchInputRef.current?.focus()
          break
        case 'F2':
          e.preventDefault()
          if (currentProduct) {
            setQuantity(prev => prev + 1)
          }
          break
        case 'F4':
          e.preventDefault()
          if (cart.length > 0) {
            setShowPaymentModal(true)
          }
          break
        case 'F6':
          e.preventDefault()
          if (cart.length > 0) {
            removeLastItem()
          }
          break
        case 'Delete':
          e.preventDefault()
          if (selectedCartItemIndex !== null) {
            removeSelectedItem()
          }
          break
        case 'F11':
          e.preventDefault()
          toggleFullscreen()
          break
        case 'Escape':
          e.preventDefault()
          clearCart()
          setSelectedCartItemIndex(null)
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [cart, currentProduct, showPaymentModal, selectedCartItemIndex])

  // =========================
  // BUSCAR PRODUTO POR CÓDIGO
  // =========================
  function searchProductByCode(code) {
    const product = products.find(p => String(p.code) === String(code))
    if (product) {
      addToCart(product, quantity)
      setCurrentProduct(product)
      setSearchTerm('')
      setQuantity(1)
    } else {
      // Beep de erro
      playBeep()
      alert(`Produto com código ${code} não encontrado!`)
    }
  }

  // =========================
  // BUSCAR POR TEXTO OU CÓDIGO
  // =========================
  function handleSearch(e) {
    const term = e.target.value
    setSearchTerm(term)

    if (term.length >= 2) {
      // Tenta buscar por código primeiro
      const foundByCode = products.find(p => String(p.code) === String(term))

      // Se não encontrar por código, busca por nome
      const foundByName = products.find(p =>
        p.name.toLowerCase().includes(term.toLowerCase())
      )

      const found = foundByCode || foundByName

      if (found) {
        setCurrentProduct(found)
      }
    }
  }

  // =========================
  // ADICIONAR AO CARRINHO
  // =========================
  function addToCart(product, qty) {
    if (product.stock < qty) {
      alert(`Estoque insuficiente! Disponível: ${product.stock}`)
      playBeep()
      return
    }

    setCashierStatus('CAIXA OCUPADO')

    const existingItem = cart.find(item => item.productId === product.id)

    if (existingItem) {
      setCart(cart.map(item =>
        item.productId === product.id
          ? {
              ...item,
              quantity: item.quantity + qty,
              totalPrice: item.unitPrice * (item.quantity + qty)
            }
          : item
      ))
    } else {
      setCart([...cart, {
        productId: product.id,
        code: product.code,
        name: product.name,
        unitPrice: product.price,
        quantity: qty,
        totalPrice: product.price * qty,
        image: product.image
      }])
    }

    setCurrentProduct(product)
    setQuantity(1)
    setSearchTerm('')
  }

  // =========================
  // REMOVER ÚLTIMO ITEM
  // =========================
  function removeLastItem() {
    if (cart.length > 0) {
      const newCart = [...cart]
      newCart.pop()
      setCart(newCart)

      if (newCart.length === 0) {
        setCashierStatus('CAIXA LIVRE')
        setCurrentProduct(null)
      }
    }
  }

  // =========================
  // REMOVER ITEM SELECIONADO
  // =========================
  function removeSelectedItem() {
    if (selectedCartItemIndex !== null && selectedCartItemIndex >= 0 && selectedCartItemIndex < cart.length) {
      const newCart = [...cart]
      newCart.splice(selectedCartItemIndex, 1)
      setCart(newCart)
      setSelectedCartItemIndex(null)

      if (newCart.length === 0) {
        setCashierStatus('CAIXA LIVRE')
        setCurrentProduct(null)
      }
    }
  }

  // =========================
  // LIMPAR CARRINHO
  // =========================
  function clearCart() {
    setCart([])
    setCurrentProduct(null)
    setSearchTerm('')
    setQuantity(1)
    setCashierStatus('CAIXA LIVRE')
  }

  // =========================
  // CALCULAR SUBTOTAL
  // =========================
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0)

  // =========================
  // CALCULAR TROCO
  // =========================
  const change = paymentMethod === 'dinheiro' && amountReceived
    ? amountReceived - subtotal
    : 0

  // =========================
  // FINALIZAR VENDA
  // =========================
  async function finalizeSale() {
    try {
      // Usar token do PDV se disponível, senão usar token normal
      const pdvToken = localStorage.getItem('pdvToken')
      const token = pdvToken || localStorage.getItem('token')

      // Obter usuário logado
      const pdvUser = pdvToken ? JSON.parse(localStorage.getItem('pdvUser')) : null
      const operator = pdvUser ? pdvUser.name : 'Operador'

      // Buscar dados da empresa para o cupom
      const companyData = await loadCompanyData()

      const response = await api.post(`/api/pdv/${companyId}/checkout`, {
        items: cart.map(item => ({
          productId: item.productId,
          quantity: item.quantity
        })),
        paymentMethod: paymentMethod,
        amountReceived: paymentMethod === 'dinheiro' ? Number(amountReceived) : 0,
        operator: operator
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (response.data.success) {
        const receiptWithCompany = {
          ...response.data.receipt,
          companyData
        }

        setReceiptData(receiptWithCompany)
        setShowPaymentModal(false)
        setPaymentMethod('')
        setAmountReceived('')

        // Gerar e baixar PDF
        setTimeout(() => {
          generateAndDownloadPDF(receiptWithCompany, response.data.order.id)
        }, 500)

        // Limpar após geração do PDF
        setTimeout(() => {
          clearCart()
          setReceiptData(null)
          loadProducts() // Recarregar estoque atualizado
        }, 2000)
      }
    } catch (err) {
      console.error('Erro ao finalizar venda:', err)
      alert(err.response?.data?.error || 'Erro ao finalizar venda')
    }
  }

  // =========================
  // GERAR E BAIXAR PDF E IMPRIMIR
  // =========================
  function generateAndDownloadPDF(receipt, orderId) {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 297]
    })

    const company = receipt.companyData || {}
    const companyName = company.name || receipt.companyName || 'EMPRESA'
    const companyPhone = company.phone || ''
    const companyEmail = company.email || ''
    const companyAddress = company.address || ''
    const companyCNPJ = company.cnpj || ''
    const companyDescription = company.description || 'Obrigado pela preferência! Volte sempre.'

    // Verificar se é Cupom Fiscal (tem CNPJ)
    const isFiscal = companyCNPJ && companyCNPJ.length === 14

    let y = 10

    // Cabeçalho - Nome da Empresa (maior, mais espaçado)
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.text(companyName.toUpperCase(), 40, y, { align: 'center', letterSpacing: 0.3, maxWidth: 70 })
    y += 8

    // CNPJ (se for fiscal, mostra o real; senão placeholder)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    if (isFiscal) {
      // Formatar CNPJ: 00.000.000/0001-91
      const formattedCNPJ = companyCNPJ.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
      doc.text(`CNPJ: ${formattedCNPJ}`, 40, y, { align: 'center' })
    } else {
      doc.text('CNPJ: 00.000.000/0001-00', 40, y, { align: 'center' })
    }
    y += 6

    // Endereço (se for fiscal e disponível)
    if (isFiscal && companyAddress) {
      doc.setFontSize(6)
      doc.text(companyAddress, 40, y, { align: 'center', maxWidth: 70 })
      y += 4
    }

    // Telefone (se disponível) - remove undefined
    if (companyPhone && companyPhone !== 'undefined') {
      doc.setFontSize(7)
      doc.text(`Tel: ${companyPhone}`, 40, y, { align: 'center' })
      y += 4
    }

    // Email (se disponível)
    if (companyEmail && companyEmail !== 'undefined') {
      doc.setFontSize(6)
      doc.text(companyEmail, 40, y, { align: 'center' })
      y += 4
    }

    y += 4

    // Divisor superior
    doc.setDrawColor(0)
    doc.setLineWidth(0.2)
    doc.line(5, y, 75, y)
    y += 3

    // CUPOM FISCAL ou NÃO FISCAL (com divisors)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.text(isFiscal ? '--- CUPOM FISCAL ---' : '--- CUPOM NÃO FISCAL ---', 40, y, { align: 'center' })
    y += 3
    doc.line(5, y, 75, y)
    y += 6

    // Metadados (lista espaçada com labels mais leves)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setFont('helvetica', 'normal')
    doc.text(`CUPOM: #${receipt.orderId}`, 5, y)
    y += 3
    doc.text(receipt.date, 5, y)
    y += 3
    doc.text(`Operador: ${receipt.operator}`, 5, y)
    y += 3
    doc.text(`Cliente: ${receipt.customer}`, 5, y)
    y += 6

    // Divisor
    doc.line(5, y, 75, y)
    y += 4

    // Itens (grid: QTD | DESCRIÇÃO | TOTAL)
    doc.setFontSize(7)
    receipt.items.forEach((item) => {
      // Quantidade à esquerda
      doc.setFont('helvetica', 'normal')
      doc.text(`${item.quantity}x`, 5, y)

      // Descrição
      doc.setFont('helvetica', 'normal')
      const descX = 12
      const maxDescWidth = 45
      const desc = item.name.length > 25 ? item.name.substring(0, 25) + '...' : item.name
      doc.text(desc, descX, y)

      // Total à direita
      doc.setFont('helvetica', 'bold')
      doc.text(`R$ ${item.totalPrice.toFixed(2)}`, 75, y, { align: 'right' })
      y += 4
    })
    y += 4

    // Divisor sólido elegante
    doc.setLineWidth(0.3)
    doc.line(5, y, 75, y)
    y += 5

    // Total Geral (destacado, maior)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('TOTAL GERAL:', 5, y)
    doc.text(`R$ ${receipt.total.toFixed(2)}`, 75, y, { align: 'right' })
    y += 6

    // Divisor sólido elegante
    doc.setLineWidth(0.3)
    doc.line(5, y, 75, y)
    y += 5

    // Pagamento
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.text(`Pagamento: ${receipt.paymentMethod.toUpperCase()}`, 5, y)
    y += 3

    if (receipt.paymentMethod === 'dinheiro') {
      doc.text(`Valor Recebido: R$ ${receipt.amountReceived.toFixed(2)}`, 5, y)
      y += 3
      doc.text(`Troco: R$ ${receipt.change.toFixed(2)}`, 5, y)
      y += 3
    }
    y += 6

    // Divisor
    doc.setLineWidth(0.2)
    doc.line(5, y, 75, y)
    y += 8

    // Rodapé - Mensagem personalizada da empresa (com quebra de linha inteligente)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    const maxLineLength = 35
    const footerLines = companyDescription.split('\n')
    footerLines.forEach((line) => {
      const words = line.split(' ')
      let currentLine = ''
      words.forEach((word) => {
        const testLine = currentLine ? `${currentLine} ${word}` : word
        if (testLine.length > maxLineLength) {
          if (currentLine) {
            doc.text(currentLine, 40, y, { align: 'center' })
            y += 4
          }
          currentLine = word
        } else {
          currentLine = testLine
        }
      })
      if (currentLine) {
        doc.text(currentLine, 40, y, { align: 'center' })
        y += 4
      }
    })
    y += 6

    // Linha de contato (se houver telefone ou email)
    if ((companyPhone && companyPhone !== 'undefined') || (companyEmail && companyEmail !== 'undefined')) {
      doc.setLineWidth(0.1)
      doc.line(5, y, 75, y)
      y += 4

      doc.setFontSize(6)
      doc.setFont('helvetica', 'normal')
      const contactInfo = (companyPhone && companyPhone !== 'undefined') ? `Tel: ${companyPhone}` : ''
      const emailInfo = (companyEmail && companyEmail !== 'undefined') ? `Email: ${companyEmail}` : ''
      const fullContact = [contactInfo, emailInfo].filter(Boolean).join(' | ')

      if (fullContact) {
        doc.text(fullContact, 40, y, { align: 'center' })
      }
    }

    // Salvar PDF para registro
    doc.save(`CSCOTACAO${orderId}.pdf`)

    // Abrir PDF em nova aba
    setTimeout(() => {
      doc.output('dataurlnewwindow')
    }, 500)
  }

  // =========================
  // COMPONENTE DE CUPOM PARA IMPRESSÃO
  // =========================
  const ReceiptPrintComponent = ({ data }) => {
    const company = data.companyData || {}
    const companyName = company.name || data.companyName || 'EMPRESA'
    const companyPhone = company.phone || ''
    const companyEmail = company.email || ''
    const companyAddress = company.address || ''
    const companyCNPJ = company.cnpj || ''
    const companyDescription = company.description || 'Obrigado pela preferência! Volte sempre.'

    // Verificar se é Cupom Fiscal
    const isFiscal = companyCNPJ && companyCNPJ.length === 14
    const formattedCNPJ = isFiscal ? companyCNPJ.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') : '00.000.000/0001-00'

    return (
      <div className="receipt-print">
        <div className="receipt-header">
          <h2>{companyName.toUpperCase()}</h2>
          <p>CNPJ: {formattedCNPJ}</p>
          {isFiscal && companyAddress && <p>{companyAddress}</p>}
          {companyPhone && companyPhone !== 'undefined' && <p>Tel: {companyPhone}</p>}
          {companyEmail && companyEmail !== 'undefined' && <p>{companyEmail}</p>}
          <p>{isFiscal ? '--- CUPOM FISCAL ---' : '--- CUPOM NÃO FISCAL ---'}</p>
        </div>
        <div className="receipt-divider">--------------------------------</div>
        <div className="receipt-meta">
          <p>CUPOM: #{data.orderId}</p>
          <p>{data.date}</p>
          <p>Operador: {data.operator}</p>
          <p>Cliente: {data.customer}</p>
        </div>
        <div className="receipt-divider">--------------------------------</div>
        <div className="receipt-items">
          {data.items.map((item, index) => (
            <div key={index} className="receipt-item">
              <span className="receipt-qty">{item.quantity}x</span>
              <span className="receipt-desc">{item.name}</span>
              <span className="receipt-total">R$ {item.totalPrice.toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="receipt-divider">--------------------------------</div>
        <div className="receipt-total">
          <p className="total-label">TOTAL GERAL:</p>
          <p className="total-value">R$ {data.total.toFixed(2)}</p>
        </div>
        <div className="receipt-divider">--------------------------------</div>
        <div className="receipt-payment">
          <p>Pagamento: {data.paymentMethod.toUpperCase()}</p>
          {data.paymentMethod === 'dinheiro' && (
            <>
              <p>Valor Recebido: R$ {data.amountReceived.toFixed(2)}</p>
              <p>Troco: R$ {data.change.toFixed(2)}</p>
            </>
          )}
        </div>
        <div className="receipt-divider">--------------------------------</div>
        <div className="receipt-footer">
          {companyDescription.split('\n').map((line, lineIndex) => {
            const words = line.split(' ')
            let currentLine = ''
            const lineElements = []
            words.forEach((word, wordIndex) => {
              const testLine = currentLine ? `${currentLine} ${word}` : word
              if (testLine.length > 35) {
                if (currentLine) {
                  lineElements.push(<p key={`${lineIndex}-${wordIndex}`}>{currentLine}</p>)
                }
                currentLine = word
              } else {
                currentLine = testLine
              }
            })
            if (currentLine) {
              lineElements.push(<p key={`${lineIndex}-last`}>{currentLine}</p>)
            }
            return lineElements
          })}
          {(companyPhone && companyPhone !== 'undefined') || (companyEmail && companyEmail !== 'undefined') ? (
            <p className="receipt-contact">
              {companyPhone && companyPhone !== 'undefined' && `Tel: ${companyPhone}`}
              {companyPhone && companyPhone !== 'undefined' && companyEmail && companyEmail !== 'undefined' && ' | '}
              {companyEmail && companyEmail !== 'undefined' && `Email: ${companyEmail}`}
            </p>
          ) : null}
          <br /><br />
        </div>
      </div>
    )
  }

  // =========================
  // TOGGLE FULLSCREEN
  // =========================
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  // =========================
  // BEEP SONORO
  // =========================
  function playBeep() {
    const audio = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU')
    audio.play().catch(() => {})
  }

  // =========================
  // LOGOUT
  // =========================
  function handleLogout() {
    localStorage.removeItem('pdvToken')
    localStorage.removeItem('pdvUser')
    localStorage.removeItem('pdvCompanyId')
    navigate(`/pdv/${companyId}`)
  }

  return (
    <div className="pdv-container">
      {/* Painel Esquerdo - Produto Atual */}
      <div className="pdv-left-panel">
        <div className="product-display">
          {currentProduct ? (
            <>
              {currentProduct.image ? (
                <img
                  src={currentProduct.image}
                  alt={currentProduct.name}
                  className="product-image"
                />
              ) : (
                <div className="product-image-placeholder">
                  <span>SEM IMAGEM</span>
                </div>
              )}
              <h2 className="product-name">{currentProduct.name.toUpperCase()}</h2>
              <p className="product-code">CÓD: {currentProduct.code}</p>
              <p className="product-price">R$ {currentProduct.price.toFixed(2)}</p>
              <p className="product-stock">ESTOQUE: {currentProduct.stock}</p>
            </>
          ) : (
            <div className="product-placeholder">
              <p>AGUARDANDO PRODUTO...</p>
            </div>
          )}
        </div>
        <div className="cashier-status">
          <h3>{cashierStatus}</h3>
        </div>
      </div>

      {/* Painel Central - Entrada */}
      <div className="pdv-center-panel">
        <div className="search-container">
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            onChange={handleSearch}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && currentProduct) {
                addToCart(currentProduct, quantity)
              }
            }}
            placeholder="Buscar produto ou código de barras (F1)"
            className="search-input"
            autoFocus
          />
        </div>

        <div className="input-grid">
          <div className="input-group">
            <label>QUANTIDADE (F2)</label>
            <div className="quantity-wrapper">
              <button
                type="button"
                className="quantity-btn minus"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                −
              </button>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                min="1"
                className="input-field"
              />
              <button
                type="button"
                className="quantity-btn plus"
                onClick={() => setQuantity(quantity + 1)}
              >
                +
              </button>
            </div>
          </div>
          <div className="input-group">
            <label>VALOR UNITÁRIO</label>
            <input
              type="text"
              value={currentProduct ? `R$ ${currentProduct.price.toFixed(2)}` : 'R$ 0,00'}
              disabled
              className="input-field disabled"
            />
          </div>
          <div className="input-group">
            <label>VALOR TOTAL</label>
            <input
              type="text"
              value={currentProduct ? `R$ ${(currentProduct.price * quantity).toFixed(2)}` : 'R$ 0,00'}
              disabled
              className="input-field disabled"
            />
          </div>
        </div>

        <div className="action-buttons">
          <button
            onClick={() => currentProduct && addToCart(currentProduct, quantity)}
            disabled={!currentProduct}
            className="btn-add"
          >
            + ADICIONAR
          </button>
          <button
            onClick={clearCart}
            className="btn-clear"
          >
            LIMPAR (ESC)
          </button>
        </div>
      </div>

      {/* Painel Direito - Cupom/Carrinho */}
      <div className="pdv-right-panel">
        <div className="cart-header">
          <h3>CUPOM / CARRINHO</h3>
        </div>
        <div className="cart-items">
          <table className="cart-table">
            <thead>
              <tr>
                <th>CÓD</th>
                <th>DESCRIÇÃO</th>
                <th>QTD</th>
                <th>VLR. UNIT</th>
                <th>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {cart.map((item, index) => (
                <tr
                  key={index}
                  className={selectedCartItemIndex === index ? 'selected' : ''}
                  onClick={() => setSelectedCartItemIndex(index)}
                >
                  <td>{item.code}</td>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>R$ {item.unitPrice.toFixed(2)}</td>
                  <td>R$ {item.totalPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="cart-footer">
          <div className="subtotal-display">
            <span>SUBTOTAL:</span>
            <span className="subtotal-value">R$ {subtotal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Rodapé - Atalhos */}
      <div className="pdv-footer">
        <div className="shortcuts-bar">
          <span>F1 - BUSCAR</span>
          <span>F2 - +QTD</span>
          <span>F4 - FINALIZAR</span>
          <span>F6 - CANCELAR ITEM</span>
          <span>DEL - REMOVER SELECIONADO</span>
          <span>ESC - LIMPAR</span>
          <span>F11 - TELA CHEIA</span>
        </div>
        <button className="logout-btn" onClick={handleLogout}>
          🚪 SAIR
        </button>
      </div>

      {/* Modal de Pagamento */}
      {showPaymentModal && (
        <div className="payment-modal-overlay">
          <div className="payment-modal">
            <h2>FINALIZAR VENDA</h2>
            <div className="payment-summary">
              <p>TOTAL A PAGAR: <strong>R$ {subtotal.toFixed(2)}</strong></p>
            </div>

            <div className="payment-methods">
              <button
                className={`payment-btn ${paymentMethod === 'dinheiro' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('dinheiro')}
              >
                💵 DINHEIRO
              </button>
              <button
                className={`payment-btn ${paymentMethod === 'credito' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('credito')}
              >
                💳 CRÉDITO
              </button>
              <button
                className={`payment-btn ${paymentMethod === 'debito' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('debito')}
              >
                💳 DÉBITO
              </button>
              <button
                className={`payment-btn ${paymentMethod === 'pix' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('pix')}
              >
                📱 PIX
              </button>
            </div>

            {paymentMethod === 'dinheiro' && (
              <div className="amount-received">
                <label>VALOR RECEBIDO:</label>
                <input
                  type="number"
                  value={amountReceived}
                  onChange={(e) => setAmountReceived(e.target.value)}
                  placeholder="Digite o valor..."
                  className="amount-input"
                  autoFocus
                />
                {amountReceived && (
                  <p className="change-display">
                    TROCO: R$ {change.toFixed(2)}
                  </p>
                )}
              </div>
            )}

            <div className="modal-actions">
              <button
                onClick={() => {
                  setShowPaymentModal(false)
                  setPaymentMethod('')
                  setAmountReceived('')
                }}
                className="btn-cancel"
              >
                CANCELAR (ESC)
              </button>
              <button
                onClick={finalizeSale}
                disabled={!paymentMethod || (paymentMethod === 'dinheiro' && (!amountReceived || change < 0))}
                className="btn-confirm"
              >
                CONFIRMAR VENDA
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Componente de Cupom para Impressão */}
      {receiptData && (
        <div className="print-only">
          <ReceiptPrintComponent data={receiptData} />
        </div>
      )}

    </div>
  )
}
