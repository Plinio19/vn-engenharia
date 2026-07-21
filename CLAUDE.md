# CLAUDE.md — VN Engenharia ERP (GitHub as Database)

Réplica da arquitetura do [Construbox](https://github.com/Plinio19/construbox/blob/main/CLAUDE.md), adaptada para a VN Engenharia. Toda a lógica funcional (cronograma, materiais, financeiro, extrato/conciliação, modelo de dados) é idêntica ao Construbox — consulte o CLAUDE.md original para detalhes de comportamento.

## O QUE MUDOU EM RELAÇÃO AO CONSTRUBOX

- **owner/repo padrão** em `assets/core.js` (`DEFAULTS_CFG`): `Plinio19` / `vn-engenharia`
- **Chave de config no localStorage**: `vne_config_v1` (era `construbox_config_v1`)
- **Prefixo das chaves de cache local**: `vne_*` (era `cbx_*`) — ex: `vne_obras`, `vne_lanc`, `vne_socios`, `vne_clientes`, `vne_prestadores`, `vne_etapas`, `vne_extrato`, `vne_extrato_estado_v2`
- **Paleta de cores** (`assets/core.css`, bloco `:root`):
  | Variável | Cor | Uso |
  |---|---|---|
  | `--brand` | `#05AAFB` | Primária |
  | `--brand-hover` | `#068CF8` | Hover/degradê |
  | `--brand-dark` | `#1F7CB7` | Primária escura |
  | `--brand-light` | `#E0F5FF` | Tint claro da marca |
  | `--verde` | `#22C55E` | Sucesso |
  | `--vermelho` | `#EF4444` | Erro |
  | `--amarelo` | `#F59E0B` | Aviso |
  | `--azul` | `#3B82F6` | Informação |
  | `--fundo` | `#F8FAFC` | Fundo claro |
  | `--texto` | `#111827` | Texto principal |
  | `--texto-leve` | `#6B7280` | Texto secundário |
  | `--cinza` | `#E5E7EB` | Borda |
  | `--branco` | `#FEFEFE` | Branco |

  No Construbox, `--brand` era âmbar e por isso era reaproveitada em `.sync-dot.amarelo`, `.stat.amarelo` e `.toast.aviso`. Como a marca da VN é azul, esses três pontos foram desacoplados para usar `var(--amarelo)` diretamente — senão "aviso" apareceria azul.
- **Sidebar**: fundo escuro trocado de `#1c1917` (quase preto/marrom) para `#0B2439` (azul-marinho escuro), incluindo o cabeçalho de impressão em `relatorios/index.html`. Estado ativo do menu (`.nav-item.ativo`) trocado de âmbar para azul (`rgba(5,170,251,.18)` / texto `#7CD4FF`).
- **Logo da sidebar**: `Constru<span>box</span>` → `VN <span>Engenharia</span>`
- **`data/*.json`**: todos commitados como `[]` (vazios) — não foram copiados dados reais do Construbox.

## MÓDULOS
Todos os módulos do Construbox foram replicados: Dashboard, Cadastros (Sócios & Clientes), Obras + Cronograma, Compras de Obra, Lançamentos, Contas a Pagar, Contas a Receber, Extrato OFX, Conciliação, Relatórios por Obra.

## CONFIGURAÇÃO INICIAL (usuário)
Na primeira visita, ir em ⚙️ Configurações e preencher:
- Usuário GitHub: `Plinio19`
- Repositório: `vn-engenharia`
- Branch: `main`
- Token: Personal Access Token com escopo `repo` (github.com/settings/tokens)

O token fica **somente no localStorage** do navegador, nunca é commitado.

## URL DO SISTEMA
https://plinio19.github.io/vn-engenharia/ (após ativar GitHub Pages: Settings → Pages → Deploy from branch: main, folder: / root)
