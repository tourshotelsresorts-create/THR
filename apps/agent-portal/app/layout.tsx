import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>THR Holidays — Agent</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500&family=Source+Sans+3:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="shell">
          <header className="top">
            <a href="/">
              <strong>THR</strong> Holidays · Agent Portal
            </a>
            <a href="/login">Account</a>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
