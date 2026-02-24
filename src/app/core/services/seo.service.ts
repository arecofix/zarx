import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DOCUMENT, isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  constructor(
    private titleService: Title,
    private metaService: Meta,
    @Inject(DOCUMENT) private document: Document,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  updateTitle(title: string) {
    this.titleService.setTitle(title);
    this.metaService.updateTag({ property: 'og:title', content: title });
    this.metaService.updateTag({ name: 'twitter:title', content: title });
  }

  updateDescription(description: string) {
    this.metaService.updateTag({ name: 'description', content: description });
    this.metaService.updateTag({ property: 'og:description', content: description });
    this.metaService.updateTag({ name: 'twitter:description', content: description });
  }

  updateKeywords(keywords: string) {
    this.metaService.updateTag({ name: 'keywords', content: keywords });
  }

  updateCanonicalUrl(url: string) {
    // Only update DOM directly if needed, or rely on Meta service if it supported link tags (it doesn't fully).
    // Using simple DOM manipulation.
    // Ensure we don't duplicate logic unnecessarily if running on server vs client, 
    // but usually we want this in the rendered HTML for bots.
    
    // Check if link already exists
    let link: HTMLLinkElement | null = this.document.querySelector("link[rel='canonical']");
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
    
    this.metaService.updateTag({ property: 'og:url', content: url });
  }

  updateSchema(schema: any) {
    // Remove existing schema if any to avoid duplicates or stale data
    const existingScript = this.document.querySelector("script[type='application/ld+json']");
    if (existingScript) {
        existingScript.remove();
    }

    const script = this.document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify(schema);
    this.document.head.appendChild(script);
  }
}
