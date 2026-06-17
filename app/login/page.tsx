import { auth } from "@/auth";
import { LoginForm } from "@/components/auth/login-form";
import { redirect } from "next/navigation";

type LoginPageProps = {
  searchParams: Promise<{
    callbackUrl?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth();
  const { callbackUrl = "/" } = await searchParams;

  if (session?.user) {
    redirect(getSafeCallbackUrl(callbackUrl));
  }

  return <LoginForm callbackUrl={callbackUrl} />;
}

function getSafeCallbackUrl(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}
