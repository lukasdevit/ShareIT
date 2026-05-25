Run appleboy/ssh-action@v1
Run echo "$GITHUB_ACTION_PATH" >> $GITHUB_PATH
Run entrypoint.sh
Downloading drone-ssh-1.8.2-linux-amd64 from https://github.com/appleboy/drone-ssh/releases/download/v1.8.2
======= CLI Version Information =======
Drone SSH version 1.8.2
=======================================
From github.com:lukasdevit/projectS
 * branch            main       -> FETCH_HEAD
   e174d6c..f3e09c5  main       -> origin/main
Updating e174d6c..f3e09c5
Fast-forward
 frontend/src/components/Analytics.tsx     | 44 +++++++++++++++++++------------
 frontend/src/components/SslConfig.tsx     | 22 ++++++++++++----
 frontend/src/components/StorageConfig.tsx | 42 ++++++++++++++++++++---------
 src/routes/admin.ts                       |  3 ++-
 4 files changed, 76 insertions(+), 35 deletions(-)
 Image projects-web Building 
 Image projects-api Building 
#1 [internal] load local bake definitions
#1 reading from stdin 958B done
#1 DONE 0.0s
#2 [api internal] load build definition from Dockerfile
#2 transferring dockerfile: 426B done
#2 DONE 0.0s
#3 [web internal] load build definition from Dockerfile
#3 transferring dockerfile: 293B done
#3 DONE 0.0s
#4 [web internal] load metadata for docker.io/library/node:22-alpine
#4 DONE 0.5s
#5 [api internal] load .dockerignore
#5 transferring context: 116B done
#5 DONE 0.0s
#6 [web internal] load .dockerignore
#6 transferring context: 80B done
#6 DONE 0.0s
#7 [api internal] load build context
#7 transferring context: 19.08kB done
#7 DONE 0.0s
#8 [api 1/6] FROM docker.io/library/node:22-alpine@sha256:968df39aedcea65eeb078fb336ed7191baf48f972b4479711397108be0966920
#8 resolve docker.io/library/node:22-alpine@sha256:968df39aedcea65eeb078fb336ed7191baf48f972b4479711397108be0966920 0.0s done
#8 DONE 0.0s
#9 [api builder 3/7] COPY package*.json ./
#9 CACHED
#10 [api builder 4/7] RUN npm ci
#10 CACHED
#11 [api builder 5/7] COPY tsconfig.json ./
#11 CACHED
#12 [web internal] load build context
#12 transferring context: 18.46kB done
#12 DONE 0.0s
#13 [web 3/6] COPY package*.json ./
#13 CACHED
#14 [web 2/6] WORKDIR /app
#14 CACHED
#15 [web 4/6] RUN npm ci
#15 CACHED
#16 [api builder 6/7] COPY src/ ./src/
#16 DONE 0.0s
#17 [web 5/6] COPY . .
#17 DONE 0.0s
#18 [web 6/6] RUN npm run build
#18 0.357 
#18 0.357 > frontend@0.1.0 build
#18 0.357 > next build
#18 0.357 
#18 ...
#19 [api builder 7/7] RUN npx tsx --no-warnings -e "console.log('build check passed')" 2>/dev/null || true
#19 1.294 build check passed
#19 DONE 1.4s
#20 [api stage-1 4/6] RUN npm ci --omit=dev
#20 CACHED
#21 [api stage-1 5/6] COPY --from=builder /app/src ./src
#21 DONE 0.0s
#22 [api stage-1 6/6] COPY tsconfig.json ./
#22 DONE 0.0s
#18 [web 6/6] RUN npm run build
#18 1.727 Attention: Next.js now collects completely anonymous telemetry regarding usage.
#18 1.727 This information is used to shape Next.js' roadmap and prioritize features.
#18 1.728 You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
#18 1.728 https://nextjs.org/telemetry
#18 1.728 
#18 ...
#23 [api] exporting to image
#23 exporting layers 0.1s done
#23 exporting manifest sha256:3e56caa18f89bf5f420fd2bef1b69fb18bb89f6844b7b6e0e2083af73d155a71 done
#23 exporting config sha256:2048c44b1b035bd4730ec99e04f939783efe8f98d808479e15255817fc3047cc done
#23 exporting attestation manifest sha256:11191ae56f71ddf3c3950aa15713268a34feedd943bd43fcace7a9b07598693c 0.0s done
#23 exporting manifest list sha256:d8b55aae3be8eefa304bb343101b01a2c9d6d852e0a7740321f222155b66087c done
#23 naming to docker.io/library/projects-api:latest done
#23 unpacking to docker.io/library/projects-api:latest 0.0s done
#23 DONE 0.2s
#18 [web 6/6] RUN npm run build
#18 1.874    ▲ Next.js 15.5.18
#18 1.874 
#18 ...
#24 [api] resolving provenance for metadata file
#24 DONE 0.0s
#18 [web 6/6] RUN npm run build
#18 1.979    Creating an optimized production build ...
#18 16.40  ✓ Compiled successfully in 11.1s
#18 16.40    Linting and checking validity of types ...
Dockerfile:12
#18 26.56 
--------------------
  10 |     
  11 |     # Build Next.js for production
  12 | >>> RUN npm run build
  13 |     
  14 |     EXPOSE 3000
