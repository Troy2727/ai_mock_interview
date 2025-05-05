'use server';
import { auth, db } from "@/firebass/admin";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
const TWO_WEEKS = 60 * 60 * 24 * 14;

export async function signUp(params: SignUpParams){
    const { uid, name, email } = params;
    try{
      const userRecord = await db.collection('users').doc(uid).get();
      if (userRecord.exists){
        return {
            success: false,
            message: 'User already exists. Please sign in Instead'
        }
      }

      // Generate avatar URL based on user's name
      const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=200&bold=true&format=svg`;

      await db.collection('users').doc(uid).set({
        name,
        email,
        avatar: avatarUrl
      });

      return {
        success: true,
        message: 'User created successfully',
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
        console.error('Error creating a user', e);
        if (e.code === 'auth/email-already-in-use'){
            return { success: false, message: 'Email already in use' };
        }

    return {
        success: false,
        message: 'Failed to create an account',
    }
}
}

export async function signIn(params: SignInParams){
    const { email, idToken} = params;
    try {
        const userRecord = await auth.getUserByEmail(email);
        if(!userRecord){
            return{
                success: false,
                message: 'User does not exist. Create an account instead.'
            }
        }
        await setSessionCookie(idToken);
    } catch (e) {
        console.log(e);
    }
}

export async function setSessionCookie(idToken: string){
    try {
        const cookieStore = await cookies();

        // Verify the ID token first
        try {
            await auth.verifyIdToken(idToken);
        } catch (verifyError) {
            console.error('Error verifying ID token:', verifyError);
            // If we're in development, create a mock session cookie
            if (process.env.NODE_ENV !== 'production') {
                console.log('Using mock session cookie for development');
                cookieStore.set('session', 'mock-session-cookie-for-development', {
                    maxAge: TWO_WEEKS,
                    httpOnly: true,
                    secure: false,
                    path: '/',
                    sameSite: 'lax',
                });
                return;
            }
            throw verifyError;
        }

        // Create the session cookie
        const sessionCookie = await auth.createSessionCookie(idToken, {expiresIn: TWO_WEEKS * 1000 });

        // Set the cookie
        cookieStore.set('session', sessionCookie, {
            maxAge: TWO_WEEKS,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            sameSite: 'lax',
        });
    } catch (error) {
        console.error('Error setting session cookie:', error);
        // If we're in development, create a mock session cookie
        if (process.env.NODE_ENV !== 'production') {
            console.log('Using mock session cookie for development after error');
            const cookieStore = await cookies();
            cookieStore.set('session', 'mock-session-cookie-for-development', {
                maxAge: TWO_WEEKS,
                httpOnly: true,
                secure: false,
                path: '/',
                sameSite: 'lax',
            });
        } else {
            throw error;
        }
    }
}

export async function getCurrentUser(): Promise<User | null> {
    // First, try to get the user from the session cookie
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;

    if (sessionCookie) {
        try {
            const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);

            const userRecord = await db.collection('users')
            .doc(decodedClaims.uid)
            .get();

            if (userRecord.exists) {
                return {
                    ...userRecord.data(),
                    id: userRecord.id,
                } as User;
            }
        } catch (e) {
            console.log('Error verifying session cookie', e);
            // Continue to check localStorage as fallback
        }
    }

    // If we're in a browser environment, check localStorage for a local session
    if (typeof window !== 'undefined') {
        try {
            const localUser = localStorage.getItem('auth_user');
            if (localUser) {
                const parsedUser = JSON.parse(localUser);

                // Create a User object from the localStorage data
                return {
                    id: parsedUser.uid,
                    name: parsedUser.displayName || 'User',
                    email: parsedUser.email,
                    avatar: parsedUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(parsedUser.displayName || 'User')}&background=random&size=200&bold=true&format=svg`,
                    isLocalSession: true,
                } as User;
            }
        } catch (localStorageError) {
            console.error('Error reading from localStorage:', localStorageError);
        }
    }

    // If we couldn't get the user from either source, return null
    return null;
}

export async function isAuthenticated(){
    const user = await getCurrentUser();

    return !!user;
}

// Sign out user by clearing the session cookie and local storage
export async function signOut() {
    // Clear the session cookie
    const cookieStore = await cookies();
    cookieStore.delete("session");

    // Clear the local session if we're in a browser environment
    if (typeof window !== 'undefined') {
        try {
            localStorage.removeItem('auth_user');
        } catch (error) {
            console.error('Error clearing local session:', error);
        }
    }
}


