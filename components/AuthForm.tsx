"use client"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Form
} from "@/components/ui/form"
import Image from "next/image"
import Link from "next/link"
import { toast } from "sonner"
import FormField from "./FormField"
import { useRouter } from "next/navigation"
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/firebass";
import { signIn, signUp } from "@/lib/actions/auth.action";
import Loading from "./Loading"
import AuthErrorPage from "./AuthErrorPage"


const AuthFormSchema = (type: FormType) => {return z.object ({
  name: type === 'sign-up' ? z.string().min(3) : z.string().optional(),
  email: z.string().email(),
  password: z.string().min(6),
})}


const AuthForm = ({type}: {type: FormType}) => {
  const router = useRouter();
  const formSchema = AuthFormSchema(type);
  // Add loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password:"",
    },
  })

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    // Set loading to true when form is submitted
    setIsLoading(true);

    try {
      if(type === 'sign-up') {
        const { name, email, password } = values;
        const userCredentials = await createUserWithEmailAndPassword(auth,email,password)
        const result = await signUp({
          uid: userCredentials.user.uid,
          name: name!,
          email,
          password,
        })
        if (!result?.success){
          toast.error(result?.message);
          setIsLoading(false);
          return;
        }

        toast.success("Account created successfully.")
        router.push('/dashboard')
      } else {
        const {email,password} = values;
        const userCredential = await signInWithEmailAndPassword(auth,email,password);
        const idToken = await userCredential.user.getIdToken();
        if(!idToken) {
          toast.error('Sign in failed')
          setIsLoading(false);
          return;
        }
        await signIn({ email, idToken})
        toast.success("Sign in successfully.");
        router.push('/dashboard')
      }
    } catch(error: any){
      console.log(error);

      // Set loading to false on error
      setIsLoading(false);

      // Provide more specific error messages based on Firebase error codes
      if (error.code === 'auth/invalid-credential') {
        setAuthError('Invalid email or password. Please check your credentials and try again.');
      } else if (error.code === 'auth/user-not-found') {
        setAuthError('User not found. Please check your email or sign up for a new account.');
      } else if (error.code === 'auth/wrong-password') {
        setAuthError('Incorrect password. Please try again.');
      } else if (error.code === 'auth/email-already-in-use') {
        setAuthError('Email already in use. Please sign in instead.');
      } else if (error.code === 'auth/weak-password') {
        setAuthError('Password is too weak. Please use a stronger password.');
      } else if (error.code === 'auth/unauthorized-domain') {
        setAuthError('This domain is not authorized for authentication. Please contact support.');
      } else {
        setAuthError(`Authentication error: ${error.message || error}`);
      }
    }
  }

  const isSignIn = type === 'sign-in';

  // If there's an authentication error, show the error page
  if (authError) {
    return (
      <AuthErrorPage
        error={authError}
        onRetry={() => setAuthError(null)}
      />
    );
  }

  return (
    <div className="card-border min-w-[20%] relative">
      {/* Full screen loader overlay */}
      {isLoading && (
            <div>{isSignIn ? <Loading /> : <Loading />}</div>
      )}

      <div className="flex flex-col gap-4 card py-8 px-10">
        <div className="flex flex-row gap-2 justify-center">
          <Image src="/logo.svg" alt="logo" height={32} width={30} /><h2 className="text-primary-100">PreWiseAI</h2>
        </div>
        <div className="flex justify-center text-[100%] sm:text-3xl">Practice Like You Truly Mean It</div>

      <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="w-full space-y-6 mt-2 form">

       {!isSignIn && (<FormField control={form.control}
          name="name"
          label="Name"
          placeholder="Your Name"
        />
      )}
       <FormField
          control={form.control}
          name="email"
          label="Email"
          placeholder="Your email address"
          type="email"
       />
       <FormField
          control={form.control}
          name="password"
          label="Password"
          placeholder="Enter your password"
          type="password"
       />

        <Button className="btn" type="submit">
          {isSignIn ? 'Sign In' : 'Sign Up'}
        </Button>

        <Button
          className="btn button flex items-center gap-2"
          type="button"
          onClick={async () => {
            try {
              setIsLoading(true);

              // Check if we're returning from a redirect
              if (typeof window !== 'undefined' && localStorage.getItem('auth_redirect_pending')) {
                // We're returning from a redirect, but the redirect handler in client.ts should handle it
                // Just show a message and reset loading state
                toast.info("Processing authentication...");
                setIsLoading(false);
                return;
              }

              const { signInWithGoogle } = await import("@/firebass");

              // Call signInWithGoogle and handle the result
              const result = await signInWithGoogle();

              // If result is null, it could be:
              // 1. User closed the popup
              // 2. We're using redirect auth and will be redirected
              if (!result) {
                // Check if we're expecting a redirect
                if (typeof window !== 'undefined' && localStorage.getItem('auth_redirect_pending')) {
                  // We're about to be redirected, keep the loading state
                  toast.info("Redirecting to Google authentication...");
                } else {
                  // User likely closed the popup
                  setIsLoading(false);
                }
                return;
              }

              // Continue with the sign-in process
              const idToken = await result.user.getIdToken();

              try {
                await signIn({ email: result.user.email!, idToken });
                toast.success("Signed in with Google successfully!");
              } catch (signInError) {
                console.error("Error during server-side sign-in:", signInError);

                // Create a local session as fallback
                if (typeof window !== 'undefined') {
                  localStorage.setItem('auth_user', JSON.stringify({
                    uid: result.user.uid,
                    email: result.user.email,
                    displayName: result.user.displayName,
                    photoURL: result.user.photoURL,
                    isLocalSession: true,
                  }));

                  toast.success("Signed in with Google (local session)");
                }
              }

              router.push("/dashboard");
            } catch (err: any) {
              console.error("Google sign-in error:", err);

              // Set the error message for the error page
              if (err.code === 'auth/unauthorized-domain') {
                setAuthError("This domain is not authorized for authentication. Please contact support.");
              } else if (err.code === 'auth/popup-closed-by-user') {
                // Just reset loading state without showing an error
                setIsLoading(false);
                return;
              } else if (err.message) {
                setAuthError(err.message);
              } else {
                setAuthError("An error occurred during sign-in. Please try again.");
              }

              setIsLoading(false);
            }
          }}
        >
          <Image src="/google-icon.png" width={26} height={28} alt="Google icon" />
          {isSignIn ? "Continue With Google" : "Continue With Google"}
        </Button>

      </form>
    </Form>
    <p className="text-center">
      {isSignIn ? 'No account yet?': 'Have an account already?'}

      <Link href={!isSignIn ? '/sign-in':'/sign-up'} className="font-bold text-user-primary ml-1">
      {!isSignIn ? "Sign in" : 'Sign up'}</Link>
    </p>

    {/* Add a link to the debug page */}
    <p className="text-center mt-4 text-xs text-gray-500">
      <Link href="/auth-debug" className="hover:underline">
        Having trouble? Check auth status
      </Link>
    </p>
    </div>
    </div>
  )
}

export default AuthForm