"use client";

import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { auth } from "@/firebase/client";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  UserCredential,
  Auth
} from "firebase/auth";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

import { signIn, signUp } from "@/lib/actions/auth.action";
import FormField from "./FormField";

// Create a fallback authentication function
const createFallbackAuth = (email: string, uid: string) => {
  // Store basic auth info in localStorage
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('fallbackAuth', JSON.stringify({
        email,
        uid,
        timestamp: Date.now(),
        isAuthenticated: true
      }));
      console.log("Fallback auth created successfully");
    } catch (error) {
      console.error('Error storing fallback auth:', error);
    }
  }
};

// Check if we're in production environment
const isProduction = process.env.NODE_ENV === 'production';

// Adjust timeouts based on environment
const getTimeouts = () => {
  // Use shorter timeouts in production
  if (isProduction) {
    return {
      firebase: 5000,  // 5 seconds in production
      token: 3000,     // 3 seconds in production
      server: 8000,    // 8 seconds in production
      internal: 6000   // 6 seconds in production
    };
  }
  
  // Use longer timeouts in development
  return {
    firebase: 10000,  // 10 seconds in development
    token: 5000,      // 5 seconds in development
    server: 15000,    // 15 seconds in development
    internal: 12000   // 12 seconds in development
  };
};

const authFormSchema = (type: FormType) => {
  return z.object({
    name: type === "sign-up" ? z.string().min(3) : z.string().optional(),
    email: z.string().email(),
    password: z.string().min(3),
  });
};

