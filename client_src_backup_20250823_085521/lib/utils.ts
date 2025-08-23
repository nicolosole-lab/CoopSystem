import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Name formatting utilities
export function formatDisplayName(firstName: string | null | undefined, lastName: string | null | undefined): string {
  const first = firstName?.trim() || '';
  const last = lastName?.trim() || '';
  
  if (!first && !last) return '';
  if (!first) return last;
  if (!last) return first;
  
  return `${last}, ${first}`;
}

// Enhanced search that handles both "Lastname, Firstname" and "Firstname Lastname" formats
export function searchMatchesName(searchTerm: string, firstName: string | null | undefined, lastName: string | null | undefined): boolean {
  const search = searchTerm.toLowerCase().trim();
  const first = (firstName?.toLowerCase() || '').trim();
  const last = (lastName?.toLowerCase() || '').trim();
  
  if (!search) return true;
  if (!first && !last) return false;
  
  // Handle "Lastname, Firstname" format search
  if (search.includes(',')) {
    const [searchLast, searchFirst] = search.split(',').map(s => s.trim());
    return last.includes(searchLast) && (!searchFirst || first.includes(searchFirst));
  }
  
  // Handle multiple words (could be "Firstname Lastname" or partial matches)
  const searchWords = search.split(' ').filter(word => word.length > 0);
  
  // Check if all search words match either first or last name
  return searchWords.every(word => 
    first.includes(word) || last.includes(word)
  );
}

// Sort people by last name, then first name
export function sortByLastName<T extends { firstName?: string | null; lastName?: string | null }>(people: T[]): T[] {
  return [...people].sort((a, b) => {
    const aLast = (a.lastName || '').toLowerCase();
    const bLast = (b.lastName || '').toLowerCase();
    const aFirst = (a.firstName || '').toLowerCase();
    const bFirst = (b.firstName || '').toLowerCase();
    
    // First sort by last name
    if (aLast !== bLast) {
      return aLast.localeCompare(bLast);
    }
    
    // Then by first name
    return aFirst.localeCompare(bFirst);
  });
}
