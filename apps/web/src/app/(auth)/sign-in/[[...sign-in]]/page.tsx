import { SignIn } from "@clerk/nextjs";

export default function Page() {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
      className="bg-[#0F2026] bg-[url(/bg.svg)] bg-cover"
    >
      <SignIn path="/sign-in" />
    </div>
  );
}
