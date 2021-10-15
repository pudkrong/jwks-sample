const jose = require('jose');
const secs = require('../lib/secs');

class TokenService {
  constructor (db, redis, options) {
    this.options = Object.assign({
      jwt: {
        algorithm: 'RS256',
        expiresIn: '24 hours',
        issuer: 'https://amity.co',
        subject: 'user id'
      },
      keys: {
        rotation: '1 min',
        cacheTTL: '1 min'
      },
      db: {
        database: 'pud',
        collection: 'jwks'
      }
    }, options);

    this.db = db.db(this.options.db.database);
    this.model = this.db.collection(this.options.db.collection);
    this.model.createIndex({ current: 1, deleted: 1 });
    this.model.createIndex({ 'key.kid': 1 }, { unique: true });

    this.redis = redis;
    this.redisKey = `jwks:key`;

    this.JWK = jose.JWK;
    this.JWT = jose.JWT;
    this.JWKS = jose.JWKS;

    this.keyStore = new this.JWKS.KeyStore();
    this.init();
  }

  async init () {
    const self = this;
    const keys = await this.getAllKeys();
    keys.forEach(key => {
      self.keyStore.add(self.JWK.asKey(key));
    });
  }

  async getCurrentKey () {
    let currentKey = null;
    const cache = await this.redis.get(this.redisKey);
    if (cache) {
      currentKey = this.JWK.asKey(JSON.parse(cache));
    } else {
      const data = await this.model.findOne({ current: true, deleted: false });
      if (data) {
        currentKey = this.JWK.asKey(data.key);
      } else {
        currentKey = await this.createKey();
      }
      await this.updateCachedKey(currentKey);
    }

    return currentKey;
  }

  async updateCachedKey (key) {
    return this.redis.set(this.redisKey, JSON.stringify(key.toJWK(true)), 'ex', secs(this.options.keys.cacheTTL));
  }

  async getAllKeys () {
    // Get all keys from DB
    const data = await this.model.find({
      deleted: false
    });
    return data.map(d => d.key);
  }

  async createKey () {
    const key = await this.JWK.generate('RSA', 2048, { use: 'sig' });
    const newKey = await this.model.insertOne({
      key: key.toJWK(true),
      current: true,
      deleted: false,
      createdAt: new Date()
    });
    await Promise.all([
      this.model.updateMany({ _id: { $ne: newKey.insertedId }, current: true, deleted: false }, { $set: { current: false }}),
      this.updateCachedKey(key),
    ]);

    this.keyStore.add(key);
    return key;
  }

  async sign (payload, options = {}) {
    const key = await this.getCurrentKey();

    options = Object.assign({}, this.options.jwt, options);
    return this.JWT.sign(payload, key, options);
  }

  async removeKey (kid) {
    const result = await this.model.updateOne({ 'key.kid': kid }, { $set: { deleted: true, current: false }});
    if (result.modifiedCount) {
      const key = this.keyStore.get({ kid });
      if (key) this.keyStore.remove(key);

      const currentKey = await this.getCurrentKey();
      if (currentKey.kid === kid) {
        await this.createKey();
      }
    }
  }

  generateJWKS () {
    return this.keyStore.toJWKS();
  }

  async verify (token, options) {
    const key = await this.getCurrentKey();

    options = Object.assign({}, options, { issuer: this.options.jwt.issuer });
    return this.JWT.verify(token, key, options);
  }

  async clean () {
    const ms = Date.now() - (secs(this.options.keys.rotation) * 1000);
    const expires = new Date(ms);
    const result = await this.model.updateMany({ createdAt: { $lt: expires }, deleted: false }, { $set: { deleted: true, current: false }});

    if (result.modifiedCount) {
      await this.updateKeyStore();
    }
  }

  async updateKeyStore () {
    // Clean cache
    await this.redis.del(this.redisKey);
    this.keyStore.all().forEach(k => this.keyStore.remove(k));

    const keys = await this.getAllKeys();
    keys.forEach(key => this.keyStore.add(this.JWK.asKey(key)));
  }
}

module.exports = TokenService;
