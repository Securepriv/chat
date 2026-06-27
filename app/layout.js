import './globals.css';
import 'stream-chat-react/css/index.css';

export const metadata = {
  title: 'Tchat privé',
  description: 'Application de tchat privé avec Next.js, Vercel et GetStream',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Tchat privé',
    statusBarStyle: 'default',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#2563eb',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
