/* ═══════════════════════════════════════════════
   PreçoField — App principal
═══════════════════════════════════════════════ */

const API = '';

// ── Estado global ────────────────────────────
let paginaAtual = 'pesquisas';
let pesquisas = [];
let produtos = [];
let pesquisaEditando = null; // objeto da pesquisa aberta no editor
let itensEditor = [];        // itens em edição (array local)
let tipoPesquisa = 'geral';

// ── Navegação ────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const pg = btn.dataset.page;
    navegarPara(pg);
  });
});

function navegarPara(pg) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-' + pg).classList.add('active');
  document.querySelector(`[data-page="${pg}"]`)?.classList.add('active');
  paginaAtual = pg;

  if (pg === 'pesquisas') carregarPesquisas();
  if (pg === 'produtos') carregarProdutos();
}

// ── Helpers ──────────────────────────────────
function fecharModal(id) {
  document.getElementById(id).style.display = 'none';
}

function abrirModal(id) {
  document.getElementById(id).style.display = 'flex';
}

function formatarMoeda(v) {
  if (!v && v !== 0) return '-';
  return 'R$ ' + parseFloat(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function formatarData(d) {
  return new Date(d).toLocaleDateString('pt-BR');
}

// ── PRODUTOS ─────────────────────────────────
async function carregarProdutos() {
  const r = await fetch(`${API}/api/produtos`);
  produtos = await r.json();
  renderProdutos();
  atualizarDatalistProdutos();
}

function renderProdutos() {
  const tbody = document.querySelector('#tabela-produtos tbody');
  if (!produtos.length) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--cinza-400);padding:32px">Nenhum produto cadastrado.</td></tr>`;
    return;
  }
  tbody.innerHTML = produtos.map(p => `
    <tr>
      <td>${p.nome}</td>
      <td>${p.codigo || '-'}</td>
      <td>${p.categoria || '-'}</td>
      <td>
        <div class="tabela-actions">
          <button class="btn btn-sm btn-outline" onclick="editarProduto('${p._id}')">Editar</button>
          <button class="btn btn-sm btn-danger" onclick="removerProduto('${p._id}')">✕</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function atualizarDatalistProdutos() {
  const dl = document.getElementById('lista-meus-produtos');
  dl.innerHTML = produtos.map(p => `<option value="${p.nome}">`).join('');
}

document.getElementById('btn-novo-produto').addEventListener('click', () => {
  document.getElementById('produto-id').value = '';
  document.getElementById('produto-nome').value = '';
  document.getElementById('produto-codigo').value = '';
  document.getElementById('produto-categoria').value = '';
  document.getElementById('modal-produto-titulo').textContent = 'Novo Produto';
  abrirModal('modal-produto');
});

function editarProduto(id) {
  const p = produtos.find(x => x._id === id);
  if (!p) return;
  document.getElementById('produto-id').value = p._id;
  document.getElementById('produto-nome').value = p.nome;
  document.getElementById('produto-codigo').value = p.codigo || '';
  document.getElementById('produto-categoria').value = p.categoria || '';
  document.getElementById('modal-produto-titulo').textContent = 'Editar Produto';
  abrirModal('modal-produto');
}

async function removerProduto(id) {
  if (!confirm('Remover este produto?')) return;
  await fetch(`${API}/api/produtos/${id}`, { method: 'DELETE' });
  carregarProdutos();
}

document.getElementById('btn-salvar-produto').addEventListener('click', async () => {
  const id = document.getElementById('produto-id').value;
  const nome = document.getElementById('produto-nome').value.trim();
  const codigo = document.getElementById('produto-codigo').value.trim();
  const categoria = document.getElementById('produto-categoria').value.trim();
  if (!nome) { alert('Informe o nome do produto.'); return; }

  if (id) {
    await fetch(`${API}/api/produtos/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, codigo, categoria })
    });
  } else {
    await fetch(`${API}/api/produtos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, codigo, categoria })
    });
  }
  fecharModal('modal-produto');
  carregarProdutos();
});

// ── PESQUISAS ─────────────────────────────────
async function carregarPesquisas() {
  const r = await fetch(`${API}/api/pesquisas`);
  pesquisas = await r.json();
  renderPesquisas();
}

function renderPesquisas() {
  const el = document.getElementById('lista-pesquisas');
  if (!pesquisas.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <p>Nenhuma pesquisa ainda. Clique em <strong>+ Nova Pesquisa</strong> para começar.</p>
      </div>`;
    return;
  }
  el.innerHTML = pesquisas.map(p => `
    <div class="card-pesquisa ${p.tipo === 'comparada' ? 'tipo-comparada' : ''}">
      <span class="card-badge ${p.tipo === 'comparada' ? 'badge-comparada' : 'badge-geral'}">
        ${p.tipo === 'comparada' ? '⚖️ Comparada' : '📋 Geral'}
      </span>
      <h3>${p.titulo}</h3>
      <p class="card-meta">${(p.itens || []).length} item(s) · Criada em ${formatarData(p.criadoEm)}</p>
      <div class="card-actions">
        <button class="btn btn-sm btn-primary" onclick="abrirEditor('${p._id}')">Abrir</button>
        <button class="btn btn-sm btn-outline" onclick="exportarPDF('${p._id}')">⬇ PDF</button>
        <button class="btn btn-sm btn-danger" onclick="removerPesquisa('${p._id}')">✕</button>
      </div>
    </div>
  `).join('');
}

