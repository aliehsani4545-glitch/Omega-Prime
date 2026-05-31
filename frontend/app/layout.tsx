import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '../components/Sidebar';
import { TopBar } from '../components/TopBar';

export const metadata: Metadata = {
  title: 'Omega Prime X',
  description: 'Institutional Market Intelligence Cockpit',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="app-layout">
          <Sidebar />
          <div className="main-area">
            <TopBar />
            <main className="page-content">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
