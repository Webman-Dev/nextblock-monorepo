// app/cms/CmsClientLayout.tsx
"use client"

import React, { type ReactNode, useEffect } from "react"
import { useAuth } from "../../context/AuthContext"
import { useRouter, usePathname } from "next/navigation" // Import usePathname
import Link from "next/link"
import {
  LayoutDashboard, FileText, PenTool, Users, Settings, ChevronRight, LogOut, Menu, ListTree, Image as ImageIconLucide, X, Languages as LanguagesIconLucide, MessageSquare,
  Copyright as CopyrightIcon, ShoppingBag, ListOrdered,
} from "lucide-react"
import { Button } from "@nextblock-cms/ui"
import { Avatar, AvatarFallback, AvatarImage } from "@nextblock-cms/ui"
import { cn } from "@nextblock-cms/utils"
import { signOutAction } from "../actions";
import Image from "next/image";
import { FeedbackModal } from "./components/FeedbackModal";

const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-full w-full py-20">
    <div className="relative">
      <div className="h-16 w-16 rounded-full border-t-4 border-b-4 border-primary animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-10 w-10 rounded-full bg-background"></div>
      </div>
    </div>
  </div>
);

type NavItemProps = {
  href: string
  icon: React.ElementType
  children: React.ReactNode
  isActive?: boolean
  adminOnly?: boolean
  writerOnly?: boolean
  isAdmin?: boolean
  isWriter?: boolean
  onClick?: () => void
}

const NavItem = ({ href, icon: Icon, children, isActive, adminOnly, writerOnly, isAdmin, isWriter, onClick }: NavItemProps) => {
  if (adminOnly && !isAdmin) return null
  if (writerOnly && !isWriter && !isAdmin) return null

  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
          isActive
            ? "bg-primary/10 text-primary dark:bg-primary/20"
            : "text-slate-600 hover:text-primary hover:bg-primary/5 dark:text-slate-300 dark:hover:bg-primary/10",
        )}
      >
        <Icon className="h-5 w-5" />
        <span>{children}</span>
        {isActive && <ChevronRight className="h-4 w-4 ml-auto" />}
      </Link>
    </li>
  )
};

type CollapsibleNavItemProps = {
  icon: React.ElementType
  title: string
  children: React.ReactNode
  isActive?: boolean
  adminOnly?: boolean
  isAdmin?: boolean
}

const CollapsibleNavItem = ({ icon: Icon, title, children, isActive, adminOnly, isAdmin }: CollapsibleNavItemProps) => {
  const [isOpen, setIsOpen] = React.useState(isActive);

  if (adminOnly && !isAdmin) return null

  return (
    <li>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all w-full",
          isActive
            ? "bg-primary/10 text-primary dark:bg-primary/20"
            : "text-slate-600 hover:text-primary hover:bg-primary/5 dark:text-slate-300 dark:hover:bg-primary/10",
        )}
      >
        <Icon className="h-5 w-5" />
        <span>{title}</span>
        <ChevronRight className={cn("h-4 w-4 ml-auto transition-transform", isOpen && "rotate-90")} />
      </button>
      {isOpen && (
        <ul className="pl-6 space-y-1.5 mt-1.5">
          {children}
        </ul>
      )}
    </li>
  )
};


