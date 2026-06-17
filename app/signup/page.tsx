import { auth } from "@/auth";
import { SignupForm } from "@/components/auth/signup-form";
import { redirect } from "next/navigation";

export default async function SignupPage() {
  const session = await auth();

  if (session?.user) {
    redirect(session.user.role === "admin" ? "/admin" : "/dashboard");
  }

  return (
    <SignupForm
      googleEnabled={Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      )}
    />
  );
}
