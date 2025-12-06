import React, { useEffect, useRef, useId } from 'react';

const SYMBOL_MAP = {
    'BTC': 'BINANCE:BTCUSDT',
    'ETH': 'BINANCE:ETHUSDT',
    'SOL': 'BINANCE:SOLUSDT',
    'DOGE': 'BINANCE:DOGEUSDT',
    'SHIB': 'BINANCE:SHIBUSDT',
    'PEPE': 'BINANCE:PEPEUSDT',
    'XRP': 'BINANCE:XRPUSDT',
    'ADA': 'BINANCE:ADAUSDT',
    'AVAX': 'BINANCE:AVAXUSDT',
    'DOT': 'BINANCE:DOTUSDT',
    'MATIC': 'BINANCE:MATICUSDT',
    'LINK': 'BINANCE:LINKUSDT',
    'UNI': 'BINANCE:UNIUSDT',
    'ATOM': 'BINANCE:ATOMUSDT',
    'LTC': 'BINANCE:LTCUSDT',
    'BCH': 'BINANCE:BCHUSDT',
    'NEAR': 'BINANCE:NEARUSDT',
    'APT': 'BINANCE:APTUSDT',
    'ARB': 'BINANCE:ARBUSDT',
    'OP': 'BINANCE:OPUSDT',
    'SUI': 'BINANCE:SUIUSDT',
    'TIA': 'BINANCE:TIAUSDT',
    'SEI': 'BINANCE:SEIUSDT',
    'BONK': 'BINANCE:BONKUSDT',
    'WIF': 'BINANCE:WIFUSDT'
};

export default function CryptoChart({ assetA, assetB, height = 350 }) {
    const containerId = useId();
    const containerRef = useRef(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Clear previous chart
        containerRef.current.innerHTML = '';

        const symbolA = SYMBOL_MAP[assetA] || `BINANCE:${assetA}USDT`;
        const symbolB = SYMBOL_MAP[assetB] || `BINANCE:${assetB}USDT`;

        // Construct symbol:
        // If Versus (both assets): Show Ratio (A / B) to see relative performance
        // If Single (one asset): Show that asset
        let symbol = symbolA;
        let title = assetA;

        if (assetA && assetB) {
            // Spread chart: A / B
            // This shows how A is performing relative to B
            symbol = `${symbolA}/${symbolB}`;
            title = `${assetA} / ${assetB}`;
        }

        const script = document.createElement('script');
        script.src = "https://s3.tradingview.com/tv.js";
        script.async = true;
        script.onload = () => {
            if (window.TradingView) {
                new window.TradingView.widget({
                    "width": "100%",
                    "height": height,
                    "symbol": symbol,
                    "interval": "15",
                    "timezone": "Etc/UTC",
                    "theme": "dark",
                    "style": "1", // Candles
                    "locale": "en",
                    "toolbar_bg": "#f1f3f6",
                    "enable_publishing": false,
                    "hide_top_toolbar": false,
                    "hide_legend": false,
                    "save_image": false,
                    "container_id": `tv-chart-${containerId}`,
                    "backgroundColor": "rgba(13, 17, 23, 1)", // Match dark theme
                    "gridLineColor": "rgba(255, 255, 255, 0.05)",
                    "allow_symbol_change": false,
                });
            }
        };

        // Create a div for the widget
        const widgetDiv = document.createElement('div');
        widgetDiv.id = `tv-chart-${containerId}`;
        widgetDiv.style.height = '100%';
        containerRef.current.appendChild(widgetDiv);
        containerRef.current.appendChild(script);

    }, [assetA, assetB, height, containerId]);

    return (
        <div
            ref={containerRef}
            style={{
                height,
                width: '100%',
                borderRadius: '12px',
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.1)',
                background: '#0d1117'
            }}
        />
    );
}
