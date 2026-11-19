const fs = require('fs')
const path = require('path')

class Database {

  static getPath(
    clientId,
    collection
  ) {

    return path.join(

      __dirname,

      `../tenants/${clientId}/${collection}.json`

    )
  }

  static read(
    clientId,
    collection
  ) {

    const filePath =
    this.getPath(
      clientId,
      collection
    )

    if (
      !fs.existsSync(filePath)
    ) {

      fs.writeFileSync(
        filePath,
        JSON.stringify([], null, 2)
      )
    }

    return JSON.parse(
      fs.readFileSync(filePath)
    )
  }

  static write(
    clientId,
    collection,
    data
  ) {

    const filePath =
    this.getPath(
      clientId,
      collection
    )

    fs.writeFileSync(

      filePath,

      JSON.stringify(
        data,
        null,
        2
      )

    )
  }

  static create(
    clientId,
    collection,
    item
  ) {

    const data =
    this.read(
      clientId,
      collection
    )

    item.id =
    Date.now()

    data.push(item)

    this.write(

      clientId,

      collection,

      data

    )

    return item
  }

  static all(
    clientId,
    collection
  ) {

    return this.read(
      clientId,
      collection
    )
  }

  // ========================
  // MÉTODOS DE PLANOS E ASSINATURAS
  // ========================

  static readPlans() {
    const plansPath = path.join(__dirname, '../tenants/_plans.json')
    
    if (!fs.existsSync(plansPath)) {
      fs.writeFileSync(plansPath, JSON.stringify({ plans: [] }, null, 2))
    }
    
    return JSON.parse(fs.readFileSync(plansPath))
  }

  static writePlans(plansData) {
    const plansPath = path.join(__dirname, '../tenants/_plans.json')
    fs.writeFileSync(plansPath, JSON.stringify(plansData, null, 2))
  }

  static readSubscription(tenantId) {
    const subscriptionPath = path.join(__dirname, `../tenants/${tenantId}/subscription.json`)
    
    if (!fs.existsSync(subscriptionPath)) {
      return null
    }
    
    return JSON.parse(fs.readFileSync(subscriptionPath))
  }

  static writeSubscription(tenantId, subscriptionData) {
    const subscriptionPath = path.join(__dirname, `../tenants/${tenantId}/subscription.json`)
    fs.writeFileSync(subscriptionPath, JSON.stringify(subscriptionData, null, 2))
  }

  static createSubscription(tenantId, planId) {
    const plans = this.readPlans()
    const plan = plans.plans.find(p => p.id === planId)
    
    if (!plan) {
      throw new Error('Plano não encontrado')
    }

    const subscription = {
      tenantId,
      planId,
      planName: plan.name,
      price: plan.price,
      modules: plan.modules,
      status: 'active',
      startDate: new Date().toISOString(),
      endDate: null, // Assinatura recorrente, sem data fim
      createdAt: new Date().toISOString()
    }

    this.writeSubscription(tenantId, subscription)
    return subscription
  }

  static updateSubscription(tenantId, data) {
    const current = this.readSubscription(tenantId) || {}
    const updated = { ...current, ...data, updatedAt: new Date().toISOString() }
    this.writeSubscription(tenantId, updated)
    return updated
  }

  static readPayments(tenantId) {
    const paymentsPath = path.join(__dirname, `../tenants/${tenantId}/payments.json`)
    
    if (!fs.existsSync(paymentsPath)) {
      fs.writeFileSync(paymentsPath, JSON.stringify([], null, 2))
    }
    
    return JSON.parse(fs.readFileSync(paymentsPath))
  }

  static writePayments(tenantId, paymentsData) {
    const paymentsPath = path.join(__dirname, `../tenants/${tenantId}/payments.json`)
    fs.writeFileSync(paymentsPath, JSON.stringify(paymentsData, null, 2))
  }

  static createPayment(data) {
    const { tenantId, amount, description, moduleName, paymentId, externalReference } = data
    
    const payments = this.readPayments(tenantId)
    
    const payment = {
      id: paymentId || Date.now(),
      tenantId,
      amount,
      description,
      moduleName,
      externalReference,
      status: 'pending',
      createdAt: new Date().toISOString()
    }
    
    payments.push(payment)
    this.writePayments(tenantId, payments)
    return payment
  }

  static updatePayment(tenantId, paymentId, data) {
    const payments = this.readPayments(tenantId)
    const index = payments.findIndex(p => p.id === paymentId || p.paymentId === paymentId)
    
    if (index === -1) {
      throw new Error('Pagamento não encontrado')
    }
    
    payments[index] = { ...payments[index], ...data, updatedAt: new Date().toISOString() }
    this.writePayments(tenantId, payments)
    return payments[index]
  }

  static readAllPayments() {
    const tenantsPath = path.join(__dirname, '../tenants')
    const tenants = fs.readdirSync(tenantsPath).filter(file => {
      const fullPath = path.join(tenantsPath, file)
      return fs.lstatSync(fullPath).isDirectory() && !file.startsWith('_')
    })
    
    const allPayments = []
    
    for (const tenantId of tenants) {
      const payments = this.readPayments(tenantId)
      allPayments.push(...payments)
    }
    
    return allPayments
  }

  static checkModuleAccess(tenantId, moduleKey) {
    const subscription = this.readSubscription(tenantId)
    
    if (!subscription) {
      return false
    }
    
    if (subscription.status !== 'active') {
      return false
    }
    
    return subscription.modules.includes(moduleKey)
  }

}

module.exports =
Database