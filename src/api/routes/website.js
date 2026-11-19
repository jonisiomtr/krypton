const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

// Middleware para obter companyId do token
const getCompanyId = (req) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'krypton-secret-key');
      return decoded.companyId;
    } catch (error) {
      console.error('Erro ao decodificar token:', error);
    }
  }
  return req.params.companyId;
};

// Obter dados do site da empresa
router.get('/:companyId', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const tenantsDir = path.join(__dirname, '../../tenants');
    const companyDir = path.join(tenantsDir, companyId);

    // Verificar se a empresa existe
    if (!fs.existsSync(companyDir)) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    // Carregar configuração do site
    const siteConfigPath = path.join(companyDir, 'site-config.json');
    let siteConfig = {};
    if (fs.existsSync(siteConfigPath)) {
      siteConfig = JSON.parse(fs.readFileSync(siteConfigPath, 'utf8'));
    }

    // Carregar produtos
    const productsPath = path.join(companyDir, 'products.json');
    let products = [];
    if (fs.existsSync(productsPath)) {
      const productsData = JSON.parse(fs.readFileSync(productsPath, 'utf8'));
      products = Array.isArray(productsData) ? productsData : (productsData.products || []);
    }

    // Carregar categorias a partir dos produtos
    const categoriesMap = new Map();
    products.forEach(product => {
      if (product.category && !categoriesMap.has(product.category)) {
        categoriesMap.set(product.category, {
          id: product.category.toLowerCase().replace(/\s+/g, '-'),
          name: product.category,
          count: 0
        });
      }
    });

    // Contar produtos por categoria
    products.forEach(product => {
      if (product.category) {
        const category = categoriesMap.get(product.category);
        if (category) {
          category.count++;
        }
      }
    });

    const categories = Array.from(categoriesMap.values());

    // Carregar cupons
    const couponsPath = path.join(companyDir, 'coupons.json');
    let coupons = [];
    if (fs.existsSync(couponsPath)) {
      coupons = JSON.parse(fs.readFileSync(couponsPath, 'utf8'));
    }

    // Dados da loja
    const companyConfigPath = path.join(companyDir, 'config.json');
    let companyConfig = {};
    if (fs.existsSync(companyConfigPath)) {
      companyConfig = JSON.parse(fs.readFileSync(companyConfigPath, 'utf8'));
    }

    const store = {
      name: siteConfig.storeName || companyConfig.companyName || 'Loja',
      storeName: siteConfig.storeName || companyConfig.companyName || 'Loja',
      tagline: siteConfig.tagline || companyConfig.tagline || '',
      description: siteConfig.description || companyConfig.description || '',
      address: siteConfig.address || '',
      logo: siteConfig.logo || companyConfig.logo || '',
      bannerImage: siteConfig.bannerImage || '',
      primaryColor: siteConfig.primaryColor || '#ff6b35',
      deliveryTime: siteConfig.deliveryTime || '50 a 60 min',
      deliveryFeeMin: siteConfig.deliveryFeeMin || 6,
      deliveryFeeMax: siteConfig.deliveryFeeMax || 15,
      pickupTime: siteConfig.pickupTime || '30 min',
      whatsapp: siteConfig.whatsapp || companyConfig.whatsapp || '',
      rating: siteConfig.rating || 0,
      minimumOrder: siteConfig.minimumOrder || 10,
      hasDelivery: siteConfig.hasDelivery !== false,
      currency: 'BRL',
      email: siteConfig.email || companyConfig.email || '',
      phone: siteConfig.phone || companyConfig.phone || '',
      hours: siteConfig.hours || {
        domingo: { open: null, close: null },
        segunda: { open: '09:00', close: '22:00' },
        terca: { open: '09:00', close: '22:00' },
        quarta: { open: '09:00', close: '22:00' },
        quinta: { open: '09:00', close: '22:00' },
        sexta: { open: '09:00', close: '22:00' },
        sabado: { open: '09:00', close: '20:00' }
      }
    };

    res.json({
      store,
      categories,
      products,
      coupons,
      config: siteConfig
    });
  } catch (error) {
    console.error('Erro ao carregar dados do site:', error);
    res.status(500).json({ error: 'Erro ao carregar dados do site' });
  }
});

// Salvar configuração do site
router.post('/:companyId/config', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const config = req.body;
    const tenantsDir = path.join(__dirname, '../../tenants');
    const companyDir = path.join(tenantsDir, companyId);

    if (!fs.existsSync(companyDir)) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    const siteConfigPath = path.join(companyDir, 'site-config.json');
    fs.writeFileSync(siteConfigPath, JSON.stringify(config, null, 2));

    res.json({ success: true, config });
  } catch (error) {
    console.error('Erro ao salvar configuração:', error);
    res.status(500).json({ error: 'Erro ao salvar configuração' });
  }
});

// Obter configuração do site (para o painel)
router.get('/:companyId/config', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    const tenantsDir = path.join(__dirname, '../../tenants');
    const companyDir = path.join(tenantsDir, companyId);

    if (!fs.existsSync(companyDir)) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    const siteConfigPath = path.join(companyDir, 'site-config.json');
    let config = {};
    if (fs.existsSync(siteConfigPath)) {
      config = JSON.parse(fs.readFileSync(siteConfigPath, 'utf8'));
    }

    res.json(config);
  } catch (error) {
    console.error('Erro ao carregar configuração:', error);
    res.status(500).json({ error: 'Erro ao carregar configuração' });
  }
});

// Obter configuração do site (para o painel - usa token)
router.get('/config/me', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    if (!companyId) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    const tenantsDir = path.join(__dirname, '../../tenants');
    const companyDir = path.join(tenantsDir, companyId);

    if (!fs.existsSync(companyDir)) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    const siteConfigPath = path.join(companyDir, 'site-config.json');
    let config = {};
    if (fs.existsSync(siteConfigPath)) {
      config = JSON.parse(fs.readFileSync(siteConfigPath, 'utf8'));
    }

    res.json(config);
  } catch (error) {
    console.error('Erro ao carregar configuração:', error);
    res.status(500).json({ error: 'Erro ao carregar configuração' });
  }
});

// Salvar configuração do site (para o painel - usa token)
router.post('/config/me', async (req, res) => {
  try {
    const companyId = getCompanyId(req);
    console.log('POST /api/site/config/me - companyId:', companyId);
    console.log('Request body:', JSON.stringify(req.body, null, 2));

    if (!companyId) {
      return res.status(401).json({ error: 'Não autorizado' });
    }

    const config = req.body;
    const tenantsDir = path.join(__dirname, '../../tenants');
    const companyDir = path.join(tenantsDir, companyId);

    if (!fs.existsSync(companyDir)) {
      return res.status(404).json({ error: 'Empresa não encontrada' });
    }

    const siteConfigPath = path.join(companyDir, 'site-config.json');
    fs.writeFileSync(siteConfigPath, JSON.stringify(config, null, 2));
    console.log('Configuração salva com sucesso em:', siteConfigPath);

    res.json({ success: true, config });
  } catch (error) {
    console.error('Erro ao salvar configuração:', error);
    res.status(500).json({ error: 'Erro ao salvar configuração' });
  }
});

module.exports = router;
