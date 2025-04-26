// apps/web/src/app/dashboard/page.tsx
import { auth } from "@clerk/nextjs/server";
import DashboardMapLoader from "@/components/dashboard-map-loader"; // Import the new client component loader

// No need for dynamic or APIProvider imports here anymore

export default async function DashboardPage() {
  const { userId } = await auth(); // Server-side auth check

  if (!userId) {
    // Handle redirect or null render if user is not authenticated
    // For example: redirect('/sign-in');
    return null;
  }

  // The page now simply renders the client component which handles the map
  return <DashboardMapLoader />;
}
