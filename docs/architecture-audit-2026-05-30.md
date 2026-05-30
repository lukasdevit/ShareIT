# ShareIT Architecture Audit Report

**Data:** 2026-05-30  
**Zakres:** Cały projekt (`backend/` + `frontend/`)  
**Względem:** `.github/copilot-instructions.md`

---

## 1. ⛔ Architektura Backend — Poważne naruszenia

### 1.1 Brak warstwy Repository

Instrukcja definiuje ścieżkę: `Route → Service → Repository → Database`. Projekt **nie posiada folderu `repositories/`**. Wszystkie route'y uzyskują dostęp do bazy danych **bezpośrednio** przez `dbGet`/`dbAll`/`dbRun`.

Wszystkie poniższe pliki mają **bezpośredni dostęp do DB z route'ów**:

| Plik | Co robi źle |
|---|---|
| `backend/routes/auth.ts` | ~440 linii — logowanie, rejestracja, demo, zmiana hasła, storage info — wszystko inline z DB |
| `backend/routes/files.ts` | Listowanie plików, toggle publiczny, usuwanie, serwowanie pliku — DB inline |
| `backend/routes/upload/multipart.ts` | Quota check DB w route handlerze, zamiast w serwisie |
| `backend/routes/admin/users.ts` | Pełny CRUD użytkowników z DB w route |
| `backend/routes/admin/db.ts` | Przeglądanie tabel — DB w route |
| `backend/routes/admin/storage.ts` | Odczyt/zapis settings z DB w route |
| `backend/routes/admin/analytics.ts` | Zapytania analityczne z DB w route |
| `backend/routes/admin/backup.ts` | Historia backupów, harmonogram — DB w route |
| `backend/routes/admin/actions.ts` | To **de facto repository** (admin_actions CRUD) umieszczone w `routes/admin/` |
| `backend/routes/admin/integrity.ts` | Ogromny plik z całą logiką integrity check + DB w route |

### 1.2 Wyjątki — pliki zgodne ze wzorcem

| Plik | Status |
|---|---|
| `backend/routes/upload/direct.ts` | ✅ Deleguje do `handleUpload` z `fileService.ts` |
| `backend/routes/admin/logs.ts` | ✅ Używa `logService.ts` |
| `backend/routes/admin/backup-manage.ts` | ✅ Operuje tylko na filesystem |
| `backend/routes/sharex.ts` | ✅ Czysty handler HTTP |

### 1.3 Serwisy, które też łamią warstwy

| Plik | Problem |
|---|---|
| `backend/services/fileService.ts` | Zawiera bezpośredni dostęp do DB (`dbGet`, `dbRun`) — serwis powinien korzystać z repozytorium |
| `backend/services/demoCleanup.ts` | Bezpośredni dostęp do DB zamiast przez repozytorium |

---

## 2. ⛔ Architektura Frontend — Ogólnie OK, drobne naruszenia

### 2.1 Naruszenia wzorca Page → Component → Hook → API Client

| Plik | Problem |
|---|---|
| `frontend/src/components/files/UploadZone.tsx` | Komponent zawiera ciężką logikę biznesową: XHR upload, Uppy integracja, obsługa błędów. Powinien delegować do hooka `useFileUpload`. |
| `frontend/src/components/FilesPanel.tsx` | 265 linii — duży komponent-orchestrator. Akceptowalny, ale na granicy. |

### 2.2 Duplikacja hooka i komponentu

Istnieje hook `useFileUpload` (`frontend/src/hooks/useFileUpload.ts`) który **NIE jest używany** przez komponent `UploadZone`. `UploadZone` **reimplementuje** tę samą logikę uploadu (XHR, progress, drag-and-drop) zamiast używać istniejącego hooka.

Hook `useFiles` (`frontend/src/hooks/useFiles.ts`) to jedynie barrel re-export — oznaczony jako `@deprecated`. Do usunięcia.

---

## 3. ⛔ `any` w kodzie

### 3.1 Frontend — Poważne

**`frontend/src/components/files/UploadZone.tsx`:**
- Linia 3: `/* eslint-disable @typescript-eslint/no-explicit-any */`
- 13 wystąpień `any` w jednym pliku (callbacki Uppy, parsowanie JSON)
- **Propozycja:** Zdefiniować typy dla callbacków Uppy zamiast wyłączać ESLinta.

