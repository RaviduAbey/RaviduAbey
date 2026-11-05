import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lanka Ready Operations',
  description: 'Staff portal for tourist visa and driving permit requests.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
