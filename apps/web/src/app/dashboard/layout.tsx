import React from "react";
import { UserButton } from "@clerk/nextjs";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <section>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          padding: "1rem",
          borderBottom: "1px solid #ccc",
        }}
      >
        <h1>Whispr Dashboard</h1>
        <UserButton afterSignOutUrl="/" />
      </header>
      <main style={{ padding: "1rem" }}>{children}</main>
    </section>
  );
}