### 3.2 Backend — Drobne

| Plik | Problem |
|---|---|
| `backend/app.ts:78` | `process.stdout as any` — obejście typów pino |
| `backend/tests/**` | `any` w testach — akceptowalne |

---

## 4. ⛔ SQL String Interpolation

### 4.1 Naruszenie w `backend/db/schema.ts`

```typescript
// Linia 61 — DEFAULT_STORAGE_LIMIT wstawiany bezpośrednio w SQL
`ALTER TABLE users ADD COLUMN storage_limit INTEGER NOT NULL DEFAULT ${DEFAULT_STORAGE_LIMIT}`
```

Mimo że `DEFAULT_STORAGE_LIMIT` to stała liczbowa (nie podatna na injection), **łamie to zasadę** "Never build SQL with string interpolation". Powinno być przekazane jako parametr lub inaczej.

### 4.2 Bezpośrednie zapytania SQL w route'ach

Wszystkie route'y używają parametryzowanych zapytań (`?` placeholders), więc **nie ma podatności SQL injection**. Jednak sama obecność SQL w route'ach łamie architekturę.

---

## 5. ⛔ Next.js — Naruszenia

### 5.1 Server Components

- `frontend/src/app/layout.tsx` ✅ Server Component
- `frontend/src/app/files/page.tsx` ✅ Server Component (tylko AuthGuard wrapper)
- `frontend/src/app/settings/page.tsx` ✅ Server Component
- `frontend/src/app/page.tsx` ❌ `'use client'` — strona główna używa `use client` tylko po to by sprawdzić czy user jest zalogowany i przekierować. Można to zrobić w middleware Next.js.

### 5.2 `"use client"` — nadużywane?

Większość komponentów słusznie używa `"use client"` (używają hooków, stanu, event handlerów). **Nie ma rażącego nadużywania.** Jedyny kandydat do refaktoryzacji to `frontend/src/app/page.tsx`.

---

## 6. Struktura projektu

### 6.1 Foldery — problemy

| Problem | Opis |
|---|---|
| **Brak `backend/repositories/`** | Zdefiniowany w instrukcji, nie istnieje |
| **`backend/routes/admin/actions.ts`** | To jest **repository + service** admin actions, nie route. Powinno być w `services/` i `repositories/`. |
| **`backend/routes/admin/helpers.ts`** | Tylko re-eksport — zbędny plik |
| **`backend/routes/admin/`** | 10 plików z ciężką logiką — każdy powinien mieć odpowiadający serwis |

### 6.2 Duplikacja logiki

| Duplikacja | Pliki |
|---|---|
| **Formatowanie bajtów** | `frontend/src/lib/utils.ts::formatSize()` vs `backend/utils/format.ts::formatBytes()` — ta sama logika |
| **Upload XHR + drag-and-drop** | `frontend/src/hooks/useFileUpload.ts` vs `frontend/src/components/files/UploadZone.tsx` — duplikacja |
| **Quota check (global storage limit)** | `backend/services/fileService.ts` (dwukrotnie: `saveFile` i `finalizeFile`) ORAZ `backend/routes/upload/multipart.ts` — ta sama logika w 3 miejscach |
| **getUserQuota** | `backend/services/fileService.ts` — prywatna funkcja wewnątrz modułu, niedostępna dla innych |
| **getOverrides (settings z DB)** | `backend/routes/admin/storage.ts` — duplikuje logikę z `backend/config/index.ts::loadDbSettings()` |

### 6.3 `process.env` zamiast configu

`backend/routes/upload/multipart.ts` linie 126 i 247:
```typescript
const base = process.env.BASE_URL || 'http://localhost:3000';
```
Zamiast używać `BASE_URL` z `../../config/index.js`.

---

## 7. Podsumowanie problemów architektonicznych

### 🔴 Krytyczne

1. **Brak warstwy Repository** — wszystkie route'y mają bezpośredni dostęp do DB. ~12 plików do refaktoryzacji.

2. **Logika biznesowa w route'ach** — `auth.ts` (~440 linii), `files.ts`, wszystkie admin route'y zawierają logikę biznesową i zapytania SQL.

3. **`backend/routes/admin/actions.ts` w złym folderze** — to jest repository, nie route.

