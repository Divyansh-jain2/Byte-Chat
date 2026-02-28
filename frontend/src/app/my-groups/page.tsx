'use client';

import { useEffect, useState } from 'react';
// import { useRouter } from 'next/navigation';
import Link from 'next/link';
import type { Group } from '@/types/chat.types';
import { groupService } from '@/services/group.service';
import Image from 'next/image';

interface MyGroup extends Group {
  is_admin: boolean;
  is_owner: boolean;
  is_anonymous: boolean;
  joined_at: string;
}

export default function MyGroupsPage() {
  // const router = useRouter();
  const [groups, setGroups] = useState<MyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMyGroups();
  }, []);

  const fetchMyGroups = async () => {
    try {
      const response = await groupService.getMyGroups();
      if (response.success && response.data && Array.isArray(response.data.groups)) {
        setGroups(response.data.groups);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
      setError('Failed to fetch your groups');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-neutral-300 dark:border-neutral-700 border-t-neutral-900 dark:border-t-neutral-100 rounded-sm animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600 dark:text-neutral-400 font-mono">LOADING...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
      {/* Header */}
      <header className="border-b-4 border-neutral-900 dark:border-neutral-100 bg-white dark:bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-neutral-900 dark:text-neutral-100 font-mono">
                [MY GROUPS]
              </h1>
              <p className="mt-2 text-neutral-600 dark:text-neutral-400 font-mono">
                Groups you`ve joined or created
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href="/my-identities"
                className="px-4 py-3 bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
              >
                🎭 IDENTITIES
              </Link>
              <Link
                href="/dashboard"
                className="px-6 py-3 bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors"
              >
                ← BACK
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-100 dark:bg-red-900 border-2 border-red-600 text-red-900 dark:text-red-100 font-mono">
            {error}
          </div>
        )}

        {groups.length === 0 ? (
          <div className="text-center py-12 border-4 border-neutral-900 dark:border-neutral-100 bg-white dark:bg-black">
            <p className="text-neutral-500 dark:text-neutral-400 text-lg font-mono font-bold mb-4">
              NO GROUPS YET
            </p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-neutral-700 dark:hover:bg-neutral-300 transition-colors"
            >
              BROWSE GROUPS
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <div
                key={group.group_id}
                className="bg-white dark:bg-black border-4 border-neutral-900 dark:border-neutral-100 p-6 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] dark:hover:shadow-[8px_8px_0px_0px_rgba(255,255,255,1)] transition-shadow"
              >
                {group.group_dp_url && (
                  <div className="mb-4">
                    <Image
                      src={group.group_dp_url}
                      alt={group.group_name}
                      width={128}
                      height={128}
                      className="object-cover border-2 border-neutral-900 dark:border-neutral-100"
                    />
                  </div>
                )}
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 font-mono">
                    {group.group_name.toUpperCase()}
                  </h3>
                  <div className="flex flex-col gap-1">
                    <span className={`px-2 py-1 text-xs font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 ${
                      group.is_public 
                        ? 'bg-green-200 dark:bg-green-800 text-green-900 dark:text-green-100'
                        : 'bg-orange-200 dark:bg-orange-800 text-orange-900 dark:text-orange-100'
                    }`}>
                      {group.is_public ? 'PUBLIC' : 'PRIVATE'}
                    </span>
                    {group.is_owner && (
                      <span className="px-2 py-1 bg-purple-200 dark:bg-purple-800 text-purple-900 dark:text-purple-100 text-xs font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100">
                        OWNER
                      </span>
                    )}
                    {group.is_admin && !group.is_owner && (
                      <span className="px-2 py-1 bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 text-xs font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100">
                        ADMIN
                      </span>
                    )}
                    {group.is_anonymous && (
                      <span className="px-2 py-1 bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100">
                        ANON
                      </span>
                    )}
                  </div>
                </div>
                
                {group.group_desc && (
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 font-mono line-clamp-3">
                    {group.group_desc}
                  </p>
                )}

                <div className="flex items-center gap-4 mb-4 text-sm text-neutral-600 dark:text-neutral-400 font-mono">
                  <span>{group.member_count} / {group.max_members} MEMBERS</span>
                </div>

                <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono mb-4">
                  Joined: {new Date(group.joined_at).toLocaleDateString()}
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/groups/${group.group_id}`}
                    className="flex-1 px-4 py-2 bg-neutral-900 dark:bg-neutral-100 text-neutral-100 dark:text-neutral-900 font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-neutral-700 dark:hover:bg-neutral-300 transition-colors text-xs text-center"
                  >
                    VIEW
                  </Link>
                  {(group.is_admin || group.is_owner) && (
                    <Link
                      href={`/groups/${group.group_id}/manage`}
                      className="flex-1 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white font-mono font-bold border-2 border-neutral-900 dark:border-neutral-100 hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors text-xs text-center"
                    >
                      MANAGE
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
