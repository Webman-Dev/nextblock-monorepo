"use client";

import Link from 'next/link';
import React, { useState, useEffect, useMemo, useRef } from 'react'
import type { Database } from '@nextblock-cms/db' // Relative path from components/
import { useCurrentContent } from '../context/CurrentContentContext';
import { useTranslations } from '@nextblock-cms/utils';

type Logo = Database['public']['Tables']['logos']['Row'] & { media: (Database['public']['Tables']['media']['Row'] & { alt_text: string | null }) | null };
type NavigationItem = Database['public']['Tables']['navigation_items']['Row'];
import Image from 'next/image'

const R2_BASE_URL = process.env.NEXT_PUBLIC_R2_BASE_URL || '';
const FALLBACK_LOGO_PATH = '/images/nextblock-logo-small.webp';

// Define a type for hierarchical navigation items
interface HierarchicalNavigationItem extends NavigationItem {
  children: HierarchicalNavigationItem[]
}

// SVG Icon for dropdowns/expandable sections
const ChevronDownIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    {...props}
  >
    <path
      fillRule="evenodd"
      d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.23 8.27a.75.75 0 01.02-1.06z"
      clipRule="evenodd"
    />
  </svg>
)

// Utility function to build the hierarchy from a flat list
const buildHierarchy = (
  items: NavigationItem[],
): HierarchicalNavigationItem[] => {
  const hierarchy: HierarchicalNavigationItem[] = []
  const itemMap: { [id: string]: HierarchicalNavigationItem } = {}

  items.forEach(item => {
    itemMap[item.id] = { ...item, children: [] }
  })

  items.forEach(item => {
    if (item.parent_id && itemMap[item.parent_id]) {
      itemMap[item.parent_id].children.push(itemMap[item.id])
    } else {
      // Add to root if no parent_id or parent_id not in map (handles orphaned items gracefully)
      if (itemMap[item.id]) {
        // Ensure item itself exists in map
        hierarchy.push(itemMap[item.id])
      }
    }
  })
  return hierarchy
}

interface ResponsiveNavProps {
  homeLinkHref: string
  logo?: Logo | null
  siteTitle: string
  navItems: NavigationItem[]
  canAccessCms: boolean;
  cmsDashboardLinkHref: string;
  headerAuthComponent: React.ReactNode;
  languageSwitcherComponent: React.ReactNode;
}

