const express = require('express');
const router = express.Router();
const db = require('../db');

// Listar todos
router.get('/', async (req, res) => {
  try {
    const produtos = await db.produtos.find({}).sort({ nome: 1 });
    res.json(produtos);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Cadastrar
router.post('/', async (req, res) => {
  try {
    const { nome, codigo, categoria } = req.body;
    if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório' });
    const produto = await db.produtos.insert({ nome, codigo: codigo || '', categoria: categoria || '', criadoEm: new Date() });
    res.status(201).json(produto);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Atualizar
router.put('/:id', async (req, res) => {
  try {
    const { nome, codigo, categoria } = req.body;
    await db.produtos.update({ _id: req.params.id }, { $set: { nome, codigo, categoria } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

// Remover
router.delete('/:id', async (req, res) => {
  try {
    await db.produtos.remove({ _id: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

module.exports = router;
