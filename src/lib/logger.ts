type LogLevel = 'info' | 'warn' | 'error' | 'debug';

interface LogMeta {
  [key: string]: any;
}

export const logger = {
  info: (message: string, meta?: LogMeta) => {
    console.info(`[INFO] ${new Date().toISOString()} - ${message}`, meta || '');
  },
  
  warn: (message: string, meta?: LogMeta) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, meta || '');
  },
  
  error: (message: string, error: any) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error);
  },
  
  debug: (message: string, meta?: LogMeta) => {
    if (import.meta.env.DEV) {
      console.debug(`[DEBUG] ${message}`, meta || '');
    }
  },
};
