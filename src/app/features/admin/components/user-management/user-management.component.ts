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
    <div class="p-6 bg-slate-950 min-h-full font-sans text-slate-300">
      
      <!-- HEADER -->
      <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div class="flex items-center gap-4">
          <a routerLink="/admin/dashboard" class="flex items-center justify-center w-10 h-10 rounded-full bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors">
             <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          </a>
          <div>
            <h2 class="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>👥</span> GESTIÓN
            </h2>
            <p class="text-xs text-slate-400 uppercase tracking-widest mt-1">
              Control de usuarios y privilegios
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
        
        <!-- Toolbar / Stats -->
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
                <th class="px-6 py-3">Rol Actual</th>
                <th class="px-6 py-3">Estado</th>
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
                         @if (user.avatar_url) {
                           <img [src]="user.avatar_url" class="w-full h-full object-cover">
                         } @else {
                           <div class="w-full h-full flex items-center justify-center text-slate-500 font-bold text-xs">
                             {{ getInitials(user) }}
                           </div>
                         }
                      </div>
                      <div>
                        <div class="font-bold text-white">{{ user.full_name || 'Sin Nombre' }}</div>
                        <div class="text-xs text-slate-500 font-mono">{{ user.email }}</div>
                        <div class="text-[10px] text-slate-600">{{ user.username || '@anon' }}</div>
                      </div>
                    </div>
                  </td>

                  <!-- Role Badge (Editable) -->
                  <td class="px-6 py-4">
                     <!-- If Editing this Row -->
                     @if (editingUserId() === user.id) {
                        <div class="flex items-center gap-2 animate-fade-in">
                          <select 
                            #roleSelect
                            [value]="user.role || 'user'"
                            (change)="onRoleChange(user, roleSelect.value)"
                            [disabled]="isProcessing() || isSelf(user.id)"
                            class="bg-slate-950 border border-blue-500 text-white text-xs rounded-md py-1 px-2 focus:outline-none"
                          >
                            <option value="user">User</option>
                            <option value="moderator">Moderator</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button (click)="cancelEdit()" class="text-slate-400 hover:text-white px-1">✕</button>
                        </div>
                     } @else {
                        <!-- Badge -->
                        <span 
                          (click)="startEdit(user)"
                          class="px-2.5 py-1 rounded-full text-[10px] font-bold border cursor-pointer hover:opacity-80 transition-opacity select-none inline-flex items-center gap-1"
                          [ngClass]="getRoleBadgeClass(user.role)"
                          title="Clic para editar rol"
                        >
                          {{ user.role | uppercase }}
                          <svg class="w-3 h-3 opacity-50 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                        </span>
                     }
                  </td>

                  <!-- Status -->
                  <td class="px-6 py-4">
                    <span class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">
                       <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                       ACTIVO
                    </span>
                  </td>

                  <!-- Actions -->
                  <td class="px-6 py-4 text-right">
                     <button 
                       (click)="startEdit(user)" 
                       class="text-slate-400 hover:text-blue-400 transition-colors p-2 rounded-lg hover:bg-slate-800"
                       title="Editar Usuario"
                       [disabled]="isSelf(user.id)"
                       [class.opacity-20]="isSelf(user.id)"
                     >
                        <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
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
      
    </div>
  `
})
export class UserManagementComponent implements OnInit {
  userService = inject(UserService);
  authService = inject(AuthService);
  toastService = inject(ToastService);

  searchTerm = signal('');
  editingUserId = signal<string | null>(null);
  isProcessing = signal(false);

  // Computed Users List with Filter
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

  getInitials(user: Profile): string {
    if (user.full_name) {
      return user.full_name.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase();
    }
    return user.email?.substring(0,2).toUpperCase() || '??';
  }

  getRoleBadgeClass(role: string = 'user') {
    switch (role) {
      case 'admin':
        return 'bg-red-500/10 text-red-500 border-red-500/50';
      case 'moderator':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/50';
      case 'responder': // Map legacy responder to Mod look for now
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/50';
      case 'military': 
        return 'bg-emerald-600/10 text-emerald-500 border-emerald-600/50';
      default: // user / civilian
        return 'bg-slate-700/30 text-slate-400 border-slate-600';
    }
  }

  isSelf(userId: string): boolean {
    return this.authService.currentUser()?.id === userId;
  }

  startEdit(user: Profile) {
    if (this.isSelf(user.id)) {
      this.toastService.warning('No puedes editar tu propio rol para evitar bloqueos accidentales.');
      return;
    }
    this.editingUserId.set(user.id);
  }

  cancelEdit() {
    this.editingUserId.set(null);
  }

  async onRoleChange(user: Profile, newRole: string) {
    if (!newRole) return;
    
    this.isProcessing.set(true);
    
    const success = await this.userService.updateUserRole(user.id, newRole);
    
    if (success) {
      this.toastService.success(`Rol de ${user.email} actualizado a ${newRole.toUpperCase()}`);
      this.editingUserId.set(null);
    } else {
      this.toastService.error('Error actualizando rol. Verifica permisos.');
    }
    
    this.isProcessing.set(false);
  }
}