export default function ResponsiveNav({
  homeLinkHref,
  navItems,
  canAccessCms,
  cmsDashboardLinkHref,
  headerAuthComponent,
  languageSwitcherComponent,
  logo,
  siteTitle,
}: ResponsiveNavProps) {
  const { t } = useTranslations();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedMobileItems, setExpandedMobileItems] = useState<Record<string, boolean>>({});

  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  const hierarchicalNavItems = useMemo(() => buildHierarchy(navItems), [navItems]);
  const { currentContent } = useCurrentContent();

  let editPathDetails: { href: string; label: string } | null = null;

  if (canAccessCms && currentContent.id && currentContent.type) {
    if (currentContent.type === 'page') {
      editPathDetails = {
        href: `/cms/pages/${currentContent.id}/edit`,
        label: t('edit_page'),
      };
    } else if (currentContent.type === 'post') {
      editPathDetails = {
        href: `/cms/posts/${currentContent.id}/edit`,
        label: t('edit_post'),
      };
    }
  }
  // The old path-based logic for determining editPathDetails is removed
  // as the context is now the source of truth for ID and type.
  // The link will only show if canAccessCms is true and context provides valid id and type.

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    // Optionally reset expanded submenus when main menu closes
    // if (!isMobileMenuOpen) setExpandedMobileItems({});
  };

  const toggleMobileSubmenu = (itemId: string) => {
    setExpandedMobileItems(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  useEffect(() => { // Added opening curly brace
    const handleResize = () => {
      if (window.innerWidth >= 768 && isMobileMenuOpen) { // Tailwind 'md' breakpoint is 768px
        setIsMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const menuElement = menuContainerRef.current;
    if (!menuElement) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      const focusableElements = menuElement.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), details, [tabindex]:not([tabindex="-1"])'
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          lastElement.focus();
          event.preventDefault();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          firstElement.focus();
          event.preventDefault();
        }
      }
    };

    if (isMobileMenuOpen) {
      const focusableElements = menuElement.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), details, [tabindex]:not([tabindex="-1"])'
      );
      
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
      
      document.addEventListener('keydown', handleKeyDown);
    } else {
      menuButtonRef.current?.focus();
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  const renderMobileNavItems = (items: HierarchicalNavigationItem[], level = 0): React.JSX.Element[] => {
    return items.map(item => (
      <div key={item.id} className={`${level > 0 ? 'ml-0' : ''}`}>
        <div
          className={`flex items-center justify-between w-full text-base font-medium text-foreground rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 ${level > 0 ? 'px-3 py-2' : 'px-3 py-2'}`}
        >
          {/* Only the label is a clickable link */}
          <Link
            href={item.url}
            className="py-0 px-0 mr-2 focus:underline focus:outline-none"
            onClick={() => {
              toggleMobileMenu();
            }}
          >
            {item.label}
          </Link>
          {/* If item has children, the rest of the row (whitespace + chevron) is a single button to toggle submenu */}
          {item.children && item.children.length > 0 && (
            <button
              type="button"
              className="flex flex-1 items-center h-full cursor-pointer bg-transparent border-none outline-none px-1 justify-end"
              style={{ minWidth: 0 }}
              aria-expanded={!!expandedMobileItems[String(item.id)]}
              aria-label={`Toggle submenu for ${item.label}`}
              onClick={e => {
                e.stopPropagation();
                toggleMobileSubmenu(String(item.id));
              }}
            >
              <span className="flex-1" /> {/* whitespace filler, clickable */}
              <ChevronDownIcon className={`h-5 w-5 transform transition-transform duration-200 ${expandedMobileItems[String(item.id)] ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
        {item.children && item.children.length > 0 && expandedMobileItems[String(item.id)] && (
          <div className="pl-[calc(0.75rem+0.5rem)] mt-1 mb-1 border-l-2 border-gray-300 dark:border-gray-600 ml-[calc(0.75rem+1px)] mr-3">
            {renderMobileNavItems(item.children, level + 1)}
          </div>
        )}
      </div>
    ));
  };

  const renderDesktopNavItems = (items: HierarchicalNavigationItem[], isSubmenu = false): React.JSX.Element[] => {
    return items.map(item => (
      <div key={item.id} className={`relative group ${isSubmenu ? 'w-full' : ''}`}>
        <Link
          href={item.url}
          className={`flex items-center justify-between hover:underline px-3 py-2 text-sm text-foreground ${isSubmenu ? 'w-full hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md' : ''}`}
        >
          {item.label}
          {item.children && item.children.length > 0 && (
            <ChevronDownIcon className={`ml-1 h-4 w-4 transition-transform duration-200 group-hover:rotate-180 ${isSubmenu ? '' : ''}`} />
          )}
        </Link>
        {item.children && item.children.length > 0 && (
          <div
            className={`
              absolute top-full left-0 mt-0 w-56 bg-background border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1
              opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-in-out z-50
              ${isSubmenu ? 'left-full top-0 -mt-[2px] ml-0' : ''}
            `}
          > {/* -mt-[2px] to align better with parent item border */}
            {renderDesktopNavItems(item.children, true)}
          </div>
        )}
      </div>
    ));
  };

  return (
    <>
      {/* Main container for desktop and mobile top bar elements */}
      <div className="flex justify-between items-center w-full">
        {/* Left side: Home link (visible on desktop and mobile) */}
        <div className="flex items-center">
          <Link
            href={homeLinkHref}
            className="flex items-center space-x-2 rtl:space-x-reverse"
          >
            {logo && logo.media ? (
              <Image
                src={
                  logo.media.object_key.startsWith('/') || logo.media.object_key.startsWith('http')
                    ? logo.media.object_key
                    : `${R2_BASE_URL}/${logo.media.object_key}`
                }
                alt={logo.media.alt_text || siteTitle || 'Nextblock'}
                width={logo.media.width || 100}
                height={logo.media.height || 32}
                className="h-14 w-auto object-contain"
                priority
              />
            ) : (
              <Image
                src={FALLBACK_LOGO_PATH}
                alt={siteTitle || 'Nextblock'}
                width={120}
                height={40}
                className="h-14 w-auto object-contain"
                priority
              />
            )}
          </Link>
          {/* Desktop: Additional Nav items */}
          <div className="hidden md:flex items-baseline font-semibold ml-6 space-x-1"> {/* Adjusted space-x for items with internal padding */}
            {hierarchicalNavItems.length > 0 && renderDesktopNavItems(hierarchicalNavItems)}
          </div>
        </div>

        {/* Right side: Auth, LangSwitcher (desktop), Hamburger (mobile) */}
        <div className="hidden md:flex items-center space-x-4">
          {canAccessCms && editPathDetails && (
            <Link href={editPathDetails.href} className="hover:underline font-semibold text-sm text-foreground mr-3">
              {editPathDetails.label}
            </Link>
          )}
          {canAccessCms && (
            <Link href={cmsDashboardLinkHref} className="hover:underline font-semibold text-sm text-foreground">
              {t('cms_dashboard')}
            </Link>
          )}
          {headerAuthComponent}
          {languageSwitcherComponent}
        </div>

        <div className="md:hidden flex items-center z-[60]">
          <button
            ref={menuButtonRef}
            onClick={toggleMobileMenu}
            className="p-2 rounded-md text-foreground hover:text-primary focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary"
            aria-label={t('open_main_menu')}
            aria-expanded={isMobileMenuOpen}
          >
            {isMobileMenuOpen ? (
              <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Overlay for Mobile Menu - Fades In/Out */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity ease-in-out duration-300 top-16 md:hidden ${
          isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
        }`}
        onClick={toggleMobileMenu}
        aria-hidden={!isMobileMenuOpen}
      />

      {/* Slide-in Mobile Menu Container (for the sliding content) */}
      <div
        ref={menuContainerRef}
        className={`fixed inset-0 z-40 transform transition-transform ease-in-out duration-300 md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label={t('mobile_navigation_menu')}
      >
        {/* Menu Content (this part slides with the container above) */}
        <div className="fixed top-16 left-0 h-[calc(100vh-4rem)] w-full max-w-sm bg-background text-foreground shadow-xl p-5 z-50 flex flex-col">
          <nav className="flex-grow flex flex-col space-y-1 overflow-y-auto pt-6"> 
            {renderMobileNavItems(hierarchicalNavItems)}
            {canAccessCms && editPathDetails && (
              <Link
                href={editPathDetails.href}
                className="block px-3 py-2 rounded-md text-base font-medium text-foreground hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={() => {
                  toggleMobileMenu();
                }}
              >
                {editPathDetails.label}
              </Link>
            )}
            {canAccessCms && (
              <Link
                href={cmsDashboardLinkHref}
                className="block px-3 py-2 rounded-md text-base font-medium text-foreground hover:bg-gray-100 dark:hover:bg-gray-700"
                onClick={toggleMobileMenu}
              >
                {t('cms_dashboard')}
              </Link>
            )}
          </nav>

          <div className="mt-auto pt-6 border-t border-foreground/20 space-y-4">
            <div >{headerAuthComponent}</div>
            <div >{languageSwitcherComponent}</div>
          </div>
        </div>
      </div>
    </>
  );
}
