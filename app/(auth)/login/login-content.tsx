"use client";

import { useState } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function LoginContent() {
  const [showLogin, setShowLogin] = useState(false);

  if (showLogin) {
    return <LoginForm />;
  }

  return (
    <div className="w-full flex flex-col items-center justify-center space-y-8 md:space-y-12">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 md:gap-3">
          <span className="font-bold text-gray-900 dark:text-white text-xl lg:text-2xl">
            KOSTAS
          </span>
        </div>
        <p className="mt-3 text-xs md:text-sm text-gray-500 dark:text-gray-400">
          Business Management Application for Rental Property
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6">
        <div className="text-center p-3 border-2 border-blue-500/20 bg-blue-500/10 rounded-lg">
          <h3 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white">
            Owner-Centric
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Kontrol penuh di tangan pemilik
          </p>
        </div>

        <div className="text-center p-3 border-2 border-green-500/20 bg-green-500/10 rounded-lg">
          <h3 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white">
            Property-First
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Aset adalah pusat data
          </p>
        </div>

        <div className="text-center p-3 border-2 border-purple-500/20 bg-purple-500/10 rounded-lg">
          <h3 className="text-sm md:text-base font-semibold text-gray-900 dark:text-white">
            Simple & Scalable
          </h3>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            Mudah digunakan dan dikembangkan
          </p>
        </div>
      </div>

      {/* Login Button */}
      <div className="text-center mt-12 flex flex-col items-center">
        <div className="flex justify-center mt-4">
          <Button
            onClick={() => setShowLogin(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm md:text-base font-medium"
          >
            Click here to login
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
