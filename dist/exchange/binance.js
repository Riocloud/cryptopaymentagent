"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExchangeClientFactory = exports.OKXClient = exports.BinanceClient = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
/**
 * 交易所 API 客户端基类
 */
class ExchangeClient {
    client;
    apiKey;
    apiSecret;
    constructor(apiKey, apiSecret, baseUrl) {
        this.apiKey = apiKey;
        this.apiSecret = apiSecret;
        this.client = axios_1.default.create({
            baseURL: baseUrl,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
    getBalance() {
        throw new Error('Not implemented');
    }
    createOrder() {
        throw new Error('Not implemented');
    }
    sign(params) {
        return crypto_1.default
            .createHmac('sha256', this.apiSecret)
            .update(params)
            .digest('hex');
    }
}
/**
 * Binance API 客户端
 */
class BinanceClient extends ExchangeClient {
    baseUrl = 'https://api.binance.com';
    constructor(apiKey, apiSecret) {
        super(apiKey, apiSecret, 'https://api.binance.com');
        this.client.defaults.headers['X-MBX-APIKEY'] = apiKey;
    }
    /**
     * 获取账户余额
     */
    async getBalance() {
        const timestamp = Date.now();
        const params = `timestamp=${timestamp}`;
        const signature = this.sign(params);
        const response = await this.client.get(`/api/v3/account?${params}&signature=${signature}`);
        const balances = response.data.balances
            .filter((b) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
            .map((b) => ({
            token: b.asset,
            available: parseFloat(b.free),
            locked: parseFloat(b.locked)
        }));
        return balances;
    }
    /**
     * 获取现货价格
     */
    async getPrice(symbol) {
        const response = await this.client.get(`/api/v3/ticker/price?symbol=${symbol}`);
        return parseFloat(response.data.price);
    }
    /**
     * 测试连接
     */
    async testConnection() {
        try {
            await this.client.get('/api/v3/ping');
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.BinanceClient = BinanceClient;
/**
 * OKX API 客户端
 */
class OKXClient extends ExchangeClient {
    baseUrl = 'https://www.okx.com';
    constructor(apiKey, apiSecret) {
        super(apiKey, apiSecret, 'https://www.okx.com');
        this.client.defaults.headers['x-api-key'] = apiKey;
    }
    /**
     * 获取账户余额
     */
    async getBalance() {
        const timestamp = Date.now().toString();
        const method = 'GET';
        const path = '/api/v5/account/balance';
        const params = '';
        const prehash = timestamp + method + path + params;
        const signature = this.sign(prehash);
        this.client.defaults.headers['ok-access-sign'] = signature;
        this.client.defaults.headers['ok-access-timestamp'] = timestamp;
        this.client.defaults.headers['ok-access-passphrase'] = this.apiSecret; // OKX 用 passphrase
        const response = await this.client.get(path);
        const data = response.data.data[0];
        const balances = data.details
            .filter((b) => parseFloat(b.availBal) > 0 || parseFloat(b.frozenBal) > 0)
            .map((b) => ({
            token: b.ccy,
            available: parseFloat(b.availBal),
            locked: parseFloat(b.frozenBal)
        }));
        return balances;
    }
    async testConnection() {
        try {
            await this.client.get('/api/v5/public/time');
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.OKXClient = OKXClient;
/**
 * 交易所客户端工厂
 */
class ExchangeClientFactory {
    static create(exchange, credentials) {
        switch (exchange.toLowerCase()) {
            case 'binance':
                return new BinanceClient(credentials.apiKey, credentials.apiSecret);
            case 'okx':
                return new OKXClient(credentials.apiKey, credentials.apiSecret);
            default:
                throw new Error(`Unsupported exchange: ${exchange}`);
        }
    }
}
exports.ExchangeClientFactory = ExchangeClientFactory;
//# sourceMappingURL=binance.js.map