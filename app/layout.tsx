import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { MusicProvider } from '@/components/MusicContext';
import { MusicToggle } from '@/components/MusicToggle';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Whot Online | Nigerian Card Game',
  description: 'Play the classic Nigerian card game Whot! online with friends.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body suppressHydrationWarning className="antialiased">
        <MusicProvider>
          {children}
          <MusicToggle />
        </MusicProvider>
      </body>
    </html>
  );
}
