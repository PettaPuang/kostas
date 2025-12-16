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

type WelcomeNavbarProps = {
  userName: string;
  userRole: string;
};

export function WelcomeNavbar({ userName, userRole }: WelcomeNavbarProps) {
  const handleLogout = async () => {
    await logoutAction();
  };

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-30 pointer-events-auto">
      <div className="rounded-2xl px-6 py-3">
        <div className="flex items-center justify-between gap-8">
          <h1 className="text-lg font-semibold text-white">KOSTAS</h1>
          <nav className="hidden md:flex items-center gap-6">
            <a
              href="#"
              className="text-white hover:text-orange-500 text-sm transition-all font-medium hover:font-bold hover:scale-105"
            >
              ABOUT
            </a>
            <a
              href="#"
              className="text-white hover:text-orange-500 text-sm transition-all font-medium hover:font-bold hover:scale-105"
            >
              PROPERTIES
            </a>
            <a
              href="#"
              className="text-white hover:text-orange-500 text-sm transition-all font-medium hover:font-bold hover:scale-105"
            >
              ROOMS
            </a>
            <a
              href="#"
              className="text-white hover:text-orange-500 text-sm transition-all font-medium hover:font-bold hover:scale-105"
            >
              DASHBOARD
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-white hover:text-orange-500 rounded-lg transition-all hover:scale-110"
            >
              <Search className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-white hover:text-orange-500 rounded-lg transition-all hover:scale-110"
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
                  className="text-white hover:text-orange-500 hover:font-bold transition-all"
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
