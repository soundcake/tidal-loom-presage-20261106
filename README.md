# Tidal Loom

Natural chest movement becomes layered ribbons of ink. Tidal Loom uses SmartSpectra’s chest-breathing trace to change the width of an animated canvas, with three ink palettes and an artwork-only video recorder. There is no target pace, score or health assessment.

## Try the illustration

With Node.js 20 or newer:

```sh
node preview.mjs
```

Open [the local preview](http://127.0.0.1:52106). This mode needs no dependencies, account or camera. Its **SYNTHETIC PREVIEW** label remains visible in exported videos.

## Use your own movement

The desktop app uses Electron and SmartSpectra 3.4.0. You need a webcam, an internet connection and your own SmartSpectra API key. Obtain a key through [Presage](https://physiology.presagetech.com/) and check the account’s available allowance before starting. The SDK is governed by [Presage’s terms](https://presagetech.com/legal/terms-of-service); its license is separate from this app’s MIT license.

```sh
npm ci
npm run build:live
npm run start:live
```

1. Read the data-handling notice and application terms. Camera mode is for consenting adults aged 18 or older.
2. Enter your API key in the app, select the consent checkbox and choose **Start with my camera**. The key is held in memory and cleared from the input after starting; do not put it in source code.
3. Sit comfortably with your face and upper chest visible, with steady lighting. Breathe naturally. The canvas responds only when a valid, fresh chest-motion signal is available.
4. Choose an ink colour. **Record artwork** creates up to 60 seconds of video; **Finish recording** ends it sooner. Download the result to keep it. Recordings contain the ribbons and a live/synthetic signal-source label, without camera images or audio.
5. **Stop & clear session** stops capture and clears the local motion window. Hiding or closing the app also stops capture.

Live recording labels distinguish a fresh SmartSpectra signal from the waiting state. The illustration remains available independently of camera mode.

## How the signal becomes ink

`live-entry.mjs` requests only `MetricType.CHEST_BREATHING`, decodes metric packets and passes `breathing.upperTrace` to `web/signal.mjs`. A rolling window of at most 180 samples normalizes movement, then a smoothed value changes ribbon amplitude. No breathing-rate target or clinical threshold is used.

Invalid validation, missing samples or a signal older than 2.2 seconds stops live animation. Late callbacks from a stopped session cannot restart it. `main.cjs` supplies the SDK’s IPC bridge with a sandboxed renderer, context isolation, no renderer Node access and video-only camera permission.

## Consent and data handling

- **Camera images:** processed on the device by the SDK. The artwork recorder never draws or records camera frames.
- **Local movement:** at most 180 samples in memory, cleared by Stop. There is no application database, analytics service or additional model prompt.
- **SDK processing:** optional telemetry and accumulated output are disabled. Presage’s SDK privacy policy nevertheless describes automatic measurement transmission to Presage and Anthropic for Insights, which cannot currently be disabled. Authentication and usage records also remain enabled. Tidal Loom does not display Insights.
- **Retention:** Presage describes retaining Insights while the developer account is active and normally deleting them within 60 days after closure. Other records have separate retention periods. Stopping Tidal Loom does not delete server records. See the [SDK privacy policy](https://presagetech.com/legal/privacy-policy), including its deletion-request instructions.
- **Artwork video:** only created on request; held in memory until replaced or the app closes, and saved on the device only when downloaded. The recorder performs no uploads. Delete downloaded files locally when no longer wanted.
- **Control:** camera mode requires explicit consent and Start. Stop, hiding the app or closing it ends the session. The app is an artwork and is not intended for diagnosis or treatment.

## Development

```sh
npm test
npm run build:live
```

The tests cover consent before sensor construction, validation and freshness gates, malformed packets, clearing after signal loss, stop/destroy cleanup, startup failures and cancellation while camera permission is pending.

Dependencies are pinned in `package-lock.json`. `web/live.js` is generated locally. Keep API keys out of Git; `.env*` and dependency directories are ignored.

Built for the [Presage SmartSpectra SDK Challenge](https://dev.to/challenges/presage-2026-11-04). SDK reference: [Node.js documentation](https://smartspectra.presagetech.com/docs/nodejs).
