import React from "react";
import { UserButton } from "@clerk/nextjs";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-screen" suppressHydrationWarning>
      <header className="flex-shrink-0 flex justify-between items-center p-4 border-b bg-white dark:bg-gray-800 dark:border-gray-700">
        <h1 className="text-xl font-semibold">Whispr Dashboard</h1>
        <UserButton afterSignOutUrl="/" />
      </header>
      <main className="flex-grow overflow-auto">{children}</main>
    </div>
  );
}
