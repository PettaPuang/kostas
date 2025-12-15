import packageJson from "../../../package.json";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const session = await auth();

  // Redirect logged in users away from login page
  if (session?.user) {
    redirect("/welcome");
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center p-4 bg-linear-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            KOSTAS
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Business Management Application for Rental Property
          </p>
        </div>
        <LoginForm />
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Version {packageJson.version}
          </p>
        </div>
      </div>
    </div>
  );
}
