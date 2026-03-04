import type { Metadata } from 'next';
import './globals.css';
import { RecordingProvider } from '@/context/RecordingContext';
import { RecordingStatus } from '@/components/RecordingStatus';
import { UserProvider } from '@/context/UserContext';

export const metadata: Metadata = {
  title: 'StreamFlow',
  description: 'Your personal streaming platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <UserProvider>
          <RecordingProvider>
            {children}
            <RecordingStatus />
          </RecordingProvider>
        </UserProvider>
      </body>
    </html>
  );
}