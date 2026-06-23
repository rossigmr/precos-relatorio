const express = require('express');
const router = express.Router();
const PDFDocument = require('pdfkit');
const db = require('../db');

const VERDE = '#1B6B3A';
const VERDE_CLARO = '#E8F5EE';
const CINZA = '#6B7280';
const CINZA_CLARO = '#F3F4F6';
const PRETO = '#111827';
const BRANCO = '#FFFFFF';
const LARANJA = '#D97706';

function formatarMoeda(valor) {
  if (!valor && valor !== 0) return '-';
  return 'R$ ' + parseFloat(valor).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function cabecalhoPage(doc, titulo, tipo, page) {
  // Faixa superior
  doc.rect(0, 0, doc.page.width, 70).fill(VERDE);
  doc.fillColor(BRANCO).fontSize(20).font('Helvetica-Bold')
    .text('Pesquisa de Preços', 40, 18, { width: 400 });
  doc.fontSize(10).font('Helvetica')
    .text(`Tipo: ${tipo === 'geral' ? 'Pesquisa Geral' : 'Pesquisa Comparada'}`, 40, 44);

  // Data
  const hoje = new Date().toLocaleDateString('pt-BR');
  doc.fillColor(BRANCO).fontSize(9)
    .text(`Emitido em ${hoje} · Pág. ${page}`, doc.page.width - 200, 28, { width: 160, align: 'right' });

  // Título da pesquisa
  doc.rect(0, 70, doc.page.width, 36).fill(VERDE_CLARO);
  doc.fillColor(VERDE).fontSize(13).font('Helvetica-Bold')
    .text(titulo, 40, 80, { width: doc.page.width - 80 });

  doc.fillColor(PRETO);
  return 120; // y inicial após cabeçalho
}

function rodape(doc) {
  const y = doc.page.height - 30;
  doc.rect(0, y - 8, doc.page.width, 38).fill(CINZA_CLARO);
  doc.fillColor(CINZA).fontSize(8).font('Helvetica')
    .text('Documento gerado automaticamente — Sistema de Pesquisa de Preços', 40, y, { width: doc.page.width - 80, align: 'center' });
}

function linhaTabela(doc, y, cols, isHeader = false, isAlt = false) {
  const rowH = isHeader ? 22 : 18;
  if (isHeader) {
    doc.rect(cols[0].x - 6, y - 4, doc.page.width - 34, rowH).fill(VERDE);
  } else if (isAlt) {
    doc.rect(cols[0].x - 6, y - 3, doc.page.width - 34, rowH).fill(CINZA_CLARO);
  }

  cols.forEach(col => {
    doc.fillColor(isHeader ? BRANCO : PRETO)
      .fontSize(isHeader ? 8 : 8)
      .font(isHeader ? 'Helvetica-Bold' : 'Helvetica')
      .text(col.texto || '-', col.x, y, { width: col.w, ellipsis: true });
  });

  return y + rowH + (isHeader ? 2 : 1);
}

router.get('/:id', async (req, res) => {
  try {
    const pesquisa = await db.pesquisas.findOne({ _id: req.params.id });
    if (!pesquisa) return res.status(404).json({ erro: 'Pesquisa não encontrada' });

    const doc = new PDFDocument({ margin: 0, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="pesquisa-${pesquisa._id}.pdf"`);
    doc.pipe(res);

    let pageNum = 1;
    let y = cabecalhoPage(doc, pesquisa.titulo, pesquisa.tipo, pageNum);

    const margemL = 40;
    const largura = doc.page.width - 80;

    if (pesquisa.tipo === 'geral') {
      // ── TABELA GERAL ──────────────────────────────────────────
      const cols = [
        { label: 'Produto', x: margemL, w: 120 },
        { label: 'Valor', x: 166, w: 70 },
        { label: 'Frete', x: 242, w: 65 },
        { label: 'Opcionais', x: 313, w: 85 },
        { label: 'Região', x: 404, w: 65 },
        { label: 'Observações', x: 475, w: 90 },
      ];

      y = linhaTabela(doc, y, cols.map(c => ({ ...c, texto: c.label })), true);

      (pesquisa.itens || []).forEach((item, i) => {
        if (y > doc.page.height - 60) {
          rodape(doc);
          doc.addPage();
          pageNum++;
          y = cabecalhoPage(doc, pesquisa.titulo, pesquisa.tipo, pageNum);
          y = linhaTabela(doc, y, cols.map(c => ({ ...c, texto: c.label })), true);
        }
        y = linhaTabela(doc, y, [
          { ...cols[0], texto: item.produto || '-' },
          { ...cols[1], texto: formatarMoeda(item.valor) },
          { ...cols[2], texto: item.tipoFrete || '-' },
          { ...cols[3], texto: item.opcionais || '-' },
          { ...cols[4], texto: item.regiao || '-' },
          { ...cols[5], texto: item.observacoes || '-' },
        ], false, i % 2 === 1);
      });

      if (!pesquisa.itens || pesquisa.itens.length === 0) {
        doc.fillColor(CINZA).fontSize(10).font('Helvetica-Oblique')
          .text('Nenhum item cadastrado nesta pesquisa.', margemL, y + 10);
      }

    } else {
      // ── TABELA COMPARADA — agrupada por implemento ────────────
      const grupos = {};
      (pesquisa.itens || []).forEach(item => {
        const chave = item.produtoCompativel || 'Sem implemento';
        if (!grupos[chave]) grupos[chave] = [];
        grupos[chave].push(item);
      });

      const cols = [
        { label: 'Produto', x: margemL, w: 115 },
        { label: 'Valor', x: 161, w: 65 },
        { label: 'Frete', x: 232, w: 60 },
        { label: 'Opcionais', x: 298, w: 80 },
        { label: 'Região', x: 384, w: 60 },
        { label: 'Observações', x: 450, w: 105 },
      ];

      const gruposKeys = Object.keys(grupos);

      if (gruposKeys.length === 0) {
        doc.fillColor(CINZA).fontSize(10).font('Helvetica-Oblique')
          .text('Nenhum item cadastrado nesta pesquisa.', margemL, y + 10);
      }

      gruposKeys.forEach((grupo, gi) => {
        // Cabeçalho do grupo
        if (y > doc.page.height - 80) {
          rodape(doc);
          doc.addPage();
          pageNum++;
          y = cabecalhoPage(doc, pesquisa.titulo, pesquisa.tipo, pageNum);
        }

        doc.rect(margemL - 6, y - 2, largura + 12, 20).fill(LARANJA);
        doc.fillColor(BRANCO).fontSize(9).font('Helvetica-Bold')
          .text(`Implemento: ${grupo}`, margemL, y + 4, { width: largura });
        y += 24;

        y = linhaTabela(doc, y, cols.map(c => ({ ...c, texto: c.label })), true);

        grupos[grupo].forEach((item, i) => {
          if (y > doc.page.height - 60) {
            rodape(doc);
            doc.addPage();
            pageNum++;
            y = cabecalhoPage(doc, pesquisa.titulo, pesquisa.tipo, pageNum);
            y = linhaTabela(doc, y, cols.map(c => ({ ...c, texto: c.label })), true);
          }
          y = linhaTabela(doc, y, [
            { ...cols[0], texto: item.produto || '-' },
            { ...cols[1], texto: formatarMoeda(item.valor) },
            { ...cols[2], texto: item.tipoFrete || '-' },
            { ...cols[3], texto: item.opcionais || '-' },
            { ...cols[4], texto: item.regiao || '-' },
            { ...cols[5], texto: item.observacoes || '-' },
          ], false, i % 2 === 1);
        });

        y += 12; // espaço entre grupos
      });
    }

    // Resumo rodapé
    y += 10;
    if (y < doc.page.height - 80) {
      doc.rect(margemL - 6, y, largura + 12, 1).fill(VERDE);
      y += 8;
      doc.fillColor(CINZA).fontSize(8).font('Helvetica')
        .text(`Total de itens: ${(pesquisa.itens || []).length}`, margemL, y);
    }

    rodape(doc);
    doc.end();

  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
