import { Injectable } from '@angular/core';

export interface GeocodingResult {
  address: string;
  street?: string;
  houseNumber?: string;
  city?: string;
  state?: string;
  country?: string;
  displayName: string;
}

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  private readonly NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
  
  /**
   * Reverse geocoding: Convert lat/lng to address
   * Uses OpenStreetMap Nominatim API
   */
  async reverseGeocode(lat: number, lng: number): Promise<GeocodingResult | null> {
    try {
      const url = `${this.NOMINATIM_URL}?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'ZARX-Security-App/1.0'
        }
      });

      if (!response.ok) {
        console.error('Geocoding failed:', response.statusText);
        return null;
      }

      const data = await response.json();
      
      if (!data || !data.address) {
        return null;
      }

      const address = data.address;
      
      // Build street address
      let street = '';
      if (address.road) {
        street = address.road;
        if (address.house_number) {
          street += ` ${address.house_number}`;
        }
      } else if (address.pedestrian) {
        street = address.pedestrian;
      } else if (address.suburb) {
        street = address.suburb;
      }

      return {
        address: street || data.display_name,
        street: address.road || address.pedestrian,
        houseNumber: address.house_number,
        city: address.city || address.town || address.village,
        state: address.state,
        country: address.country,
        displayName: data.display_name
      };
    } catch (error) {
      console.error('Error in reverse geocoding:', error);
      return null;
    }
  }

  /**
   * Format address for display
   */
  formatAddress(result: GeocodingResult): string {
    if (result.street && result.houseNumber) {
      return `${result.street} ${result.houseNumber}`;
    } else if (result.street) {
      return result.street;
    } else if (result.address) {
      return result.address;
    }
    return result.displayName;
  }

  /**
   * Get short address (street + number)
   */
  getShortAddress(result: GeocodingResult): string {
    const parts: string[] = [];
    
    if (result.street) parts.push(result.street);
    if (result.houseNumber) parts.push(result.houseNumber);
    
    if (parts.length > 0) {
      return parts.join(' ');
    }
    
    return result.city || result.displayName.split(',')[0];
  }

  /**
   * Get full address with city
   */
  getFullAddress(result: GeocodingResult): string {
    const parts: string[] = [];
    
    if (result.street) {
      parts.push(result.street);
      if (result.houseNumber) {
        parts[parts.length - 1] += ` ${result.houseNumber}`;
      }
    }
    
    if (result.city) parts.push(result.city);
    if (result.state) parts.push(result.state);
    
    return parts.join(', ') || result.displayName;
  }
}
