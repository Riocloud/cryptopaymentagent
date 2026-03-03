import axios, { AxiosInstance } from 'axios';
import crypto from 'crypto';

/**
 * 交易所 API 客户端基类
 */
class ExchangeClient {
  protected client: AxiosInstance;
  protected apiKey: string;
  protected apiSecret: string;
  
  constructor(apiKey: string, apiSecret: string, baseUrl: string) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.client = axios.create({
      baseURL: baseUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
  
  getBalance(): Promise<ExchangeBalance[]> {
    throw new Error('Not implemented');
  }
  
  createOrder(): Promise<any> {
    throw new Error('Not implemented');
  }
  
  protected sign(params: string): string {
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(params)
      .digest('hex');
  }
}

/**
 * Binance API 客户端
 */
export class BinanceClient extends ExchangeClient {
  private readonly baseUrl = 'https://api.binance.com';
  
  constructor(apiKey: string, apiSecret: string) {
    super(apiKey, apiSecret, 'https://api.binance.com');
    this.client.defaults.headers['X-MBX-APIKEY'] = apiKey;
  }
  
  /**
   * 获取账户余额
   */
  async getBalance(): Promise<ExchangeBalance[]> {
    const timestamp = Date.now();
    const params = `timestamp=${timestamp}`;
    const signature = this.sign(params);
    
    const response = await this.client.get(`/api/v3/account?${params}&signature=${signature}`);
    
    const balances = response.data.balances
      .filter((b: any) => parseFloat(b.free) > 0 || parseFloat(b.locked) > 0)
      .map((b: any) => ({
        token: b.asset,
        available: parseFloat(b.free),
        locked: parseFloat(b.locked)
      }));
    
    return balances;
  }
  
  /**
   * 获取现货价格
   */
  async getPrice(symbol: string): Promise<number> {
    const response = await this.client.get(`/api/v3/ticker/price?symbol=${symbol}`);
    return parseFloat(response.data.price);
  }
  
  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/api/v3/ping');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * OKX API 客户端
 */
export class OKXClient extends ExchangeClient {
  private readonly baseUrl = 'https://www.okx.com';
  
  constructor(apiKey: string, apiSecret: string) {
    super(apiKey, apiSecret, 'https://www.okx.com');
    this.client.defaults.headers['x-api-key'] = apiKey;
  }
  
  /**
   * 获取账户余额
   */
  async getBalance(): Promise<ExchangeBalance[]> {
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
      .filter((b: any) => parseFloat(b.availBal) > 0 || parseFloat(b.frozenBal) > 0)
      .map((b: any) => ({
        token: b.ccy,
        available: parseFloat(b.availBal),
        locked: parseFloat(b.frozenBal)
      }));
    
    return balances;
  }
  
  async testConnection(): Promise<boolean> {
    try {
      await this.client.get('/api/v5/public/time');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * 交易所客户端工厂
 */
export class ExchangeClientFactory {
  static create(
    exchange: string,
    credentials: { apiKey: string; apiSecret: string }
  ): ExchangeClient {
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

/**
 * 余额数据类型
 */
export interface ExchangeBalance {
  token: string;
  available: number;
  locked: number;
}
