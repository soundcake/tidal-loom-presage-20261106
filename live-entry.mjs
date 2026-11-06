import { SmartSpectraSDK, MetricType } from '@smartspectra/node-sdk/renderer';
import { decodeMetrics } from '@smartspectra/node-sdk/messages';
window.createTidalSensor = apiKey => {
  const sdk = new SmartSpectraSDK({ apiKey, requestedMetrics: [MetricType.CHEST_BREATHING], enableTelemetry: false, enableAccumulatedOutput: false, logLevel: 3 });
  let stream;
  sdk.on('streamAvailable', value => { stream = value; });
  return {
    onValidation: fn => sdk.on('validationStatus', fn),
    onMetrics: fn => sdk.on('metrics', (buf, ts) => fn(decodeMetrics(buf), ts)),
    onError: fn => sdk.on('error', code => fn(`Camera processing stopped (SDK code ${code}).`)),
    start: () => sdk.start(),
    stop: async () => { try { await sdk.stop(); } finally { stream?.getTracks().forEach(track => track.stop()); } },
    destroy: () => { stream?.getTracks().forEach(track => track.stop()); sdk.destroy(); }
  };
};
