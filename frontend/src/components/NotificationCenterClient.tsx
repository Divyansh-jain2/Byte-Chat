'use client';

import dynamic from 'next/dynamic';

const NotificationCenter = dynamic(() => import('@/components/NotificationCenter'), {
  ssr: false,
});

export default function NotificationCenterClient() {
  return <NotificationCenter />;
}
