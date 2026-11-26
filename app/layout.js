export const metadata = { title: 'SIGAE Web' };

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: 24, background: '#f7f7f8' }}>
        {children}
      </body>
    </html>
  );
}
