import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { Profile } from '../../../../core/models';

@Component({
  selector: 'app-reputation-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
      <div class="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
        <div>
          <h2 class="text-xl font-bold text-white flex items-center gap-2">
            <span>🎖️</span> Leaderboard Ciudadano
          </h2>
          <p class="text-sm text-slate-400">Marcos Paz - Score de Reputación</p>
        </div>
        <div class="text-xs font-mono text-emerald-500 bg-emerald-900/20 px-3 py-1 rounded border border-emerald-500/30">
          LIVE DATA
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-slate-800">
        
        <!-- Top Citizens -->
        <div class="p-4">
          <h3 class="text-sm font-bold text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span>🛡️</span> Ciudadanos Ejemplares
          </h3>
          
          @if (loading()) {
            <div class="space-y-3">
               @for (i of [1,2,3]; track i) {
                 <div class="h-12 bg-slate-800/50 rounded animate-pulse"></div>
               }
            </div>
          } @else {
            <div class="space-y-2">
               @for (user of topUsers(); track user.id; let i = $index) {
                 <div class="flex items-center justify-between p-3 bg-slate-800/30 hover:bg-slate-800/50 rounded-lg group transition-colors">
                    <div class="flex items-center gap-3">
                       <span class="text-lg font-black text-slate-500 w-6">#{{i+1}}</span>
                       <div class="w-8 h-8 rounded-full bg-slate-700 overflow-hidden">
                          <img [src]="user.avatar_url || 'assets/avatar-placeholder.png'" class="w-full h-full object-cover">
                       </div>
                       <div>
                          <div class="font-bold text-slate-200">@{{ user.username || 'Anon' }}</div>
                          <div class="text-[10px] text-slate-400 font-mono">{{ user.id | slice:0:8 }}</div>
                       </div>
                    </div>
                    <div class="text-right">
                       <div class="text-emerald-400 font-black text-lg">{{ user.reputation_score }}</div>
                       <div class="text-[9px] text-slate-500 uppercase">Puntos</div>
                    </div>
                 </div>
               }
            </div>
          }
        </div>

        <!-- Low Score / Observed -->
        <div class="p-4 bg-red-950/10">
          <h3 class="text-sm font-bold text-red-400 uppercase tracking-widest mb-4 flex items-center gap-2">
            <span>👁️</span> Usuarios Observados
          </h3>

          @if (loading()) {
            <div class="space-y-3">
               @for (i of [1,2,3]; track i) {
                 <div class="h-12 bg-slate-800/50 rounded animate-pulse"></div>
               }
            </div>
          } @else {
             <div class="space-y-2">
               @for (user of lowUsers(); track user.id) {
                 <div class="flex items-center justify-between p-3 bg-red-900/10 hover:bg-red-900/20 border border-red-900/20 rounded-lg group transition-colors">
                    <div class="flex items-center gap-3">
                       <div class="w-8 h-8 rounded-full bg-slate-700 overflow-hidden grayscale opacity-70">
                          <img [src]="user.avatar_url || 'assets/avatar-placeholder.png'" class="w-full h-full object-cover">
                       </div>
                       <div>
                          <div class="font-bold text-slate-200">@{{ user.username || 'Anon' }}</div>
                          <div class="text-[10px] text-red-300 font-mono flex items-center gap-1">
                             Status: OBSERVADO
                          </div>
                       </div>
                    </div>
                    <div class="text-right">
                       <div class="text-red-500 font-black text-lg">{{ user.reputation_score }}</div>
                       <div class="text-[9px] text-slate-500 uppercase">Puntos</div>
                    </div>
                 </div>
               } @empty {
                 <div class="text-center py-6 text-slate-500 text-xs">
                    No hay usuarios bajo observación.
                 </div>
               }
            </div>
          }
        </div>

      </div>
    </div>
  `,
  styles: []
})
export class ReputationDashboardComponent implements OnInit {
  private supabase = inject(SupabaseService).client;
  
  loading = signal(true);
  topUsers = signal<Profile[]>([]);
  lowUsers = signal<Profile[]>([]);

  ngOnInit() {
    this.refreshData();
  }

  async refreshData() {
    this.loading.set(true);
    try {
      // Top 10
      const { data: top } = await this.supabase
        .from('profiles')
        .select('*')
        .order('reputation_score', { ascending: false })
        .limit(10);
      
      if (top) this.topUsers.set(top as any);

      // Bottom 10 (Only those < 300)
      const { data: low } = await this.supabase
        .from('profiles')
        .select('*')
        .lt('reputation_score', 300)
        .order('reputation_score', { ascending: true })
        .limit(10);

      if (low) this.lowUsers.set(low as any);

    } catch (e) {
      console.error(e);
    } finally {
      this.loading.set(false);
    }
  }
}
