import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <title>THR Holidays — Admin</title>
        <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <nav className="nav">
          <strong>THR Admin</strong>
          <a href="/">Dashboard</a>
          <a href="/masters/hotels">Hotels</a>
          <a href="/masters/vehicles">Vehicles</a>
          <a href="/masters/activities">Activities</a>
          <a href="/masters/destinations">Destinations</a>
          <a href="/masters/suppliers">Suppliers</a>
          <a href="/markup">Markup</a>
          <a href="/settings">Settings</a>
          <a href="/audit">Audit</a>
          <a href="/login">Login</a>
        </nav>
        {children}
      </body>
    </html>
  );
}
