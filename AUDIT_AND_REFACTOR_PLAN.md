# Comprehensive Audit and Refactoring Plan

## 1. Project Cleanup

**Goal:** Remove clutter and non-functional files from the project root to maintain a clean workspace.
**Files to Remove:**

- **Documentation/Logs:** `ANDROID_DEPLOY_INSTRUCTIONS.md`, `DEPLOY_STATUS.md`, `NOTIFICATION_STRATEGY.md`, `SOS_ARCHITECTURE.md`, `SQL_MIGRATION_USERS.md`, `build.log`, `lighthouse-report.html`, `lighthouse-report.json`.
- **SQL Scripts:** `FINAL_SECURITY_FIX.sql`, `FIX_LINT_ISSUES.sql`, `FIX_REPORTS_RELATION.sql`, `FIX_SECURITY_ISSUES.sql`, `FIX_SOS_DB.sql`, `OPTIMIZE_RLS.sql`, `postgis_setup.sql`. (These should be applied to the database and then removed from the source code, or moved to a `migrations/` folder if strictly necessary for version control, but the user requested cleanup).
- **Scripts:** `register-user.js` (Verify utility status, likely move to `scripts/` or remove).

## 2. Codebase Audit & Refactoring (Clean Code & Architecture)

**Goal:** Ensure code follows SOLID principles, Clean Architecture, and is free of "obfuscated/broken" logic.
**Key Areas to Review:**

- **Hardcoding:** Check `src/environments` and Service files for hardcoded URLs or secrets. ensure `environment.ts` and `environment.prod.ts` are correctly utilized.
- **Service Layer:**
  - `SosService` (Critical path): Ensure robustness and error handling for the panic button.
  - `AuthService`: Verify state management (Signals/Observables).
- **Component Layer:**
  - `AdminDashboardComponent`: Check for "God Component" anti-pattern (too much logic in one file). Refactor into smaller sub-components if necessary.
- **Performance:**
  - Lazy Loading: Verify all non-core routes are lazy loaded.
  - Change Detection: Ensure `OnPush` strategy where applicable.

## 3. Optimization & Stability

**Goal:** Ensure the application runs smoothly in production.

- **Build Optimization:** Verify `angular.json` production configurations (optimization: true, sourceMap: false, etc.).
- **Asset Optimization:** Ensure images/icons are optimized (already addressed some, but will double check).

## 4. Deployment Pipeline

**Goal:** automate and finalize deployment.

- **GitHub Actions:** Review `.github/workflows` to ensure CI/CD is correctly set up for build and deploy.
- **Firebase Hosting:** Deploy the optimized build to Firebase.

## Execution Strategy

1.  **Execute Cleanup**: Delete identified root files.
2.  **Refactor**: Perform targeted refactoring on `AdminDashboard` and `SosService`.
3.  **Build & Test**: Run a full production build to verify stability.
4.  **Deploy**: Trigger deployment.
