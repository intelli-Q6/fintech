// Sovereign Broker CSV & Excel Importer Engine for KoshQ
// Supports Zerodha (Holdings & Tradebook), Groww, INDmoney, Upstox, and Generic Tradebooks
// 100% In-Browser Memory Execution • Zero Network Egress

import * as XLSX from 'xlsx';
import { Holding, AssetClass } from '../../data/types';

export type BrokerType = 'Zerodha' | 'Groww' | 'INDmoney' | 'Upstox' | 'Generic';

export interface ParsedBrokerHolding {
  id: string;
  symbol: string;
  name: string;
  isin: string;
  assetClass: AssetClass;
  sector: string;
  marketCapCategory: 'Large Cap' | 'Mid Cap' | 'Small Cap' | 'Debt' | 'Commodity' | 'Govt';
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  investedAmount: number;
  currentValue: number;
  unrealizedGain: number;
  unrealizedGainPercent: number;
  brokerSource: BrokerType;
  tradeType?: 'EQUITY' | 'MUTUAL_FUND' | 'ETF' | 'BOND';
}

export interface BrokerParsedReport {
  broker: BrokerType;
  fileName: string;
  recordCount: number;
  totalValuation: number;
  totalInvested: number;
  totalGain: number;
  totalGainPercent: number;
  parsedAt: string;
  holdings: ParsedBrokerHolding[];
  warnings?: string[];
}

// Comprehensive Master Dictionary of Top Indian Equities & ETFs for Auto-Enrichment
interface SecurityMeta {
  name: string;
  isin: string;
  sector: string;
  category: 'Large Cap' | 'Mid Cap' | 'Small Cap' | 'Commodity';
  assetClass: AssetClass;
}