4. **`UploadZone.tsx` — `eslint-disable any` + duplikacja hooka `useFileUpload`**.

### 🟡 Średnie

5. **Duplikacja quota check** — global storage limit sprawdzany w 3 miejscach.

6. **`db/schema.ts` używa string interpolation** dla `DEFAULT_STORAGE_LIMIT`.

7. **`process.env` w `multipart.ts`** zamiast configu `BASE_URL`.

8. **`useFileUpload` hook nieużywany** — UploadZone ma własną implementację.

9. **`useFiles` barrel** — deprecated, do usunięcia.

10. **`backend/routes/admin/helpers.ts`** — zbędny plik (tylko re-eksport).

### 🟢 Drobne

11. **`frontend/src/app/page.tsx`** — `'use client'` niepotrzebnie; można użyć middleware.

12. **`backend/app.ts:78`** — `process.stdout as any`.

13. **`formatSize` vs `formatBytes`** — niespójne nazewnictwo frontend/backend.

14. **`FilesPanel.tsx`** — 265 linii, na granicy czytelności.

---

## 8. Propozycje refactorów

### 8.1 Utworzenie warstwy Repository

```
backend/repositories/
  fileRepository.ts    — wszystkie query na tabeli files
  userRepository.ts    — wszystkie query na tabeli users
  settingsRepository.ts — wszystkie query na tabeli settings
  backupRepository.ts  — query na backup_logs
  integrityRepository.ts — query na integrity_checks / integrity_issues
  actionRepository.ts  — query na admin_actions (przenieść z routes/admin/actions.ts)
```

Każda funkcja w repozytorium powinna mieć nazwę opisującą co robi, np.:
- `fileRepository.findById(id)`
- `fileRepository.listByUser(userId, pagination, search)`
- `fileRepository.togglePublic(id, isPublic)`
- `userRepository.findByUsername(username)`
- `userRepository.getQuota(userId)`

### 8.2 Utworzenie warstwy Service dla admin

```
backend/services/
  admin/
    userService.ts    — logika zarządzania użytkownikami (przeniesiona z routes/admin/users.ts)
    storageService.ts — logika konfiguracji storage (przeniesiona z routes/admin/storage.ts)
    backupService.ts  — logika backupów (przeniesiona z routes/admin/backup.ts)
    analyticsService.ts — logika analityki
    integrityService.ts — logika integrity check
```

### 8.3 Refactor `auth.ts`

Podzielić na:
- `backend/services/authService.ts` — logika logowania, rejestracji, lockout, demo
- `backend/repositories/userRepository.ts` — wszystkie query user
- `backend/routes/auth.ts` — tylko HTTP handler + schema validation

### 8.4 Refactor `UploadZone.tsx`

- Usunąć zduplikowaną logikę uploadu
- Użyć hooka `useFileUpload` wewnątrz `UploadZone`
- Zdefiniować typy dla callbacków Uppy zamiast `any` + `eslint-disable`
- Przenieść `useFileUpload` z `UploadZone` do hooka

### 8.5 Konsolidacja quota check

Stworzyć jedną funkcję w `fileService.ts` (lub nowym `quotaService.ts`):
```typescript
export async function checkStorageQuota(userId: number, additionalBytes: number): Promise<void>
```
I używać jej we wszystkich 3 miejscach zamiast duplikować.

### 8.6 Usunięcie zbędnych plików

- `frontend/src/hooks/useFiles.ts` — deprecated barrel
- `backend/routes/admin/helpers.ts` — zbędny re-eksport

### 8.7 Poprawki TypeScript

- `UploadZone.tsx`: zastąpić `any` typami Uppy (`@uppy/core` eksportuje typy)
- `backend/app.ts:78`: użyć `as unknown as Writable` zamiast `as any`
- `backend/db/schema.ts`: użyć stałej w inny sposób (np. `?` placeholder w migration)

---

## 9. Statystyki

| Kategoria | Liczba problemów |
|---|---|
| 🔴 Krytyczne | 4 |
| 🟡 Średnie | 6 |
| 🟢 Drobne | 4 |
| **Razem** | **14** |

| Pliki wymagające refaktoryzacji | ~20 |
|---|---|
| Pliki do usunięcia | 2 |
| Nowe pliki do utworzenia | ~15 |
