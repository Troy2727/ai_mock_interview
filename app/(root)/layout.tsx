import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";
import { redirect } from "next/navigation";

import { isAuthenticated } from "@/lib/actions/auth.action";

const Layout = async ({ children }: { children: ReactNode }) => {
  const isUserAuthenticated = await isAuthenticated();
  if (!isUserAuthenticated) redirect("/sign-in");

  return (
    <div className="root-layout">
      <nav className="w-full flex justify-center sm:justify-start">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.svg"
            alt="PrepWise Logo"
            width={38}
            height={34}
            style={{ width: "auto", height: "auto" }}
          />
          <h2 className="text-primary-100">PrepWise</h2>
        </Link>
      </nav>

      {children}
    </div>
  );
};

export default Layout;
