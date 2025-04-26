import Image from 'next/image'
import Link from 'next/link'
import React, { ReactNode } from 'react'
import { getCurrentUser, isAuthenticated } from '@/lib/actions/auth.action'
import { redirect } from 'next/navigation';
import SignOutButton from '@/components/SignOutButton';
import UserAvatar from '@/components/UserAvatar';
const Rootlayout = async ({children} : {children: ReactNode}) => {
 const isUserAuthenticated = await isAuthenticated();
  if (!isUserAuthenticated) redirect('/');

  // Get current user to display their avatar
  const user = await getCurrentUser();

  return (
    <div className='root-layout'>
      <nav className='flex items-center justify-between shadow p-4'>
        <Link href="/dashboard" className='flex items-center gap-2' >
          <Image src="/logo.svg" alt="Logo" width={38} height={32}/>
          <h2 className='text-primary-100'>PreWiseAI</h2>
        </Link>

        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-2">
              <UserAvatar user={user} size={40} />
              <span className="hidden sm:inline text-primary-100">{user.name}</span>
            </div>
          )}
          <SignOutButton />
        </div>
      </nav>
      {children}
    </div>
  )
}

export default Rootlayout