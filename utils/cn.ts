type ClassValue = string | number | boolean | undefined | null | ClassValue[] | Record<string, boolean>;

export function cn(...inputs: ClassValue[]): string {
  const classes: string[] = [];
  
  inputs.forEach(input => {
    if (!input) return;
    
    if (typeof input === 'string' || typeof input === 'number') {
      classes.push(String(input));
    } else if (Array.isArray(input)) {
      const nested = cn(...input);
      if (nested) classes.push(nested);
    } else if (typeof input === 'object') {
      Object.keys(input).forEach(key => {
        if (input[key]) classes.push(key);
      });
    }
  });
  
  return classes.join(' ');
}