export default function CmsClientLayout({ children }: { children: ReactNode }) {
  const { user, profile, role, isLoading, isAdmin, isWriter } = useAuth();
  const router = useRouter();
  const pathname = usePathname(); // Use the usePathname hook
  const [cmsSidebarOpen, setCmsSidebarOpen] = React.useState(false);

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push("/sign-in?redirect=/cms/dashboard");
      } else if (!isWriter && !isAdmin) {
        router.push("/unauthorized?reason=insufficient_role_in_layout");
      }
    }
  }, [user, role, isLoading, router, isAdmin, isWriter]);

  useEffect(() => {
    const mainLayoutElement = document.querySelector('body > div > main > div.flex-1.w-full.flex.flex-col.items-center');
    if (mainLayoutElement) {
      mainLayoutElement.classList.remove('max-w-7xl');
      (mainLayoutElement as HTMLElement).style.padding = '0';
    }
     const mainScreenChild = document.querySelector('main.min-h-screen > div.flex-1.w-full');
     if (mainScreenChild) {
        mainScreenChild.classList.remove("max-w-7xl");
    }

    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setCmsSidebarOpen(true);
      } else {
        // setCmsSidebarOpen(false); // Removed to allow manual toggle on mobile
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const closeSidebarOnMobile = () => {
    if (window.innerWidth < 768) {
      setCmsSidebarOpen(false);
    }
  };


  // With server-side auth data, isLoading is initially false.
  // We show a spinner only if something client-side sets it to true (e.g., during logout).
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // The useEffect handles redirection if the server-provided user/role is insufficient.
  // Returning null here prevents rendering the layout for unauthorized users.
  if (!user || (!isWriter && !isAdmin)) {
    return null;
  }

  const getInitials = () => {
    if (profile && profile.full_name) return profile.full_name.split(' ').map((n: string) => n[0]).join('').substring(0,2).toUpperCase();
    if (profile && profile.github_username) return profile.github_username.substring(0,2).toUpperCase();
    if (user && user.email) return user.email.charAt(0).toUpperCase();
    return "U"; // Default fallback
  }
  const getRoleColor = () => {
    if (isAdmin) return "bg-amber-500";
    if (isWriter) return "bg-emerald-500";
    return "bg-sky-500"; // Default color
  }

  // pageTitle logic should now work reliably with usePathname
  let pageTitle = "CMS"; // Default title
  if (pathname === "/cms/dashboard") pageTitle = "Dashboard";
  else if (pathname.startsWith("/cms/pages/new")) pageTitle = "New Page";
  else if (pathname.startsWith("/cms/pages/") && pathname.endsWith("/edit")) pageTitle = "Edit Page";
  else if (pathname.startsWith("/cms/pages")) pageTitle = "Pages";
  else if (pathname.startsWith("/cms/posts/new")) pageTitle = "New Post";
  else if (pathname.startsWith("/cms/posts/") && pathname.endsWith("/edit")) pageTitle = "Edit Post";
  else if (pathname.startsWith("/cms/posts")) pageTitle = "Posts";
  else if (pathname.startsWith("/cms/navigation/new")) pageTitle = "New Navigation Item";
  else if (pathname.startsWith("/cms/navigation/") && pathname.includes("/edit")) pageTitle = "Edit Navigation Item";
  else if (pathname.startsWith("/cms/navigation")) pageTitle = "Navigation";
  else if (pathname.startsWith("/cms/media/") && pathname.endsWith("/edit")) pageTitle = "Edit Media Item";
  else if (pathname.startsWith("/cms/media")) pageTitle = "Media Library";
  else if (pathname.startsWith("/cms/users/") && pathname.endsWith("/edit")) pageTitle = "Edit User Profile";
  else if (pathname.startsWith("/cms/users")) pageTitle = "User Management";
  else if (pathname.startsWith("/cms/settings/languages/new")) pageTitle = "New Language";
  else if (pathname.startsWith("/cms/settings/languages") && pathname.includes("/edit")) pageTitle = "Edit Language";
  else if (pathname.startsWith("/cms/settings/languages")) pageTitle = "Language Settings";
  // Fallback for general /cms/settings if no more specific language path matches
  else if (pathname.startsWith("/cms/settings/logos")) pageTitle = "Logos";
  else if (pathname.startsWith("/cms/settings/copyright")) pageTitle = "Copyright Settings";
  else if (pathname.startsWith("/cms/settings/extra-translations")) pageTitle = "Extra Translations";

  else if (pathname.startsWith("/cms/settings")) pageTitle = "Settings";
  else if (pathname.startsWith("/cms/products/new")) pageTitle = "New Product";
  else if (pathname.startsWith("/cms/products/") && pathname.endsWith("/edit")) pageTitle = "Edit Product";
  else if (pathname.startsWith("/cms/products")) pageTitle = "Products";
  else if (pathname.startsWith("/cms/orders/") && pathname.endsWith("/edit")) pageTitle = "Edit Order";
  else if (pathname.startsWith("/cms/orders")) pageTitle = "Orders";


  return (
    <div className="w-full flex flex-col md:flex-row bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="fixed bottom-4 right-4 z-[60] md:hidden">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setCmsSidebarOpen(!cmsSidebarOpen)}
          className="bg-white shadow-lg dark:bg-slate-800 rounded-full h-12 w-12"
        >
          {cmsSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      <aside
        className={cn(
          "fixed md:sticky top-0 left-0 h-screen w-64 bg-white shadow-lg transition-transform duration-300 ease-in-out dark:bg-slate-900 dark:border-r dark:border-slate-700/60",
          "md:translate-x-0",
          cmsSidebarOpen ? "translate-x-0" : "-translate-x-full",
          "z-30"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b dark:border-slate-700/60 h-16 flex items-center shrink-0">
            <Link href="/cms/dashboard" className="flex items-center gap-2 px-2">
              <Image
                src="/images/nextblock-logo-small.webp"
                alt="Nextblock logo"
                width={32}
                height={32}
                className="h-8 w-auto"
                priority
              />
              <h2 className="text-xl font-bold text-foreground">
                Nextblock CMS
              </h2>
            </Link>
          </div>

          <nav className="px-3 py-4 flex-1 overflow-y-auto">
            <ul className="space-y-1.5">
              <NavItem href="/cms/dashboard" icon={LayoutDashboard} isActive={pathname === "/cms/dashboard"} isAdmin={isAdmin} isWriter={isWriter} onClick={closeSidebarOnMobile}>
                Dashboard
              </NavItem>
              <NavItem href="/cms/pages" icon={FileText} isActive={pathname.startsWith("/cms/pages")} writerOnly isAdmin={isAdmin} isWriter={isWriter} onClick={closeSidebarOnMobile}>
                Pages
              </NavItem>
              <NavItem href="/cms/posts" icon={PenTool} isActive={pathname.startsWith("/cms/posts")} writerOnly isAdmin={isAdmin} isWriter={isWriter} onClick={closeSidebarOnMobile}>
                Posts
              </NavItem>
              <NavItem href="/cms/media" icon={ImageIconLucide} isActive={pathname.startsWith("/cms/media")} writerOnly isAdmin={isAdmin} isWriter={isWriter} onClick={closeSidebarOnMobile}>
                Media
              </NavItem>

              <div className="mt-6 mb-2">
                <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                  Store
                </p>
              </div>
              <NavItem href="/cms/products" icon={ShoppingBag} isActive={pathname.startsWith("/cms/products")} writerOnly isAdmin={isAdmin} isWriter={isWriter} onClick={closeSidebarOnMobile}>
                Products
              </NavItem>
              <NavItem href="/cms/orders" icon={ListOrdered} isActive={pathname.startsWith("/cms/orders")} writerOnly isAdmin={isAdmin} isWriter={isWriter} onClick={closeSidebarOnMobile}>
                Orders
              </NavItem>

              {isAdmin && (
                <>
                  <div className="mt-6 mb-2">
                    <p className="px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider dark:text-slate-400">
                      Administration
                    </p>
                  </div>
                  <NavItem href="/cms/navigation" icon={ListTree} isActive={pathname.startsWith("/cms/navigation")} adminOnly isAdmin={isAdmin} onClick={closeSidebarOnMobile}>
                    Navigation
                  </NavItem>
                  <NavItem href="/cms/users" icon={Users} isActive={pathname.startsWith("/cms/users")} adminOnly isAdmin={isAdmin} onClick={closeSidebarOnMobile}>
                    Manage Users
                  </NavItem>
                  <CollapsibleNavItem
                    icon={Settings}
                    title="Settings"
                    isActive={pathname.startsWith("/cms/settings")}
                    adminOnly
                    isAdmin={isAdmin}
                  >
                    <NavItem href="/cms/settings/languages" icon={LanguagesIconLucide} isActive={pathname.startsWith("/cms/settings/languages")} adminOnly isAdmin={isAdmin} onClick={closeSidebarOnMobile}>
                      Languages
                   </NavItem>
                   <NavItem href="/cms/settings/logos" icon={ImageIconLucide} isActive={pathname.startsWith("/cms/settings/logos")} adminOnly isAdmin={isAdmin} onClick={closeSidebarOnMobile}>
                     Logos
                   </NavItem>
                    <NavItem href="/cms/settings/copyright" icon={CopyrightIcon} isActive={pathname.startsWith("/cms/settings/copyright")} adminOnly isAdmin={isAdmin} onClick={closeSidebarOnMobile}>
                      Copyright
                    </NavItem>
                    <NavItem href="/cms/settings/extra-translations" icon={MessageSquare} isActive={pathname.startsWith("/cms/settings/extra-translations")} adminOnly isAdmin={isAdmin} onClick={closeSidebarOnMobile}>
                      Extra Translations
                    </NavItem>
                 </CollapsibleNavItem>
                </>
              )}
            </ul>
          </nav>


          <div className="p-3 pb-0">
             <FeedbackModal />
          </div>

          <div className="mt-auto p-3 border-t border-slate-200 dark:border-slate-700/60 shrink-0">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border">
                <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.github_username || user?.email} />
                <AvatarFallback className="bg-primary/10 text-primary font-medium">{getInitials()}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-slate-700 dark:text-slate-200">{profile?.full_name || profile?.github_username || user?.email}</p>
                <div className="flex items-center gap-1.5">
                  <div className={cn("h-2 w-2 rounded-full", getRoleColor())}></div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">{role}</p>
                </div>
              </div>
              <form action={signOutAction}>
                <Button type="submit" variant="ghost" size="icon" className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300" title="Sign Out">
                    <LogOut className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 transition-all duration-300 ease-in-out w-full">
        <header className="bg-background dark:bg-slate-800/30 border-b border-border h-16 flex items-center px-6 sticky top-0 z-20 w-full shrink-0">
            <Button variant="ghost" size="icon" className="md:hidden mr-3 -ml-2" onClick={() => setCmsSidebarOpen(!cmsSidebarOpen)}>
                <Menu className="h-5 w-5" />
            </Button>
           <h1 className="text-lg font-semibold text-foreground">
              {pageTitle}
            </h1>
        </header>
        <main className="p-6 w-full overflow-y-auto h-[calc(100vh-4rem)]">
            {children}
        </main>
      </div>
      {cmsSidebarOpen && ! (typeof window !== 'undefined' && window.innerWidth >= 768) && (
        <div
            className="fixed inset-0 bg-black/30 z-20 md:hidden"
            onClick={() => setCmsSidebarOpen(false)}
        />
      )}
    </div>
  )
}