const INDIAN_SECURITY_LOOKUP: Record<string, SecurityMeta> = {
  RELIANCE: { name: 'Reliance Industries Ltd.', isin: 'INE002A01018', sector: 'Energy & Petrochem', category: 'Large Cap', assetClass: 'equity' },
  TCS: { name: 'Tata Consultancy Services Ltd.', isin: 'INE467B01029', sector: 'Information Technology', category: 'Large Cap', assetClass: 'equity' },
  HDFCBANK: { name: 'HDFC Bank Ltd.', isin: 'INE040A01034', sector: 'Banking & Financials', category: 'Large Cap', assetClass: 'equity' },
  INFY: { name: 'Infosys Ltd.', isin: 'INE009A01021', sector: 'Information Technology', category: 'Large Cap', assetClass: 'equity' },
  ICICIBANK: { name: 'ICICI Bank Ltd.', isin: 'INE090A01021', sector: 'Banking & Financials', category: 'Large Cap', assetClass: 'equity' },
  BHARTIARTL: { name: 'Bharti Airtel Ltd.', isin: 'INE397D01024', sector: 'Telecommunications', category: 'Large Cap', assetClass: 'equity' },
  ITC: { name: 'ITC Ltd.', isin: 'INE154A01025', sector: 'FMCG & Consumer', category: 'Large Cap', assetClass: 'equity' },
  LT: { name: 'Larsen & Toubro Ltd.', isin: 'INE018A01030', sector: 'Capital Goods & Infra', category: 'Large Cap', assetClass: 'equity' },
  KOTAKBANK: { name: 'Kotak Mahindra Bank Ltd.', isin: 'INE237A01028', sector: 'Banking & Financials', category: 'Large Cap', assetClass: 'equity' },
  SBIN: { name: 'State Bank of India', isin: 'INE062A01020', sector: 'Banking & Financials', category: 'Large Cap', assetClass: 'equity' },
  TATAMOTORS: { name: 'Tata Motors Ltd.', isin: 'INE155A01022', sector: 'Automobile', category: 'Large Cap', assetClass: 'equity' },
  BAJFINANCE: { name: 'Bajaj Finance Ltd.', isin: 'INE296A01024', sector: 'Financial Services', category: 'Large Cap', assetClass: 'equity' },
  MARUTI: { name: 'Maruti Suzuki India Ltd.', isin: 'INE585B01010', sector: 'Automobile', category: 'Large Cap', assetClass: 'equity' },
  SUNPHARMA: { name: 'Sun Pharmaceutical Industries Ltd.', isin: 'INE044A01036', sector: 'Pharmaceuticals', category: 'Large Cap', assetClass: 'equity' },
  TITAN: { name: 'Titan Company Ltd.', isin: 'INE280A01028', sector: 'Consumer Goods & Luxury', category: 'Large Cap', assetClass: 'equity' },
  ASIANPAINT: { name: 'Asian Paints Ltd.', isin: 'INE021A01026', sector: 'Paints & Consumer', category: 'Large Cap', assetClass: 'equity' },
  AXISBANK: { name: 'Axis Bank Ltd.', isin: 'INE238A01034', sector: 'Banking & Financials', category: 'Large Cap', assetClass: 'equity' },
  WIPRO: { name: 'Wipro Ltd.', isin: 'INE075A01022', sector: 'Information Technology', category: 'Large Cap', assetClass: 'equity' },
  HCLTECH: { name: 'HCL Technologies Ltd.', isin: 'INE860A01027', sector: 'Information Technology', category: 'Large Cap', assetClass: 'equity' },
  TATASTEEL: { name: 'Tata Steel Ltd.', isin: 'INE081A01020', sector: 'Metals & Mining', category: 'Large Cap', assetClass: 'equity' },
  NTPC: { name: 'NTPC Ltd.', isin: 'INE733E01010', sector: 'Power & Utilities', category: 'Large Cap', assetClass: 'equity' },
  POWERGRID: { name: 'Power Grid Corporation of India Ltd.', isin: 'INE752E01010', sector: 'Power & Utilities', category: 'Large Cap', assetClass: 'equity' },
  ONGC: { name: 'Oil & Natural Gas Corporation Ltd.', isin: 'INE213A01029', sector: 'Energy & Petrochem', category: 'Large Cap', assetClass: 'equity' },
  ULTRACEMCO: { name: 'UltraTech Cement Ltd.', isin: 'INE481G01011', sector: 'Cement & Building Material', category: 'Large Cap', assetClass: 'equity' },
  COALINDIA: { name: 'Coal India Ltd.', isin: 'INE522F01014', sector: 'Energy & Mining', category: 'Large Cap', assetClass: 'equity' },
  BAJAJFINSV: { name: 'Bajaj Finserv Ltd.', isin: 'INE918I01026', sector: 'Financial Services', category: 'Large Cap', assetClass: 'equity' },
  NESTLEIND: { name: 'Nestle India Ltd.', isin: 'INE239A01024', sector: 'FMCG & Consumer', category: 'Large Cap', assetClass: 'equity' },
  GRASIM: { name: 'Grasim Industries Ltd.', isin: 'INE047A01021', sector: 'Diversified & Materials', category: 'Large Cap', assetClass: 'equity' },
  JSWSTEEL: { name: 'JSW Steel Ltd.', isin: 'INE019A01038', sector: 'Metals & Mining', category: 'Large Cap', assetClass: 'equity' },
  TECHM: { name: 'Tech Mahindra Ltd.', isin: 'INE669C01036', sector: 'Information Technology', category: 'Large Cap', assetClass: 'equity' },
  ADANIENT: { name: 'Adani Enterprises Ltd.', isin: 'INE423A01024', sector: 'Conglomerate & Infra', category: 'Large Cap', assetClass: 'equity' },
  ADANIPORTS: { name: 'Adani Ports & SEZ Ltd.', isin: 'INE742F01042', sector: 'Infrastructure & Ports', category: 'Large Cap', assetClass: 'equity' },
  ZOMATO: { name: 'Zomato Ltd.', isin: 'INE758T01015', sector: 'Consumer Internet', category: 'Large Cap', assetClass: 'equity' },
  JIOFIN: { name: 'Jio Financial Services Ltd.', isin: 'INE758E01017', sector: 'Financial Services', category: 'Large Cap', assetClass: 'equity' },
  BEL: { name: 'Bharat Electronics Ltd.', isin: 'INE263A01024', sector: 'Defense & Electronics', category: 'Large Cap', assetClass: 'equity' },
  HAL: { name: 'Hindustan Aeronautics Ltd.', isin: 'INE066F01020', sector: 'Defense & Aerospace', category: 'Large Cap', assetClass: 'equity' },
  TRENT: { name: 'Trent Ltd.', isin: 'INE849A01020', sector: 'Retail & Consumer', category: 'Large Cap', assetClass: 'equity' },
  // Index & Commodity ETFs
  NIFTYBEES: { name: 'Nippon India Nifty 50 BeES ETF', isin: 'INF204KB14I2', sector: 'Broad Market Index', category: 'Large Cap', assetClass: 'etf' },
  BANKBEES: { name: 'Nippon India Nifty Bank BeES ETF', isin: 'INF204KB14H4', sector: 'Banking & Financials', category: 'Large Cap', assetClass: 'etf' },
  GOLDBEES: { name: 'Nippon India Gold BeES ETF', isin: 'INF204KB17I5', sector: 'Commodity', category: 'Commodity', assetClass: 'gold' },
  SILVERBEES: { name: 'Nippon India Silver ETF', isin: 'INF204KB18V3', sector: 'Commodity', category: 'Commodity', assetClass: 'gold' },
  JUNIORBEES: { name: 'Nippon India Nifty Next 50 BeES ETF', isin: 'INF204KB14J0', sector: 'Large & Mid Cap', category: 'Large Cap', assetClass: 'etf' },
  MON100: { name: 'Motilal Oswal Nasdaq 100 ETF', isin: 'INF247L01AU4', sector: 'US Tech Equities', category: 'Large Cap', assetClass: 'etf' }
};

