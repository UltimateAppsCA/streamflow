'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  userId: number;
  email: string;
}

export function useAuth(requireAuth: boolean = true) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/me');
        
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          
          // If on landing page but authenticated, redirect to watch
          if (pathname === '/' && requireAuth) {
            router.push('/watch');
          }
        } else {
          setUser(null);
          // If auth required and not authenticated, redirect to login
          if (requireAuth) {
            router.push('/login');
          }
        }
      } catch (error) {
        setUser(null);
        if (requireAuth) {
          router.push('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [pathname, requireAuth, router]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
  };

  return { user, loading, logout };
}