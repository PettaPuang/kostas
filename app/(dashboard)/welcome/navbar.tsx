"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, LogOut } from "lucide-react";
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

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      DEVELOPER: "Developer",
      OWNER: "Owner",
      OWNERGROUP: "Owner Group",
      STAFF: "Staff",
      FINANCE: "Finance",
    };
    return roleMap[role] || role;
  };

  return (
    <div className="border-b bg-white dark:bg-gray-900">
      <div className="px-4 py-3 flex items-center justify-between">
        <h1 className="text-lg font-normal">
          Welcome <span className="font-bold">{userName}</span>
          <span className="text-sm text-gray-500 ml-2">
            ({getRoleLabel(userRole)})
          </span>
        </h1>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-10 w-10">
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
