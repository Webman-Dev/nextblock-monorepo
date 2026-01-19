'use client';

import { signOutAction } from "../app/actions";
import { hasPublicEnvVars } from "@nextblock-cms/utils";
import Link from "next/link";
import { Badge } from "@nextblock-cms/ui";
import { Button } from "@nextblock-cms/ui";
import { useAuth } from "../context/AuthContext";
import { useTranslations } from "@nextblock-cms/utils";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@nextblock-cms/ui";
import { User, LogOut, LayoutDashboard } from "lucide-react";

export default function AuthButton() {
  const { user, profile, isAdmin, isWriter } = useAuth();
  const { t } = useTranslations();
  const displayName = profile?.full_name || profile?.github_username || user?.email || null;
  const showAdminLink = isAdmin || isWriter;

  if (!hasPublicEnvVars) {
    return (
      <>
        <div className="flex gap-4 items-center">
          <div>
            <Badge
              variant={"default"}
              className="font-normal pointer-events-none"
            >
              {t('update_env_file_warning')}
            </Badge>
          </div>
          <div className="flex gap-2">
            <Button
              asChild
              size="sm"
              variant={"outline"}
              disabled
              className="opacity-75 cursor-none pointer-events-none"
            >
              <Link href="/sign-in">{t('sign_in')}</Link>
            </Button>
            <Button
              asChild
              size="sm"
              variant={"default"}
              disabled
              className="opacity-75 cursor-none pointer-events-none"
            >
              <Link href="/sign-up">{t('sign_up')}</Link>
            </Button>
          </div>
        </div>
      </>
    );
  }
  return user ? (
    <div className="flex items-center gap-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
             {/* Avatar fallback or user icon */}
             <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                {displayName ? displayName.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
             </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">{displayName || 'User'}</p>
              <p className="text-xs leading-none text-muted-foreground">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              <span>{t('profile') || 'Profile'}</span>
            </Link>
          </DropdownMenuItem>
          {showAdminLink && (
             <DropdownMenuItem asChild>
              <Link href="/cms/dashboard" className="cursor-pointer">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                <span>{t('cms_dashboard')}</span>
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <form action={signOutAction} className="w-full">
            <DropdownMenuItem asChild>
                <button type="submit" className="w-full flex items-center cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t('sign_out')}</span>
                </button>
            </DropdownMenuItem>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/sign-in">{t('sign_in')}</Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/sign-up">{t('sign_up')}</Link>
      </Button>
    </div>
  );
}
