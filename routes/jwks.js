const express = require('express');
const router = express.Router();
const TokenService = require('../services/token');
const { MongoClient } = require('mongodb');
const Redis = require('ioredis');

function Deferred () {
  let _resolve;
  let _reject;
  const promise = new Promise((resolve, reject) => {
    _resolve = resolve;
    _reject = reject;
  });

  return {
    resolve: _resolve,
    reject: _reject,
    promise
  };
}
const deferred = Deferred();
const client = new MongoClient('mongodb://localhost:27017');
client.isConnected = deferred.promise;
client.connect((error, c) => {
  if (error) return deferred.reject(error);
  deferred.resolve();
});

const redis = new Redis();
const tokenService = new TokenService(client, redis, {});
/* GET home page. */
router.get('/jwks.json', async function handler (req, res, next) {
  try {
    const data = await tokenService.generateJWKS();
    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).end();
  }
});

router.post('/', async (req, res) => {
  try {
    const token = await tokenService.createKey();
    res.json({ token });
  } catch (error) {
    console.error(error);
    res.status(500).end();
  }
});

router.delete('/:kid', async (req, res) => {
  try {
    await tokenService.removeKey(req.params.kid);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).end();
  }
});

router.get('/sign', async (req, res) => {
  try {
    const jwt = await tokenService.sign({ name: 'pud' });
    res.json({ jwt });
  } catch (error) {
    console.error(error);
    res.status(500).end();
  }
});

router.post('/verify', async (req, res) => {
  try {
    const result = await tokenService.verify(req.body.payload);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).end();
  }
});

router.post('/clean', async (req, res) => {
  try {
    const result = await tokenService.clean();
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).end();
  }
});

module.exports = router;
