import { isPlatformBrowser } from '@angular/common';

let cachedLeaflet: any = null;

/**
 * Robust, SSR-safe centralized Leaflet loader.
 * Guarantees a single module resolution, attaches window.L for plugins,
 * and fixes default Leaflet icon paths.
 */
export async function getLeaflet(platformId?: Object): Promise<any> {
  if (platformId && !isPlatformBrowser(platformId)) {
    return null;
  }
  if (typeof window === 'undefined') {
    return null;
  }
  if (cachedLeaflet) {
    return cachedLeaflet;
  }

  try {
    const leafletModule = await import('leaflet');
    const L = (leafletModule as any).default || leafletModule;
    
    // Make L globally available for Leaflet plugins (leaflet-draw, leaflet.heat)
    (window as any).L = L;

    // Load Leaflet plugins in browser context
    try {
      await import('leaflet-draw');
    } catch (_) {}

    try {
      await import('leaflet.heat');
    } catch (_) {}

    // Fix default Leaflet marker icons
    if (L.Icon && L.Icon.Default && L.Icon.Default.prototype) {
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'assets/marker-icon-2x.png',
        iconUrl: 'assets/marker-icon.png',
        shadowUrl: 'assets/marker-shadow.png',
      });
    }

    cachedLeaflet = L;
    return L;
  } catch (error) {
    console.error('[LeafletUtil] Failed to load Leaflet:', error);
    return null;
  }
}