--------------------
target web: failed to solve: process "/bin/sh -c npm run build" did not complete successfully: exit code: 1
#18 26.56 Failed to compile.
#18 26.56 
#18 26.56 ./src/app/files/page.tsx
#18 26.56 5:19  Warning: 'isText' is defined but never used.  @typescript-eslint/no-unused-vars
#18 26.56 38:56  Warning: React Hook useEffect has a missing dependency: 'router'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
#18 26.56 57:21  Warning: Error: Calling setState synchronously within an effect can trigger cascading renders
#18 26.56 
#18 26.56 Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
#18 26.56 * Update external systems with the latest state from React.
#18 26.56 * Subscribe for updates from some external system, calling setState in a callback function when external state changes.
#18 26.56 
#18 26.56 Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).
#18 26.56 
#18 26.56 /app/src/app/files/page.tsx:57:21
#18 26.56   55 |   }, [user, api]);
#18 26.56   56 |
#18 26.56 > 57 |   useEffect(() => { fetchFiles(1, search); }, [fetchFiles]);
#18 26.56      |                     ^^^^^^^^^^ Avoid calling setState() directly within an effect
#18 26.56   58 |
#18 26.56   59 |   // Keyboard shortcuts for lightbox
#18 26.56   60 |   useEffect(() => {  react-hooks/set-state-in-effect
#18 26.56 57:47  Warning: React Hook useEffect has a missing dependency: 'search'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
#18 26.56 
#18 26.56 ./src/app/settings/page.tsx
#18 26.56 12:56  Warning: React Hook useEffect has a missing dependency: 'router'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
#18 26.56 
#18 26.56 ./src/components/DbEditor.tsx
#18 26.56 21:7  Warning: Error: Calling setState synchronously within an effect can trigger cascading renders
#18 26.56 
#18 26.56 Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
#18 26.56 * Update external systems with the latest state from React.
#18 26.56 * Subscribe for updates from some external system, calling setState in a callback function when external state changes.
#18 26.56 
#18 26.56 Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).
#18 26.56 
#18 26.56 /app/src/components/DbEditor.tsx:21:7
#18 26.56   19 |   useEffect(() => {
#18 26.56   20 |     if (injectedSql) {
#18 26.56 > 21 |       setSqlQuery(injectedSql);
#18 26.56      |       ^^^^^^^^^^^ Avoid calling setState() directly within an effect
#18 26.56   22 |       onConsumed?.();
#18 26.56   23 |     }
#18 26.56   24 |   }, [injectedSql]);  react-hooks/set-state-in-effect
#18 26.56 24:6  Warning: React Hook useEffect has a missing dependency: 'onConsumed'. Either include it or remove the dependency array. If 'onConsumed' changes too often, find the parent component that defines it and wrap that definition in useCallback.  react-hooks/exhaustive-deps
#18 26.56 
#18 26.56 ./src/components/ImageGallery.tsx
#18 26.56 24:13  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
#18 26.56 
#18 26.56 ./src/components/Lightbox.tsx
#18 26.56 39:19  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
#18 26.56 39:19  Warning: img elements must have an alt prop, either with meaningful text, or an empty string for decorative images.  jsx-a11y/alt-text
#18 26.56 40:19  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
#18 26.56 40:19  Warning: img elements must have an alt prop, either with meaningful text, or an empty string for decorative images.  jsx-a11y/alt-text
#18 26.56 41:7  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
#18 26.56 
#18 26.56 ./src/components/SettingsPage.tsx
#18 26.56 14:39  Warning: '_token' is defined but never used.  @typescript-eslint/no-unused-vars
#18 26.56 14:47  Warning: 'user' is defined but never used.  @typescript-eslint/no-unused-vars
#18 26.56 27:6  Warning: React Hook useEffect has a missing dependency: 'apiFetch'. Either include it or remove the dependency array. If 'apiFetch' changes too often, find the parent component that defines it and wrap that definition in useCallback.  react-hooks/exhaustive-deps
#18 26.56 
#18 26.56 ./src/components/SslConfig.tsx
#18 26.56 29:28  Error: Compilation Skipped: Existing memoization could not be preserved
#18 26.56 
#18 26.56 React Compiler has skipped optimizing this component because the existing manual memoization could not be preserved. The inferred dependencies did not match the manually specified dependencies, which could cause the value to change more or less frequently than expected. The inferred dependency was `data.cert_expiry`, but the source dependencies were [data?.cert_expiry]. Inferred different dependency than source.
#18 26.56 
#18 26.56 /app/src/components/SslConfig.tsx:29:28
#18 26.56   27 |   }, []);
#18 26.56   28 |
#18 26.56 > 29 |   const daysLeft = useMemo(() => {
#18 26.56      |                            ^^^^^^^
#18 26.56 > 30 |     if (!data?.cert_expiry) return null;
#18 26.56      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
#18 26.56 > 31 |     return Math.ceil((new Date(data.cert_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
#18 26.56      | ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
#18 26.56 > 32 |   }, [data?.cert_expiry]);
#18 26.56      | ^^^^ Could not preserve existing manual memoization
#18 26.56   33 |
#18 26.56   34 |   if (loading) return <section className="card"><p className="text-sm text-zinc-500">Loading…</p></section>;
#18 26.56   35 |   if (!data) return <section className="card"><p className="text-sm text-red-400">Failed to load SSL info.</p></section>;  react-hooks/preserve-manual-memoization
#18 26.56 31:62  Error: Error: Cannot call impure function during render
#18 26.56 
#18 26.56 `Date.now` is an impure function. Calling an impure function can produce unstable results that update unpredictably when the component happens to re-render. (https://react.dev/reference/rules/components-and-hooks-must-be-pure#components-and-hooks-must-be-idempotent).
#18 26.56 
#18 26.56 /app/src/components/SslConfig.tsx:31:62
#18 26.56   29 |   const daysLeft = useMemo(() => {
#18 26.56   30 |     if (!data?.cert_expiry) return null;
#18 26.56 > 31 |     return Math.ceil((new Date(data.cert_expiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
#18 26.56      |                                                              ^^^^^^^^^^ Cannot call impure function
#18 26.56   32 |   }, [data?.cert_expiry]);
#18 26.56   33 |
#18 26.56   34 |   if (loading) return <section className="card"><p className="text-sm text-zinc-500">Loading…</p></section>;  react-hooks/purity
#18 26.56 
#18 26.56 ./src/components/StorageConfig.tsx
#18 26.56 41:21  Warning: Error: Calling setState synchronously within an effect can trigger cascading renders
#18 26.56 
#18 26.56 Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
#18 26.56 * Update external systems with the latest state from React.
#18 26.56 * Subscribe for updates from some external system, calling setState in a callback function when external state changes.
#18 26.56 
#18 26.56 Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).
#18 26.56 
#18 26.56 /app/src/components/StorageConfig.tsx:41:21
#18 26.56   39 |   }, [apiFetch]);
#18 26.56   40 |
#18 26.56 > 41 |   useEffect(() => { load(); }, [load]);
#18 26.56      |                     ^^^^ Avoid calling setState() directly within an effect
#18 26.56   42 |
#18 26.56   43 |   function startEdit() {
#18 26.56   44 |     setForm({  react-hooks/set-state-in-effect
#18 26.56 
#18 26.56 ./src/components/TableBrowser.tsx
#18 26.56 35:21  Warning: Error: Calling setState synchronously within an effect can trigger cascading renders
#18 26.56 
#18 26.56 Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
#18 26.56 * Update external systems with the latest state from React.
#18 26.56 * Subscribe for updates from some external system, calling setState in a callback function when external state changes.
#18 26.56 
#18 26.56 Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).
#18 26.56 
#18 26.56 /app/src/components/TableBrowser.tsx:35:21
#18 26.56   33 |   }
#18 26.56   34 |
#18 26.56 > 35 |   useEffect(() => { fetchTables(); }, [refreshKey]);
#18 26.56      |                     ^^^^^^^^^^^ Avoid calling setState() directly within an effect
#18 26.56   36 |
#18 26.56   37 |   async function loadTableData(tableName: string) {
#18 26.56   38 |     setTableLoading(true);  react-hooks/set-state-in-effect
#18 26.56 35:39  Warning: React Hook useEffect has a missing dependency: 'fetchTables'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
#18 26.56 
#18 26.56 ./src/components/UserManager.tsx
#18 26.56 51:21  Warning: Error: Calling setState synchronously within an effect can trigger cascading renders
#18 26.56 
#18 26.56 Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
#18 26.56 * Update external systems with the latest state from React.
#18 26.56 * Subscribe for updates from some external system, calling setState in a callback function when external state changes.
#18 26.56 
#18 26.56 Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).
#18 26.56 
#18 26.56 /app/src/components/UserManager.tsx:51:21
#18 26.56   49 |   }
#18 26.56   50 |
#18 26.56 > 51 |   useEffect(() => { fetchUsers(1, search); }, []);
#18 26.56      |                     ^^^^^^^^^^ Avoid calling setState() directly within an effect
#18 26.56   52 |
#18 26.56   53 |   function openEdit(u: User) {
#18 26.56   54 |     setEditId(u.id);  react-hooks/set-state-in-effect
#18 26.56 51:47  Warning: React Hook useEffect has missing dependencies: 'fetchUsers' and 'search'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps
#18 26.56 
#18 26.56 ./src/lib/api.tsx
#18 26.56 26:16  Warning: Error: Calling setState synchronously within an effect can trigger cascading renders
#18 26.56 
#18 26.56 Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
#18 26.56 * Update external systems with the latest state from React.
#18 26.56 * Subscribe for updates from some external system, calling setState in a callback function when external state changes.
#18 26.56 
#18 26.56 Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).
#18 26.56 
#18 26.56 /app/src/lib/api.tsx:26:16
#18 26.56   24 |   useEffect(() => {
#18 26.56   25 |     const saved = localStorage.getItem("shareit_token");
#18 26.56 > 26 |     if (saved) setToken(saved);
#18 26.56      |                ^^^^^^^^ Avoid calling setState() directly within an effect
#18 26.56   27 |   }, []);
#18 26.56   28 |
#18 26.56   29 |   // Validate token and fetch user  react-hooks/set-state-in-effect
#18 26.56 31:19  Warning: Error: Calling setState synchronously within an effect can trigger cascading renders
#18 26.56 
#18 26.56 Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
#18 26.56 * Update external systems with the latest state from React.
#18 26.56 * Subscribe for updates from some external system, calling setState in a callback function when external state changes.
#18 26.56 
#18 26.56 Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).
#18 26.56 
#18 26.56 /app/src/lib/api.tsx:31:19
#18 26.56   29 |   // Validate token and fetch user
#18 26.56   30 |   useEffect(() => {
#18 26.56 > 31 |     if (!token) { setUser(null); return; }
#18 26.56      |                   ^^^^^^^ Avoid calling setState() directly within an effect
#18 26.56   32 |     let cancelled = false;
#18 26.56   33 |     apiRaw(token, "/auth/me").then(async (r) => {
#18 26.56   34 |       if (cancelled) return;  react-hooks/set-state-in-effect
#18 26.56 
#18 26.56 info  - Need to disable some ESLint rules? Learn more here: https://nextjs.org/docs/app/api-reference/config/eslint#disabling-rules
#18 ERROR: process "/bin/sh -c npm run build" did not complete successfully: exit code: 1
------
 > [web 6/6] RUN npm run build:
26.56 /app/src/lib/api.tsx:31:19
26.56   29 |   // Validate token and fetch user
26.56   30 |   useEffect(() => {
26.56 > 31 |     if (!token) { setUser(null); return; }
26.56      |                   ^^^^^^^ Avoid calling setState() directly within an effect
26.56   32 |     let cancelled = false;
26.56   33 |     apiRaw(token, "/auth/me").then(async (r) => {
26.56   34 |       if (cancelled) return;  react-hooks/set-state-in-effect
26.56 
26.56 info  - Need to disable some ESLint rules? Learn more here: https://nextjs.org/docs/app/api-reference/config/eslint#disabling-rules
------
Total reclaimed space: 0B
✅ Deploy complete — https://***
===============================================
✅ Successfully executed commands to all hosts.
===============================================