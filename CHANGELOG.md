# CHANGELOG — VN Engenharia (mudanças a considerar portar para o Construbox)

Este arquivo documenta tudo que foi construído em cima da base original do Construbox,
desde a cópia inicial. Serve como roteiro para outro agente aplicar as mesmas melhorias
no repositório do Construbox, caso façam sentido lá também.

Cada seção lista: o que mudou, por quê, em quais arquivos, e os nomes exatos de
funções/campos/variáveis envolvidos.

---

## 1. Botão "🔄 Sincronizar agora" em todas as páginas

**Por quê:** o usuário queria uma garantia visual de que dá pra forçar a busca dos dados
mais recentes do GitHub a qualquer momento, além do sync automático que já ocorre a
cada ação.

**O quê:** adicionado em `index.html`, `cadastros/index.html`, `obras/index.html`,
`obras/cronograma/index.html`, `compras/index.html`, `lancamentos/index.html`,
`contas-pagar/index.html`, `contas-receber/index.html`, `extrato/index.html`,
`conciliacao/index.html`, `relatorios/index.html`:

```html
<button class="btn btn-outline btn-sm no-print" onclick="init()" title="Buscar a versão mais recente do GitHub agora">🔄 Sincronizar agora</button>
```

Colocado dentro de `.topbar-acoes`, ao lado do `.sync-pill`. Reaproveita a própria
função `init()` de cada página (que já busca do GitHub e re-renderiza), então não
precisou de nenhuma função nova.

---

## 2. Garantir que TODA mutação sincroniza imediatamente (sem passos "batch")

**Por quê:** algumas ações no Cronograma só ficavam em memória até o usuário clicar
"Salvar" num modal maior — se fechasse o navegador antes, perdia a alteração.

**O quê:** em `obras/cronograma/index.html`, as funções `addMat()`, `removerMat()`,
`solicitarCompra()` (depois removida, ver seção 5) e `salvarMatUpd()` passaram a ser
`async` e chamar `await sync(mensagem)` (ou equivalente) logo após mutar o array
`etapas` em memória — igual todo o resto do sistema já fazia (`salvar()` em
`obras/index.html`, `salvarSocio()`/`salvarCliente()`/`salvarPrestador()` em
`cadastros/index.html`, etc.).

O checklist também passou a sincronizar a cada mudança: `addClItem()`,
`toggleClItem()`, `removerClItem()` em `obras/cronograma/index.html` viraram
`async` com `await sync('Checklist atualizado')`.

**Recomendação:** auditar o Construbox procurando por funções que só fazem
`renderX(e)` sem um `await sync(...)`/`await salvarDados(...)` logo depois.

---

## 3. Campo "Material da Obra" (quem compra: empresa ou cliente)

**Por quê:** distinguir obras onde o material está incluso no contrato (a empresa
compra) de obras onde o cliente fornece o próprio material.

**O quê:**
- Novo campo no objeto Obra: `materialPorConta` — valores `'empresa'` ou `'cliente'`
  (obras antigas sem o campo são tratadas como `'cliente'` por padrão em todo o código,
  via `obra?.materialPorConta === 'empresa'`).
- Select no formulário de Obra em `obras/index.html` (`id="f-material"`), salvo em
  `salvar()`, populado em `abrirModal()` (default `'cliente'`) e `editar()`.
- Badge na listagem de obras: 🛒 Empresa / 👤 Cliente.

Esse campo é o gatilho de comportamento condicional usado em quase tudo daqui pra baixo.

---

## 4. Assistente de 3 passos para "Nova Etapa" no Cronograma

**Por quê:** antes, criar uma etapa e depois configurar checklist e materiais exigia
abrir 3 modais separados manualmente. Pedido do usuário: um fluxo guiado.

**O quê** (tudo em `obras/cronograma/index.html`):
- `iniciarAssistenteEtapa()` — chamado pelo botão "+ Nova Etapa", seta
  `modoAssistente = true` e abre o modal de etapa normal.
- Variável global `let modoAssistente = false;`.
- `aplicarModoAssistenteEtapa()` / `aplicarModoAssistenteChecklist()` /
  `aplicarModoAssistenteMateriais()` — mostram/escondem os botões "Seguinte"/"Voltar"
  vs. os botões normais "Salvar"/"Fechar"/"Cancelar", chamadas no fim de
  `abrirModalEtapa()`, `editarEtapa()`, `abrirChecklist()`, `abrirMateriais()`.
