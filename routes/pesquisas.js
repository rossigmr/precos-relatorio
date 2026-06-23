const express = require('express');
const router = express.Router();
const db = require('../db');

// Listar todas as pesquisas
router.get('/', async (req, res) => {
  try {
    const pesquisas = await db.pesquisas.find({}).sort({ criadoEm: -1 });
    res.json(pesquisas);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Buscar pesquisa por ID
router.get('/:id', async (req, res) => {
  try {
    const pesquisa = await db.pesquisas.findOne({ _id: req.params.id });
    if (!pesquisa) return res.status(404).json({ erro: 'Não encontrada' });
    res.json(pesquisa);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Criar nova pesquisa
router.post('/', async (req, res) => {
  try {
    const { titulo, tipo, itens } = req.body;
    // tipo: 'geral' ou 'comparada'
    if (!titulo || !tipo) return res.status(400).json({ erro: 'Título e tipo são obrigatórios' });
    const pesquisa = await db.pesquisas.insert({
      titulo,
      tipo,
      itens: itens || [],
      criadoEm: new Date(),
      atualizadoEm: new Date()
    });
    res.status(201).json(pesquisa);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Atualizar pesquisa
router.put('/:id', async (req, res) => {
  try {
    const { titulo, tipo, itens } = req.body;
    await db.pesquisas.update(
      { _id: req.params.id },
      { $set: { titulo, tipo, itens, atualizadoEm: new Date() } }
    );
    const pesquisa = await db.pesquisas.findOne({ _id: req.params.id });
    res.json(pesquisa);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Remover pesquisa
router.delete('/:id', async (req, res) => {
  try {
    await db.pesquisas.remove({ _id: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
