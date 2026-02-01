import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../core/services/supabase.service';
import { AuthService } from '../../core/services/auth.service';
import { LocationService } from '../../core/services/location.service';

@Injectable({
  providedIn: 'root'
})
export class EmergencyService {
  private supabase = inject(SupabaseService).client;
  private auth = inject(AuthService);
  private location = inject(LocationService);

  async triggerSOS() {
    const user = this.auth.currentUser();
    const pos = this.location.currentPosition();

    if (!user) throw new Error('User not authenticated');
    if (!pos) throw new Error('Location not available');

    const { latitude, longitude } = pos.coords;

    // Insert alert into Supabase
    const { data, error } = await this.supabase
      .from('alerts')
      .insert({
        user_id: user.id,
        type: 'SOS',
        priority: 'CRITICAL',
        status: 'OPEN',
        location: `POINT(${longitude} ${latitude})`, // PostGIS format: LON LAT
        description: 'Emergency SOS triggered manually via App'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
