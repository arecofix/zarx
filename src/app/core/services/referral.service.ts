import { Injectable, inject, signal } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { ToastService } from './toast.service';
import { ActivatedRoute } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class ReferralService {
  private supabase = inject(SupabaseService).client;
  private toast = inject(ToastService);
  private route = inject(ActivatedRoute);

  pendingRefercalCode = signal<string | null>(null);

  constructor() {
    // Check for deep link param 'ref' on init
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      this.pendingRefercalCode.set(ref);
      localStorage.setItem('zarx_ref_code', ref); // Persist for signup flow
    } else {
        // Recover from storage if page reloaded
        const stored = localStorage.getItem('zarx_ref_code');
        if (stored) this.pendingRefercalCode.set(stored);
    }
  }

  /**
   * Generates the invite link for the current user
   */
  getInviteLink(inviteCode: string): string {
    // Ensuring it points to register as requested
    return `${window.location.origin}/register?ref=${inviteCode}`;
  }

  /**
   * Opens the native share dialog
   */
  async shareInvite(inviteCode: string) {
    const url = this.getInviteLink(inviteCode);
    // Persuasive message as requested
    const text = `Vecino, unite a ZARX. Es la red que usamos para cuidarnos en el barrio. Registrate con mi link y sumamos puntos de vigía juntos: ${url}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Invitación a ZARX',
          text: text,
          url: url
        });
        this.toast.success('¡Gracias por expandir la red!');
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(text);
        this.toast.info('Enlace copiado al portapapeles');
      } catch (err) {
         this.toast.error('No se pudo compartir');
      }
    }
  }

  /**
   * Applies the code currently held in state or storage
   * Should be called after user created account (before onboarding finish)
   */
  async applyPendingReferral() {
    const code = this.pendingRefercalCode();
    if (!code) return;

    try {
      const { data, error } = await this.supabase
        .rpc('apply_referral_code', { code });
        
      if (error) throw error;
      
      if (data) {
          console.log('Referral applied successfully');
          localStorage.removeItem('zarx_ref_code'); // Clear
          this.pendingRefercalCode.set(null);
      }
    } catch (e) {
      console.error('Failed to apply referral:', e);
    }
  }
  
  /**
   * Get referral stats for the current user
   */
  async getReferralStats() {
     const { count, error } = await this.supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('referred_by', (await this.supabase.auth.getUser()).data.user?.id)
        .eq('is_onboarded', true);
     
     return { count: count || 0, error };
  }
}
