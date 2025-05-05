import type { Metadata } from "next";
import { Mona_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import ErrorBoundary from "@/components/ErrorBoundary";
import AuthRedirectWrapper from "@/components/AuthRedirectWrapper";

const monaSans = Mona_Sans({
  variable: "--font-mona-sans",
  subsets: ["latin"],
  //display: "swap", // ⬅️  improves font performance
});



export const metadata: Metadata = {
  title: "PreWiseAI - Precision in Recruitment",
  description: "PreWiseAI is an AI-driven interview platform with real-time voice integration and automated feedback, helping users prepare faster and smarter.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${monaSans.className} antialiased pattern`}
      >
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        {/* Add the AuthRedirectWrapper to handle redirect authentication */}
        <AuthRedirectWrapper />
        <Toaster />
      </body>
    </html>
  );
}
