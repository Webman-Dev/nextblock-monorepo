'use client';

import { hasPublicEnvVars } from "@nextblock-cms/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  Avatar,
  AvatarFallback,
  AvatarImage
} from "@nextblock-cms/ui";
import { User, LogOut, LayoutDashboard } from "lucide-react";

export default function AuthButton() {
  const { user, profile, isAdmin, isWriter, supabase } = useAuth();
  const { t } = useTranslations();
  const router = useRouter();
  const displayName = profile?.full_name || profile?.github_username || user?.email || null;
  const showAdminLink = isAdmin || isWriter;

  const handleSignOut = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      router.refresh();
    }
  };

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
          <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
            <Avatar className="h-8 w-8 transition-all hover:ring-1 hover:ring-primary">
              <AvatarImage src={profile?.avatar_url || undefined} alt={displayName || 'User'} />
              <AvatarFallback className="bg-muted">
                {displayName ? displayName.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
              </AvatarFallback>
            </Avatar>
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
          <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t('sign_out')}</span>
          </DropdownMenuItem>
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
