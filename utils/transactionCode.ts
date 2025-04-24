/**
 * Generates a random transaction code for errands
 * @returns A 6-character alphanumeric code
 */
export const generateTransactionCode = (): string => {
    // Generate a random 6-character alphanumeric code
    return Math.random().toString(36).substring(2, 8).toUpperCase()
  }
  