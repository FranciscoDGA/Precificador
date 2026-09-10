/**
 * Landing Page - Interações, FAQ Accordion e Simulador Rápido
 */

(function() {
  'use strict';

  // Simulador Rápido da Hero Section
  const demoCost = document.getElementById('demoCost');
  const demoChannel = document.getElementById('demoChannel');
  const demoTax = document.getElementById('demoTax');
  const demoMargin = document.getElementById('demoMargin');

  const demoResMin = document.getElementById('demoResMin');
  const demoResIdeal = document.getElementById('demoResIdeal');
  const demoResProfit = document.getElementById('demoResProfit');

  const channelRates = {
    'mercadolivre': { commission: 0.16, fixedFee: 6.0 },
    'amazon': { commission: 0.15, fixedFee: 2.0 },
    'shopee': { commission: 0.20, fixedFee: 4.0 },
    'shein': { commission: 0.16, fixedFee: 0.0 }
  };

  function updateDemo() {
    if (!demoCost || !demoChannel || !demoTax || !demoMargin) return;

    const cost = Math.max(0, parseFloat(demoCost.value) || 0);
    const tax = Math.max(0, (parseFloat(demoTax.value) || 0) / 100);
    const margin = Math.max(0, (parseFloat(demoMargin.value) || 0) / 100);
    const channelKey = demoChannel.value;
    const channel = channelRates[channelKey] || { commission: 0.16, fixedFee: 6.0 };

    const baseCost = cost + channel.fixedFee;
    const varFees = tax + channel.commission;
    const minDenom = 1 - varFees;
    const idealDenom = minDenom - margin;

    const money = val => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    if (minDenom > 0 && idealDenom > 0) {
      const minPrice = baseCost / minDenom;
      const idealPrice = baseCost / idealDenom;
      const profit = (idealPrice * minDenom) - baseCost;

      if (demoResMin) demoResMin.textContent = money(minPrice);
      if (demoResIdeal) demoResIdeal.textContent = money(idealPrice);
      if (demoResProfit) demoResProfit.textContent = money(profit);
    } else {
      if (demoResMin) demoResMin.textContent = '—';
      if (demoResIdeal) demoResIdeal.textContent = 'Inviável';
      if (demoResProfit) demoResProfit.textContent = '—';
    }
  }

  [demoCost, demoChannel, demoTax, demoMargin].forEach(el => {
    if (el) el.addEventListener('input', updateDemo);
  });

  // FAQ Accordion
  document.querySelectorAll('.faq-question').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const isOpen = item.classList.contains('open');

      // Fecha outros itens
      document.querySelectorAll('.faq-item').forEach(other => {
        other.classList.remove('open');
      });

      if (!isOpen) {
        item.classList.add('open');
      }
    });
  });

  // Executa o cálculo inicial da demo
  updateDemo();

})();
