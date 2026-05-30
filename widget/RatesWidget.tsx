/**
 * RatesWidget.tsx
 * NovaSec1 — Medium (4×2) Android home screen widget
 * Shows: USD→KES live rate, BTC price, ETH price, last-updated time
 *
 * Built with react-native-android-widget
 * Tapping the widget opens the app to the relevant tab.
 */

import React from 'react';
import {
  FlexWidget,
  TextWidget,
  ImageWidget,
} from 'react-native-android-widget';

export interface RatesWidgetData {
  usdToKes: string;   // e.g. "130.45"
  btcUsd: string;     // e.g. "67,420"
  ethUsd: string;     // e.g. "3,512"
  btcKes: string;     // e.g. "8,764,000"
  ethKes: string;     // e.g. "456,560"
  updatedAt: string;  // e.g. "14:32"
  isOffline: boolean;
}

// ─── Colour tokens (match App.js) ────────────────────────────────────────────
const BG       = '#0A0A0A';
const CARD     = '#1C1C1E';
const ACCENT   = '#FF9F0A';
const TEXT     = '#FFFFFF';
const MUTED    = '#888888';
const DIVIDER  = '#2C2C2E';
const UP_GREEN = '#30D158';

interface Props {
  data: RatesWidgetData;
}

export function RatesWidget({ data }: Props) {
  const {
    usdToKes,
    btcUsd,
    ethUsd,
    btcKes,
    ethKes,
    updatedAt,
    isOffline,
  } = data;

  return (
    /**
     * Root container — fills the 4×2 widget cell.
     * clickAction opens NovaSec1 when user taps the widget.
     */
    <FlexWidget
      style={{
        width: 'match_parent',
        height: 'match_parent',
        flexDirection: 'column',
        backgroundColor: BG,
        borderRadius: 20,
        padding: 14,
      }}
      clickAction="OPEN_APP"
    >
      {/* ── Header row ───────────────────────────────────────────── */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
        }}
      >
        {/* App name + offline badge */}
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TextWidget
            text="NovaSec1"
            style={{
              fontSize: 13,
              color: ACCENT,
              fontFamily: 'sans-serif-medium',
            }}
          />
          {isOffline && (
            <TextWidget
              text=" · cached"
              style={{ fontSize: 11, color: MUTED, fontFamily: 'sans-serif' }}
            />
          )}
        </FlexWidget>

        {/* Last updated */}
        <TextWidget
          text={`Updated ${updatedAt}`}
          style={{ fontSize: 11, color: MUTED, fontFamily: 'sans-serif' }}
        />
      </FlexWidget>

      {/* ── Divider ───────────────────────────────────────────────── */}
      <FlexWidget
        style={{
          height: 1,
          backgroundColor: DIVIDER,
          marginBottom: 10,
        }}
      />

      {/* ── Main rates row ────────────────────────────────────────── */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          flex: 1,
          justifyContent: 'space-between',
          alignItems: 'stretch',
        }}
      >

        {/* USD → KES card */}
        <FlexWidget
          style={{
            flex: 1,
            backgroundColor: CARD,
            borderRadius: 14,
            padding: 10,
            marginRight: 6,
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
          clickAction="OPEN_CURRENCY_TAB"
        >
          <TextWidget
            text="USD → KES"
            style={{ fontSize: 11, color: MUTED, fontFamily: 'sans-serif' }}
          />
          <TextWidget
            text={usdToKes}
            style={{
              fontSize: 24,
              color: TEXT,
              fontFamily: 'sans-serif-light',
            }}
          />
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TextWidget
              text="▲"
              style={{ fontSize: 9, color: UP_GREEN, marginRight: 2 }}
            />
            <TextWidget
              text="Live rate"
              style={{ fontSize: 10, color: UP_GREEN, fontFamily: 'sans-serif' }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Crypto column — BTC + ETH stacked */}
        <FlexWidget
          style={{
            flex: 1,
            flexDirection: 'column',
            gap: 6,
          }}
          clickAction="OPEN_CRYPTO_TAB"
        >
          {/* BTC card */}
          <FlexWidget
            style={{
              flex: 1,
              backgroundColor: CARD,
              borderRadius: 14,
              padding: 10,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <FlexWidget style={{ flexDirection: 'column' }}>
              <TextWidget
                text="BTC"
                style={{
                  fontSize: 11,
                  color: ACCENT,
                  fontFamily: 'sans-serif-medium',
                }}
              />
              <TextWidget
                text={`$${btcUsd}`}
                style={{ fontSize: 15, color: TEXT, fontFamily: 'sans-serif-light' }}
              />
            </FlexWidget>
            <TextWidget
              text={`KES ${btcKes}`}
              style={{ fontSize: 10, color: MUTED, fontFamily: 'sans-serif' }}
            />
          </FlexWidget>

          {/* ETH card */}
          <FlexWidget
            style={{
              flex: 1,
              backgroundColor: CARD,
              borderRadius: 14,
              padding: 10,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <FlexWidget style={{ flexDirection: 'column' }}>
              <TextWidget
                text="ETH"
                style={{
                  fontSize: 11,
                  color: '#627EEA', // ETH brand blue
                  fontFamily: 'sans-serif-medium',
                }}
              />
              <TextWidget
                text={`$${ethUsd}`}
                style={{ fontSize: 15, color: TEXT, fontFamily: 'sans-serif-light' }}
              />
            </FlexWidget>
            <TextWidget
              text={`KES ${ethKes}`}
              style={{ fontSize: 10, color: MUTED, fontFamily: 'sans-serif' }}
            />
          </FlexWidget>
        </FlexWidget>

      </FlexWidget>

      {/* ── Footer: tap hint ─────────────────────────────────────── */}
      <TextWidget
        text="Tap to open NovaSec1"
        style={{
          fontSize: 10,
          color: DIVIDER,
          fontFamily: 'sans-serif',
          textAlign: 'center',
          marginTop: 8,
        }}
      />
    </FlexWidget>
  );
}
