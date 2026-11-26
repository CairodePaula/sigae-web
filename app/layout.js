import './globals.css';

export const metadata = { title: 'SIGAE Web' };

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}