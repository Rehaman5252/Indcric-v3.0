'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Trophy, Gift, User, History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

const navItems = [
  { href: '/', icon: Home, label: 'Home' },
  { href: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { href: '/history', icon: History, label: 'History' },
  { href: '/rewards', icon: Gift, label: 'Rewards' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export default function BottomNav() {
  const pathname = usePathname();

  // ✅ Hide on specific routes
  if (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/quiz') ||
    pathname.startsWith('/walkthrough') ||
    pathname.startsWith('/admin')
  ) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-amber-900/40 shadow-[0_-8px_24px_rgba(212,175,55,0.3)] z-40">
      {/* Navigation items */}
      <nav className="flex justify-around items-center px-4 py-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href);

          return (
            <motion.div
              key={item.href}
              whileHover={{ scale: 1.1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <Link
                href={item.href}
                className="flex flex-col items-center gap-1 relative px-3 py-2 rounded-lg transition-all duration-200"
              >
                {isActive && (
                  <motion.div
                    layoutId="active-nav"
                    className="absolute inset-0 bg-[#D4AF37]/15 rounded-lg -z-10"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}

                <motion.div
                  animate={isActive ? { scale: 1.15 } : { scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                >
                  <Icon
                    className={cn(
                      'w-6 h-6 transition-all duration-200',
                      isActive
                        ? 'text-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]'
                        : 'text-muted-foreground hover:text-muted-foreground/80'
                    )}
                    style={
                      isActive
                        ? { color: '#D4AF37', filter: 'drop-shadow(0 0 8px rgba(212,175,55,0.6))' }
                        : {}
                    }
                  />
                </motion.div>

                <motion.span
                  animate={isActive ? { scale: 1.05 } : { scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  className={cn(
                    'text-xs font-medium transition-all duration-200',
                    isActive
                      ? 'text-[#D4AF37]'
                      : 'text-muted-foreground group-hover:text-muted-foreground/80'
                  )}
                  style={isActive ? { color: '#D4AF37' } : {}}
                >
                  {item.label}
                </motion.span>
              </Link>
            </motion.div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-amber-900/40 px-4 py-2 text-center bg-black/50">
        <p className="text-xs text-muted-foreground">
          &copy; 2025 Halekard Private Limited | All rights reserved.
        </p>
      </div>
    </div>
  );
}