- `salvarEtapa()` foi alterado: se `modoAssistente`, ao invés de fechar o modal,
  chama `abrirChecklist(etapa.id)` (passo 2).
- `voltarParaEtapa()`, `seguirParaMateriais()`, `voltarParaChecklist()`,
  `concluirAssistente()` — navegação entre os 3 passos. Fecham o modal atual
  manipulando `classList` diretamente (**sem** chamar `fecharModalEtapa()` /
  `fecharChecklist()` / `fecharMateriais()`, porque essas funções resetam
  `modoAssistente = false`).
- Cada `fecharX()` (fechar via ✕ ou Cancelar) reseta `modoAssistente = false` —
  é o que permite abandonar o assistente a qualquer passo sem travar o estado.
- Cada modal ganhou uma linha de progresso (`#wiz-progress-etapa`,
  `#wiz-progress-cl`, `#wiz-progress-mat`) escondida por padrão, mostrada só em
  modo assistente ("Passo 1 de 3 — Dados da Etapa", etc).
- Os ícones 📋 (checklist) e 📦 (materiais) nos cards de etapa continuam existindo
  normalmente para edição posterior fora do assistente.

---

## 5. Sistema completo de Pedido de Compra

**Por quê:** o antigo botão "🛒 Solicitar compra" só marcava `pedidoCompra: true` sem
capturar fornecedor, prazo, valores — não servia pra nada além de um checkbox.

**O quê:**
- Novo arquivo de dados: `data/pedidos_compra.json` (array, inicia `[]`).
- Modelo do Pedido:
  ```json
  {
    "id": "...", "obraId": "...", "fornecedor": "...", "contato": "...",
    "prazoEntrega": "2026-08-01", "formaPagamento": "...", "condicoes": "...",
    "status": "aberto",
    "dataPedido": "2026-07-21", "criadoEm": "2026-07-21",
    "itens": [{
      "etapaId": "...", "materialId": "...", "nome": "...", "etapaNome": "...",
      "unidade": "...", "qtd": 100, "valorUnit": 35, "valorTotal": 3500, "qtdRecebida": 0
    }],
    "valorTotal": 3500
  }
  ```
  `status` é `aberto | parcial | recebido | cancelado`.
- Campo novo no material: `pedidoCompraId` (aponta pro `id` do pedido, além do já
  existente `pedidoCompra: boolean`).
- Em `compras/index.html`:
  - Modal `#modal-pedido` — fornecedor (com autocomplete, ver seção 7), contato,
    prazo, forma de pagamento, condições, tabela de itens com valor unitário editável
    e total calculado ao vivo.
  - `abrirModalPedido(itensRef)` recebe `[{etapaId, matId}, ...]` — usado tanto pelo
    botão individual "Gerar pedido" quanto pelo botão em lote (seleção múltipla via
    checkbox na aba Necessidade de Compra).
  - `confirmarPedidoCompra()` monta o objeto pedido, seta `pedidoCompra`,
    `pedidoCompraId`, `fornecedor` em cada material selecionado, salva em
    `pedidosCompra` e sincroniza **dois** arquivos: `syncEtapas()` (etapas.json) e
    `syncPedidos()` (pedidos_compra.json).
  - A aba antes chamada "🛒 Pedidos Solicitados" virou **"🛒 Pedidos de Compra"**
    (`renderPedidos()` reescrita): agora itera `pedidosCompra` (documentos), não mais
    uma lista solta de materiais. Cada card mostra fornecedor, itens, status, valor
    total, e botão **"🖨️ Imprimir Pedido"** (`imprimirPedido(pedidoId)`, usa
    `abrirDocumentoImpressao` do core.js — ver seção 9).
- **Interligação entrega ↔ pedido** (o pedido central do pedido): quando o usuário
  registra entrega de um material vinculado a um pedido — seja pela tela de Compras
  (`confirmarEntrega()`) ou direto no Cronograma (`salvarMatUpd()`) — a função
  `atualizarPedidoAposEntrega(pedidosCompra, material)` (nova, em `core.js`) localiza
  o item correspondente pelo `materialId`, atualiza `qtdRecebida` e recalcula
  `status` do pedido (`recebido` se todos os itens completos, `parcial` se algum
  recebido, `aberto` senão). As duas páginas chamam essa função e, se ela retornar
  um pedido atualizado, sincronizam `pedidos_compra.json` também.

