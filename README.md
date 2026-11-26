# AI Crypto Quant Pro V2 (Mobile PWA)

## Features
- OKX public market candles and ticker watchlist (BTC, ETH, SOL, XRP, DOGE)
- EMA12/26, RSI14, MACD and volume-based rule score
- Local paper account with 1,000 USDT starting balance
- Simulated 3% stop-loss and 6% take-profit checks while the app is running and market refreshes
- Daily simulated realized-loss guard of 30 USDT for new entries
- Position sizing: approximately 1% risk budget and 25% notional cap
- Simplified historical backtest and CSV trade export
- PWA install support for iPhone Safari Add to Home Screen

## Deploy / upgrade existing GitHub Pages
Upload and commit all files in this folder to the root of the existing repository, replacing files with the same names. Keep `index.html` at the repository root. GitHub Pages should remain configured to deploy `main` / root. Wait for deployment, then reopen the existing site.

## Limitations
- Paper trading only. No private API keys, no real orders, no leverage.
- This is a deterministic indicator/rule engine, not a trained AI model and not financial advice.
- Stop-loss/take-profit checks run only while the app is active and market data refreshes; they are not exchange-side orders.
- Data is stored in this browser's local storage and may be lost if site data is cleared or the device changes.
- Backtest is simplified and does not model slippage, spread, partial fills, or market impact.