document.getElementById('btn-nova-pesquisa').addEventListener('click', () => {
  abrirModal('modal-tipo');
});

// Seleção do tipo no modal
document.querySelectorAll('.tipo-card').forEach(card => {
  card.addEventListener('click', () => {
    const tipo = card.dataset.tipo;
    fecharModal('modal-tipo');
    iniciarNovaPesquisa(tipo);
  });
});

function iniciarNovaPesquisa(tipo) {
  tipoPesquisa = tipo;
  pesquisaEditando = null;
  itensEditor = [];
  document.getElementById('editor-titulo-input').value = '';
  document.getElementById('editor-titulo-h').textContent = 'Nova Pesquisa';
  document.getElementById('editor-tipo-label').textContent = tipo === 'geral' ? 'Pesquisa Geral' : 'Pesquisa Comparada';
  document.getElementById('label-compativel').style.display = tipo === 'comparada' ? 'flex' : 'none';
  renderItensEditor();
  mostrarEditor();
}

async function abrirEditor(id) {
  const r = await fetch(`${API}/api/pesquisas/${id}`);
  const p = await r.json();
  pesquisaEditando = p;
  tipoPesquisa = p.tipo;
  itensEditor = [...(p.itens || [])];
  document.getElementById('editor-titulo-input').value = p.titulo;
  document.getElementById('editor-titulo-h').textContent = p.titulo || 'Pesquisa';
  document.getElementById('editor-tipo-label').textContent = p.tipo === 'geral' ? 'Pesquisa Geral' : 'Pesquisa Comparada';
  document.getElementById('label-compativel').style.display = p.tipo === 'comparada' ? 'flex' : 'none';
  renderItensEditor();
  mostrarEditor();
}

function mostrarEditor() {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('page-editor').classList.add('active');
  carregarProdutos(); // para o datalist
}

document.getElementById('btn-voltar').addEventListener('click', () => {
  navegarPara('pesquisas');
});

async function removerPesquisa(id) {
  if (!confirm('Remover esta pesquisa?')) return;
  await fetch(`${API}/api/pesquisas/${id}`, { method: 'DELETE' });
  carregarPesquisas();
}

