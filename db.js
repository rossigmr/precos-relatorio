const Datastore = require('nedb-promises');
const path = require('path');

const db = {
  produtos: Datastore.create({ filename: path.join(__dirname, 'data', 'produtos.db'), autoload: true }),
  pesquisas: Datastore.create({ filename: path.join(__dirname, 'data', 'pesquisas.db'), autoload: true }),
};

module.exports = db;
