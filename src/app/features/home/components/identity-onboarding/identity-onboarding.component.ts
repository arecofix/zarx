import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-identity-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-6 backdrop-blur-md">
      <div class="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        
        <!-- Decoration -->
        <div class="absolute -top-12 -right-12 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
        
        <div class="relative z-10 text-center">
          <div class="w-20 h-20 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-slate-700 shadow-xl rotate-3">
            <span class="text-4xl">🆔</span>
          </div>

          <h2 class="text-2xl font-black text-white mb-2 tracking-tight uppercase">Configura tu Identidad</h2>
          <p class="text-slate-400 text-sm mb-8">
            Elige un nombre público para que otros usuarios y oficiales puedan identificarte en la red.
          </p>

          <div class="space-y-6 text-left">
            <div>
              <label class="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Nombre de Usuario</label>
              <div class="relative mt-1">
                <span class="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-500 font-bold">@</span>
                <input 
                  type="text" 
                  [(ngModel)]="username"
                  (input)="checkUsername()"
                  class="w-full bg-slate-950 border border-slate-800 rounded-xl py-4 pl-10 pr-4 text-white text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all font-mono"
                  placeholder="ej: guardian_areco"
                  maxlength="20"
                />
              </div>
              @if (isChecking()) {
                <p class="text-[10px] text-slate-500 mt-2 animate-pulse">Verificando disponibilidad...</p>
              } @else if (errorMsg()) {
                <p class="text-[10px] text-red-500 mt-2">{{ errorMsg() }}</p>
              } @else if (username().length >= 3 && isAvailable()) {
                <p class="text-[10px] text-emerald-500 mt-2">✅ Nombre disponible</p>
              }
            </div>

            <button 
              (click)="saveIdentity()"
              [disabled]="!canSubmit() || isSaving()"
              class="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:grayscale text-white font-bold rounded-xl shadow-lg shadow-emerald-900/40 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              @if (isSaving()) {
                <div class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              }
              FINALIZAR CONFIGURACIÓN
            </button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class IdentityOnboardingComponent {
  @Output() complete = new EventEmitter<void>();
  
  private supabase = inject(SupabaseService).client;
  private auth = inject(AuthService);
  private toast = inject(ToastService);

  username = signal('');
  isChecking = signal(false);
  isAvailable = signal(false);
  isSaving = signal(false);
  errorMsg = signal('');

  canSubmit = signal(false);

  async checkUsername() {
    const val = this.username().toLowerCase().trim();
    this.username.set(val);

    if (val.length < 3) {
      this.isAvailable.set(false);
      this.canSubmit.set(false);
      this.errorMsg.set(val.length > 0 ? 'Mínimo 3 caracteres' : '');
      return;
    }

    if (!/^[a-z0-9_]+$/.test(val)) {
      this.errorMsg.set('Solo letras, números y guiones bajos');
      this.canSubmit.set(false);
      return;
    }

    this.isChecking.set(true);
    this.errorMsg.set('');

    try {
      const { data, error } = await this.supabase
        .from('profiles')
        .select('username')
        .eq('username', val);

      if (error) throw error;

      const available = (data as any[]).length === 0;
      this.isAvailable.set(available);
      this.canSubmit.set(available);
      if (!available) this.errorMsg.set('Este nombre ya está en uso');
    } catch (e) {
      console.error(e);
    } finally {
      this.isChecking.set(false);
    }
  }

  async saveIdentity() {
    const user = this.auth.currentUser();
    if (!user) return;

    this.isSaving.set(true);
    try {
      const { error } = await this.supabase
        .from('profiles')
        .update({ username: this.username() })
        .eq('id', user.id);

      if (error) throw error;

      this.toast.success('¡Identidad configurada!');
      this.complete.emit();
    } catch (e: any) {
      this.toast.error(e.message || 'Error al guardar');
    } finally {
      this.isSaving.set(false);
    }
  }
}