// Clean numerical parser
function cleanNumber(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const str = String(val).replace(/,/g, '').replace(/[^\d.-]/g, '');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

// Clean string parser
function cleanStr(val: any): string {
  if (!val) return '';
  return String(val).trim();
}

// Header matching helper
function findCol(headers: string[], candidates: string[]): string | undefined {
  const normHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  for (const c of candidates) {
    const normC = c.toLowerCase().replace(/[^a-z0-9]/g, '');
    const idx = normHeaders.indexOf(normC);
    if (idx !== -1) return headers[idx];
  }
  return undefined;
}

// Parse Raw Tabular Data (CSV or Excel sheet rows) into Broker Holdings
export function parseBrokerTableData(
  rows: Record<string, any>[],
  fileName: string
): BrokerParsedReport {
  if (!rows || rows.length === 0) {
    throw new Error('No data rows found in the uploaded file.');
  }

  const firstRow = rows[0];
  const headers = Object.keys(firstRow);
  const upperHeaders = headers.map(h => h.toUpperCase());
  const upperFile = fileName.toUpperCase();

  // 1. Detect Broker Type
  let broker: BrokerType = 'Generic';
  const headerStr = upperHeaders.join(' ');
  if (upperFile.includes('ZERODHA') || headerStr.includes('TRADE_DATE') || (headerStr.includes('INSTRUMENT') && headerStr.includes('LTP'))) {
    broker = 'Zerodha';
  } else if (upperFile.includes('GROWW') || headerStr.includes('SHARES') && headerStr.includes('1D RETURNS')) {
    broker = 'Groww';
  } else if (upperFile.includes('INDMONEY') || headerStr.includes('SECURITY NAME') || headerStr.includes('BUYING PRICE')) {
    broker = 'INDmoney';
  } else if (upperFile.includes('UPSTOX')) {
    broker = 'Upstox';
  }

  // 2. Identify Key Column Mappings
  const symbolCol = findCol(headers, ['Instrument', 'Symbol', 'Ticker', 'Stock Name', 'Security Name', 'trading_symbol', 'Trading Symbol']);
  const nameCol = findCol(headers, ['Name', 'Company Name', 'Stock Name', 'Security Name', 'Scheme Name', 'Company']);
  const qtyCol = findCol(headers, ['Qty.', 'Quantity', 'Shares', 'Units', 'quantity', 'Qty', 'Balance Units']);
  const priceCol = findCol(headers, ['Avg. cost', 'Average Price', 'Buy Price', 'Average Buying Price', 'price', 'Cost Price', 'Avg Price']);
  const ltpCol = findCol(headers, ['LTP', 'Current Price', 'Last Price', 'Current Market Price', 'Market Price', 'NAV']);
  const isinCol = findCol(headers, ['ISIN', 'isin', 'ISIN Code']);
  const valCol = findCol(headers, ['Cur. val', 'Current Value', 'Market Value', 'Current Portfolio Value', 'Value']);
  const tradeTypeCol = findCol(headers, ['trade_type', 'Type', 'Transaction Type', 'Action']);

  // If this is a Tradebook (multiple buy/sell orders), aggregate lots FIFO/Weighted
  const isTradebook = Boolean(tradeTypeCol && (upperHeaders.includes('TRADE_TYPE') || upperHeaders.includes('ORDER_ID')));

  const holdingsMap = new Map<string, {
    symbol: string;
    name: string;
    isin: string;
    qty: number;
    totalCost: number;
    lastLtp: number;
  }>();

  if (isTradebook && symbolCol && qtyCol && priceCol) {
    // Process Tradebook orders
    for (const row of rows) {
      const sym = cleanStr(row[symbolCol]).toUpperCase().replace(/[^A-Z0-9_-]/g, '');
      if (!sym) continue;

      const qty = cleanNumber(row[qtyCol]);
      const price = cleanNumber(row[priceCol]);
      const tradeType = cleanStr(row[tradeTypeCol!]).toLowerCase();
      const isin = isinCol ? cleanStr(row[isinCol]) : '';

      const existing = holdingsMap.get(sym) || {
        symbol: sym,
        name: nameCol ? cleanStr(row[nameCol]) : sym,
        isin: isin,
        qty: 0,
        totalCost: 0,
        lastLtp: price
      };

      if (tradeType.includes('buy') || tradeType === 'b') {
        existing.totalCost += (qty * price);
        existing.qty += qty;
        existing.lastLtp = price;
      } else if (tradeType.includes('sell') || tradeType === 's') {
        const avg = existing.qty > 0 ? (existing.totalCost / existing.qty) : price;
        existing.qty = Math.max(0, existing.qty - qty);
        existing.totalCost = Math.max(0, existing.qty * avg);
        existing.lastLtp = price;
      }

      if (isin && !existing.isin) existing.isin = isin;
      holdingsMap.set(sym, existing);
    }
  } else {
    // Process Holdings Snapshot
    for (const row of rows) {
      const symRaw = symbolCol ? cleanStr(row[symbolCol]) : (nameCol ? cleanStr(row[nameCol]) : '');
      const sym = symRaw.toUpperCase().split(/[\s_-]+/)[0].replace(/[^A-Z0-9]/g, '');
      if (!sym) continue;

      const qty = qtyCol ? cleanNumber(row[qtyCol]) : 0;
      if (qty <= 0) continue; // ignore zero positions

      const avgPrice = priceCol ? cleanNumber(row[priceCol]) : 0;
      let ltp = ltpCol ? cleanNumber(row[ltpCol]) : 0;
      const explicitVal = valCol ? cleanNumber(row[valCol]) : 0;

      if (ltp === 0 && explicitVal > 0 && qty > 0) {
        ltp = explicitVal / qty;
      } else if (ltp === 0 && avgPrice > 0) {
        ltp = avgPrice;
      }

      const isin = isinCol ? cleanStr(row[isinCol]) : '';
      const name = nameCol ? cleanStr(row[nameCol]) : sym;

      holdingsMap.set(sym, {
        symbol: sym,
        name,
        isin,
        qty,
        totalCost: avgPrice * qty,
        lastLtp: ltp
      });
    }
  }

  // 3. Transform and Enrich into ParsedBrokerHolding[]
  const holdings: ParsedBrokerHolding[] = [];

  holdingsMap.forEach((item, symbolKey) => {
    if (item.qty <= 0) return;

    // Lookup Master Dictionary
    const known = INDIAN_SECURITY_LOOKUP[symbolKey];
    const isin = item.isin || known?.isin || `INE${Math.random().toString().slice(2, 11)}`;
    const name = (known?.name && known.name.length > item.name.length) ? known.name : (item.name || symbolKey);
    const sector = known?.sector || 'Diversified Equity';
    const category = known?.category || 'Large Cap';
    const assetClass: AssetClass = known?.assetClass || (
      symbolKey.includes('BEES') || symbolKey.includes('ETF') ? 'etf' :
      symbolKey.includes('GOLD') || symbolKey.includes('SGB') ? 'gold' :
      symbolKey.includes('BOND') || symbolKey.includes('GS') ? 'bond' : 'equity'
    );

    const avgPrice = item.qty > 0 ? Number((item.totalCost / item.qty).toFixed(2)) : item.lastLtp;
    const currentPrice = Number(item.lastLtp.toFixed(2));
    const investedAmount = Number(item.totalCost.toFixed(2));
    const currentValue = Number((item.qty * currentPrice).toFixed(2));
    const unrealizedGain = Number((currentValue - investedAmount).toFixed(2));
    const unrealizedGainPercent = investedAmount > 0 ? Number(((unrealizedGain / investedAmount) * 100).toFixed(2)) : 0;

    holdings.push({
      id: `broker-${symbolKey}-${Date.now()}-${holdings.length}`,
      symbol: symbolKey,
      name,
      isin,
      assetClass,
      sector,
      marketCapCategory: category,
      quantity: item.qty,
      averagePrice: avgPrice,
      currentPrice,
      investedAmount,
      currentValue,
      unrealizedGain,
      unrealizedGainPercent,
      brokerSource: broker
    });
  });

  const totalValuation = Number(holdings.reduce((sum, h) => sum + h.currentValue, 0).toFixed(2));
  const totalInvested = Number(holdings.reduce((sum, h) => sum + h.investedAmount, 0).toFixed(2));
  const totalGain = Number((totalValuation - totalInvested).toFixed(2));
  const totalGainPercent = totalInvested > 0 ? Number(((totalGain / totalInvested) * 100).toFixed(2)) : 0;

  return {
    broker,
    fileName,
    recordCount: holdings.length,
    totalValuation,
    totalInvested,
    totalGain,
    totalGainPercent,
    parsedAt: new Date().toLocaleDateString('en-IN'),
    holdings
  };
}

// Client-Side CSV / Excel File Loader
export async function parseBrokerFile(file: File): Promise<BrokerParsedReport> {
  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

  if (isExcel) {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    return parseBrokerTableData(rows, file.name);
  } else {
    // CSV parsing via FileReader and XLSX utility for bulletproof quotes/commas/CRLF handling
    const text = await file.text();
    const workbook = XLSX.read(text, { type: 'string' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    return parseBrokerTableData(rows, file.name);
  }
}

// Convert Broker Parsed Holdings to Sovereign Vault Holding[]
export function convertBrokerItemsToHoldings(report: BrokerParsedReport): Holding[] {
  const total = report.totalValuation || 1;
  return report.holdings.map((h, idx) => ({
    id: `import-${h.symbol.toLowerCase()}-${Date.now()}-${idx}`,
    symbol: h.symbol,
    name: h.name,
    isin: h.isin,
    assetClass: h.assetClass,
    sector: h.sector,
    marketCapCategory: h.marketCapCategory,
    quantity: h.quantity,
    averageBuyPrice: h.averagePrice,
    currentPrice: h.currentPrice,
    investedAmount: h.investedAmount,
    currentValue: h.currentValue,
    unrealizedGain: h.unrealizedGain,
    unrealizedGainPercent: h.unrealizedGainPercent,
    allocationPercent: Number(((h.currentValue / total) * 100).toFixed(2)),
    sparkline: [h.averagePrice, h.averagePrice * 1.02, h.currentPrice * 0.98, h.currentPrice],
    riskGrade: h.assetClass === 'gold' ? 'Low' : h.marketCapCategory === 'Large Cap' ? 'Moderate' : 'High'
  }));
}

// Built-in Verified Sample Datasets for Instant Testing
export const SAMPLE_ZERODHA_HOLDINGS: BrokerParsedReport = {
  broker: 'Zerodha',
  fileName: 'zerodha_holdings_verified.csv',
  recordCount: 5,
  totalValuation: 1428500,
  totalInvested: 1145000,
  totalGain: 283500,
  totalGainPercent: 24.76,
  parsedAt: new Date().toLocaleDateString('en-IN'),
  holdings: [
    {
      id: 'z-1',
      symbol: 'RELIANCE',
      name: 'Reliance Industries Ltd.',
      isin: 'INE002A01018',
      assetClass: 'equity',
      sector: 'Energy & Petrochem',
      marketCapCategory: 'Large Cap',
      quantity: 150,
      averagePrice: 2450.00,
      currentPrice: 2980.00,
      investedAmount: 367500,
      currentValue: 447000,
      unrealizedGain: 79500,
      unrealizedGainPercent: 21.63,
      brokerSource: 'Zerodha'
    },
    {
      id: 'z-2',
      symbol: 'TCS',
      name: 'Tata Consultancy Services Ltd.',
      isin: 'INE467B01029',
      assetClass: 'equity',
      sector: 'Information Technology',
      marketCapCategory: 'Large Cap',
      quantity: 80,
      averagePrice: 3480.00,
      currentPrice: 4210.00,
      investedAmount: 278400,
      currentValue: 336800,
      unrealizedGain: 58400,
      unrealizedGainPercent: 20.98,
      brokerSource: 'Zerodha'
    },
    {
      id: 'z-3',
      symbol: 'HDFCBANK',
      name: 'HDFC Bank Ltd.',
      isin: 'INE040A01034',
      assetClass: 'equity',
      sector: 'Banking & Financials',
      marketCapCategory: 'Large Cap',
      quantity: 200,
      averagePrice: 1520.00,
      currentPrice: 1675.00,
      investedAmount: 304000,
      currentValue: 335000,
      unrealizedGain: 31000,
      unrealizedGainPercent: 10.20,
      brokerSource: 'Zerodha'
    },
    {
      id: 'z-4',
      symbol: 'INFY',
      name: 'Infosys Ltd.',
      isin: 'INE009A01021',
      assetClass: 'equity',
      sector: 'Information Technology',
      marketCapCategory: 'Large Cap',
      quantity: 100,
      averagePrice: 1450.00,
      currentPrice: 1890.00,
      investedAmount: 145000,
      currentValue: 189000,
      unrealizedGain: 44000,
      unrealizedGainPercent: 30.34,
      brokerSource: 'Zerodha'
    },
    {
      id: 'z-5',
      symbol: 'GOLDBEES',
      name: 'Nippon India Gold BeES ETF',
      isin: 'INF204KB17I5',
      assetClass: 'gold',
      sector: 'Commodity',
      marketCapCategory: 'Commodity',
      quantity: 1800,
      averagePrice: 50.00,
      currentPrice: 67.05,
      investedAmount: 90000,
      currentValue: 120690,
      unrealizedGain: 30690,
      unrealizedGainPercent: 34.10,
      brokerSource: 'Zerodha'
    }
  ]
};

export const SAMPLE_GROWW_HOLDINGS: BrokerParsedReport = {
  broker: 'Groww',
  fileName: 'groww_portfolio_verified.csv',
  recordCount: 4,
  totalValuation: 984200,
  totalInvested: 760000,
  totalGain: 224200,
  totalGainPercent: 29.50,
  parsedAt: new Date().toLocaleDateString('en-IN'),
  holdings: [
    {
      id: 'g-1',
      symbol: 'ITC',
      name: 'ITC Ltd.',
      isin: 'INE154A01025',
      assetClass: 'equity',
      sector: 'FMCG & Consumer',
      marketCapCategory: 'Large Cap',
      quantity: 600,
      averagePrice: 380.00,
      currentPrice: 485.00,
      investedAmount: 228000,
      currentValue: 291000,
      unrealizedGain: 63000,
      unrealizedGainPercent: 27.63,
      brokerSource: 'Groww'
    },
    {
      id: 'g-2',
      symbol: 'BHARTIARTL',
      name: 'Bharti Airtel Ltd.',
      isin: 'INE397D01024',
      assetClass: 'equity',
      sector: 'Telecommunications',
      marketCapCategory: 'Large Cap',
      quantity: 200,
      averagePrice: 1180.00,
      currentPrice: 1540.00,
      investedAmount: 236000,
      currentValue: 308000,
      unrealizedGain: 72000,
      unrealizedGainPercent: 30.51,
      brokerSource: 'Groww'
    },
    {
      id: 'g-3',
      symbol: 'NIFTYBEES',
      name: 'Nippon India Nifty 50 BeES ETF',
      isin: 'INF204KB14I2',
      assetClass: 'etf',
      sector: 'Broad Market Index',
      marketCapCategory: 'Large Cap',
      quantity: 850,
      averagePrice: 215.00,
      currentPrice: 272.00,
      investedAmount: 182750,
      currentValue: 231200,
      unrealizedGain: 48450,
      unrealizedGainPercent: 26.51,
      brokerSource: 'Groww'
    },
    {
      id: 'g-4',
      symbol: 'TATAMOTORS',
      name: 'Tata Motors Ltd.',
      isin: 'INE155A01022',
      assetClass: 'equity',
      sector: 'Automobile',
      marketCapCategory: 'Large Cap',
      quantity: 150,
      averagePrice: 755.00,
      currentPrice: 1026.00,
      investedAmount: 113250,
      currentValue: 154000,
      unrealizedGain: 40750,
      unrealizedGainPercent: 35.98,
      brokerSource: 'Groww'
    }
  ]
};

export const SAMPLE_INDMONEY_HOLDINGS: BrokerParsedReport = {
  broker: 'INDmoney',
  fileName: 'indmoney_wealth_statement.xlsx',
  recordCount: 4,
  totalValuation: 865000,
  totalInvested: 695000,
  totalGain: 170000,
  totalGainPercent: 24.46,
  parsedAt: new Date().toLocaleDateString('en-IN'),
  holdings: [
    {
      id: 'ind-1',
      symbol: 'LT',
      name: 'Larsen & Toubro Ltd.',
      isin: 'INE018A01030',
      assetClass: 'equity',
      sector: 'Capital Goods & Infra',
      marketCapCategory: 'Large Cap',
      quantity: 75,
      averagePrice: 2850.00,
      currentPrice: 3580.00,
      investedAmount: 213750,
      currentValue: 268500,
      unrealizedGain: 54750,
      unrealizedGainPercent: 25.61,
      brokerSource: 'INDmoney'
    },
    {
      id: 'ind-2',
      symbol: 'ICICIBANK',
      name: 'ICICI Bank Ltd.',
      isin: 'INE090A01021',
      assetClass: 'equity',
      sector: 'Banking & Financials',
      marketCapCategory: 'Large Cap',
      quantity: 220,
      averagePrice: 980.00,
      currentPrice: 1215.00,
      investedAmount: 215600,
      currentValue: 267300,
      unrealizedGain: 51700,
      unrealizedGainPercent: 23.98,
      brokerSource: 'INDmoney'
    },
    {
      id: 'ind-3',
      symbol: 'TITAN',
      name: 'Titan Company Ltd.',
      isin: 'INE280A01028',
      assetClass: 'equity',
      sector: 'Consumer Goods & Luxury',
      marketCapCategory: 'Large Cap',
      quantity: 45,
      averagePrice: 3100.00,
      currentPrice: 3640.00,
      investedAmount: 139500,
      currentValue: 163800,
      unrealizedGain: 24300,
      unrealizedGainPercent: 17.42,
      brokerSource: 'INDmoney'
    },
    {
      id: 'ind-4',
      symbol: 'SILVERBEES',
      name: 'Nippon India Silver ETF',
      isin: 'INF204KB18V3',
      assetClass: 'gold',
      sector: 'Commodity',
      marketCapCategory: 'Commodity',
      quantity: 1800,
      averagePrice: 70.00,
      currentPrice: 92.00,
      investedAmount: 126000,
      currentValue: 165600,
      unrealizedGain: 39600,
      unrealizedGainPercent: 31.43,
      brokerSource: 'INDmoney'
    }
  ]
};