---

## 6. "Necessidade de Compra" com comportamento diferente por tipo de obra

**Por quê:** consequência direta do campo `materialPorConta` (seção 3) — obra
"empresa" precisa virar Pedido de Compra; obra "cliente" só precisa avisar o cliente
do que falta.

**O quê** (`compras/index.html`, `renderNecessidade()`):
- Obras `materialPorConta === 'empresa'`: lista materiais com `!m.pedidoCompra`,
  com checkbox de seleção (`toggleSelecao`, `toggleSelecaoObra`) e botão
  **"🛒 Gerar pedido"** por material, ou **"🛒 Gerar pedido com selecionados"** em
  lote (`gerarPedidoSelecionados()`) — ambos abrem `abrirModalPedido(...)`.
- Obras `materialPorConta !== 'empresa'` (cliente): lista materiais com
  `qtdEntregue < qtdPrevista`, **sem checkbox**, com botão **"📥 Registrar entrega"**
  por material e um botão **"📤 Exportar Material"** no cabeçalho do card da obra
  (`exportarNecessidadeObra(obraId)`).
- O mesmo botão **"📤 Exportar Material"** também aparece:
  - No cabeçalho de cada card de obra "cliente" nas abas **Pendentes para Iniciar**
    e **Todos os Materiais** (mesma função `exportarNecessidadeObra`).
  - Fixo na barra de filtro no topo da página (`#btn-exportar-mat-topo`),
    visível quando uma obra específica "cliente" está selecionada no dropdown —
    funciona em qualquer aba, inclusive Pedidos de Compra (que nunca tem cards de
    obra "cliente" pra embutir o botão).
  - No **Cronograma** (`obras/cronograma/index.html`): botão no topbar
    `#btn-exportar-mat` (`exportarMateriaisObra()`, exporta a obra inteira) e um
    ícone 📤 por etapa nos cards (`exportarMateriaisEtapa(etapaId)`, exporta só
    aquela etapa) — ambos só visíveis quando `obra.materialPorConta !== 'empresa'`.
- **No Cronograma**, o antigo botão manual "🛒 Solicitar compra" por material foi
  **removido**. No lugar, um selo sem clique:
  - Obra empresa + `pedidoCompra`: "🛒 Em pedido"
  - Obra empresa + sem pedido: "🧾 Auto (Compras)"
  - Obra cliente: nenhum selo (só o botão de Atualizar quantidades continua).

---

## 7. Catálogos de Materiais e Fornecedores + autocomplete

**Por quê:** evitar digitar o mesmo material/fornecedor toda vez; permitir puxar de
um cadastro existente.

**O quê:**
- `data/materiais_catalogo.json` — `{id, nome, unidade, categoria, valorReferencia, obs}`.
- `data/fornecedores.json` — `{id, nome, cnpj, categoria, contato, telefone, email, obs}`.
- Ambos com CRUD completo na página `cadastros/index.html` (ver seção 8), seguindo
  exatamente o mesmo padrão de Sócios/Clientes/Prestadores (array em memória +
  `salvarLocal` + `salvarDados` no `configurado()`).
- **Autocomplete de Materiais** em `obras/cronograma/index.html`: o campo
  `#mn-nome` (adicionar material) ganhou `list="lista-catalogo-mat"` +
  `<datalist id="lista-catalogo-mat">` populado por `renderCatalogoDatalist()`.
  Ao escolher/digitar um nome que bate com o catálogo, `preencherPorCatalogo()`
  preenche a Unidade automaticamente (só se o campo já não tiver conteúdo).
- **Autocomplete de Fornecedores** em `compras/index.html`: o campo
  `#ped-fornecedor` (no modal de Pedido de Compra) ganhou `list="lista-catalogo-forn"`
  + datalist populado por `renderCatalogoFornDatalist()`. `preencherPorFornecedor()`
  preenche o campo Contato com `contato · telefone · email` do cadastro.
- Em ambos os casos o catálogo continua permitindo digitar algo novo — o datalist
  só sugere, não trava o campo.
- Busca de CNPJ (BrasilAPI) generalizada: `buscarCNPJGenerico(prefixo)` em
  `cadastros/index.html` substitui a antiga `buscarCNPJ()` fixa em `mcli-*`, agora
  reutilizada tanto por Clientes (`buscarCNPJGenerico('mcli')`) quanto por
  Fornecedores (`buscarCNPJGenerico('mforn')`).

