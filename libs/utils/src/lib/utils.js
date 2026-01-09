import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export function utils() {
    return 'utils';
}
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
//# sourceMappingURL=utils.js.map