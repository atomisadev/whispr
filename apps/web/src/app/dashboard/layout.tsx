import React from "react";
import { UserButton } from "@clerk/nextjs";
import  Image  from "next/image";
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen bg-[#0F2026]" suppressHydrationWarning>
      <header className="flex-shrink-0 flex justify-between items-center p-4 border-b dark:bg-gray-800 dark:border-gray-700">
        {/* <h1 className="text-xl font-semibold">Whispr Dashboard</h1> */}
        <Image src="/logo.svg" alt="Logo" width={100} height={50} />
        <UserButton afterSignOutUrl="/" />
      </header>
      <main className="flex-grow overflow-auto">{children}</main>
    </div>
  );
}