---

## 8. Cadastros reorganizado em abas

**Por quê:** virou 5 categorias empilhadas numa grade só (Sócios, Clientes,
Prestadores, Materiais, Fornecedores) — poluído visualmente.

**O quê** (`cadastros/index.html`): trocado por abas usando o componente `.chip`
(mesmo padrão de Compras/Cronograma/Extrato — ver seção 10): **👥 Sócios**,
**🏢 Clientes**, **🔨 Funcionários**, **📦 Materiais**, **🚚 Fornecedores**.
`setTab(t)` alterna `display:none`/`''` nos painéis `#painel-socios`,
`#painel-clientes`, `#painel-funcionarios`, `#painel-materiais`,
`#painel-fornecedores`. A entidade interna continua se chamando `prestadores`
(`data/prestadores.json`, `vne_prestadores`) para não quebrar `extrato/index.html`
e `lancamentos/index.html`, que também leem esses dados — só o rótulo visível virou
"Funcionários".

Título/subtítulo da página e o item do menu lateral (`MODULOS` em `core.js`)
renomeados de "Sócios & Clientes" para **"Cadastro Geral"**.

---

## 9. Utilitário compartilhado de documento imprimível (`core.js`)

**Por quê:** tanto o Pedido de Compra quanto a lista de materiais faltantes quanto
os relatórios precisavam gerar um "documento" pronto pra imprimir/salvar como PDF.

**O quê** — três funções novas em `assets/core.js`:
```js
abrirDocumentoImpressao(titulo, subtitulo, corpoHtml)
```
Abre uma nova aba (`window.open`) com HTML/CSS autocontido (título, subtítulo,
botão "🖨️ Imprimir / Salvar como PDF", o `corpoHtml` passado, rodapé com data de
geração). Usado por `imprimirPedido()`, `exportarRelatorioInterno()`,
`exportarRelatorioCliente()`, `gerarDocumentoMateriaisFaltantes()`.

```js
gerarDocumentoMateriaisFaltantes(obra, etapasDaObra)
```
Monta uma tabela (Etapa, Material, Unidade, Qtd Prevista, Já Entregue, Faltante)
com os materiais cuja `qtdPrevista > qtdEntregue`, e chama
`abrirDocumentoImpressao`. Usado por `exportarNecessidadeObra`,
`exportarMateriaisObra`, `exportarMateriaisEtapa` (seção 6).

```js
atualizarPedidoAposEntrega(pedidosCompra, material)
```
Ver seção 5 — interliga entrega e pedido de compra.

---

## 10. Correção de CSS: `.chip` (botões de aba) sem estilo

**Bug real, não só estética:** a classe `.chip`/`.chip.ativo` usada nos botões de
abas (Pendentes, Todos os Materiais, etc.) só estava definida localmente dentro do
`<style>` de `obras/cronograma/index.html` e `extrato/index.html`. Em
`compras/index.html` a classe era usada mas nunca definida em lugar nenhum — os
botões caíam no visual cru do navegador (feios, sem cor, sem hover).

**Correção:** `.chip`/`.chip:hover`/`.chip.ativo`/`.chip.ativo:hover` movidos para
`assets/core.css` (seção `/* ── CHIP (abas/filtros) ── */`, logo após `.badge`),
removida a duplicação nos dois arquivos que já tinham a definição local.

```css
.chip { padding: 6px 16px; border-radius: 999px; font-size: .82rem; font-weight: 600;
  cursor: pointer; border: 1.5px solid var(--cinza); background: var(--branco);
  color: var(--texto-leve); transition: all .15s; white-space: nowrap; }
.chip:hover     { background: var(--fundo2); color: var(--texto); border-color: var(--cinza2); }
.chip.ativo     { background: var(--brand); color: #fff; border-color: var(--brand); box-shadow: 0 2px 6px rgba(5,170,251,.35); }
.chip.ativo:hover { background: var(--brand-hover); border-color: var(--brand-hover); }
```

---

## 11. Responsividade para telas grandes (sem depender de zoom do navegador)

**Por quê:** em monitores grandes a fonte base fixa (14px) e o `.page { max-width:
1400px; }` deixavam tudo pequeno com muito espaço vazio sobrando.

