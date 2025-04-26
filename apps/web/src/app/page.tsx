import Image from "next/image";
import Link from "next/link";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";

export default async function Home() {
  const { userId } = await auth();

  return (
    <div className="grid grid-rows-[20px_1fr_20px] bg-[#0F2026] bg-[url(/bg.svg)] bg-cover items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center  sm:items-start">
        <div className="flex gap-4 items-center flex-col">
          <Image
            src="/logo.svg"
            alt="Logo"
            width={600}
            height={50}/>
          {!userId ? (
            // Show sign-in/sign-up if not logged in
            <>
              <SignInButton>
                <button className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto">
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton>
                <button className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]">
                  Sign Up
                </button>
              </SignUpButton>
            </>
          ) : (
            // Show link to dashboard if logged in
            <Link href="/dashboard">
              <span className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto">
                Go to Dashboard
              </span>
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
