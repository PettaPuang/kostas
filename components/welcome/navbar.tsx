"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, LogOut, Search } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth.actions";
import { useRouter } from "next/navigation";

type WelcomeNavbarProps = {
  userName: string;
  userRole: string;
};

export function WelcomeNavbar({ userName, userRole }: WelcomeNavbarProps) {
  const router = useRouter();

  const handleLogout = async () => {
    await logoutAction();
    router.push("/login");
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
      <div className="rounded-2xl px-6 py-3">
        <div className="flex items-center justify-between gap-8">
          <h1 className="text-lg font-semibold text-white">KOSTAS</h1>
          <nav className="hidden md:flex items-center gap-6">
            <a
              href="#"
              className="text-white hover:text-white text-sm transition-colors"
            >
              ABOUT
            </a>
            <a
              href="#"
              className="text-white hover:text-white text-sm transition-colors"
            >
              PROPERTIES
            </a>
            <a
              href="#"
              className="text-white hover:text-white text-sm transition-colors"
            >
              ROOMS
            </a>
            <a
              href="#"
              className="text-white hover:text-white text-sm transition-colors"
            >
              DASHBOARD
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-white hover:text-white hover:bg-white/5 rounded-lg"
            >
              <Search className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-white hover:text-white hover:bg-white/5 rounded-lg"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-black/40 rounded-xl shadow-xl"
              >
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="text-white hover:bg-white/10"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}
