import type { Metadata } from 'next';
import { Inter, Instrument_Serif, JetBrains_Mono } from 'next/font/google';

import { AuthProvider } from '@/components/AuthProvider';
import { CartDrawer } from '@/components/CartDrawer';
import { CartProvider } from '@/components/CartProvider';
import { FlyDot } from '@/components/FlyDot';

import './globals.css';

// Self-hosted (build-time bundled) font assets via next/font.
// Each font's CSS variable is overridden on <html>, winning over the
// fallback stack defined in styles/tokens.css. Documented exception
// to "no CDN at build time": next/font fetches once at build, then
// serves the .woff2 from our own origin at runtime.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-sans',
});

const serif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-serif',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Lumen Goods',
  description:
    'A small atelier of garments and leather goods, designed in Copenhagen and made by independent ateliers across Europe and Japan.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable} ${mono.variable}`}>
      <body>
        <AuthProvider>
          <CartProvider>
            {children}
            <CartDrawer />
            <FlyDot />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
