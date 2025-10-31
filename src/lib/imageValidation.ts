/**
 * Image Validation Utilities
 * Used to validate image accessibility and detect CORS issues before export/publish
 */

export interface ImageValidationResult {
  accessible: boolean;
  hasCorsIssue: boolean;
  errorMessage?: string;
}

/**
 * Validates if an image URL is accessible and checks for CORS issues
 * @param url - The image URL to validate
 * @returns Promise with validation result
 */
export async function validateImageAccess(url: string): Promise<ImageValidationResult> {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      mode: 'cors' 
    });
    
    return { 
      accessible: response.ok, 
      hasCorsIssue: false 
    };
  } catch (error) {
    // Check if it's a CORS error
    if (error instanceof TypeError && (
      error.message.includes('CORS') || 
      error.message.includes('Cross-Origin') ||
      error.message.includes('Failed to fetch')
    )) {
      return { 
        accessible: false, 
        hasCorsIssue: true,
        errorMessage: 'Bloqueado por política CORS'
      };
    }
    
    return { 
      accessible: false, 
      hasCorsIssue: false,
      errorMessage: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Validates multiple image URLs in batch
 * @param urls - Array of image URLs to validate
 * @returns Promise with array of validation results
 */
export async function validateImageBatch(urls: string[]): Promise<ImageValidationResult[]> {
  return Promise.all(urls.map(url => validateImageAccess(url)));
}

/**
 * Gets a summary of validation results
 */
export function getValidationSummary(results: ImageValidationResult[]): {
  total: number;
  accessible: number;
  corsIssues: number;
  otherErrors: number;
} {
  return {
    total: results.length,
    accessible: results.filter(r => r.accessible).length,
    corsIssues: results.filter(r => r.hasCorsIssue).length,
    otherErrors: results.filter(r => !r.accessible && !r.hasCorsIssue).length,
  };
}
