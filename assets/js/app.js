/**
 * Precificador Pro - Motor Financeiro e Gestor de Produtos
 * Armazenamento 100% Local (Offline First)
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'precificador_pro_db_v2';
  const LICENSE_KEY = 'precificador_pro_license';

  // Canais padrões com taxas de mercado atualizadas e documentação oficial
  const DEFAULT_CHANNELS = {
    'Mercado Livre': { 
      commission: 16.0, 
      fixedFee: 6.0, 
      payment: 0.0, 
      note: 'Varia por categoria (11% a 19%) e reputação. Frete grátis obrigatório em produtos acima de R$ 79,00.',
      docUrl: 'https://www.mercadolivre.com.br/ajuda/quanto-custa-vender-um-produto_1338'
    },
    'Amazon': { 
      commission: 15.0, 
      fixedFee: 2.0, 
      payment: 0.0, 
      note: 'Varia de 8% a 15% conforme categoria na Amazon Brasil (consulte tabela oficial).',
      docUrl: 'https://sell.amazon.com.br/precos'
    },
    'Shopee': { 
      commission: 14.0, 
      fixedFee: 4.0, 
      payment: 0.0, 
      note: 'Padrão 14% + 6% no programa de frete grátis (limite máximo de R$ 100 de comissão por item).',
      docUrl: 'https://seller.shopee.com.br/edu/article/19515'
    },
    'Shein': { 
      commission: 16.0, 
      fixedFee: 0.0, 
      payment: 0.0, 
      note: 'Comissão sobre o valor total do pedido com frete incluído conforme contrato de seller.',
      docUrl: 'https://seller.shein.com.br/'
    },
    'TikTok Shop': { 
      commission: 10.0, 
      fixedFee: 2.0, 
      payment: 0.0, 
      note: 'Canal em expansão no Brasil com condições e tarifas promocionais para novos sellers.',
      docUrl: 'https://seller-br.tiktok.com/'
    },
    'Magalu': { 
      commission: 16.0, 
      fixedFee: 3.0, 
      payment: 0.0, 
      note: 'Varia de 12% a 18% conforme categoria e se opta por antecipação automática.',
      docUrl: 'https://portaldolu.magalu.com/'
    },
    'Loja Própria / WhatsApp': { 
      commission: 0.0, 
      fixedFee: 0.0, 
      payment: 3.99, 
      note: 'Venda direta sem intermediários. Considere apenas a taxa do gateway de pagamento ou máquina.',
      docUrl: 'https://www.mercadopago.com.br/ajuda/custos-receber-pagamentos_2977'
    }
  };

  // Estado da aplicação
  let state = {
    channels: JSON.parse(JSON.stringify(DEFAULT_CHANNELS)),
    items: [],
    isPro: false,
    licenseKey: ''
  };

  // Utilitários de Formatação
  const money = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val) || 0);
  const pct = (val) => `${(Number(val) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  const getNum = (id) => Math.max(0, parseFloat(document.getElementById(id)?.value) || 0);
  const escapeHtml = (text) => String(text ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  // Gerenciamento de Persistência
  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        channels: state.channels,
        items: state.items
      }));
    } catch (e) {
      console.error('Erro ao salvar no armazenamento local:', e);
    }
  }

  // Produtos de Demonstração (Evita a tela vazia na primeira visita)
  const DEMO_ITEMS = [
    {
      id: 'demo-1',
      date: new Date().toISOString(),
      product: 'Fone Bluetooth TWS Pro (Exemplo)',
      sku: 'FONE-BT-PRO',
      channel: 'Mercado Livre',
      baseCost: 34.50,
      cost: 30.00,
      packaging: 2.50,
      freight: 0.00,
      other: 0.00,
      fixed: 2.00,
      tax: 0.06,
      loss: 0.02,
      ads: 0.00,
      targetMargin: 0.25,
      commission: 0.16,
      fixedFee: 6.00,
      payment: 0.00,
      minimumPrice: 53.47,
      idealPrice: 79.90,
      profit: 19.98,
      realMargin: 0.2501,
      status: 'LUCRO ÓTIMO',
      statusClass: 'ok'
    },
    {
      id: 'demo-2',
      date: new Date().toISOString(),
      product: 'Garrafa Térmica Inox 500ml (Exemplo)',
      sku: 'GARRAFA-500',
      channel: 'Shopee',
      baseCost: 20.30,
      cost: 17.50,
      packaging: 1.80,
      freight: 0.00,
      other: 0.00,
      fixed: 1.00,
      tax: 0.06,
      loss: 0.02,
      ads: 0.00,
      targetMargin: 0.25,
      commission: 0.14,
      fixedFee: 4.00,
      payment: 0.00,
      minimumPrice: 31.97,
      idealPrice: 47.90,
      profit: 12.02,
      realMargin: 0.2509,
      status: 'LUCRO ÓTIMO',
      statusClass: 'ok'
    }
  ];

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.channels) state.channels = { ...DEFAULT_CHANNELS, ...parsed.channels };
        if (parsed.items && Array.isArray(parsed.items)) state.items = parsed.items;
      }
      
      // Se for a primeira vez e o catálogo estiver vazio, pré-carrega os produtos de demonstração
      if (!state.items || state.items.length === 0) {
        state.items = JSON.parse(JSON.stringify(DEMO_ITEMS));
        saveState();
      }

      // Verificar Licença PRO
      const savedLicense = localStorage.getItem(LICENSE_KEY);
      if (savedLicense) {
        state.isPro = true;
        state.licenseKey = savedLicense;
      }
    } catch (e) {
      console.error('Erro ao carregar dados locais:', e);
      state.channels = JSON.parse(JSON.stringify(DEFAULT_CHANNELS));
      state.items = JSON.parse(JSON.stringify(DEMO_ITEMS));
    }
  }

  // Preenchimento de Selects
  function populateChannelSelect() {
    const select = document.getElementById('channelSelect');
    if (!select) return;
    const current = select.value;
    const channelNames = Object.keys(state.channels);
    select.innerHTML = channelNames.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');

    // Verificar se veio parâmetro de canal na URL (?canal=amazon, ?canal=shopee, etc.)
    const params = new URLSearchParams(window.location.search);
    const canalParam = params.get('canal');
    if (canalParam) {
      const match = channelNames.find(c => c.toLowerCase().includes(canalParam.toLowerCase()));
      if (match) {
        select.value = match;
        updateChannelReadout();
        return;
      }
    }

    if (channelNames.includes(current)) {
      select.value = current;
    } else {
      select.value = channelNames[0] || 'Mercado Livre';
    }
    updateChannelReadout();

    // Popula também o select de Engenharia Reversa (Aba 6)
    const revSelect = document.getElementById('revChannelSelect');
    if (revSelect) {
      const curRev = revSelect.value;
      revSelect.innerHTML = channelNames.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
      if (channelNames.includes(curRev)) {
        revSelect.value = curRev;
      } else {
        revSelect.value = channelNames[0] || 'Mercado Livre';
      }
    }
  }

  function updateChannelReadout() {
    const select = document.getElementById('channelSelect');
    if (!select) return;
    const channelName = select.value;
    const c = state.channels[channelName] || DEFAULT_CHANNELS[channelName] || { commission: 0, fixedFee: 0, payment: 0, note: '', docUrl: '#' };

    const commInput = document.getElementById('channelCommissionInput');
    const feeInput = document.getElementById('channelFixedFeeInput');
    const payInput = document.getElementById('channelPaymentInput');
    const noteElem = document.getElementById('channelNoteText');
    const docLink = document.getElementById('channelDocLink');

    if (commInput) commInput.value = (Number(c.commission) || 0).toFixed(2);
    if (feeInput) feeInput.value = (Number(c.fixedFee) || 0).toFixed(2);
    if (payInput) payInput.value = (Number(c.payment) || 0).toFixed(2);
    if (noteElem) noteElem.textContent = c.note || 'Ajuste as taxas conforme a categoria exata do seu produto.';
    
    if (docLink) {
      docLink.href = c.docUrl || DEFAULT_CHANNELS[channelName]?.docUrl || '#';
      docLink.title = `Abrir tabela oficial de tarifas de ${channelName}`;
    }
  }

  // Coleta dados do formulário
  function getFormData() {
    const channelName = document.getElementById('channelSelect')?.value || 'Mercado Livre';
    const c = state.channels[channelName] || DEFAULT_CHANNELS[channelName] || { commission: 0, fixedFee: 0, payment: 0 };

    // Permite que o valor venha diretamente dos inputs editáveis se existirem
    const commissionVal = document.getElementById('channelCommissionInput') 
      ? getNum('channelCommissionInput') 
      : (c.commission || 0);

    const fixedFeeVal = document.getElementById('channelFixedFeeInput') 
      ? getNum('channelFixedFeeInput') 
      : (c.fixedFee || 0);

    const paymentVal = document.getElementById('channelPaymentInput') 
      ? getNum('channelPaymentInput') 
      : (c.payment || 0);

    return {
      product: document.getElementById('productName')?.value.trim() || '',
      sku: document.getElementById('productSku')?.value.trim() || '',
      channel: channelName,
      cost: getNum('productCost'),
      packaging: getNum('productPackaging'),
      freight: getNum('productFreight'),
      other: getNum('productOther'),
      fixed: getNum('productFixed'),
      tax: getNum('productTax') / 100,
      loss: getNum('productLoss') / 100,
      ads: getNum('productAds') / 100,
      targetMargin: getNum('targetMargin') / 100,
      commission: commissionVal / 100,
      fixedFee: fixedFeeVal,
      payment: paymentVal / 100
    };
  }

  // Cálculo Financeiro Preciso
  function calculate(data = getFormData()) {
    // Custo base total = insumos + embalagem + frete pago + variáveis extras + fixo rateado + taxa fixa do canal
    const baseCost = data.cost + data.packaging + data.freight + data.other + data.fixed + data.fixedFee;
    
    // Soma das taxas que incidem diretamente sobre o preço de venda bruto
    const totalPercentFees = data.tax + data.commission + data.payment + data.loss + data.ads;

    // Denominadores
    const minDenom = 1 - totalPercentFees;
    const idealDenom = minDenom - data.targetMargin;

    let minimumPrice = null;
    let idealPrice = null;
    let profit = null;
    let realMargin = null;
    let markup = null;
    let status = 'OK';
    let statusClass = 'ok';

    if (minDenom <= 0) {
      status = 'TAXAS EXCESSIVAS';
      statusClass = 'bad';
    } else {
      minimumPrice = baseCost / minDenom;
    }

    if (idealDenom <= 0) {
      status = 'MARGEM INVIÁVEL';
      statusClass = 'bad';
    } else if (minimumPrice !== null) {
      idealPrice = baseCost / idealDenom;
      profit = (idealPrice * minDenom) - baseCost;
      realMargin = idealPrice > 0 ? (profit / idealPrice) : 0;

      const directCosts = data.cost + data.packaging + data.freight + data.other + data.fixed;
      markup = directCosts > 0 ? (idealPrice / directCosts) : null;

      if (profit < 0) {
        status = 'PREJUÍZO';
        statusClass = 'bad';
      } else if (realMargin < 0.05) {
        status = 'MARGEM BAIXA';
        statusClass = 'warn';
      }
    }

    return {
      ...data,
      baseCost,
      totalPercentFees,
      minimumPrice,
      idealPrice,
      profit,
      realMargin,
      markup,
      status,
      statusClass
    };
  }

  // Renderiza Resultados na Tela
  function renderCalculation() {
    const result = calculate();

    const elBaseCost = document.getElementById('resBaseCost');
    const elPercentFees = document.getElementById('resPercentFees');
    const elMinPrice = document.getElementById('resMinPrice');
    const elIdealPrice = document.getElementById('resIdealPrice');
    const elProfit = document.getElementById('resProfit');
    const elMargin = document.getElementById('resMargin');
    const elStatus = document.getElementById('resStatus');
    const elNote = document.getElementById('resExplanation');

    if (elBaseCost) elBaseCost.textContent = money(result.baseCost);
    if (elPercentFees) elPercentFees.textContent = pct(result.totalPercentFees * 100);
    if (elMinPrice) elMinPrice.textContent = result.minimumPrice !== null ? money(result.minimumPrice) : '—';
    if (elIdealPrice) elIdealPrice.textContent = result.idealPrice !== null ? money(result.idealPrice) : '—';
    if (elProfit) elProfit.textContent = result.profit !== null ? money(result.profit) : '—';
    if (elMargin) elMargin.textContent = result.realMargin !== null ? pct(result.realMargin * 100) : '—';

    if (elStatus) {
      elStatus.textContent = result.status;
      elStatus.className = `status-pill ${result.statusClass}`;
    }

    if (elNote) {
      if (result.statusClass === 'bad') {
        elNote.textContent = 'A soma das taxas variáveis e da margem ultrapassa 100% do preço. Reduza a margem ou reveja os custos.';
      } else {
        const markupTxt = result.markup ? `${result.markup.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}x` : '—';
        elNote.textContent = `Preço ideal garante lucro líquido de ${money(result.profit)} com Markup multiplicador de ${markupTxt} sobre o custo direto.`;
      }
    }

    // INOVAÇÃO 1: Raio-X da Partilha do Preço de Venda
    if (result.idealPrice && result.idealPrice > 0) {
      const rev = result.idealPrice;
      const supplierCost = (result.cost || 0) + (result.packaging || 0) + (result.freight || 0);
      const channelFees = (rev * (result.commission || 0)) + (result.fixedFee || 0) + (rev * (result.payment || 0));
      const taxesAndOther = (rev * ((result.tax || 0) + (result.loss || 0) + (result.ads || 0))) + (result.fixed || 0);
      const pocketProfit = Math.max(0, result.profit || 0);

      const pCost = Math.max(0, Math.min(100, (supplierCost / rev) * 100));
      const pChannel = Math.max(0, Math.min(100, (channelFees / rev) * 100));
      const pTax = Math.max(0, Math.min(100, (taxesAndOther / rev) * 100));
      const pProfit = Math.max(0, Math.min(100, (pocketProfit / rev) * 100));

      const barC = document.getElementById('barCost');
      const barCh = document.getElementById('barChannel');
      const barT = document.getElementById('barTax');
      const barP = document.getElementById('barProfit');

      if (barC) barC.style.width = `${pCost}%`;
      if (barCh) barCh.style.width = `${pChannel}%`;
      if (barT) barT.style.width = `${pTax}%`;
      if (barP) barP.style.width = `${pProfit}%`;

      const txtC = document.getElementById('partilhaCost');
      const txtCh = document.getElementById('partilhaChannel');
      const txtT = document.getElementById('partilhaTax');
      const txtP = document.getElementById('partilhaProfit');

      if (txtC) txtC.textContent = `${pct(pCost)} (${money(supplierCost)})`;
      if (txtCh) txtCh.textContent = `${pct(pChannel)} (${money(channelFees)})`;
      if (txtT) txtT.textContent = `${pct(pTax)} (${money(taxesAndOther)})`;
      if (txtP) txtP.textContent = `${pct(pProfit)} (${money(pocketProfit)})`;
    }

    // INOVAÇÃO 2: Alerta Inteligente da Faixa Crítica dos R$ 79 do Mercado Livre
    const mlZone = document.getElementById('mlZoneCard');
    if (mlZone) {
      const curChannel = document.getElementById('channelSelect')?.value || '';
      if (curChannel.includes('Mercado Livre') && result.idealPrice) {
        mlZone.style.display = 'block';
        if (result.idealPrice >= 79 && result.idealPrice <= 95) {
          mlZone.style.background = 'rgba(245, 158, 11, 0.12)';
          mlZone.style.borderColor = 'rgba(245, 158, 11, 0.4)';
          mlZone.style.color = '#fef3c7';
          mlZone.innerHTML = `
            <div style="font-weight:700; color:#fbbf24; margin-bottom:4px; display:flex; align-items:center; gap:6px;">
              ⚠️ ZONA DA MORTE DO MERCADO LIVRE (R$ 79 a R$ 95)
            </div>
            O Mercado Livre impõe <strong>Frete Grátis obrigatório (cerca de R$ 20,00)</strong> para vendas a partir de R$ 79,00.<br>
            Vender a <strong>${money(result.idealPrice)}</strong> deixará <strong>MENOS dinheiro no seu bolso</strong> do que vender a <strong>R$ 78,90</strong>!<br>
            💡 <strong>Recomendação:</strong> Venda a <strong>R$ 78,90</strong> (sem frete obrigatório) OU suba o preço para <strong>${money(result.idealPrice + 16)}</strong> para absorver o frete com lucro.
          `;
        } else if (result.idealPrice < 79) {
          mlZone.style.background = 'rgba(16, 185, 129, 0.1)';
          mlZone.style.borderColor = 'rgba(16, 185, 129, 0.3)';
          mlZone.style.color = '#d1fae5';
          mlZone.innerHTML = `
            <div style="font-weight:700; color:#34d399; margin-bottom:2px;">
              ✅ FAIXA ECONÔMICA (Abaixo de R$ 79,00)
            </div>
            Frete 100% pago pelo comprador. Você não sofre retenção de frete grátis obrigatório no Mercado Livre.
          `;
        } else {
          mlZone.style.background = 'rgba(59, 130, 246, 0.1)';
          mlZone.style.borderColor = 'rgba(59, 130, 246, 0.25)';
          mlZone.style.color = '#e0f2fe';
          mlZone.innerHTML = `
            <div style="font-weight:700; color:#60a5fa; margin-bottom:2px;">
              📦 Frete Grátis Diluído no Ticket
            </div>
            Como seu preço (${money(result.idealPrice)}) está bem acima de R$ 79, certifique-se de preencher o frete no campo "Frete Pago pelo Vendedor" para que ele seja computado na margem.
          `;
        }
      } else {
        mlZone.style.display = 'none';
      }
    }

    // INOVAÇÃO 3: Teste de Desconto Seguro & Oferta Relâmpago
    const elMaxDiscVal = document.getElementById('resMaxDiscountVal');
    const elMaxDiscPct = document.getElementById('resMaxDiscountPct');
    const elMaxDiscTag = document.getElementById('resMaxDiscountTag');
    const promoInput = document.getElementById('promoDiscountInput');
    const elPromoProfit = document.getElementById('promoSimProfit');

    if (result.idealPrice && result.idealPrice > 0 && result.minimumPrice !== null) {
      const maxDiscountVal = Math.max(0, result.idealPrice - result.minimumPrice);
      const maxDiscountPct = (maxDiscountVal / result.idealPrice) * 100;

      if (elMaxDiscVal) elMaxDiscVal.textContent = money(maxDiscountVal);
      if (elMaxDiscPct) elMaxDiscPct.textContent = pct(maxDiscountPct);
      if (elMaxDiscTag) elMaxDiscTag.textContent = `Máx: ${pct(maxDiscountPct)}`;

      const userPromoDisc = (parseFloat(promoInput?.value) || 5) / 100;
      const promoPrice = result.idealPrice * (1 - userPromoDisc);
      const supplierCost = (result.cost || 0) + (result.packaging || 0) + (result.freight || 0);
      const promoFees = (promoPrice * ((result.commission || 0) + (result.payment || 0) + (result.tax || 0) + (result.loss || 0) + (result.ads || 0))) + (result.fixedFee || 0) + (result.fixed || 0);
      const simProfit = promoPrice - supplierCost - promoFees;

      if (elPromoProfit) {
        elPromoProfit.textContent = money(simProfit);
        elPromoProfit.style.color = simProfit > 0 ? '#34d399' : '#f87171';
      }
    }
  }

  // Adicionar produto ao catálogo
  function addProduct() {
    const result = calculate();
    if (!result.product) {
      alert('Por favor, informe o nome do produto antes de adicionar.');
      document.getElementById('productName')?.focus();
      return;
    }

    // Validação de Limite no modo Free
    if (!state.isPro && state.items.length >= 5) {
      showProModal('Você atingiu o limite de 5 produtos cadastrados na versão gratuita. Desbloqueie o Precificador Pro para adicionar produtos ilimitados!');
      return;
    }

    const newItem = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      ...result
    };

    state.items.unshift(newItem);
    saveState();
    renderProductsList();
    clearForm(true);
  }

  // Limpar formulário
  function clearForm(keepName = false) {
    if (!keepName) {
      if (document.getElementById('productName')) document.getElementById('productName').value = '';
      if (document.getElementById('productSku')) document.getElementById('productSku').value = '';
    }
    document.getElementById('productCost').value = '30.00';
    document.getElementById('productPackaging').value = '2.50';
    document.getElementById('productFreight').value = '0.00';
    document.getElementById('productOther').value = '0.00';
    document.getElementById('productFixed').value = '3.00';
    document.getElementById('productTax').value = '6.00';
    document.getElementById('productLoss').value = '2.00';
    document.getElementById('productAds').value = '0.00';
    document.getElementById('targetMargin').value = '15.00';
    renderCalculation();
  }

  // Renderizar Lista de Produtos & Métricas
  function renderProductsList() {
    const tbody = document.getElementById('productsTableBody');
    const countItems = document.getElementById('statCount');
    const avgPrice = document.getElementById('statAvgPrice');
    const totalProfit = document.getElementById('statTotalProfit');
    const alertItems = document.getElementById('statAlerts');

    if (!tbody) return;

    const items = state.items;
    if (countItems) countItems.textContent = items.length;

    const validItems = items.filter(i => i.idealPrice !== null);
    const avg = validItems.length ? validItems.reduce((acc, i) => acc + i.idealPrice, 0) / validItems.length : 0;
    if (avgPrice) avgPrice.textContent = money(avg);

    const sumProfit = items.reduce((acc, i) => acc + (i.profit || 0), 0);
    if (totalProfit) totalProfit.textContent = money(sumProfit);

    const alerts = items.filter(i => i.statusClass !== 'ok').length;
    if (alertItems) alertItems.textContent = alerts;

    if (items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align: center; padding: 40px; color: var(--text-muted);">
        Nenhum produto cadastrado ainda. Use o simulador acima para calcular e salvar seus produtos.
      </td></tr>`;
      return;
    }

    tbody.innerHTML = items.map(item => `
      <tr>
        <td>
          <strong style="color: #fff; display: block;">${escapeHtml(item.product)}</strong>
          <small style="color: var(--text-muted);">${escapeHtml(item.sku || 'Sem SKU')}</small>
        </td>
        <td><span class="badge" style="background: var(--bg-input);">${escapeHtml(item.channel)}</span></td>
        <td class="num">${money(item.baseCost)}</td>
        <td class="num" style="color: var(--text-muted);">${item.minimumPrice !== null ? money(item.minimumPrice) : '—'}</td>
        <td class="num"><strong style="color: #fff;">${item.idealPrice !== null ? money(item.idealPrice) : '—'}</strong></td>
        <td class="num" style="color: #34d399; font-weight: 700;">${item.profit !== null ? money(item.profit) : '—'}</td>
        <td class="num">${item.realMargin !== null ? pct(item.realMargin * 100) : '—'}</td>
        <td><span class="status-pill ${item.statusClass}">${escapeHtml(item.status)}</span></td>
        <td class="actions">
          <button class="btn btn-danger btn-sm" data-delete-id="${item.id}" title="Excluir produto">
            Excluir
          </button>
        </td>
      </tr>
    `).join('');

    // Event listeners para deletar
    tbody.querySelectorAll('[data-delete-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-delete-id');
        state.items = state.items.filter(i => i.id !== id);
        saveState();
        renderProductsList();
      });
    });
  }

  // Renderizar Tabela de Taxas dos Canais
  function renderChannelsTable() {
    const tbody = document.getElementById('channelsTableBody');
    if (!tbody) return;

    tbody.innerHTML = Object.keys(state.channels).map(name => {
      const c = state.channels[name];
      return `
        <tr>
          <td><strong style="color: #fff;">${escapeHtml(name)}</strong></td>
          <td class="num">
            <input type="number" step="0.01" min="0" max="100" class="input-addon-group channel-input"
                   data-channel="${escapeHtml(name)}" data-field="commission" value="${c.commission}"
                   style="width: 90px; text-align: right; padding: 6px 8px;">
          </td>
          <td class="num">
            <input type="number" step="0.01" min="0" class="input-addon-group channel-input"
                   data-channel="${escapeHtml(name)}" data-field="fixedFee" value="${c.fixedFee}"
                   style="width: 90px; text-align: right; padding: 6px 8px;">
          </td>
          <td class="num">
            <input type="number" step="0.01" min="0" max="100" class="input-addon-group channel-input"
                   data-channel="${escapeHtml(name)}" data-field="payment" value="${c.payment}"
                   style="width: 90px; text-align: right; padding: 6px 8px;">
          </td>
          <td><small style="color: var(--text-muted);">${escapeHtml(c.note || '')}</small></td>
          <td style="text-align: center;">
            <a href="${escapeHtml(c.docUrl || DEFAULT_CHANNELS[name]?.docUrl || '#')}" target="_blank" rel="noopener noreferrer" 
               class="btn btn-secondary btn-sm" style="font-size:0.75rem; padding:4px 10px; display:inline-flex; align-items:center; gap:4px; text-decoration:none; white-space:nowrap;">
              Ver Tarifas ↗
            </a>
          </td>
        </tr>
      `;
    }).join('');

    tbody.querySelectorAll('.channel-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const ch = e.target.getAttribute('data-channel');
        const field = e.target.getAttribute('data-field');
        const val = parseFloat(e.target.value) || 0;
        if (state.channels[ch]) {
          state.channels[ch][field] = val;
          saveState();
          updateChannelReadout();
          renderCalculation();
        }
      });
    });
  }

  // Exportar CSV
  function exportCSV() {
    if (!state.items.length) {
      alert('Não há produtos salvos para exportar.');
      return;
    }

    const headers = ['Produto', 'SKU', 'Canal', 'Custo Base', 'Preço Mínimo', 'Preço Ideal', 'Lucro Unitário', 'Margem Real', 'Status'];
    const rows = state.items.map(i => [
      i.product,
      i.sku || '',
      i.channel,
      i.baseCost.toFixed(2),
      i.minimumPrice ? i.minimumPrice.toFixed(2) : '',
      i.idealPrice ? i.idealPrice.toFixed(2) : '',
      i.profit ? i.profit.toFixed(2) : '',
      i.realMargin ? (i.realMargin * 100).toFixed(2) + '%' : '',
      i.status
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `precificador_produtos_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  // Backup JSON
  function backupJSON() {
    if (!state.isPro) {
      showProModal('O backup completo em JSON e a restauração de dados são recursos exclusivos do Precificador Pro.');
      return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `precificador_backup_${new Date().toISOString().slice(0,10)}.json`);
    dlAnchorElem.click();
  }

  // Restaurar JSON
  function restoreJSON(file) {
    if (!state.isPro) {
      showProModal('A restauração de backup JSON é um recurso exclusivo do Precificador Pro.');
      return;
    }

    const reader = new FileReader();
    reader.onload = function(event) {
      try {
        const imported = JSON.parse(event.target.result);
        if (imported.items && Array.isArray(imported.items)) {
          state.items = imported.items;
          if (imported.channels) state.channels = imported.channels;
          saveState();
          populateChannelSelect();
          renderChannelsTable();
          renderProductsList();
          renderCalculation();
          alert('Backup restaurado com sucesso!');
        } else {
          alert('Arquivo de backup inválido.');
        }
      } catch (err) {
        alert('Erro ao processar arquivo JSON.');
      }
    };
    reader.readAsText(file);
  }

  // Sistema de Licenciamento (Kiwify & Hotmart)
  function activateLicense(key) {
    const cleanKey = key.trim().toUpperCase();
    if (!cleanKey) return false;

    // Validação flexível: Código Kiwify (KW...), Hotmart (HP...), PRO-, e-mail ou código de 6+ caracteres
    if (cleanKey.startsWith('KW') || cleanKey.startsWith('KIWIFY') || cleanKey.startsWith('HP') || cleanKey.startsWith('PRO-') || cleanKey.includes('@') || cleanKey.length >= 6) {
      state.isPro = true;
      state.licenseKey = cleanKey;
      localStorage.setItem(LICENSE_KEY, cleanKey);
      updateProBadges();
      return true;
    }
    return false;
  }

  function updateProBadges() {
    const badge = document.getElementById('appPlanBadge');
    if (badge) {
      if (state.isPro) {
        badge.className = 'badge badge-pro';
        badge.textContent = 'PRO ATIVO';
      } else {
        badge.className = 'badge badge-warning';
        badge.textContent = 'PLANO FREE';
      }
    }
  }

  function showProModal(msg = '') {
    const modal = document.getElementById('proModal');
    const msgEl = document.getElementById('proModalMessage');
    if (msgEl && msg) msgEl.textContent = msg;
    if (modal) modal.classList.add('active');
  }

  function hideProModal() {
    const modal = document.getElementById('proModal');
    if (modal) modal.classList.remove('active');
  }

  function showWelcomeModal() {
    const modal = document.getElementById('welcomeModal');
    if (modal) modal.classList.add('active');
  }

  function hideWelcomeModal() {
    const modal = document.getElementById('welcomeModal');
    if (modal) modal.classList.remove('active');
  }

  // ==========================================
  // NOVOS MÓDULOS EXPANDIDOS (v3.5)
  // ==========================================

  // 1. Gerenciador de Abas
  function initTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-tab');
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');

        if (targetId === 'tab-comparador') renderMultiChannelComparison();
        if (targetId === 'tab-kits') renderCombos();
        if (targetId === 'tab-metas') renderGoals();
        if (targetId === 'tab-cotacao') renderWhatsAppPreview();
        if (targetId === 'tab-reversa') renderReverseEngineering();
      });
    });
  }

  // 2. Comparador Multi-Canal Lado a Lado
  function renderMultiChannelComparison() {
    const tbody = document.getElementById('multiChannelTableBody');
    if (!tbody) return;

    const baseForm = getFormData();
    const prodName = baseForm.product || 'Produto em Simulação';
    const elProd = document.getElementById('compCurrentProduct');
    const elCost = document.getElementById('compCurrentCost');

    if (elProd) elProd.textContent = prodName;
    if (elCost) elCost.textContent = money(baseForm.cost + baseForm.packaging + baseForm.freight + baseForm.other + baseForm.fixed);

    const channelNames = Object.keys(state.channels);
    const results = channelNames.map(name => {
      const c = state.channels[name];
      const itemData = {
        ...baseForm,
        channel: name,
        commission: (c.commission || 0) / 100,
        fixedFee: c.fixedFee || 0,
        payment: (c.payment || 0) / 100
      };
      return calculate(itemData);
    });

    // Identifica melhores canais
    const validResults = results.filter(r => r.idealPrice !== null && r.profit > 0);
    let maxProfit = -Infinity, minPrice = Infinity;
    validResults.forEach(r => {
      if (r.profit > maxProfit) maxProfit = r.profit;
      if (r.idealPrice < minPrice) minPrice = r.idealPrice;
    });

    tbody.innerHTML = results.map(r => {
      const isMaxProfit = r.profit && r.profit === maxProfit;
      const isMinPrice = r.idealPrice && r.idealPrice === minPrice;
      let badgeHtml = '—';
      if (isMaxProfit) badgeHtml = '<span class="badge badge-success">Maior Lucro</span>';
      else if (isMinPrice) badgeHtml = '<span class="badge" style="background:#2563eb; color:#fff;">Mais Competitivo</span>';

      return `
        <tr>
          <td><strong style="color:#fff;">${escapeHtml(r.channel)}</strong></td>
          <td class="num">${pct((r.commission + r.payment) * 100)}</td>
          <td class="num">${money(r.fixedFee)}</td>
          <td class="num" style="color:var(--text-muted);">${r.minimumPrice !== null ? money(r.minimumPrice) : '—'}</td>
          <td class="num"><strong style="color:#fff;">${r.idealPrice !== null ? money(r.idealPrice) : '—'}</strong></td>
          <td class="num" style="color:#34d399; font-weight:700;">${r.profit !== null ? money(r.profit) : '—'}</td>
          <td class="num">${r.realMargin !== null ? pct(r.realMargin * 100) : '—'}</td>
          <td>${badgeHtml}</td>
        </tr>
      `;
    }).join('');
  }

  // 3. Simulador de Kits & Combos (1x, 2x, 3x, 5x)
  function renderCombos() {
    const container = document.getElementById('comboGridContainer');
    if (!container) return;

    const baseForm = getFormData();
    const displayChannel = document.getElementById('comboChannelDisplay');
    if (displayChannel) displayChannel.value = baseForm.channel;

    const userDiscount = (parseFloat(document.getElementById('comboDiscountPct')?.value) || 5) / 100;
    const packDiscount = (parseFloat(document.getElementById('comboPackDiscount')?.value) || 25) / 100;

    const multipliers = [
      { qty: 1, label: '1 Unidade (Avulso)', packMult: 1.0, disc: 0, tag: 'Padrão' },
      { qty: 2, label: 'Kit Leve 2', packMult: 1.5, disc: userDiscount, tag: 'Mais Vendido' },
      { qty: 3, label: 'Kit Leve 3', packMult: 1.8, disc: userDiscount * 1.3, tag: 'Melhor Custo-Benefício' },
      { qty: 5, label: 'Super Combo 5x', packMult: 2.2, disc: userDiscount * 1.8, tag: 'Maior Lucro Bruto' }
    ];

    const singleResult = calculate(baseForm);
    const singlePrice = singleResult.idealPrice || 0;

    container.innerHTML = multipliers.map((m, idx) => {
      // Custos proporcionais
      const cost = baseForm.cost * m.qty;
      const packaging = (baseForm.packaging * m.qty) * (1 - (packDiscount * (m.qty > 1 ? 1 : 0)));
      const freight = baseForm.freight; // Frete único diluído
      const fixed = baseForm.fixed * (m.qty > 1 ? 1.3 : 1.0); // Fixo diluído

      const comboData = {
        ...baseForm,
        cost,
        packaging,
        freight,
        fixed,
        targetMargin: baseForm.targetMargin
      };

      const res = calculate(comboData);
      const standardFullPrice = singlePrice * m.qty;
      const discountedKitPrice = res.idealPrice ? res.idealPrice * (1 - m.disc) : 0;
      const clientSavings = Math.max(0, standardFullPrice - discountedKitPrice);
      const unitPriceInKit = m.qty > 0 ? discountedKitPrice / m.qty : 0;

      const isFeatured = idx === 1; // 2 unidades é o mais popular

      return `
        <div class="combo-card ${isFeatured ? 'featured' : ''}">
          ${m.tag ? `<span class="combo-badge" style="${isFeatured ? 'background:#10b981;' : 'background:#3b82f6;'}">${escapeHtml(m.tag)}</span>` : ''}
          <div>
            <h3 style="font-size:1.15rem; color:#fff; margin-bottom:4px;">${escapeHtml(m.label)}</h3>
            <span style="font-size:0.76rem; color:var(--text-muted);">${m.qty} unidades no mesmo pacote</span>

            <div style="margin:16px 0 10px;">
              <span style="font-size:0.74rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Preço Sugerido do Kit</span>
              <div style="font-size:1.6rem; font-weight:800; color:#fff;">${money(discountedKitPrice)}</div>
              <small style="color:var(--text-muted);">${money(unitPriceInKit)} cada item no kit</small>
            </div>

            ${clientSavings > 0 ? `
              <div style="background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.25); border-radius:var(--radius-sm); padding:6px 10px; margin-bottom:12px;">
                <small style="color:#60a5fa; font-weight:700;">Cliente economiza ${money(clientSavings)}</small>
              </div>
            ` : '<div style="height:32px;"></div>'}
          </div>

          <div style="border-top:1px solid var(--border); padding-top:12px; margin-top:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-size:0.8rem; color:var(--text-muted);">Lucro Líquido no Bolso:</span>
              <strong style="color:#34d399; font-size:1.05rem;">${money(res.profit)}</strong>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // 4. Calculadora de Metas de Lucro & Ponto de Equilíbrio
  function renderGoals() {
    const fixedCosts = parseFloat(document.getElementById('goalFixedCosts')?.value) || 0;
    const targetProfit = parseFloat(document.getElementById('goalTargetProfit')?.value) || 0;
    const workingDays = parseInt(document.getElementById('goalWorkingDays')?.value) || 30;

    const baseForm = getFormData();
    const res = calculate(baseForm);

    const price = res.idealPrice || 50;
    const unitProfit = res.profit && res.profit > 0 ? res.profit : (price * 0.20); // Fallback 20% margem

    const totalTargetProfit = fixedCosts + targetProfit;
    const unitsMonth = unitProfit > 0 ? Math.ceil(totalTargetProfit / unitProfit) : 0;
    const unitsDay = workingDays > 0 ? Math.ceil(unitsMonth / workingDays) : 0;
    const targetRevenue = unitsMonth * price;

    const marginRate = price > 0 ? (unitProfit / price) : 0.2;
    const breakEvenRevenue = marginRate > 0 ? (fixedCosts / marginRate) : 0;

    const elBreakEven = document.getElementById('goalBreakEvenRevenue');
    const elTargetRev = document.getElementById('goalTargetRevenue');
    const elUnitsMonth = document.getElementById('goalUnitsMonth');
    const elUnitsDay = document.getElementById('goalUnitsDay');

    if (elBreakEven) elBreakEven.textContent = money(breakEvenRevenue);
    if (elTargetRev) elTargetRev.textContent = money(targetRevenue);
    if (elUnitsMonth) elUnitsMonth.textContent = `${unitsMonth.toLocaleString('pt-BR')} unid.`;
    if (elUnitsDay) elUnitsDay.textContent = `${unitsDay.toLocaleString('pt-BR')} / dia`;
  }

  // 5. Cotação Formatada para WhatsApp
  function generateWhatsAppText() {
    const baseForm = getFormData();
    const res = calculate(baseForm);

    const storeName = document.getElementById('quoteStoreName')?.value.trim() || 'Nossa Loja';
    const payTerms = document.getElementById('quotePaymentTerms')?.value.trim() || 'À vista no Pix ou até 12x no cartão';
    const shipTerms = document.getElementById('quoteShippingTerms')?.value.trim() || 'Pronta entrega • Envio em até 24h';

    const prodName = baseForm.product || 'Produto de Alta Qualidade';
    const sku = baseForm.sku ? `\n🏷️ *Código:* ${baseForm.sku}` : '';
    const unitPrice = res.idealPrice ? money(res.idealPrice) : 'Sob Consulta';

    // Cálculo rápido dos kits
    const kit2Price = res.idealPrice ? money(res.idealPrice * 2 * 0.95) : '—';
    const kit3Price = res.idealPrice ? money(res.idealPrice * 3 * 0.92) : '—';

    return `Olá! Segue a cotação oficial da *${storeName}*:

📦 *Produto:* ${prodName}${sku}

💰 *Opções Especiais de Preço:*
• 1 Unidade: *${unitPrice}*
• Kit Leve 2: *${kit2Price}* (com 5% OFF)
• Kit Leve 3: *${kit3Price}* (Mais Vendido 🔥 com 8% OFF)

💳 *Pagamento:* ${payTerms}
🚚 *Envio:* ${shipTerms}

Ficou com alguma dúvida ou deseja que eu já separe o seu pedido? 😊`;
  }

  function renderWhatsAppPreview() {
    const preview = document.getElementById('whatsappPreviewText');
    if (!preview) return;
    preview.textContent = generateWhatsAppText();
  }

  function copyWhatsAppQuote() {
    const text = generateWhatsAppText();
    navigator.clipboard.writeText(text).then(() => {
      const toast = document.getElementById('toast');
      if (toast) {
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
      }
    }).catch(err => {
      alert('Cotação copiada com sucesso!');
    });
  }

  // INOVAÇÃO 4: Engenharia Reversa do Concorrente (Preço Alvo)
  function renderReverseEngineering() {
    const compPrice = parseFloat(document.getElementById('revCompPrice')?.value) || 0;
    const channelName = document.getElementById('revChannelSelect')?.value || 'Mercado Livre';
    const targetMargin = (parseFloat(document.getElementById('revTargetMargin')?.value) || 20) / 100;
    const tax = (parseFloat(document.getElementById('revTax')?.value) || 6) / 100;
    const packaging = parseFloat(document.getElementById('revPackaging')?.value) || 0;

    const channel = state.channels[channelName] || DEFAULT_CHANNELS[channelName] || { commission: 16, fixedFee: 6, payment: 0 };
    const commissionRate = (channel.commission || 0) / 100;
    const paymentRate = (channel.payment || 0) / 100;
    const fixedFee = channel.fixedFee || 0;

    // Cálculo Reverso:
    const expectedProfit = compPrice * targetMargin;
    const channelFees = (compPrice * (commissionRate + paymentRate)) + fixedFee;
    const taxAndPackaging = (compPrice * tax) + packaging;
    const maxSupplierCost = compPrice - expectedProfit - channelFees - taxAndPackaging;

    const elMaxCost = document.getElementById('revMaxCost');
    const elExpProfit = document.getElementById('revExpectedProfit');
    const elExpMargin = document.getElementById('revExpectedMargin');
    const elChanFees = document.getElementById('revChannelFees');
    const elTaxFixed = document.getElementById('revTaxAndFixed');
    const elStatusBadge = document.getElementById('revStatusBadge');
    const elVerdictBox = document.getElementById('revVerdictBox');
    const elVerdictTitle = document.getElementById('revVerdictTitle');
    const elVerdictText = document.getElementById('revVerdictText');

    if (elMaxCost) elMaxCost.textContent = money(maxSupplierCost);
    if (elExpProfit) elExpProfit.textContent = money(expectedProfit);
    if (elExpMargin) elExpMargin.textContent = `${pct(targetMargin * 100)} do valor da venda`;
    if (elChanFees) elChanFees.textContent = money(channelFees);
    if (elTaxFixed) elTaxFixed.textContent = money(taxAndPackaging);

    if (maxSupplierCost > 0) {
      if (elStatusBadge) {
        elStatusBadge.textContent = 'PRODUTO VIÁVEL';
        elStatusBadge.className = 'status-pill ok';
      }
      if (elVerdictBox) {
        elVerdictBox.style.background = 'rgba(16, 185, 129, 0.08)';
        elVerdictBox.style.borderColor = 'rgba(16, 185, 129, 0.25)';
      }
      if (elVerdictTitle) {
        elVerdictTitle.style.color = '#34d399';
        elVerdictTitle.textContent = '✅ PRODUTO VIÁVEL COM MARGEM PROTEGIDA:';
      }
      if (elVerdictText) {
        elVerdictText.innerHTML = `Você pode pagar até <strong>${money(maxSupplierCost)}</strong> no fornecedor para vender a <strong>${money(compPrice)}</strong> e ainda garantir <strong>${money(expectedProfit)}</strong> líquido no bolso por cada venda.`;
      }
    } else {
      if (elStatusBadge) {
        elStatusBadge.textContent = 'PREÇO INVIÁVEL';
        elStatusBadge.className = 'status-pill bad';
      }
      if (elVerdictBox) {
        elVerdictBox.style.background = 'rgba(239, 68, 68, 0.08)';
        elVerdictBox.style.borderColor = 'rgba(239, 68, 68, 0.25)';
      }
      if (elVerdictTitle) {
        elVerdictTitle.style.color = '#f87171';
        elVerdictTitle.textContent = '🛑 ALERTA DE PREJUÍZO (TAXAS MAIORES QUE A MARGEM):';
      }
      if (elVerdictText) {
        elVerdictText.innerHTML = `Mesmo que o fornecedor te entregue este produto <strong>DE GRAÇA (custo zero)</strong>, as taxas do marketplace (${money(channelFees)}) somadas aos impostos de DAS (${money(compPrice * tax)}) e embalagem inviabilizam a margem de ${pct(targetMargin * 100)}. Não concorra com esse preço!`;
      }
    }
  }

  // Inicialização
  function init() {
    loadState();
    populateChannelSelect();
    renderChannelsTable();
    updateProBadges();
    initTabs();

    // Eventos de Inputs do Formulário Principal
    const inputIds = [
      'productName', 'productSku', 'productCost', 'productPackaging',
      'productFreight', 'productOther', 'productFixed', 'productTax',
      'productLoss', 'productAds', 'targetMargin'
    ];

    inputIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', () => {
        renderCalculation();
        // Atualiza módulos se a aba estiver aberta
        const activeTab = document.querySelector('.tab-btn.active')?.getAttribute('data-tab');
        if (activeTab === 'tab-comparador') renderMultiChannelComparison();
        if (activeTab === 'tab-kits') renderCombos();
        if (activeTab === 'tab-metas') renderGoals();
        if (activeTab === 'tab-cotacao') renderWhatsAppPreview();
      });
    });

    const channelSel = document.getElementById('channelSelect');
    if (channelSel) {
      channelSel.addEventListener('change', () => {
        updateChannelReadout();
        renderCalculation();
        const activeTab = document.querySelector('.tab-btn.active')?.getAttribute('data-tab');
        if (activeTab === 'tab-comparador') renderMultiChannelComparison();
      });
    }

    // Eventos dos inputs editáveis de taxas do canal
    const channelFeeInputs = ['channelCommissionInput', 'channelFixedFeeInput', 'channelPaymentInput'];
    channelFeeInputs.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          const currentChannel = document.getElementById('channelSelect')?.value;
          if (currentChannel && state.channels[currentChannel]) {
            state.channels[currentChannel].commission = getNum('channelCommissionInput');
            state.channels[currentChannel].fixedFee = getNum('channelFixedFeeInput');
            state.channels[currentChannel].payment = getNum('channelPaymentInput');
            saveState();
          }
          renderCalculation();
          const activeTab = document.querySelector('.tab-btn.active')?.getAttribute('data-tab');
          if (activeTab === 'tab-comparador') renderMultiChannelComparison();
          if (activeTab === 'tab-kits') renderCombos();
          if (activeTab === 'tab-cotacao') renderWhatsAppPreview();
        });
      }
    });

    // Botão restaurar taxas sugeridas do canal
    const btnResetFees = document.getElementById('btnResetChannelFees');
    if (btnResetFees) {
      btnResetFees.addEventListener('click', () => {
        const currentChannel = document.getElementById('channelSelect')?.value;
        if (currentChannel && DEFAULT_CHANNELS[currentChannel]) {
          state.channels[currentChannel] = JSON.parse(JSON.stringify(DEFAULT_CHANNELS[currentChannel]));
          saveState();
          updateChannelReadout();
          renderCalculation();
          const activeTab = document.querySelector('.tab-btn.active')?.getAttribute('data-tab');
          if (activeTab === 'tab-comparador') renderMultiChannelComparison();
        }
      });
    }

    // Eventos específicos dos novos módulos
    ['comboDiscountPct', 'comboPackDiscount'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', renderCombos);
    });

    ['goalFixedCosts', 'goalTargetProfit', 'goalWorkingDays'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', renderGoals);
    });

    ['quoteStoreName', 'quotePaymentTerms', 'quoteShippingTerms'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', renderWhatsAppPreview);
    });

    document.getElementById('btnCopyWhatsApp')?.addEventListener('click', copyWhatsAppQuote);

    // Botões de Ação
    document.getElementById('btnAddProduct')?.addEventListener('click', addProduct);
    document.getElementById('btnClearForm')?.addEventListener('click', () => clearForm(false));
    document.getElementById('btnExportCsv')?.addEventListener('click', exportCSV);
    document.getElementById('btnBackupJson')?.addEventListener('click', backupJSON);
    document.getElementById('btnPrint')?.addEventListener('click', () => window.print());

    // Input de Restauração JSON
    const jsonFileInput = document.getElementById('jsonFileInput');
    if (jsonFileInput) {
      jsonFileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          restoreJSON(e.target.files[0]);
        }
      });
    }

    // Modal Pro e Ativação Kiwify
    document.getElementById('btnOpenProModal')?.addEventListener('click', () => showProModal());
    document.getElementById('btnCloseProModal')?.addEventListener('click', hideProModal);
    document.getElementById('btnSubmitLicense')?.addEventListener('click', () => {
      const input = document.getElementById('licenseKeyInput');
      if (input && activateLicense(input.value)) {
        alert('Parabéns! Sua licença Pro foi ativada com sucesso neste dispositivo.');
        hideProModal();
      } else {
        alert('Código de transação ou chave inválida. Verifique o código enviado no seu e-mail de compra pela Kiwify.');
      }
    });

    // Modal de Boas-Vindas Pós-Compra Kiwify
    const urlParams = new URLSearchParams(window.location.search);
    const hasOrderParam = urlParams.has('order_id') || urlParams.has('kiwify') || urlParams.has('from') || urlParams.has('status');
    const isFirstVisitAfterPay = hasOrderParam || urlParams.get('welcome') === '1';

    if (isFirstVisitAfterPay) {
      showWelcomeModal();
    }

    document.getElementById('btnStartActivation')?.addEventListener('click', () => {
      hideWelcomeModal();
      showProModal('Cole seu código de transação ou o seu e-mail de compra da Kiwify abaixo para liberar o Pro.');
      setTimeout(() => document.getElementById('licenseKeyInput')?.focus(), 200);
    });

    document.getElementById('btnCloseWelcomeModal')?.addEventListener('click', hideWelcomeModal);

    // Limpar tudo
    document.getElementById('btnClearAllItems')?.addEventListener('click', () => {
      if (state.items.length && confirm('Deseja realmente apagar todos os produtos salvos no seu dispositivo?')) {
        state.items = [];
        saveState();
        renderProductsList();
      }
    });

    // Eventos da Engenharia Reversa (Aba 6)
    ['revCompPrice', 'revTargetMargin', 'revTax', 'revPackaging'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', renderReverseEngineering);
    });
    document.getElementById('revChannelSelect')?.addEventListener('change', renderReverseEngineering);

    // Evento do Simulador de Cupom / Promoção
    document.getElementById('promoDiscountInput')?.addEventListener('input', renderCalculation);

    // Renderização Inicial
    renderCalculation();
    renderProductsList();
    renderMultiChannelComparison();
    renderCombos();
    renderGoals();
    renderWhatsAppPreview();
    renderReverseEngineering();
  }

  // Inicializar após DOM carregado
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
