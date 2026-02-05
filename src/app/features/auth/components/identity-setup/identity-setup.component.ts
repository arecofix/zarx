import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { ToastService } from '../../../../core/services/toast.service';

@Component({
  selector: 'app-identity-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="fixed inset-0 z-50 flex flex-col items-center justify-center p-6 bg-slate-950 text-white overflow-hidden">
      <!-- Background Effects -->
      <div class="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div class="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-3xl"></div>
        <div class="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-3xl"></div>
      </div>

      <div class="relative w-full max-w-md bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl animate-fade-in-up">
        
        <!-- Header -->
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold bg-clip-text text-transparent bg-linear-to-r from-blue-400 to-purple-400 mb-2">Identidad Digital</h1>
          <p class="text-slate-400 text-sm">Configura tu perfil para la red ZARX</p>
        </div>

        <!-- Avatar Section -->
        <div class="flex flex-col items-center mb-8 relative group">
          <div class="relative w-32 h-32 rounded-full overflow-hidden border-4 border-slate-800 shadow-xl bg-slate-800 transition-transform active:scale-95">
            <img 
              [src]="avatarUrl() || 'assets/img/avatar-placeholder.png'" 
              class="w-full h-full object-cover"
              alt="Avatar"
              (error)="handleImageError($event)"
            />
            
            <!-- Upload Overlay -->
            <label class="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <svg class="w-8 h-8 text-white mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
              <span class="text-xs font-bold text-white">Cambiar</span>
              <input type="file" accept="image/*" class="hidden" (change)="uploadAvatar($event)">
            </label>
          </div>
          <div *ngIf="isUploading()" class="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full z-10">
             <div class="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>

        <!-- Form Section -->
        <div class="space-y-6">
          <div class="group">
            <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Nombre de Usuario</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span class="text-slate-500 font-bold">@</span>
              </div>
              <input 
                type="text" 
                [(ngModel)]="username" 
                placeholder="usuario_zarx"
                class="bg-slate-950/50 border border-slate-700 text-white text-lg rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent block w-full pl-8 p-3 transition-all placeholder:text-slate-600"
                [class.border-red-500]="usernameError()"
              />
            </div>
            <p *ngIf="usernameError()" class="text-red-400 text-xs mt-1 ml-1">{{ usernameError() }}</p>
          </div>

          <button 
            (click)="saveProfile()"
            [disabled]="isLoading() || !username"
            class="w-full relative group overflow-hidden rounded-xl p-px"
          >
             <div class="absolute inset-0 bg-linear-to-r from-blue-500 via-purple-500 to-blue-500 opacity-70 group-hover:opacity-100 transition-opacity animate-gradient-xy"></div>
             <div class="relative bg-slate-900 rounded-xl px-6 py-3.5 flex items-center justify-center transition-all group-active:scale-[0.99]">
               <span *ngIf="!isLoading()" class="font-bold text-white tracking-wide">CONFIRMAR IDENTIDAD</span>
               <div *ngIf="isLoading()" class="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
             </div>
          </button>
        </div>

        <div class="mt-6 text-center">
            <p class="text-xs text-slate-600">Al continuar, tu perfil será visible para la red de seguridad.</p>
        </div>

      </div>
    </div>
  `,
  styles: [`
    .animate-fade-in-up {
      animation: fadeInUp 0.5s ease-out forwards;
    }
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-gradient-xy {
        background-size: 200% 200%;
        animation: gradient-xy 3s ease infinite;
    }
    @keyframes gradient-xy {
        0%, 100% { background-position: 0% 50%; }
        50% { background-position: 100% 50%; }
    }
  `]
})
export class IdentitySetupComponent {
  private auth = inject(AuthService);
  private supabase = inject(SupabaseService).client;
  private toast = inject(ToastService);
  private router = inject(Router);

  username = '';
  avatarUrl = signal<string | null>(null);
  isLoading = signal(false);
  isUploading = signal(false);
  usernameError = signal<string | null>(null);

  constructor() {
    this.loadCurrentProfile();
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
        if (data.username) this.username = data.username;
        if (data.avatar_url) this.avatarUrl.set(data.avatar_url);
      }
    }
  }

  handleImageError(event: any) {
    event.target.src = 'https://ui-avatars.com/api/?name=User&background=0D8ABC&color=fff';
  }

  async uploadAvatar(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.isUploading.set(true);
    try {
      const user = this.auth.currentUser();
      if (!user) throw new Error('No usuario');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await this.supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = this.supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

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
    if (!this.username) return;
    
    this.isLoading.set(true);
    this.usernameError.set(null);

    try {
      const user = this.auth.currentUser();
      if (!user) throw new Error('No authentication');

      const updates = {
        username: this.username,
        avatar_url: this.avatarUrl(),
        is_onboarded: true,
        updated_at: new Date()
      };

      const { error } = await this.supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) {
        if (error.code === '23505') { // Unique violation
             this.usernameError.set('Este nombre de usuario ya está en uso.');
        } else {
             throw error;
        }
        return;
      }

      this.toast.success('Perfil actualizado! Bienvenido.');
      this.router.navigate(['/home']); // Or wherever main flow is

    } catch (error) {
      console.error('Profile update error:', error);
      this.toast.error('Error al guardar perfil.');
    } finally {
      this.isLoading.set(false);
    }
  }
}
