import { Component, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule],

  template: `
    <div class="fixed inset-0 w-full h-full bg-slate-950 flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <!-- Background Effects -->
      <div class="absolute inset-0 z-0">
        <div class="absolute inset-0 bg-linear-to-br from-slate-900 via-slate-950 to-black"></div>
        <div class="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-sky-500/10 rounded-full blur-[100px] animate-pulse"></div>
        <div class="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-blue-600/10 rounded-full blur-[100px] animate-pulse" style="animation-delay: 1s;"></div>
        <div class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[50px_50px] mask-[radial-gradient(ellipse_at_center,black,transparent_80%)]"></div>
      </div>

      <!-- Logo Only (No Back Button) -->
      <div class="absolute top-4 right-4 z-50">
         <h1 class="text-xl font-black text-white tracking-tighter drop-shadow-md opacity-80">ZARX <span class="text-sky-400 text-xs align-top">SYS</span></h1>
      </div>

      <!-- Login Card -->
      <div class="relative z-10 w-full max-w-sm sm:max-w-lg bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl sm:rounded-2xl shadow-2xl overflow-y-auto max-h-[95vh] ring-1 ring-white/5 custom-scrollbar">
        
        <div class="h-1 w-full bg-linear-to-r from-sky-500 via-blue-600 to-indigo-600 sticky top-0 z-20"></div>

        <div class="p-4 sm:p-8">
          <div class="text-center mb-4 sm:mb-6">
            <h1 class="text-2xl sm:text-3xl font-black text-white tracking-tighter mb-0.5 drop-shadow-lg">
              ZARX <span class="text-sky-400 text-sm sm:text-base align-top px-1 border border-sky-500/30 rounded bg-sky-500/10">SYS</span>
            </h1>
            <p class="text-slate-400 text-[10px] sm:text-xs font-mono uppercase tracking-[0.2em]">{{ isSignUp() ? 'NEW AGENT REGISTRATION' : 'SECURE ACCESS' }}</p>
          </div>

          <!-- Mode Toggle -->
          <div class="flex justify-center mb-4">
            <div class="bg-slate-950/50 p-0.5 sm:p-1 rounded-lg border border-white/5 flex gap-1 transform scale-90 sm:scale-100">
              <button type="button" (click)="isSignUp.set(false)" 
                  [class]="!isSignUp() ? 'bg-slate-800 text-sky-400 shadow-sm' : 'text-slate-300 hover:text-slate-300'"
                  class="px-5 py-1.5 text-xs font-bold rounded-md transition-all duration-200">
                  LOGIN
              </button>
              <button type="button" (click)="isSignUp.set(true)" 
                  [class]="isSignUp() ? 'bg-slate-800 text-sky-400 shadow-sm' : 'text-slate-300 hover:text-slate-300'"
                  class="px-5 py-1.5 text-xs font-bold rounded-md transition-all duration-200">
                  REGISTER
              </button>
            </div>
          </div>

          <!-- Social Login (Moved Top for Easy Access) -->
          <div class="grid grid-cols-3 gap-2 mb-4">
            <button type="button" (click)="signInWithOAuth('google')" class="flex items-center justify-center py-2 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors bg-slate-900/50 active:scale-95">
                <svg class="h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24"><path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            </button>
            <button type="button" (click)="signInWithOAuth('github')" class="flex items-center justify-center py-2 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors bg-slate-900/50 active:scale-95">
              <svg class="h-4 w-4 sm:h-5 sm:w-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .3a12 12 0 0 0-3.8 23.38c.6.12.83-.26.83-.57L9 21.07c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.1-.74.08-.73.08-.73 1.2.09 1.83 1.24 1.83 1.24 1.08 1.83 2.81 1.3 3.5 1 .1-.78.42-1.31.76-1.61-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.23 1.91 1.23 3.22 0 4.61-2.8 5.63-5.48 5.92.42.36.81 1.1.81 2.22l-.01 3.29c0 .31.2.69.82.57A12 12 0 0 0 12 .3"/></svg>
            </button>
            <button type="button" (click)="signInWithOAuth('facebook')" class="flex items-center justify-center py-2 border border-slate-700 rounded-lg hover:bg-slate-800 transition-colors bg-slate-900/50 active:scale-95">
                <svg class="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </button>
          </div>

          <div class="relative py-2 mb-3">
            <div class="absolute inset-0 flex items-center"><span class="w-full border-t border-slate-700"></span></div>
            <div class="relative flex justify-center text-[10px] uppercase"><span class="bg-slate-900 px-2 text-slate-300">Or use email</span></div>
          </div>

          <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="space-y-3">
            
            <!-- === EXTENDED REGISTRATION FIELDS === -->
            @if (isSignUp()) {
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
                <!-- Full Name -->
                 <div class="space-y-0.5 col-span-2">
                  <input type="text" formControlName="fullName" class="block w-full bg-slate-950/50 border border-slate-700 text-white rounded-lg px-3 py-2 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-xs sm:text-sm" placeholder="Full Name">
                </div>



                <!-- Phone -->
                 <div class="space-y-0.5">
                  <input type="tel" formControlName="phone" class="block w-full bg-slate-950/50 border border-slate-700 text-white rounded-lg px-3 py-2 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-xs sm:text-sm" placeholder="Phone (Opt)">
                </div>
              </div>
            }

            <!-- === STANDARD FIELDS === -->
            <div class="space-y-2">
              <div class="space-y-0.5">
                <input type="email" formControlName="email" class="block w-full bg-slate-950/50 border border-slate-700 text-white rounded-lg px-3 py-2.5 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all text-xs sm:text-sm font-medium" placeholder="Email Address">
              </div>

              <div class="space-y-0.5">
                <input type="password" formControlName="password" class="block w-full bg-slate-950/50 border border-slate-700 text-white rounded-lg px-3 py-2.5 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all text-xs sm:text-sm font-medium" placeholder="Password (Min 6)">
              </div>
            </div>

            <!-- Terms Checkbox -->
            @if (isSignUp()) {
              <div class="flex items-start gap-2 mt-2 p-2 bg-slate-800/50 rounded-lg border border-white/5">
                <input type="checkbox" formControlName="terms" id="terms" class="mt-0.5 w-3.5 h-3.5 rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500">
                <label for="terms" class="text-[10px] text-slate-400 leading-tight">
                  I accept the <a href="#" class="text-sky-400">Terms</a>. Public Username.
                </label>
              </div>

              <!-- Data Consent Checkbox -->
              <div class="flex items-start gap-2 mt-1 p-2 bg-slate-800/50 rounded-lg border border-white/5">
                <input type="checkbox" formControlName="dataConsent" id="dataConsent" class="mt-0.5 w-3.5 h-3.5 rounded border-slate-600 bg-slate-700 text-sky-500 focus:ring-sky-500">
                <label for="dataConsent" class="text-[10px] text-slate-400 leading-tight">
                   Consiento expresamente el tratamiento de mis datos de geolocalizacion y biometricos para fines de seguridad preventiva y validacion de identidad.
                </label>
              </div>
            }

            <!-- Main Button -->
            <button 
              type="submit" 
              [disabled]="loginForm.invalid || isLoading() || rateLimitCooldown() > 0"
              class="w-full relative overflow-hidden rounded-xl bg-linear-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 transition-all py-3 font-bold text-white uppercase tracking-wider text-xs sm:text-sm shadow-lg shadow-sky-500/25 disabled:opacity-50 disabled:cursor-not-allowed mt-1 active:scale-95"
              [class.from-red-600]="rateLimitCooldown() > 0"
              [class.to-red-700]="rateLimitCooldown() > 0"
            >
              <span class="relative z-10 flex items-center justify-center gap-2">
                @if (rateLimitCooldown() > 0) {
                   <span>COOLDOWN ({{ rateLimitCooldown() }}s)</span>
                } @else if (isLoading()) {
                  <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  <span>...</span>
                } @else {
                  <span>{{ isSignUp() ? 'REGISTER' : 'LOGIN' }}</span>
                }
              </span>
            </button>

            <!-- Errors -->
            @if (loginForm.invalid && loginForm.touched) {
               <div class="text-center">
                 <p class="text-[10px] text-red-400 font-medium">Please check fields</p>
               </div>
            }
          </form>
        </div>
      </div>
    </div>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  
  rateLimitCooldown = signal(0);
  private cooldownInterval: ReturnType<typeof setInterval> | undefined;

  isLoading = signal(false);
  isSignUp = signal(false);

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    // Extended Registration Fields
    fullName: [''],
    phone: [''],

    terms: [false],
    dataConsent: [false]
  });

  constructor() {
     // Auto-redirect if already logged in (e.g. after OAuth redirect)
     effect(() => {
        if (this.authService.currentUser()) {
           this.router.navigate(['/inicio']);
        }
     });

     // Dynamic Validation for Sign Up fields
     this.loginForm.valueChanges.subscribe(() => {
        const isRegistering = this.isSignUp();
        const fullName = this.loginForm.get('fullName');
        const terms = this.loginForm.get('terms');
        const dataConsent = this.loginForm.get('dataConsent');
        
        if (isRegistering) {
          fullName?.setValidators([Validators.required]);
          terms?.setValidators([Validators.requiredTrue]);
          dataConsent?.setValidators([Validators.requiredTrue]);
        } else {
          fullName?.clearValidators();
          terms?.clearValidators();
          dataConsent?.clearValidators();
        }
        fullName?.updateValueAndValidity({ emitEvent: false });
        terms?.updateValueAndValidity({ emitEvent: false });
        dataConsent?.updateValueAndValidity({ emitEvent: false });
     });
  }

  toggleMode() {
    this.isSignUp.update(v => !v);
  }

  // Auto-generate username if left blank
  private generateUsername(name: string): string {
    const base = name.split(' ')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
    const random = Math.floor(Math.random() * 10000);
    return `agent_${base}${random}`;
  }

  async signInWithOAuth(provider: 'google' | 'github' | 'facebook') {
     try {
       await this.authService.signInWithOAuth(provider);
     } catch (err: unknown) {
       const message = err instanceof Error ? err.message : 'Unknown OAuth error';
       alert('OAuth Error: ' + message);
     }
  }

  async onSubmit() {
    if (this.isLoading() || this.rateLimitCooldown() > 0) return;

    if (this.loginForm.valid) {
      this.isLoading.set(true);
      const { email, password, fullName, phone } = this.loginForm.value;

      try {
         // ... (try block logic)
         let error;
         
         if (this.isSignUp()) {
            const metadata = { full_name: fullName, phone, username: '' };
            const res = await this.authService.signUp(email, password, metadata);
            error = res.error;
            if (!error) alert(`Registration Successful! Please check your email to confirm.`);
         } else {
            const res = await this.authService.signInWithPassword(email, password);
            error = res.error;
         }

         if (error) throw error;
         
         if (!this.isSignUp()) {
             // Navigation is handled by AuthService subscription
             // inside auth.service.ts handleNavigation() method.
         } 
         
      } catch (err: unknown) {
        let msg = err instanceof Error ? err.message : 'Authentication Failed';
        
        // Safe check for status property on unknown error
        const status = (err as { status?: number })?.status;
        
        if (status === 429 || msg.includes('429') || msg.toLowerCase().includes('too many requests')) {
           msg = 'SECURITY LOCKOUT: Too many attempts. System cooldown initiated.';
           this.startCooldown(60);
        } else if (status === 400) {
           if (msg.includes('Email not confirmed')) msg = 'ACCESS DENIED: Email address not verified. Please check your inbox.';
           else if (msg.includes('Invalid login credentials')) msg = 'ACCESS DENIED: Invalid credentials.';
        }
        
        alert(msg);
      } finally {
        this.isLoading.set(false);
      }
    } else {
      this.loginForm.markAllAsTouched();
    }
  }

  startCooldown(seconds: number) {
    this.rateLimitCooldown.set(seconds);
    if (this.cooldownInterval) clearInterval(this.cooldownInterval);
    
    this.cooldownInterval = setInterval(() => {
      this.rateLimitCooldown.update(v => {
        if (v <= 1) {
          clearInterval(this.cooldownInterval);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
  }
}
