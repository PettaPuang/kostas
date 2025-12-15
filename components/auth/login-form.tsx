"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Email atau password salah");
        setIsLoading(false);
        return;
      }

      if (result?.ok) {
        // Redirect ke home, akan otomatis redirect sesuai role
        router.push("/");
        router.refresh();
      } else {
        setError("Login gagal. Silakan coba lagi.");
        setIsLoading(false);
      }
    } catch (error) {
      setError("Terjadi kesalahan. Silakan coba lagi.");
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit}>
        <div className="flex flex-col gap-3 md:gap-4 lg:gap-5">
          <div className="grid gap-1.5 md:gap-2">
            <Label
              htmlFor="email"
              className="text-xs md:text-sm font-medium"
            >
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Masukkan email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="h-10 md:h-11 text-sm border-gray-300 dark:border-gray-700 focus:border-[#006FB8] focus:ring-[#006FB8]"
            />
          </div>
          <div className="grid gap-1.5 md:gap-2">
            <Label
              htmlFor="password"
              className="text-xs md:text-sm font-medium"
            >
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Masukkan password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="pr-10 h-10 md:h-11 text-sm border-gray-300 dark:border-gray-700 focus:border-[#006FB8] focus:ring-[#006FB8]"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-2 md:px-3 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-3.5 w-3.5 md:h-4 md:w-4 text-gray-500" />
                ) : (
                  <Eye className="h-3.5 w-3.5 md:h-4 md:w-4 text-gray-500" />
                )}
                <span className="sr-only">
                  {showPassword ? "Hide password" : "Show password"}
                </span>
              </Button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-2 md:p-3 text-xs md:text-sm text-destructive">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-10 md:h-11 text-xs md:text-sm font-medium bg-[#006FB8] hover:bg-[#005A8C] text-white transition-colors"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 md:h-4 md:w-4 animate-spin" />
                Masuk...
              </>
            ) : (
              "Masuk"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