// ── SALVAR PESQUISA ───────────────────────────
document.getElementById('btn-salvar-pesquisa').addEventListener('click', async () => {
  const titulo = document.getElementById('editor-titulo-input').value.trim();
  if (!titulo) { alert('Informe o título da pesquisa.'); return; }

  const payload = { titulo, tipo: tipoPesquisa, itens: itensEditor };

  if (pesquisaEditando) {
    await fetch(`${API}/api/pesquisas/${pesquisaEditando._id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    pesquisaEditando = { ...pesquisaEditando, ...payload };
  } else {
    const r = await fetch(`${API}/api/pesquisas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    pesquisaEditando = await r.json();
  }

  document.getElementById('editor-titulo-h').textContent = titulo;
  alert('Pesquisa salva com sucesso!');
});

// ── EXPORTAR PDF ─────────────────────────────
document.getElementById('btn-exportar-pdf').addEventListener('click', () => {
  if (!pesquisaEditando) { alert('Salve a pesquisa primeiro.'); return; }
  exportarPDF(pesquisaEditando._id);
});

function exportarPDF(id) {
  window.open(`${API}/api/relatorio/${id}`, '_blank');
}

// ── ITENS DO EDITOR ───────────────────────────
function renderItensEditor() {
  const el = document.getElementById('lista-itens');

  if (!itensEditor.length) {
    el.innerHTML = `<div class="no-items">Nenhum item adicionado. Clique em <strong>+ Adicionar Item</strong>.</div>`;
    return;
  }

  if (tipoPesquisa === 'comparada') {
    // agrupar por produtoCompativel
    const grupos = {};
    itensEditor.forEach((item, idx) => {
      const chave = item.produtoCompativel || 'Sem implemento';
      if (!grupos[chave]) grupos[chave] = [];
      grupos[chave].push({ ...item, _idx: idx });
    });

    el.innerHTML = Object.entries(grupos).map(([grupo, items]) => `
      <div class="grupo-label">⚙️ Implemento: ${grupo}</div>
      ${items.map(item => cardItem(item, item._idx)).join('')}
    `).join('');
  } else {
    el.innerHTML = itensEditor.map((item, idx) => cardItem(item, idx)).join('');
  }
}

function cardItem(item, idx) {
  const compat = tipoPesquisa === 'comparada'
    ? `<div class="item-field"><strong>Compatível</strong><span>${item.produtoCompativel || '-'}</span></div>` : '';
  return `
    <div class="item-card">
      <div class="item-idx">${idx + 1}</div>
      <div class="item-info">
        <div class="item-field"><strong>Produto</strong><span>${item.produto || '-'}</span></div>
        ${compat}
        <div class="item-field"><strong>Valor</strong><span class="item-valor">${formatarMoeda(item.valor)}</span></div>
        <div class="item-field"><strong>Frete</strong><span>${item.tipoFrete || '-'}</span></div>
        <div class="item-field"><strong>Opcionais</strong><span>${item.opcionais || '-'}</span></div>
        <div class="item-field"><strong>Região</strong><span>${item.regiao || '-'}</span></div>
        ${item.observacoes ? `<div class="item-field span2"><strong>Obs.</strong><span>${item.observacoes}</span></div>` : ''}
      </div>
      <div class="item-actions">
        <button class="btn btn-sm btn-outline" onclick="editarItem(${idx})">Editar</button>
        <button class="btn btn-sm btn-danger" onclick="removerItem(${idx})">✕</button>
      </div>
    </div>
  `;
}

document.getElementById('btn-add-item').addEventListener('click', () => {
  abrirModalItem(-1);
});

function editarItem(idx) {
  abrirModalItem(idx);
}

function removerItem(idx) {
  itensEditor.splice(idx, 1);
  renderItensEditor();
}

function abrirModalItem(idx) {
  document.getElementById('item-idx').value = idx;
  const item = idx >= 0 ? itensEditor[idx] : {};

  document.getElementById('item-produto').value = item.produto || '';
  document.getElementById('item-compativel').value = item.produtoCompativel || '';
  document.getElementById('item-valor').value = item.valor || '';
  document.getElementById('item-frete').value = item.tipoFrete || '';
  document.getElementById('item-opcionais').value = item.opcionais || '';
  document.getElementById('item-regiao').value = item.regiao || '';
  document.getElementById('item-obs').value = item.observacoes || '';

  document.getElementById('modal-item-titulo').textContent = idx >= 0 ? 'Editar Item' : 'Adicionar Item';
  document.getElementById('label-compativel').style.display = tipoPesquisa === 'comparada' ? 'flex' : 'none';

  abrirModal('modal-item');
}

document.getElementById('btn-salvar-item').addEventListener('click', () => {
  const produto = document.getElementById('item-produto').value.trim();
  const valor = document.getElementById('item-valor').value;
  if (!produto) { alert('Informe o nome do produto.'); return; }
  if (!valor) { alert('Informe o valor.'); return; }

  const idx = parseInt(document.getElementById('item-idx').value);
  const item = {
    produto,
    produtoCompativel: document.getElementById('item-compativel').value.trim(),
    valor: parseFloat(valor),
    tipoFrete: document.getElementById('item-frete').value,
    opcionais: document.getElementById('item-opcionais').value.trim(),
    regiao: document.getElementById('item-regiao').value.trim(),
    observacoes: document.getElementById('item-obs').value.trim(),
  };

  if (idx >= 0) {
    itensEditor[idx] = item;
  } else {
    itensEditor.push(item);
  }

  fecharModal('modal-item');
  renderItensEditor();
});

// Fechar modais ao clicar no overlay
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.style.display = 'none';
  });
});

// ── Init ─────────────────────────────────────
carregarPesquisas();
