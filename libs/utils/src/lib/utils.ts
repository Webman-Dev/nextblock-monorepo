import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function utils(): string {
  return 'utils';
}


export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
