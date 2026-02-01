import { Injectable, signal, effect, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  
  // Signal for Dark Mode state
  darkMode = signal<boolean>(true);

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      // Sync with localStorage or system preference if needed in future
      // defaulting to true as per requirements
      
      effect(() => {
        const isDark = this.darkMode();
        if (isDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      });
    }
  }

  toggleTheme() {
    this.darkMode.update(active => !active);
  }
}
