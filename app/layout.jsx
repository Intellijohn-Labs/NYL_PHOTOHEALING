import './globals.css';

export const metadata = {
  title: 'NYL Photo Healing',
  description: "Healers' screen for NYL Photo Healing",
  robots: { index: false, follow: false },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#15242B',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Anek Malayalam covers English and Malayalam, so names typed in either script display properly */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Anek+Malayalam:wght@400;500;600;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
