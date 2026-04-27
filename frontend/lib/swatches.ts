// Global filter palette — port of COLOR_SWATCHES in prototype/data.js.
// Kept on the client (rather than fetched) because it's tiny, static, and
// drives the filter UI from the first paint.
import type { ColorOption } from './types';

export const COLOR_SWATCHES: ColorOption[] = [
  { name: 'Stone', hex: '#d8d2c5', tone: 'stone' },
  { name: 'Noir', hex: '#1f2535', tone: 'noir' },
  { name: 'Sand', hex: '#ece7d9', tone: 'sand' },
  { name: 'Clay', hex: '#c8aa92', tone: 'clay' },
  { name: 'Bone', hex: '#efece4', tone: 'bone' },
  { name: 'Rose', hex: '#e6c8c1', tone: 'rose' },
  { name: 'Indigo', hex: '#c7c8e4', tone: 'indigo' },
  { name: 'Olive', hex: '#9da079', tone: 'olive' },
  { name: 'Fog', hex: '#d6dbe0', tone: 'fog' },
];
