import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import './globals.css';

export const metadata: Metadata = {
  title: 'TelePoint EMI Portal',
  description: 'Professional EMI Management System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body bg-obsidian-950 text-slate-200 antialiased">
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0f1425',
              color: '#e2e8f0',
              border: '1px solid rgba(232,184,0,0.2)',
              fontFamily: 'DM Sans, sans-serif',
            },
            success: {
              iconTheme: { primary: '#10b981', secondary: '#0f1425' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#0f1425' },
            },
          }}
        />
        {children}
      </body>
    </html>
  );
}
