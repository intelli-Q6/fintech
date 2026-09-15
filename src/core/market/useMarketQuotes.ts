import { useState, useEffect } from 'react';
import {
  marketDataService,
  LiveInstrumentQuote,
  MarketSessionInfo
} from './marketDataService';

export function useMarketQuotes() {
  const [quotes, setQuotes] = useState<Record<string, LiveInstrumentQuote>>(() =>
    marketDataService.getAllQuotes()
  );
  const [sessionInfo, setSessionInfo] = useState<MarketSessionInfo>(() =>
    marketDataService.getMarketSessionInfo()
  );
  const [tickerState, setTickerState] = useState(() =>
    marketDataService.getTickerState()
  );

  useEffect(() => {
    // 1. Subscribe to real-time quote ticks
    const unsubscribe = marketDataService.subscribe(newQuotes => {
      setQuotes(newQuotes);
      setTickerState(marketDataService.getTickerState());
    });

    // 2. Periodic clock update for IST market session
    const sessionInterval = setInterval(() => {
      setSessionInfo(marketDataService.getMarketSessionInfo());
    }, 15000);

    return () => {
      unsubscribe();
      clearInterval(sessionInterval);
    };
  }, []);

  return {
    quotes,
    sessionInfo,
    tickerState,
    togglePause: () => marketDataService.toggleTicker(),
    setTickSpeed: (ms: number) => marketDataService.setTickSpeed(ms),
    syncAMFI: (force = true) => marketDataService.syncAMFINAVs(force),
    syncExchange: (symbols?: string[]) => marketDataService.syncExchangeQuotes(symbols),
    syncAll: (force = true) => marketDataService.syncAllFeeds(force),
    registerInstrument: (symbol: string, name: string, assetClass: 'equity' | 'etf' | 'mutual_fund' | 'bond', price: number, dayChange = 0, dayChangePercent = 0) =>
      marketDataService.registerLiveInstrument(symbol, name, assetClass, price, dayChange, dayChangePercent),
    getQuote: (symbol: string) => quotes[symbol] || marketDataService.getQuote(symbol)
  };
}
