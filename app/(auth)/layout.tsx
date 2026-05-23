import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Portfolio — Account',
  description: 'Sign in or create your AI Portfolio account.',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      {children}
    </div>
  );
}
