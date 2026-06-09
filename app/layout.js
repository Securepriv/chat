import './globals.css';
import 'stream-chat-react/dist/css/v2/index.css';

export const metadata = {
  title: 'Tchat GetStream + Vercel',
  description: 'Application de tchat simple avec Next.js, Vercel et GetStream',
};

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
