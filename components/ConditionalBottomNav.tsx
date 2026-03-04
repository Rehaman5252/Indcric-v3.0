'use client';

import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';

const BottomNav = dynamic(() => import('@/components/BottomNav'), {
  ssr: false,
  loading: () => null,
});

export default function ConditionalBottomNav() {
  const pathname = usePathname();
  
  // ✅ Hide BottomNav on admin routes (and other excluded routes are handled in BottomNav itself)
  if (pathname.startsWith('/admin')) {
    return null;
  }

  return <BottomNav />;
}
