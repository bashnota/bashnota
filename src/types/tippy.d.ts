// Type declaration file for tippy.js to fix type issues
import 'tippy.js'

declare module 'tippy.js' {
  interface PropsFunctions {
    (targets: string | Element | Element[] | null, props?: Partial<Props>): any;
  }
} 








