import { auth, currentUser } from "@clerk/nextjs/server";
import dynamic from "next/dynamic";

const DynamicMapComponent = dynamic(
  () => import("@/components/mapbox").then((mod) => mod.MapComponent),
  {
    loading: () => (
      <div className="flex items-center justify-center h-full">
        Loading map...
      </div>
    ),
  }
);

export default async function DashboardPage() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  return (
    <div className="h-full w-full">
      {" "}
      <DynamicMapComponent />
    </div>
  );
}
