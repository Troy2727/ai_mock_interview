import Agent from '@/components/Agent'
import EjectionErrorHandler from '@/components/EjectionErrorHandler'
import { getCurrentUser } from '@/lib/actions/auth.action'
import React from 'react'

const page = async () => {
  const user = await getCurrentUser();
  return (
    <>
      <h3> Interview Generation </h3>
      <EjectionErrorHandler>
        <Agent userName={user?.name} userId={user?.id} type="generate" />
      </EjectionErrorHandler>
    </>
  )
}

export default page