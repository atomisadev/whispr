import { auth, currentUser } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  const { userId } = await auth();
  const user = await currentUser();

  if (!userId || !user) {
    // ideally shouldn't be reached if the middleware is doing its job but like why not
    return <div>Redirecting...</div>;
  }

  return (
    <div>
      <h2>Welcome to the dasboard {user.firstName || user.username}!</h2>
      <p>This is a protected area</p>
      <p>Your User ID is: {userId}</p>
    </div>
  );
}
