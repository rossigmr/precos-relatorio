# PreçoField — Sistema de Pesquisa de Preços

## Como rodar

```bash
npm install
node server.js
```

Acesse: http://localhost:3000

## Funcionalidades

- **Meus Produtos** — Cadastro dos seus produtos de referência
- **Pesquisas** — Dois modelos disponíveis:
  - **Geral**: Levantamento livre de preços
  - **Comparada**: Agrupada por implemento/produto compatível

### Campos por item
- Produto (fornecedor/modelo pesquisado)
- Produto Compatível (apenas Comparada)
- Valor (R$)
- Tipo de Frete (CIF / FOB / etc.)
- Opcionais
- Região
- Observações

### Exportação PDF
- Relatório com cabeçalho, tabela e rodapé profissional
- Pesquisa Comparada gera seções por implemento

## Tecnologias
- **Backend**: Node.js + Express
- **Banco**: NeDB (arquivo local, sem configuração)
- **PDF**: PDFKit
