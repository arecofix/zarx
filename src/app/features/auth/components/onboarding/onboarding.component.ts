import { Component, inject, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { ToastService } from '../../../../core/services/toast.service';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-black text-white overflow-hidden font-sans">
      <!-- Background Effects (Red Neon) -->
       <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div class="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[100px]"></div>
        <div class="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-red-900/10 rounded-full blur-[100px]"></div>
      </div>

      <div class="relative w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-red-500/20 rounded-3xl p-8 shadow-[0_0_50px_rgba(220,38,38,0.1)] animate-fade-in-up">
        
        <!-- Header -->
        <div class="text-center mb-10">
          <div class="inline-block p-3 rounded-full bg-red-500/10 mb-4 border border-red-500/30">
             <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <h1 class="text-3xl font-black text-white tracking-tight mb-2 uppercase">Identidad</h1>
          <p class="text-zinc-400 text-sm font-medium">Configura tu perfil para continuar</p>
        </div>

        <!-- Avatar Section -->
        <div class="flex flex-col items-center mb-10 relative group">
          <div class="relative w-32 h-32 rounded-full overflow-hidden border-2 border-red-500/50 shadow-[0_0_20px_rgba(220,38,38,0.3)] bg-zinc-800 transition-all active:scale-95">
             <img 
              [src]="avatarUrl() || 'assets/img/avatar-placeholder.png'" 
              class="w-full h-full object-cover"
              alt="Avatar"
              (error)="handleImageError($event)"
            />
             <!-- Overlay -->
             <label class="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm">
               <svg class="w-8 h-8 text-red-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
               <span class="text-[10px] font-bold text-red-400 uppercase tracking-widest">Cambiar Foto</span>
               <input type="file" accept="image/*" class="hidden" (change)="uploadAvatar($event)">
             </label>
          </div>
           @if (isUploading()) {
              <div class="absolute inset-0 flex items-center justify-center z-20">
                 <div class="w-32 h-32 rounded-full border-4 border-red-500 border-t-transparent animate-spin"></div>
              </div>
           }
        </div>

        <!-- Form Section -->
        <div class="space-y-6">
          <div class="group relative">
            <label class="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 ml-1">Nombre de Usuario</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <span class="text-zinc-500 font-bold">@</span>
              </div>
              <input 
                type="text" 
                [ngModel]="username()"
                (ngModelChange)="onUsernameChange($event)"
                placeholder="usuario_zarx"
                class="bg-black/50 border border-zinc-800 text-white text-lg rounded-xl focus:ring-1 focus:ring-red-500 focus:border-red-500 block w-full pl-9 p-4 transition-all placeholder:text-zinc-700 font-mono"
                [class.border-red-500]="usernameError()"
                [class.border-emerald-500]="usernameAvailable() && !usernameError()"
              />
               <!-- Status Indicator -->
                <div class="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    @if (checkingUsername()) {
                        <div class="w-4 h-4 border-2 border-zinc-600 border-t-white rounded-full animate-spin"></div>
                    } @else if (usernameAvailable() && username()) {
                         <svg class="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                    }
                </div>
            </div>
             @if (usernameError()) {
                <p class="text-red-500 text-xs mt-2 ml-1 font-bold animate-pulse">{{ usernameError() }}</p>
             }
          </div>

          <button 
            (click)="saveProfile()"
            [disabled]="isLoading() || !username() || !usernameAvailable() || usernameError()"
            class="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-black rounded-xl transition-all shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:shadow-[0_0_30px_rgba(220,38,38,0.6)] active:scale-[0.98] disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed uppercase tracking-widest flex items-center justify-center gap-2"
          >
               @if (isLoading()) {
                  <div class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
               }
               <span>Confirmar Identidad</span>
          </button>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; }
    @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  `]
})
export class OnboardingComponent implements OnDestroy {
  private auth = inject(AuthService);
  private supabase = inject(SupabaseService).client;
  private toast = inject(ToastService);
  private router = inject(Router);

  // Signals
  username = signal('');
  avatarUrl = signal<string | null>(null);
  isLoading = signal(false);
  isUploading = signal(false);
  
  // Validation Signals
  usernameError = signal<string | null>(null);
  usernameAvailable = signal(false);
  checkingUsername = signal(false);

  private searchSubject = new Subject<string>();
  private searchSub: Subscription;

  constructor() {
    this.loadCurrentProfile();
    
    // Configurar RxJS debounce para validación
    this.searchSub = this.searchSubject.pipe(
      debounceTime(500),
      distinctUntilChanged()
    ).subscribe(async (term) => {
       await this.checkAvailability(term);
    });
  }

  ngOnDestroy() {
    this.searchSub.unsubscribe();
  }

  onUsernameChange(val: string) {
     this.username.set(val);
     this.usernameError.set(null);
     this.usernameAvailable.set(false);
     
     // Validaciones básicas síncronas
     const cleanVal = val.trim().toLowerCase();
     
     if (!cleanVal) return;
     
     if (cleanVal.length < 3) {
        this.usernameError.set('Mínimo 3 caracteres');
        return;
     }

     if (!/^[a-z0-9_]+$/.test(cleanVal)) {
        this.usernameError.set('Solo letras, números y guión bajo');
        return;
     }
     
     this.checkingUsername.set(true);
     this.searchSubject.next(cleanVal);
  }

  async checkAvailability(username: string) {
    try {
      const user = this.auth.currentUser();
      if (!user) return;

      const { data, error } = await this.supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .neq('id', user.id) // Exclude self
        .maybeSingle(); // Use maybeSingle to avoid error on 0 rows

      this.checkingUsername.set(false);

      if (error) {
        console.error(error);
        return;
      }

      if (data) {
        this.usernameError.set('Nombre de usuario no disponible');
        this.usernameAvailable.set(false);
      } else {
        this.usernameAvailable.set(true);
      }
    } catch (e) {
      this.checkingUsername.set(false);
    }
  }

  async loadCurrentProfile() {
    const user = this.auth.currentUser();
    if (user) {
      const { data } = await this.supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', user.id)
        .single();
      
      if (data) {
        if (data.username) {
            this.username.set(data.username);
            this.usernameAvailable.set(true); // Assume current is valid
        }
        if (data.avatar_url) this.avatarUrl.set(data.avatar_url);
      }
    }
  }

  handleImageError(event: any) {
    event.target.src = 'assets/img/avatar-placeholder.png';
  }

  async uploadAvatar(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.isUploading.set(true);
    try {
      const user = this.auth.currentUser();
      if (!user) throw new Error('No usuario');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await this.supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = this.supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      this.avatarUrl.set(data.publicUrl);
      this.toast.success('Avatar subido correctamente');

    } catch (error: any) {
      console.error('Upload error:', error);
      this.toast.error('Error al subir imagen');
    } finally {
      this.isUploading.set(false);
    }
  }

  async saveProfile() {
    const finalUsername = this.username();
    if (!finalUsername || this.usernameError()) return;
    
    this.isLoading.set(true);

    try {
      const user = this.auth.currentUser();
      if (!user) throw new Error('No authentication');

      const updates = {
        username: finalUsername,
        avatar_url: this.avatarUrl(),
        updated_at: new Date()
      };

      const { error } = await this.supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      this.toast.success('¡Identidad configurada!');
      
      // Force reload or redirect
      // We can emit an event or just reload window to refresh all guards/states
      window.location.reload(); 

    } catch (error: any) {
      console.error('Profile update error:', error);
      this.toast.error(error.message || 'Error al guardar perfil.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