**O quê** (`assets/core.css`, novo bloco no fim do arquivo): como praticamente todo
o texto do design system usa `rem` (não `px`), bastou escalar a fonte base do
`<html>` por media query pra cascatear pra títulos, tabelas, botões e badges em
todas as páginas:

```css
@media (min-width: 1600px) { html, body { font-size: 15px; } .page { max-width: 1600px; } }
@media (min-width: 1920px) { html, body { font-size: 16px; } .page { max-width: 1800px; }
  :root { --sidebar-w: 250px; --topbar-h: 64px; } }
@media (min-width: 2560px) { html, body { font-size: 18px; } .page { max-width: 2100px; }
  :root { --sidebar-w: 270px; --topbar-h: 68px; } }
```

---

## 12. Lista de materiais no Cronograma sem rolagem horizontal

**Bug de UX:** a tabela de materiais dentro do modal "📦 Materiais da Etapa" tinha
13 colunas fixas (Material, Un., Classificação, Prev., Mín Ini., Comprado, Entregue,
Utilizado, Saldo, Fornecedor, Valor Prev., Status, Ações) — forçava scroll lateral
em qualquer tamanho de tela.

**Correção:** `renderMatBody()` em `obras/cronograma/index.html` reescrita — trocou
`<table>` por cards empilhados (`.mat-linha`), com as quantidades numa
`.mat-linha-stats` que usa `flex-wrap: wrap`, então nunca precisa de rolagem lateral,
só quebra linha conforme o espaço disponível. Classes CSS novas adicionadas no
`<style>` da própria página: `.mat-linha`, `.mat-linha-topo`, `.mat-linha-nome`,
`.mat-linha-tag`, `.mat-linha-stats`, `.mat-linha-acoes`, `.mat-linha-selo`.

---

## 13. Relatório por Obra: dados físicos + exportação Interno/Cliente

**Por quê:** o relatório só mostrava dados financeiros — faltava % de execução por
etapa, e não havia como gerar algo apresentável ao cliente sem expor custos internos.

**O quê** (`relatorios/index.html`):
- Página passou a carregar também `data/etapas.json` (antes só `obras.json` e
  `lancamentos.json`).
- Cálculos extraídos para `calcularDadosObra(o)` (retorna `{lanc, rec, des, saldo,
  contrato, percRec, etObra, fisico, etConc, etExec, etBloq, matTotal, matPendObrig,
  matValorPrev, matValorComp, catDes, catRec}`), reaproveitada tanto pelo card na
  tela quanto pelos dois exportadores abaixo.
- Novo bloco visual na tela: KPIs de "🏗️ Andamento Físico" (% físico ponderado por
  peso — mesma fórmula do Cronograma, etapas totais/execução/concluídas/
  aguardando), lista "📋 Progresso por Etapa" e resumo "📦 Materiais".
- **`exportarRelatorioInterno(obraId)`** — documento completo: financeiro (recebido,
  a receber, pago, a pagar, saldo líquido), despesas por categoria (inclui mão de
  obra), receitas por categoria, físico, progresso por etapa, materiais com valores.
  Mostra `toast('...não deve ser enviado ao cliente...')` ao gerar, e o próprio
  documento impresso tem um banner vermelho fixo no topo com o mesmo aviso (assim
  o aviso viaja mesmo se o PDF for salvo/reenviado).
- **`exportarRelatorioCliente(obraId)`** — sem nenhuma menção a despesas ou mão de
  obra: etapas concluídas (com data), etapas em andamento/faltantes, alerta de
  materiais aguardando entrega (nome + quantidade faltante, **sem valores**),
  progresso físico geral, e resumo financeiro do ponto de vista do cliente (valor
  do contrato, total recebido, saldo a receber).
- Ambos usam `abrirDocumentoImpressao` (seção 9).
- Compras ganhou suporte a `?obra=` na URL (`OBRA_PARAM` em `compras/index.html`),
  usado pelo link "Ver em Compras →" do relatório pra abrir já filtrado.

---

## Resumo de arquivos de dados novos (criar vazios `[]` no Construbox se for portar)

- `data/pedidos_compra.json`
- `data/materiais_catalogo.json`
- `data/fornecedores.json`

## Resumo de campos novos em estruturas existentes

- **Obra**: `materialPorConta` (`'empresa' | 'cliente'`)
- **Material (dentro de etapa)**: `pedidoCompraId` (além do já existente `pedidoCompra`)
