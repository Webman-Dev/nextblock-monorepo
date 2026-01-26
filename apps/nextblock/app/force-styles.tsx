import React from 'react';

/**
 * This component is never rendered but ensures that specific Tailwind classes
 * used in the database seeds (SQL files) are generated in the CSS bundle.
 * 
 * We are using this as a fallback because Tailwind's scanning of SQL files
 * in the libs directory is proving unreliable on Windows.
 */
export default function ForceStyles() {
  return (
    <div className="hidden">
      {/* Spacing & Layout */}
      <div className="mt-10 p-8 p-10 p-12 gap-4"></div>
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8"></div>
      
      {/* Text colors used in blocks */}
      <div className="text-slate-200 text-slate-300 text-slate-400 text-slate-600 text-slate-900"></div>
      <div className="text-blue-400 text-purple-400"></div>
      <div className="dark:text-slate-200 dark:text-slate-400 dark:text-white"></div>
      <div className="text-sm font-semibold text-center text-white"></div>
      <div className="uppercase tracking-[0.3em] tracking-wide tracking-widest"></div>
      
      {/* Backgrounds and Borders */}
      <div className="bg-white/5 bg-white/10 border-white/10 border-white/20"></div>
      <div className="bg-slate-50 hover:bg-slate-100 dark:bg-white/5 dark:hover:bg-white/10"></div>
      
      {/* Button Styles (Force generation since libs scan might fail on Windows) */}
      <div className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"></div>
      <div className="bg-primary text-primary-foreground hover:bg-primary/90"></div>
      <div className="border border-input bg-background hover:bg-accent hover:text-accent-foreground"></div>
      <div className="h-10 px-4 py-2"></div>
      <div className="rounded-md px-8 py-2 text-lg"></div>

      {/* Gradients */}
      <div className="bg-gradient-to-r bg-gradient-to-br from-blue-400 to-cyan-400"></div>
      <div className="from-blue-500/10 to-purple-500/10"></div>
    </div>
  );
}
