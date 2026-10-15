/**
 * iPhone launch screens. iOS only uses an apple-touch-startup-image whose pixel
 * size exactly matches the device, so the one launch design (lib/brand-icon.tsx
 * launchImage) is rendered once per screen size, served at /pwa/launch-WxH.png.
 */
const DEVICES = [
  { w: 440, h: 956, dpr: 3 }, // 16 Pro Max
  { w: 402, h: 874, dpr: 3 }, // 16 Pro
  { w: 430, h: 932, dpr: 3 }, // 14 Pro Max, 15 Plus/Pro Max, 16 Plus
  { w: 393, h: 852, dpr: 3 }, // 14 Pro, 15, 15 Pro, 16
  { w: 428, h: 926, dpr: 3 }, // 12/13 Pro Max, 14 Plus
  { w: 390, h: 844, dpr: 3 }, // 12, 13, 14
  { w: 375, h: 812, dpr: 3 }, // X, XS, 11 Pro, 12/13 mini
  { w: 414, h: 896, dpr: 3 }, // XS Max, 11 Pro Max
  { w: 414, h: 896, dpr: 2 }, // XR, 11
  { w: 375, h: 667, dpr: 2 }, // SE (2nd/3rd gen), 6/7/8
];

export const LAUNCH_SCREENS = DEVICES.map(({ w, h, dpr }) => ({
  file: `launch-${w * dpr}x${h * dpr}.png`,
  width: w * dpr,
  height: h * dpr,
  media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`,
}));
