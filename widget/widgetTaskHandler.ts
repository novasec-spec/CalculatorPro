/**
 * widgetTaskHandler.ts
 * NovaSec1 — Android widget background task handler
 *
 * This file runs in a headless JS context (no React tree).
 * It handles three widget lifecycle events:
 *   - WIDGET_ADDED   : first render when user adds the widget
 *   - WIDGET_UPDATE  : periodic refresh (every 30 min via WorkManager)
 *   - WIDGET_CLICK   : user tapped a clickAction zone
 *
 * Install: npx expo install react-native-android-widget
 * Register in index.js (see bottom of this file for instructions).
 */

import { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { RatesWidget, RatesWidgetData } from './RatesWidget';
import SecureStorage from 'expo-secure-store';

// ─── Cache keys ───────────────────────────────────────────────────────────────
const CACHE_KEY_RATES  = 'widget_cached_rates';
const CACHE_KEY_CRYPTO = 'widget_cached_crypto';

// ─── API endpoints ────────────────────────────────────────────────────────────
const FX_API     = 'https://api.exchangerate-api.com/v4/latest/USD';
const CRYPTO_API = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatPrice(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000)     return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return n.toFixed(2);
}

function formatKes(usd: number, kesRate: number): string {
  const kes = usd * kesRate;
  if (kes >= 1_000_000) return (kes / 1_000_000).toFixed(2) + 'M';
  if (kes >= 1_000)     return kes.toLocaleString('en-US', { maximumFractionDigits: 0 });
  return kes.toFixed(0);
}

function currentTime(): string {
  const now = new Date();
  return now.toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// ─── Fetch live data (with offline fallback) ──────────────────────────────────
async function fetchWidgetData(): Promise<{ data: RatesWidgetData; isOffline: boolean }> {
  try {
    // Fetch FX rates
    const fxRes     = await fetch(FX_API, { signal: AbortSignal.timeout(8000) });
    const fxJson    = await fxRes.json();
    const kesRate   = fxJson.rates?.KES ?? 150;

    // Fetch crypto prices
    const cryptoRes  = await fetch(CRYPTO_API, { signal: AbortSignal.timeout(8000) });
    const cryptoJson = await cryptoRes.json();
    const btcUsd     = cryptoJson.bitcoin?.usd  ?? 0;
    const ethUsd     = cryptoJson.ethereum?.usd ?? 0;

    const data: RatesWidgetData = {
      usdToKes:  kesRate.toFixed(2),
      btcUsd:    formatPrice(btcUsd),
      ethUsd:    formatPrice(ethUsd),
      btcKes:    formatKes(btcUsd, kesRate),
      ethKes:    formatKes(ethUsd, kesRate),
      updatedAt: currentTime(),
      isOffline: false,
    };

    // Cache for offline fallback
    await SecureStorage.setItem(CACHE_KEY_RATES,  JSON.stringify({ kesRate }));
    await SecureStorage.setItem(CACHE_KEY_CRYPTO, JSON.stringify({ btcUsd, ethUsd }));

    return { data, isOffline: false };

  } catch {
    // Network failed — load from cache
    let kesRate = 150, btcUsd = 0, ethUsd = 0;

    try {
      const cachedRates  = await SecureStorage.getItem(CACHE_KEY_RATES);
      const cachedCrypto = await SecureStorage.getItem(CACHE_KEY_CRYPTO);
      if (cachedRates)  ({ kesRate }        = JSON.parse(cachedRates));
      if (cachedCrypto) ({ btcUsd, ethUsd } = JSON.parse(cachedCrypto));
    } catch { /* use defaults */ }

    const data: RatesWidgetData = {
      usdToKes:  kesRate.toFixed(2),
      btcUsd:    btcUsd  ? formatPrice(btcUsd)  : '--',
      ethUsd:    ethUsd  ? formatPrice(ethUsd)  : '--',
      btcKes:    btcUsd  ? formatKes(btcUsd, kesRate) : '--',
      ethKes:    ethUsd  ? formatKes(ethUsd, kesRate) : '--',
      updatedAt: currentTime(),
      isOffline: true,
    };

    return { data, isOffline: true };
  }
}

// ─── Main task handler ────────────────────────────────────────────────────────
/**
 * widgetTaskHandler is registered in index.js and called by
 * react-native-android-widget in a headless JS context.
 */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, widgetInfo, renderWidget, jumpToActivity } = props;

  switch (widgetAction) {

    // ── Widget added to home screen ──────────────────────────────────────────
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE': {
      const { data } = await fetchWidgetData();

      // Render the React Native widget tree into a bitmap
      renderWidget(RatesWidget({ data }));
      break;
    }

    // ── User tapped the widget ───────────────────────────────────────────────
    case 'WIDGET_CLICK': {
      const { clickAction } = props;

      switch (clickAction) {
        case 'OPEN_CURRENCY_TAB':
          // Deep-link into the app's currency tab
          jumpToActivity({
            className: '.MainActivity',
            extras: [{ key: 'tab', value: 'currency' }],
          });
          break;

        case 'OPEN_CRYPTO_TAB':
          jumpToActivity({
            className: '.MainActivity',
            extras: [{ key: 'tab', value: 'crypto' }],
          });
          break;

        case 'OPEN_APP':
        default:
          jumpToActivity({
            className: '.MainActivity',
            extras: [{ key: 'tab', value: 'calculator' }],
          });
          break;
      }
      break;
    }

    // ── Widget resized ───────────────────────────────────────────────────────
    case 'WIDGET_RESIZED': {
      // Re-render at new size (data from cache for speed)
      const { data } = await fetchWidgetData();
      renderWidget(RatesWidget({ data }));
      break;
    }

    // ── Widget removed ───────────────────────────────────────────────────────
    case 'WIDGET_DELETED':
      // Nothing to clean up — cached rates are also used by the main app
      break;

    default:
      break;
  }
}
