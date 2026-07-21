// ── VN Engenharia — Core JS ──

const CHAVE_CFG   = 'vne_config_v1';
const DEFAULTS_CFG = { owner: 'Plinio19', repo: 'vn-engenharia', branch: 'main' };

// ── CONFIG ──
function getConfig() {
  try { return { ...DEFAULTS_CFG, ...JSON.parse(localStorage.getItem(CHAVE_CFG)) }; }
  catch { return { ...DEFAULTS_CFG }; }
}
function setConfig(cfg) { localStorage.setItem(CHAVE_CFG, JSON.stringify(cfg)); }
function configurado()   { const c = getConfig(); return !!(c.owner && c.repo && c.token); }

// ── GITHUB API ──
function ghHeaders() {
  const c = getConfig();
  return { 'Authorization': `token ${c.token}`, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github.v3+json' };
}
function ghUrl(path) {
  const c = getConfig();
  return `https://api.github.com/repos/${c.owner}/${c.repo}/contents/${path}`;
}
function toB64(str)  { return btoa(unescape(encodeURIComponent(str))); }
function fromB64(str){ return decodeURIComponent(escape(atob(str))); }

async function ghGet(path) {
  const res = await fetch(ghUrl(path), { headers: ghHeaders() });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub GET ${path}: HTTP ${res.status}`);
  return res.json();
}
async function ghPut(path, content, sha, mensagem) {
  const c = getConfig();
  const body = { message: mensagem || `Atualização — ${new Date().toLocaleString('pt-BR')}`, content: toB64(content), branch: c.branch };
  if (sha) body.sha = sha;
  const res = await fetch(ghUrl(path), { method: 'PUT', headers: ghHeaders(), body: JSON.stringify(body) });
  if (!res.ok) { const e = await res.json(); throw new Error(e.message || `HTTP ${res.status}`); }
  return res.json();
}

// ── DATA HELPERS ──
async function carregarDados(path) {
  const data = await ghGet(path);
  if (!data) return { lista: [], sha: null };
  return { lista: JSON.parse(fromB64(data.content.replace(/\n/g, ''))), sha: data.sha };
}
async function salvarDados(path, lista, sha, mensagem) {
  const res = await ghPut(path, JSON.stringify(lista, null, 2), sha, mensagem);
  return res.content.sha;
}

// ── LOCAL STORAGE ──
function salvarLocal(chave, dados)   { localStorage.setItem(chave, JSON.stringify(dados)); }
function carregarLocal(chave)        { try { return JSON.parse(localStorage.getItem(chave)); } catch { return null; } }

// ── UTILS ──
function uid()  { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
function esc(s) { return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function hl(texto, busca) {
  if (!busca || !texto) return esc(texto);
  return esc(texto).replace(new RegExp(`(${busca.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark class="pesquisa-destaque">$1</mark>');
}
function formatarData(iso) {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}
function hoje() { return new Date().toISOString().slice(0, 10); }
function formatarMoeda(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
function parseMoeda(s) {
  if (!s) return 0;
  return parseFloat(String(s).replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
}

// ── CATEGORIAS ──
const CATEGORIAS = {
  receita: [
    { value: 'medicao',      label: 'Medição' },
    { value: 'adiantamento', label: 'Adiantamento' },
    { value: 'parcela',      label: 'Parcela do Contrato' },
    { value: 'reembolso-in', label: 'Reembolso (entrada)' },
    { value: 'outros-rec',   label: 'Outros' },
  ],
  despesa: [
    { value: 'mao-de-obra',  label: 'Mão de Obra' },
    { value: 'material',     label: 'Material' },
    { value: 'ferramenta',   label: 'Ferramenta' },
    { value: 'combustivel',  label: 'Combustível / Gasolina' },
    { value: 'comissao',     label: 'Comissão' },
    { value: 'hospedagem',   label: 'Hospedagem' },
    { value: 'reembolso',    label: 'Reembolso Funcionário' },
    { value: 'imposto',      label: 'Imposto / Taxa' },
    { value: 'outros',       label: 'Outros' },
  ],
};

function labelCategoria(tipo, value) {
  const lista = CATEGORIAS[tipo] || [];
  return lista.find(c => c.value === value)?.label || value || '—';
}

function opcoesCategoria(tipo) {
  const lista = CATEGORIAS[tipo] || [];
  return lista.map(c => `<option value="${c.value}">${c.label}</option>`).join('');
}

// ── STATUS / BADGES ──
function badgeStatus(s) {
  const m = { pago:'verde', pendente:'amarelo', agendado:'azul', cancelado:'cinza' };
  const l = { pago:'Pago', pendente:'Pendente', agendado:'Agendado', cancelado:'Cancelado' };
  return `<span class="badge ${m[s]||'cinza'}">${l[s]||s}</span>`;
}

// ── DOCUMENTO IMPRIMÍVEL (Pedido de Compra, listas de material...) ──
function abrirDocumentoImpressao(titulo, subtitulo, corpoHtml) {
  const w = window.open('', '_blank');
  if (!w) { toast('Permita pop-ups para gerar o documento.', 'aviso'); return; }
  w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/><title>${titulo}</title>
    <style>
      * { box-sizing:border-box; }
      body { font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; padding:32px; color:#111827; max-width:900px; margin:0 auto; }
      h1 { font-size:1.3rem; margin:0 0 2px; }
      .sub { color:#6B7280; font-size:.85rem; margin-bottom:22px; }
      table { width:100%; border-collapse:collapse; margin-top:10px; }
      th, td { border:1px solid #E5E7EB; padding:8px 10px; font-size:.85rem; text-align:left; }
      th { background:#F1F5F9; text-transform:uppercase; font-size:.68rem; letter-spacing:.04em; color:#6B7280; }
      .footer { margin-top:26px; font-size:.72rem; color:#6B7280; border-top:1px solid #E5E7EB; padding-top:10px; }
      .btn-imprimir { margin-bottom:18px; padding:9px 18px; background:#05AAFB; color:#fff; border:none; border-radius:8px; font-weight:700; cursor:pointer; font-size:.85rem; }
      @media print { .no-print { display:none !important; } }
    </style></head><body>
    <button class="no-print btn-imprimir" onclick="window.print()">🖨️ Imprimir / Salvar como PDF</button>
    <h1>${titulo}</h1>
    <div class="sub">${subtitulo}</div>
    ${corpoHtml}
    <div class="footer">Gerado em ${new Date().toLocaleString('pt-BR')} — VN Engenharia</div>
    </body></html>`);
  w.document.close();
}

// ── EXPORTAR MATERIAIS FALTANTES (obras "cliente fornece o material") ──
function gerarDocumentoMateriaisFaltantes(obra, etapasDaObra) {
  const linhas = [];
  (etapasDaObra||[]).forEach(e => (e.materiais||[]).forEach(m => {
    const falt = Math.max((m.qtdPrevista||0) - (m.qtdEntregue||0), 0);
    if (falt > 0) linhas.push({ etapa: e.nome, ...m, faltante: falt });
  }));
  if (!linhas.length) { toast('Nenhum material faltante encontrado.', 'aviso'); return; }
  const corpo = `<table><thead><tr>
      <th>Etapa</th><th>Material</th><th>Unidade</th><th>Qtd Prevista</th><th>Já Entregue</th><th>Faltante</th>
    </tr></thead><tbody>
    ${linhas.map(l => `<tr>
      <td>${esc(l.etapa)}</td><td>${esc(l.nome)}</td><td>${esc(l.unidade||'—')}</td>
      <td>${l.qtdPrevista||0}</td><td>${l.qtdEntregue||0}</td><td><strong>${l.faltante}</strong></td>
    </tr>`).join('')}
    </tbody></table>`;
  const sub = `${obra.cliente?`Cliente: ${esc(obra.cliente)} · `:''}Gerado em ${new Date().toLocaleDateString('pt-BR')}`;
  abrirDocumentoImpressao(`Materiais Faltantes — ${esc(obra.nome)}`, sub, corpo);
}

// ── PEDIDO DE COMPRA ↔ ENTREGA (interligação) ──
// Ao registrar entrega de um material vinculado a um pedido, atualiza o item e o status do pedido.
function atualizarPedidoAposEntrega(pedidosCompra, material) {
  if (!material.pedidoCompraId) return null;
  const pedido = (pedidosCompra||[]).find(p => p.id === material.pedidoCompraId);
  if (!pedido) return null;
  const item = (pedido.itens||[]).find(i => i.materialId === material.id);
  if (!item) return null;
  item.qtdRecebida = material.qtdEntregue || 0;
  const todosCompletos = pedido.itens.every(i => (i.qtdRecebida||0) >= (i.qtd||0));
  const algumRecebido  = pedido.itens.some(i => (i.qtdRecebida||0) > 0);
  pedido.status = todosCompletos ? 'recebido' : algumRecebido ? 'parcial' : 'aberto';
  return pedido;
}

// ── TOAST ──
function toast(msg, tipo = '') {
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.textContent = msg;
  let c = document.getElementById('toasts');
  if (!c) { c = document.createElement('div'); c.id = 'toasts'; c.className = 'toast-container'; document.body.appendChild(c); }
  c.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .35s'; setTimeout(() => el.remove(), 350); }, 3200);
}

// ── SYNC STATUS ──
function setSyncStatus(cor, texto) {
  const dot  = document.getElementById('sync-dot');
  const span = document.getElementById('sync-texto');
  if (dot)  dot.className  = `sync-dot${cor !== 'verde' ? ' ' + cor : ''}`;
  if (span) span.textContent = texto;
}

// ── BASE PATH (GitHub Pages) ──
function _basePath() {
  const baseEl = document.querySelector('base');
  if (baseEl) return baseEl.href.replace(/\/$/, '');
  if (window.location.hostname.endsWith('.github.io')) {
    return '/' + window.location.pathname.split('/').filter(Boolean)[0];
  }
  return '';
}

// ── SIDEBAR ──
const MODULOS = [
  { id: 'dashboard',        label: 'Dashboard',          icone: '📊', href: '/index.html' },
  { grupo: 'Cadastros' },
  { id: 'cadastros',        label: 'Cadastro Geral',  icone: '👥', href: '/cadastros/' },
  { id: 'obras',            label: 'Obras',              icone: '🏗️', href: '/obras/' },
  { id: 'compras',          label: 'Compras de Obra',    icone: '🛒', href: '/compras/' },
  { grupo: 'Financeiro' },
  { id: 'lancamentos',      label: 'Lançamentos',        icone: '📝', href: '/lancamentos/' },
  { id: 'contas-pagar',     label: 'Contas a Pagar',     icone: '💸', href: '/contas-pagar/' },
  { id: 'contas-receber',   label: 'Contas a Receber',   icone: '💰', href: '/contas-receber/' },
  { grupo: 'Análise' },
  { id: 'extrato',          label: 'Classificar Extrato',icone: '🏦', href: '/extrato/' },
  { id: 'conciliacao',      label: 'Conciliação Banc.',  icone: '⚖️', href: '/conciliacao/' },
  { id: 'relatorios',       label: 'Relatório por Obra', icone: '📈', href: '/relatorios/' },
];

function buildSidebar(moduloAtivo) {
  const root = _basePath();
  const navItems = MODULOS.map(m => {
    if (m.grupo) return `<div class="nav-grupo">${m.grupo}</div>`;
    return `<a class="nav-item ${m.id === moduloAtivo ? 'ativo' : ''}" href="${root}${m.href}">
      <span class="icone">${m.icone}</span><span>${m.label}</span></a>`;
  }).join('');
  return `<div class="sidebar" id="sidebar">
    <div class="sidebar-logo">
      <div class="nome">VN <span>Engenharia</span></div>
      <div class="versao">Gestão de Obras</div>
    </div>
    <nav class="sidebar-nav">${navItems}</nav>
    <div class="sidebar-footer">
      VN Engenharia © 2026<br>
      <a href="#" onclick="abrirConfig()">⚙️ Configurações</a>
    </div>
  </div>`;
}

// ── CONFIG MODAL ──
function abrirConfig() {
  let m = document.getElementById('modal-cfg');
  if (!m) {
    m = document.createElement('div');
    m.id = 'modal-cfg';
    m.className = 'overlay';
    m.innerHTML = `<div class="modal" style="max-width:420px;">
      <div class="modal-header">
        <h2>⚙️ Configurações GitHub</h2>
        <button class="btn-fechar" onclick="document.getElementById('modal-cfg').classList.remove('aberto')">✕</button>
      </div>
      <div class="modal-body" style="display:flex;flex-direction:column;gap:12px;padding:0 20px 4px;">
        <div class="form-campo"><label>Usuário GitHub</label><input id="cfg-owner" type="text" autocomplete="off" name="vne-owner-nofill"/></div>
        <div class="form-campo"><label>Repositório</label><input id="cfg-repo" type="text" autocomplete="off" name="vne-repo-nofill"/></div>
        <div class="form-campo"><label>Branch</label><input id="cfg-branch" type="text" autocomplete="off" name="vne-branch-nofill"/></div>
        <div class="form-campo">
          <label>Token de Acesso (ghp_...)</label>
          <input id="cfg-token" type="password" placeholder="ghp_..." autocomplete="new-password"/>
          <span class="hint">github.com/settings/tokens → marque <strong>repo</strong></span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span id="cfg-badge" style="font-size:0.78rem;color:var(--texto-leve);">—</span>
          <button class="btn btn-outline btn-sm" onclick="testarConfig()">Testar conexão</button>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-outline" onclick="document.getElementById('modal-cfg').classList.remove('aberto')">Cancelar</button>
        <button class="btn btn-primary" onclick="salvarConfig()">✓ Salvar</button>
      </div>
    </div>`;
    document.body.appendChild(m);
  }
  const c = getConfig();
  document.getElementById('cfg-owner').value  = c.owner  || '';
  document.getElementById('cfg-repo').value   = c.repo   || '';
  document.getElementById('cfg-branch').value = c.branch || 'main';
  document.getElementById('cfg-token').value  = c.token  || '';
  m.classList.add('aberto');
  m.onclick = e => { if (e.target === m) m.classList.remove('aberto'); };
}

async function testarConfig() {
  const owner = document.getElementById('cfg-owner').value.trim();
  const repo  = document.getElementById('cfg-repo').value.trim();
  const token = document.getElementById('cfg-token').value.trim();
  const badge = document.getElementById('cfg-badge');
  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: { Authorization: `token ${token}` } });
    if (res.ok) { badge.textContent = '✓ Conectado'; badge.style.color = 'var(--verde)'; toast('Conectado!', 'sucesso'); }
    else        { badge.textContent = '✗ Não encontrado'; badge.style.color = 'var(--vermelho)'; toast('Repositório não encontrado.', 'erro'); }
  } catch { toast('Erro de rede.', 'erro'); }
}

function salvarConfig() {
  const c = {
    owner:  document.getElementById('cfg-owner').value.trim(),
    repo:   document.getElementById('cfg-repo').value.trim(),
    branch: document.getElementById('cfg-branch').value.trim() || 'main',
    token:  document.getElementById('cfg-token').value.trim(),
  };
  if (!c.owner || !c.repo || !c.token) { toast('Preencha todos os campos.', 'erro'); return; }
  setConfig(c);
  document.getElementById('modal-cfg').classList.remove('aberto');
  toast('Salvo! Recarregando...', 'sucesso');
  setTimeout(() => location.reload(), 1200);
}
