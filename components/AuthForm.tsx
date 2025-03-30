"use client";

import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { auth } from "@/firebase/client";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";

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

const authFormSchema = (type: FormType) => {
  return z.object({
    name: type === "sign-up" ? z.string().min(3) : z.string().optional(),
    email: z.string().email(),
    password: z.string().min(3),
  });
};

const AuthForm = ({ type }: { type: FormType }) => {
  const router = useRouter();

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
          setTimeout(() => reject(new Error('Authentication timed out')), 10000);
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
            return;
          }

          toast.success("Account created successfully. Please sign in.");
          router.push("/sign-in");
        } catch (error: any) {
          if (error.message === 'Authentication timed out') {
            toast.error("Authentication timed out. Please try again later.");
            return;
          }
          throw error; // Re-throw for the outer catch block
        }
      } else {
        const { email, password } = data;

        // Show loading toast
        const loadingToast = toast.loading("Signing in...");

        try {
          // Add timeout for Firebase operations
          const authPromise = signInWithEmailAndPassword(
            auth,
            email,
            password
          );
          
          // Create a timeout promise
          const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error('Authentication timed out')), 10000);
          });
          
          // Race the auth operation against a timeout
          const userCredential = await Promise.race<UserCredential>([authPromise, timeoutPromise]);
          
          // Get token with timeout
          const tokenPromise = userCredential.user.getIdToken();
          const idToken = await Promise.race<string>([
            tokenPromise,
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Token retrieval timed out')), 5000))
          ]);
          
          if (!idToken) {
            toast.dismiss(loadingToast);
            toast.error("Sign in Failed. Please try again.");
            return;
          }

          // Call server with timeout and abort controller
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000);
          
          try {
            // Use a custom fetch with timeout instead of the server action directly
            // This gives us more control over the timeout behavior
            const response = await fetch('/sign-in', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ email, idToken }),
              signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              toast.dismiss(loadingToast);
              toast.success("Signed in successfully.");
              router.push("/");
            } else {
              // Try the server action as fallback
              console.log("Fetch failed, trying server action directly");
              const actionResponse = await signIn({ email, idToken });
              
              toast.dismiss(loadingToast);
              if (actionResponse.success) {
                toast.success(actionResponse.message || "Signed in successfully.");
                router.push("/");
              } else {
                toast.error(actionResponse.message || "Failed to sign in. Please try again.");
              }
            }
          } catch (fetchError: any) {
            clearTimeout(timeoutId);
            
            if (fetchError.name === 'AbortError') {
              console.log("Fetch aborted due to timeout, trying server action directly");
              
              try {
                // Try the server action as fallback with a shorter timeout
                const actionTimeoutId = setTimeout(() => {
                  toast.dismiss(loadingToast);
                  toast.error("Server request timed out. Using fallback authentication.");
                  // Proceed anyway since we have a valid Firebase auth
                  toast.success("Signed in with limited functionality.");
                  router.push("/");
                }, 10000);
                
                const actionResponse = await signIn({ email, idToken });
                clearTimeout(actionTimeoutId);
                
                toast.dismiss(loadingToast);
                if (actionResponse.success) {
                  toast.success(actionResponse.message || "Signed in successfully.");
                  router.push("/");
                } else {
                  toast.error(actionResponse.message || "Failed to sign in. Please try again.");
                }
              } catch (actionError) {
                // If both fetch and server action fail, use client-side only auth
                console.error("Both fetch and server action failed:", actionError);
                toast.dismiss(loadingToast);
                toast.warning("Server authentication failed. Using client-side authentication only.");
                router.push("/");
              }
            } else {
              toast.dismiss(loadingToast);
              toast.error(`Network error: ${fetchError.message || "Unknown error"}`);
            }
          }
        } catch (error: any) {
          toast.dismiss(loadingToast);
          
          if (error.message === 'Authentication timed out') {
            toast.error("Authentication timed out. Please try again later.");
            return;
          } else if (error.message === 'Token retrieval timed out') {
            toast.error("Token retrieval timed out. Please try again later.");
            return;
          }
          throw error; // Re-throw for the outer catch block
        }
      }
    } catch (error: any) {
      console.error(error);
      
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

            <Button className="btn" type="submit">
              {isSignIn ? "Sign In" : "Create an Account"}
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
