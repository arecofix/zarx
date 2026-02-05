import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NewsService, NewsPost } from '../../../../core/services/news.service';

@Component({
  selector: 'app-news-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-slate-950 p-6 font-mono text-slate-200">
      <!-- Header -->
      <div class="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
         <h1 class="text-2xl font-black tracking-widest text-white flex items-center gap-3">
            <span class="text-emerald-500">📢</span> CANAL DE SOBERANÍA
         </h1>
         <button (click)="goToDashboard()" class="px-4 py-2 border border-slate-700 rounded hover:bg-slate-800 transition-colors uppercase text-xs font-bold">
            Volver al Panel
         </button>
      </div>

      <!-- Create Form -->
      <div class="bg-slate-900/50 border border-slate-700 p-6 rounded-xl mb-8 shadow-lg">
         <h2 class="text-emerald-500 font-bold mb-4 uppercase text-sm tracking-wider flex items-center gap-2">
            <span>✍️</span> Redactar Aviso Oficial
         </h2>
         
         <div class="space-y-4">
            <textarea [(ngModel)]="newPost.content" rows="3" placeholder="Ej: Se registra corte de luz en Barrio La Recova. Cuadrilla en camino..." class="w-full bg-slate-950 border border-slate-700 rounded p-4 text-white focus:border-emerald-500 outline-none transition-colors placeholder-slate-600"></textarea>
            
            <div class="flex flex-col md:flex-row gap-4 justify-between items-center">
               <!-- Type Selector -->
               <div class="flex gap-2 w-full md:w-auto">
                  <button (click)="newPost.type = 'ALERT'" [class.bg-red-600]="newPost.type === 'ALERT'" [class.border-red-600]="newPost.type === 'ALERT'" [class.text-white]="newPost.type === 'ALERT'" class="flex-1 md:flex-none px-4 py-2 border border-slate-700 rounded text-xs font-bold uppercase hover:bg-slate-800 transition-all text-slate-400">
                     🚨 Alerta
                  </button>
                  <button (click)="newPost.type = 'INFO'" [class.bg-emerald-600]="newPost.type === 'INFO'" [class.border-emerald-600]="newPost.type === 'INFO'" [class.text-white]="newPost.type === 'INFO'" class="flex-1 md:flex-none px-4 py-2 border border-slate-700 rounded text-xs font-bold uppercase hover:bg-slate-800 transition-all text-slate-400">
                     ℹ️ Info
                  </button>
                  <button (click)="newPost.type = 'PROMO'" [class.bg-blue-600]="newPost.type === 'PROMO'" [class.border-blue-600]="newPost.type === 'PROMO'" [class.text-white]="newPost.type === 'PROMO'" class="flex-1 md:flex-none px-4 py-2 border border-slate-700 rounded text-xs font-bold uppercase hover:bg-slate-800 transition-all text-slate-400">
                     📣 Promo
                  </button>
               </div>

               <button (click)="publish()" [disabled]="!newPost.content || isPublishing()" class="w-full md:w-auto px-8 py-3 bg-emerald-500 text-black font-bold rounded hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed uppercase text-xs tracking-wider shadow-lg shadow-emerald-900/20 active:scale-95 transition-all">
                  {{ isPublishing() ? 'ENVIANDO...' : 'PUBLICAR AHORA' }}
               </button>
            </div>
         </div>
      </div>

      <!-- List -->
      <div class="space-y-4 pb-20">
         <h2 class="text-slate-500 font-bold mb-4 uppercase text-xs tracking-wider">Historial de Comunicados</h2>
         
         @for (post of posts(); track post.id) {
           <div class="bg-slate-900 border border-slate-800 p-4 rounded-lg flex flex-col md:flex-row md:items-center gap-4 group hover:border-slate-600 transition-colors relative overflow-hidden">
              @if (post.is_active) {
                 <div class="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500"></div>
              }

              <div class="flex items-center gap-4 flex-1">
                 <div class="w-10 h-10 rounded-full flex-none flex items-center justify-center text-lg bg-slate-800 border border-slate-700 shrink-0">
                    @if (post.type === 'ALERT') { <span>🚨</span> }
                    @else if (post.type === 'INFO') { <span>ℹ️</span> }
                    @else { <span>📣</span> }
                 </div>
                 <div class="min-w-0">
                    <p class="text-white font-medium text-sm md:text-base wrap-break-word">{{ post.content }}</p>
                    <span class="text-xs text-slate-500 font-mono">{{ post.created_at | date:'short' }}</span>
                 </div>
              </div>

              <div class="flex items-center justify-end gap-3 mt-2 md:mt-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                 <button (click)="toggleActive(post)" class="text-[10px] font-bold px-3 py-1.5 rounded border transition-colors uppercase tracking-wider"
                         [ngClass]="post.is_active ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10' : 'border-slate-700 text-slate-500 hover:text-slate-300'">
                    {{ post.is_active ? 'Activo' : 'Inactivo' }}
                 </button>
                 <button (click)="delete(post.id!)" class="text-slate-600 hover:text-red-500 transition-colors p-2 rounded hover:bg-red-500/10">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                 </button>
              </div>
           </div>
         } @empty {
             <div class="text-center py-12 text-slate-600 italic border border-dashed border-slate-800 rounded-lg">
                No hay comunicados registrados.
             </div>
         }
      </div>
    </div>
  `
})
export class NewsAdminComponent implements OnInit {
  private newsService = inject(NewsService);
  private router = inject(Router);

  posts = signal<NewsPost[]>([]);
  isPublishing = signal(false);

  newPost: NewsPost = {
    content: '',
    type: 'INFO'
  };

  ngOnInit() {
    this.loadPosts();
  }

  goToDashboard() {
    this.router.navigate(['/admin/dashboard']);
  }

  async loadPosts() {
     try {
       const data = await this.newsService.getAllNewsForAdmin();
       this.posts.set(data);
     } catch (e) {
       console.error(e);
     }
  }

  async publish() {
    if (!this.newPost.content) return;
    this.isPublishing.set(true);
    try {
      await this.newsService.createPost(this.newPost);
      this.newPost.content = ''; // Reset but keep type
      await this.loadPosts();
    } catch (e) {
      alert('Error al publicar');
    } finally {
      this.isPublishing.set(false);
    }
  }

  async toggleActive(post: NewsPost) {
    if (!post.id) return;
    const newState = !post.is_active;
    
    // Optimistic update
    this.posts.update(current => 
       current.map(p => p.id === post.id ? { ...p, is_active: newState } : p)
    );

    try {
      await this.newsService.updateStatus(post.id, newState);
    } catch (e) {
      // Revert if error
      await this.loadPosts();
      alert('Error updating status');
    }
  }

  async delete(id: string) {
    if (!confirm('¿Borrar comunicado?')) return;
    try {
      await this.newsService.deletePost(id);
      this.posts.update(current => current.filter(p => p.id !== id));
    } catch (e) {
      alert('Error deleting');
    }
  }
}
