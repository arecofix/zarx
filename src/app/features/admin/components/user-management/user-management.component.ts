import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ToastService } from '../../../../core/services/toast.service';
import { AppConstants } from '../../../../core/constants/app.constants';
import { Profile } from '../../../../core/models';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="p-6 bg-slate-950 min-h-full font-sans text-slate-300 relative">
      
      <!-- HEADER -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div class="flex items-center gap-4">
          <a routerLink="/admin/dashboard" class="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
             <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          </a>
          <div>
            <h2 class="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>👥</span> GESTIÓN DE USUARIOS
            </h2>
            <p class="text-xs text-slate-400 uppercase tracking-widest mt-1">
              Control de roles y perfiles
            </p>
          </div>
        </div>

        <!-- Search Bar -->
        <div class="relative w-full md:w-72">
          <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
             <svg class="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
             </svg>
          </div>
          <input 
            type="text" 
            [(ngModel)]="searchTerm"
            placeholder="Buscar por email o nombre..." 
            class="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
          />
        </div>
      </div>

      <!-- DATA GRID -->
      <div class="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-2xl backdrop-blur-sm">
        
        <!-- Toolbar -->
        <div class="px-6 py-4 border-b border-slate-800 flex items-center gap-4 bg-slate-900/80">
           <div class="flex items-center gap-2">
             <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
             <span class="text-xs font-bold text-white">{{ filteredUsers().length }} Usuarios</span>
           </div>
           
           @if (userService.isLoading()) {
             <span class="text-xs text-blue-400 animate-pulse flex items-center gap-1">
               <svg class="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
               Sincronizando...
             </span>
           }
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-sm">
            <thead class="bg-slate-950/50 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th class="px-6 py-3">Usuario</th>
                <th class="px-6 py-3">Rol</th>
                <th class="px-6 py-3">Teléfono</th>
                <th class="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800">
              @for (user of filteredUsers(); track user.id) {
                <tr class="hover:bg-slate-800/30 transition-colors group">
                  
                  <!-- User Info -->
                  <td class="px-6 py-4">
                    <div class="flex items-center gap-3">
                      <div class="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                         <img [src]="user.avatar_url || 'assets/images/placeholder_avatar.png'" class="w-full h-full object-cover">
                      </div>
                      <div>
                        <div class="font-bold text-white">{{ user.full_name || 'Sin Nombre' }}</div>
                        <div class="text-xs text-slate-500 font-mono">{{ user.email }}</div>
                      </div>
                    </div>
                  </td>

                  <!-- Role Badge -->
                  <td class="px-6 py-4">
                     <span 
                       class="px-2.5 py-1 rounded-full text-[10px] font-bold border inline-flex items-center gap-1"
                       [ngClass]="getRoleBadgeClass(user.role)"
                     >
                       {{ user.role | uppercase }}
                     </span>
                  </td>

                  <!-- Phone -->
                  <td class="px-6 py-4 text-slate-400 font-mono text-xs">
                    {{ user.phone || '-' }}
                  </td>

                  <!-- Actions -->
                  <td class="px-6 py-4 text-right">
                     <button 
                       (click)="openEditModal(user)" 
                       class="text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-600 transition-colors px-3 py-1.5 rounded-lg text-xs font-bold border border-blue-500/20"
                       title="Editar Usuario"
                       [disabled]="isSelf(user.id)"
                       [class.opacity-50]="isSelf(user.id)"
                     >
                        EDITAR
                     </button>
                  </td>

                </tr>
              } @empty {
                <tr>
                   <td colspan="4" class="px-6 py-12 text-center text-slate-500 italic">
                      No se encontraron usuarios...
                   </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- EDIT MODAL -->
      @if (selectedUser()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
           <div class="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-scale-up">
              
              <!-- Modal Header -->
              <div class="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
                 <h3 class="text-lg font-bold text-white">Editar Usuario</h3>
                 <button (click)="closeEditModal()" class="text-slate-400 hover:text-white transition-colors">✕</button>
              </div>

              <!-- Modal Body -->
              <div class="p-6 space-y-4">
                 
                 <div class="flex items-center gap-4 mb-4">
                    <div class="w-16 h-16 rounded-full bg-slate-800 overflow-hidden border-2 border-slate-700">
                       <img [src]="selectedUser()?.avatar_url || 'assets/images/placeholder_avatar.png'" class="w-full h-full object-cover">
                    </div>
                    <div>
                       <div class="text-white font-bold">{{ selectedUser()?.full_name }}</div>
                       <div class="text-xs text-slate-500">{{ selectedUser()?.email }}</div>
                       <div class="text-[10px] text-slate-600 font-mono mt-1">ID: {{ selectedUser()?.id | slice:0:8 }}</div>
                    </div>
                 </div>

                 <!-- Role Selector -->
                 <div>
                    <label class="block text-xs font-bold text-slate-400 uppercase mb-2">Rol del Sistema</label>
                    <div class="grid grid-cols-2 gap-2">
                       @for (role of availableRoles; track role.value) {
                          <button 
                             (click)="setRole(role.value)"
                             class="p-3 rounded-lg border text-xs font-bold transition-all text-left flex flex-col gap-1"
                             [class.bg-blue-600_20]="tempRole() === role.value"
                             [class.border-blue-500]="tempRole() === role.value"
                             [class.text-blue-400]="tempRole() === role.value"
                             [class.bg-slate-800]="tempRole() !== role.value"
                             [class.border-slate-700]="tempRole() !== role.value"
                             [class.text-slate-400]="tempRole() !== role.value"
                          >
                             <span class="uppercase">{{ role.label }}</span>
                             <span class="text-[10px] font-normal opacity-70">{{ role.desc }}</span>
                          </button>
                       }
                    </div>
                 </div>

              </div>

              <!-- Modal Footer -->
              <div class="p-4 bg-slate-950/50 border-t border-slate-800 flex justify-end gap-3">
                 <button (click)="closeEditModal()" class="px-4 py-2 rounded-lg text-slate-400 hover:text-white text-xs font-bold hover:bg-slate-800 transition-colors">CANCELAR</button>
                 <button 
                    (click)="saveChanges()" 
                    [disabled]="isProcessing() || tempRole() === selectedUser()?.role"
                    class="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                 >
                    @if (isProcessing()) {
                       <svg class="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    }
                    GUARDAR CAMBIOS
                 </button>
              </div>

           </div>
        </div>
      }
      
    </div>
  `,
  styles: [`
    .animate-fade-in { animation: fadeIn 0.2s ease-out; }
    .animate-scale-up { animation: scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes scaleUp { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  `]
})
export class UserManagementComponent implements OnInit {
  userService = inject(UserService);
  authService = inject(AuthService);
  toastService = inject(ToastService);

  searchTerm = signal('');
  selectedUser = signal<Profile | null>(null);
  tempRole = signal<string>('civilian');
  isProcessing = signal(false);

  availableRoles = [
    { value: 'civilian', label: 'Civil', desc: 'Usuario estándar' },
    { value: 'responder', label: 'Respondedor', desc: 'Acceso a moderación básica' },
    { value: 'military', label: 'Fuerza', desc: 'Acceso táctico' },
    { value: 'admin', label: 'Admin', desc: 'Control total del sistema' }
  ];

  filteredUsers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const all = this.userService.users();
    if (!term) return all;

    return all.filter(u => 
      (u.email?.toLowerCase().includes(term)) ||
      (u.full_name?.toLowerCase().includes(term)) ||
      (u.username?.toLowerCase().includes(term))
    );
  });

  ngOnInit() {
    this.userService.fetchAllUsers();
  }

  isSelf(userId: string): boolean {
    return this.authService.currentUser()?.id === userId;
  }

  getRoleBadgeClass(role: string = 'civilian') {
    switch (role) {
      case 'admin': return 'bg-red-500/10 text-red-500 border-red-500/50';
      case 'responder': return 'bg-blue-500/10 text-blue-400 border-blue-500/50';
      case 'military': return 'bg-emerald-600/10 text-emerald-500 border-emerald-600/50';
      default: return 'bg-slate-700/30 text-slate-400 border-slate-600';
    }
  }

  openEditModal(user: Profile) {
    if (this.isSelf(user.id)) {
      this.toastService.warning('No puedes editar tu propio rol.');
      return;
    }
    this.selectedUser.set(user);
    this.tempRole.set(user.role || 'civilian');
  }

  closeEditModal() {
    this.selectedUser.set(null);
  }

  setRole(role: string) {
    this.tempRole.set(role);
  }

  async saveChanges() {
    const user = this.selectedUser();
    const newRole = this.tempRole();
    
    if (!user || !newRole) return;
    
    this.isProcessing.set(true);
    
    const success = await this.userService.updateUserRole(user.id, newRole);
    
    if (success) {
      this.toastService.success(`Rol actualizado a ${newRole.toUpperCase()}`);
      this.closeEditModal();
    } else {
      this.toastService.error('Error al actualizar rol. Verifica la consola.');
    }
    
    this.isProcessing.set(false);
  }
}
