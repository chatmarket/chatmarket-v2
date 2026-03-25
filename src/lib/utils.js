import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;

export const ADMIN_EMAILS = [
  'unei@chatmarket.info',
  'ono@onestep-corp.com',
  'kimurayasunari5@gmail.com'
];

export const isAdminUser = (email) => ADMIN_EMAILS.includes(email);