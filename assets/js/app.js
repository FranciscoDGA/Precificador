/**
 * Precificador Pro - Motor Financeiro e Gestor de Produtos
 * Armazenamento 100% Local (Offline First)
 */

(function() {
  'use strict';

  const STORAGE_KEY = 'precificador_pro_db_v2';
  const LICENSE_KEY = 'precificador_pro_license';

  // Canais padrões com taxas de mercado atualizadas
  const DEFAULT_CHANNELS = {
    'Mercado Livre': { commission: 16.0, fixedFee: 6.0, payment: 0.0, note: 'Varia por categoria e reputação. Frete grátis em itens acima de R$ 79.' },
    'Amazon': { commission: 15.0, fixedFee: 2.0, payment: 0.0, note: 'Varia de 8% a 15% conforme categoria. Plano individual ou profissional.' },
    'Shopee': { commission: 14.0, fixedFee: 4.0, payment: 0.0, note: 'Taxa padrão 14% + 6% no programa de frete grátis (máx R$ 100 comissão).' },
    'Shein': { commission: 16.0, fixedFee: 0.0, payment: 0.0, note: 'Comissão sobre o valor total do pedido com frete incluído.' },
    'TikTok Shop': { commission: 10.0, fixedFee: 2.0, payment: 0.0, note: 'Canal em expansão no Brasil, taxas promocionais por categoria.' },
    'Magalu': { commission: 16.0, fixedFee: 3.0, payment: 0.0, note: 'Varia conforme categoria e antecipação de repasse.' },
    'Loja Própria / WhatsApp': { commission: 0.0, fixedFee: 0.0, payment: 3.99, note: 'Venda direta. Considere apenas a taxa do gateway de pagamento ou cartão.' }
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

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.channels) state.channels = { ...DEFAULT_CHANNELS, ...parsed.channels };
        if (parsed.items && Array.isArray(parsed.items)) state.items = parsed.items;
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
      state.items = [];
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
  }

  function updateChannelReadout() {
    const select = document.getElementById('channelSelect');
    if (!select) return;
    const channelName = select.value;
    const c = state.channels[channelName] || { commission: 0, fixedFee: 0, payment: 0, note: '' };

    const commElem = document.getElementById('readoutCommission');
    const feeElem = document.getElementById('readoutFixedFee');
    const payElem = document.getElementById('readoutPayment');
    const noteElem = document.getElementById('channelNoteText');

    if (commElem) commElem.textContent = pct(c.commission);
    if (feeElem) feeElem.textContent = money(c.fixedFee);
    if (payElem) payElem.textContent = pct(c.payment);
    if (noteElem) noteElem.textContent = c.note || 'Taxa padrão configurada.';
  }

  // Coleta dados do formulário
  function getFormData() {
    const channelName = document.getElementById('channelSelect')?.value || 'Mercado Livre';
    const c = state.channels[channelName] || { commission: 0, fixedFee: 0, payment: 0 };

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
      commission: (c.commission || 0) / 100,
      fixedFee: c.fixedFee || 0,
      payment: (c.payment || 0) / 100
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

  // Sistema de Licenciamento Hotmart
  function activateLicense(key) {
    const cleanKey = key.trim().toUpperCase();
    if (!cleanKey) return false;

    // Regra de validação flexível: Código Hotmart (ex: HP...) ou Chave PRO
    if (cleanKey.startsWith('HP') || cleanKey.startsWith('PRO-') || cleanKey.length >= 8) {
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

  // Inicialização
  function init() {
    loadState();
    populateChannelSelect();
    renderChannelsTable();
    updateProBadges();

    // Eventos de Inputs do Formulário
    const inputIds = [
      'productName', 'productSku', 'productCost', 'productPackaging',
      'productFreight', 'productOther', 'productFixed', 'productTax',
      'productLoss', 'productAds', 'targetMargin'
    ];

    inputIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', renderCalculation);
    });

    const channelSel = document.getElementById('channelSelect');
    if (channelSel) {
      channelSel.addEventListener('change', () => {
        updateChannelReadout();
        renderCalculation();
      });
    }

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

    // Modal Pro e Ativação Hotmart
    document.getElementById('btnOpenProModal')?.addEventListener('click', () => showProModal());
    document.getElementById('btnCloseProModal')?.addEventListener('click', hideProModal);
    document.getElementById('btnSubmitLicense')?.addEventListener('click', () => {
      const input = document.getElementById('licenseKeyInput');
      if (input && activateLicense(input.value)) {
        alert('Parabéns! Sua licença Pro foi ativada com sucesso neste dispositivo.');
        hideProModal();
      } else {
        alert('Código de transação ou chave de licença inválida. Verifique o código enviado no seu e-mail pela Hotmart.');
      }
    });

    // Limpar tudo
    document.getElementById('btnClearAllItems')?.addEventListener('click', () => {
      if (state.items.length && confirm('Deseja realmente apagar todos os produtos salvos no seu dispositivo?')) {
        state.items = [];
        saveState();
        renderProductsList();
      }
    });

    // Renderização Inicial
    renderCalculation();
    renderProductsList();
  }

  // Inicializar após DOM carregado
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