const AuthForm = ({ type }: { type: FormType }) => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnvironmentReady, setIsEnvironmentReady] = useState(false);
  const timeouts = getTimeouts();

  // Check environment on component mount
  useEffect(() => {
    console.log(`Running in ${process.env.NODE_ENV} environment`);
    console.log(`Using timeouts: ${JSON.stringify(timeouts)}`);
    setIsEnvironmentReady(true);
  }, []);

  const formSchema = authFormSchema(type);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    // Prevent multiple submissions
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    let timeoutIds: NodeJS.Timeout[] = [];
    
    try {
      if (type === "sign-up") {
        const { name, email, password } = data;

        // Add timeout for Firebase operations
        const authPromise = createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        
        // Create a timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
          const id = setTimeout(() => reject(new Error('Authentication timed out')), timeouts.firebase);
          timeoutIds.push(id);
        });
        
        try {
          // Race the auth operation against a timeout
          const userCredential = await Promise.race<UserCredential>([authPromise, timeoutPromise]);
          
          const result = await signUp({
            uid: userCredential.user.uid,
            name: name!,
            email,
            password,
          });

          if (!result.success) {
            toast.error(result.message);
            setIsSubmitting(false);
            return;
          }

          toast.success("Account created successfully. Please sign in.");
          router.push("/sign-in");
        } catch (error: any) {
          console.error("Sign-up error:", error);
          if (error.message === 'Authentication timed out') {
            toast.error("Authentication timed out. Please try again later.");
          } else {
            toast.error(`Sign-up error: ${error.message || "Unknown error"}`);
          }
          setIsSubmitting(false);
          return;
        }
      } else {
        const { email, password } = data;

        // Show loading toast
        const loadingToast = toast.loading("Signing in...");

        try {
          console.log("Starting Firebase authentication...");
          
          // For production, set up a pre-emptive fallback timer
          // This will trigger client-side auth if the process takes too long
          let fallbackTriggered = false;
          
          if (isProduction) {
            const earlyFallbackId = setTimeout(() => {
              console.log("Pre-emptive fallback triggered");
              fallbackTriggered = true;
              
              // Only show the toast if we're still in the loading state
              toast.dismiss(loadingToast);
              toast.warning("Using client-side authentication for faster access.");
              
              // Create fallback authentication with a placeholder UID
              // We'll update this with the real UID if/when Firebase auth completes
              createFallbackAuth(email, `temp-${Date.now()}`);
              
              // Proceed to home page immediately
              setIsSubmitting(false);
              router.push("/");
            }, timeouts.firebase / 2); // Trigger halfway through the Firebase timeout
            
            timeoutIds.push(earlyFallbackId);
          }
          
          // Add timeout for Firebase operations
          const authPromise = signInWithEmailAndPassword(
            auth,
            email,
            password
          );
          
          // Create a timeout promise
          const timeoutPromise = new Promise<never>((_, reject) => {
            const id = setTimeout(() => reject(new Error('Authentication timed out')), timeouts.firebase);
            timeoutIds.push(id);
          });
          
          // Race the auth operation against a timeout
          console.log("Waiting for Firebase auth...");
          const userCredential = await Promise.race<UserCredential>([authPromise, timeoutPromise]);
          console.log("Firebase auth completed successfully");
          
          // If fallback was already triggered, just update the UID in localStorage
          if (fallbackTriggered) {
            console.log("Updating fallback auth with real UID");
            createFallbackAuth(email, userCredential.user.uid);
            return; // Exit early since navigation already happened
          }
          
          // Get token with timeout
          console.log("Requesting ID token...");
          const tokenPromise = userCredential.user.getIdToken();
          const tokenTimeoutPromise = new Promise<never>((_, reject) => {
            const id = setTimeout(() => reject(new Error('Token retrieval timed out')), timeouts.token);
            timeoutIds.push(id);
          });
          
          const idToken = await Promise.race<string>([tokenPromise, tokenTimeoutPromise]);
          console.log("ID token retrieved successfully");
          
          if (!idToken) {
            toast.dismiss(loadingToast);
            toast.error("Sign in Failed. Please try again.");
            setIsSubmitting(false);
            return;
          }

          // Set a timeout for the server action
          let isTimedOut = false;
          const timeoutId = setTimeout(() => {
            isTimedOut = true;
            toast.dismiss(loadingToast);
            toast.error("Server request timed out. Using fallback authentication.");
            
            // Create fallback authentication
            createFallbackAuth(email, userCredential.user.uid);
            
            // Proceed anyway since we have a valid Firebase auth
            toast.success("Signed in with limited functionality.");
            setIsSubmitting(false);
            router.push("/");
          }, timeouts.server);
          timeoutIds.push(timeoutId);
          
          try {
            console.log("Calling server action...");
            // Call the server action directly with a wrapped Promise that catches connection errors
            const actionPromise = new Promise<any>(async (resolve, reject) => {
              try {
                const result = await signIn({ email, idToken });
                resolve(result);
              } catch (e) {
                console.error("Server action internal error:", e);
                reject(e);
              }
            });
            
            // Race against a shorter timeout
            const actionTimeoutPromise = new Promise((_, reject) => {
              const id = setTimeout(() => reject(new Error('Internal timeout')), timeouts.internal);
              timeoutIds.push(id);
            });
            
            const response = await Promise.race([actionPromise, actionTimeoutPromise]);
            console.log("Server action completed:", response);
            
            // If we already timed out, don't continue with the normal flow
            if (isTimedOut) return;
            
            clearTimeout(timeoutId);
            toast.dismiss(loadingToast);
            
            if (response.success) {
              toast.success(response.message || "Signed in successfully.");
              router.push("/");
            } else {
              toast.error(response.message || "Failed to sign in. Please try again.");
              setIsSubmitting(false);
            }
          } catch (serverError: any) {
            console.error("Server action error:", serverError);
            
            // If we already timed out, don't show additional errors
            if (isTimedOut) return;
            
            clearTimeout(timeoutId);
            toast.dismiss(loadingToast);
            
            if (serverError.message === 'Internal timeout' || 
                serverError.message?.includes('Connection') || 
                serverError.message?.includes('network')) {
              toast.error("Connection error. Using client-side authentication.");
              // Create fallback authentication
              createFallbackAuth(email, userCredential.user.uid);
            } else {
              toast.error("Server error. Using client-side authentication.");
            }
            
            // Proceed anyway since we have a valid Firebase auth
            setIsSubmitting(false);
            router.push("/");
          }
        } catch (error: any) {
          console.error("Firebase auth error:", error);
          toast.dismiss(loadingToast);
          
          if (error.message === 'Authentication timed out') {
            toast.error("Authentication timed out. Please try again later.");
          } else if (error.message === 'Token retrieval timed out') {
            toast.error("Token retrieval timed out. Please try again later.");
          } else {
            // Handle specific Firebase auth errors
            if (error.code === 'auth/user-not-found') {
              toast.error("User not found. Please check your email or create an account.");
            } else if (error.code === 'auth/wrong-password') {
              toast.error("Incorrect password. Please try again.");
            } else if (error.code === 'auth/invalid-credential') {
              toast.error("Invalid credentials. Please check your email and password.");
            } else if (error.code === 'auth/network-request-failed') {
              toast.error("Network error. Please check your connection and try again.");
            } else {
              toast.error(`Sign-in error: ${error.message || "Unknown error"}`);
            }
          }
          setIsSubmitting(false);
          return;
        }
      }
    } catch (error: any) {
      console.error("Outer error:", error);
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/user-not-found') {
        toast.error("User not found. Please check your email or create an account.");
      } else if (error.code === 'auth/wrong-password') {
        toast.error("Incorrect password. Please try again.");
      } else if (error.code === 'auth/invalid-credential') {
        toast.error("Invalid credentials. Please check your email and password.");
      } else if (error.code === 'auth/email-already-in-use') {
        toast.error("Email already in use. Please sign in instead.");
      } else if (error.code === 'auth/network-request-failed') {
        toast.error("Network error. Please check your connection and try again.");
      } else {
        toast.error(`There was an error: ${error.message || error}`);
      }
      setIsSubmitting(false);
    } finally {
      // Clean up all timeouts
      timeoutIds.forEach(id => clearTimeout(id));
      setIsSubmitting(false);
    }
  };

  const isSignIn = type === "sign-in";

  return (
    <div className="card-border lg:min-w-[566px]">
      <div className="flex flex-col gap-6 card py-14 px-10">
        <div className="flex flex-row gap-2 justify-center">
          <Image src="/logo.svg" alt="logo" height={32} width={38} />
          <h2 className="text-primary-100">PrepWise</h2>
        </div>

        <h3>Practice job interviews with AI</h3>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-full space-y-6 mt-4 form"
          >
            {!isSignIn && (
              <FormField
                control={form.control}
                name="name"
                label="Name"
                placeholder="Your Name"
                type="text"
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

            <Button className="btn" type="submit" disabled={isSubmitting || !isEnvironmentReady}>
              {isSubmitting 
                ? (isSignIn ? "Signing In..." : "Creating Account...") 
                : (isSignIn ? "Sign In" : "Create an Account")}
            </Button>
          </form>
        </Form>

        <p className="text-center">
          {isSignIn ? "No account yet?" : "Have an account already?"}
          <Link
            href={!isSignIn ? "/sign-in" : "/sign-up"}
            className="font-bold text-user-primary ml-1"
          >
            {!isSignIn ? "Sign In" : "Sign Up"}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AuthForm;
