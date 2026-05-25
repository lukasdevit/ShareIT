Run appleboy/ssh-action@v1
Run echo "$GITHUB_ACTION_PATH" >> $GITHUB_PATH
Run entrypoint.sh
Downloading drone-ssh-1.8.2-linux-amd64 from https://github.com/appleboy/drone-ssh/releases/download/v1.8.2
======= CLI Version Information =======
Drone SSH version 1.8.2
=======================================
From github.com:lukasdevit/projectS
 * branch            main       -> FETCH_HEAD
   f3e09c5..3c08d7a  main       -> origin/main
Updating f3e09c5..3c08d7a
Fast-forward
 error.md                              | 314 ++++++++++++++++++++++++++++++++++
 frontend/src/components/SslConfig.tsx |  11 +-
 2 files changed, 320 insertions(+), 5 deletions(-)
 create mode 100644 error.md
 Image projects-api Building 
 Image projects-web Building 
#1 [internal] load local bake definitions
#1 reading from stdin 958B done
#1 DONE 0.0s
#2 [web internal] load build definition from Dockerfile
#2 transferring dockerfile: 293B done
#2 DONE 0.0s
#3 [api internal] load build definition from Dockerfile
#3 transferring dockerfile: 426B done
#3 DONE 0.0s
#4 [api internal] load metadata for docker.io/library/node:22-alpine
#4 DONE 0.4s
#5 [web internal] load .dockerignore
#5 transferring context: 80B done
#5 DONE 0.0s
#6 [api internal] load .dockerignore
#6 transferring context: 116B done
#6 DONE 0.0s
#7 [api internal] load build context
#7 transferring context: 1.06kB done
#7 DONE 0.0s
#8 [api builder 1/7] FROM docker.io/library/node:22-alpine@sha256:968df39aedcea65eeb078fb336ed7191baf48f972b4479711397108be0966920
#8 resolve docker.io/library/node:22-alpine@sha256:968df39aedcea65eeb078fb336ed7191baf48f972b4479711397108be0966920 0.0s done
#8 DONE 0.0s
#9 [web internal] load build context
#9 transferring context: 5.32kB done
#9 DONE 0.0s
#10 [api builder 6/7] COPY src/ ./src/
#10 CACHED
#11 [api stage-1 5/6] COPY --from=builder /app/src ./src
#11 CACHED
#12 [api builder 3/7] COPY package*.json ./
#12 CACHED
#13 [api stage-1 4/6] RUN npm ci --omit=dev
#13 CACHED
#14 [api builder 4/7] RUN npm ci
#14 CACHED
#15 [api builder 5/7] COPY tsconfig.json ./
#15 CACHED
#16 [api builder 7/7] RUN npx tsx --no-warnings -e "console.log('build check passed')" 2>/dev/null || true
#16 CACHED
#17 [api stage-1 6/6] COPY tsconfig.json ./
#17 CACHED
#18 [web 3/6] COPY package*.json ./
#18 CACHED
#19 [web builder 2/7] WORKDIR /app
#19 CACHED
#20 [web 4/6] RUN npm ci
#20 CACHED
#21 [web 5/6] COPY . .
#21 DONE 0.0s
#22 [api] exporting to image
#22 exporting layers 0.0s done
#22 exporting manifest sha256:3e56caa18f89bf5f420fd2bef1b69fb18bb89f6844b7b6e0e2083af73d155a71 done
#22 exporting config sha256:2048c44b1b035bd4730ec99e04f939783efe8f98d808479e15255817fc3047cc done
#22 exporting attestation manifest sha256:b2c0bcc4d75ebf15ff41f34de1bd8402bb383c6db627369938fab740327cefae 0.0s done
#22 exporting manifest list sha256:ec423920aa4acaf8132a42c2b4fe0c0bf242fc2bcc470fe878e7abbbf4dc8d4b
#22 exporting manifest list sha256:ec423920aa4acaf8132a42c2b4fe0c0bf242fc2bcc470fe878e7abbbf4dc8d4b done
#22 naming to docker.io/library/projects-api:latest done
#22 unpacking to docker.io/library/projects-api:latest 0.0s done
#22 DONE 0.1s
#23 [api] resolving provenance for metadata file
#23 DONE 0.0s
#24 [web 6/6] RUN npm run build
#24 0.332 
#24 0.332 > frontend@0.1.0 build
#24 0.332 > next build
#24 0.332 
#24 1.464 Attention: Next.js now collects completely anonymous telemetry regarding usage.
#24 1.465 This information is used to shape Next.js' roadmap and prioritize features.
#24 1.465 You can learn more, including how to opt-out if you'd not like to participate in this anonymous program, by visiting the following URL:
#24 1.465 https://nextjs.org/telemetry
#24 1.465 
#24 1.597    ▲ Next.js 15.5.18
#24 1.597 
#24 1.731    Creating an optimized production build ...
#24 17.26  ✓ Compiled successfully in 12.1s
#24 17.27    Linting and checking validity of types ...
#24 27.18 
#24 27.18 ./src/app/files/page.tsx
#24 27.18 5:19  Warning: 'isText' is defined but never used.  @typescript-eslint/no-unused-vars
#24 27.18 38:56  Warning: React Hook useEffect has a missing dependency: 'router'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
#24 27.18 57:21  Warning: Error: Calling setState synchronously within an effect can trigger cascading renders
#24 27.18 
#24 27.18 Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
#24 27.18 * Update external systems with the latest state from React.
#24 27.18 * Subscribe for updates from some external system, calling setState in a callback function when external state changes.
#24 27.18 
#24 27.18 Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).
#24 27.18 
#24 27.18 /app/src/app/files/page.tsx:57:21
#24 27.18   55 |   }, [user, api]);
#24 27.18   56 |
#24 27.18 > 57 |   useEffect(() => { fetchFiles(1, search); }, [fetchFiles]);
#24 27.18      |                     ^^^^^^^^^^ Avoid calling setState() directly within an effect
#24 27.18   58 |
#24 27.18   59 |   // Keyboard shortcuts for lightbox
#24 27.18   60 |   useEffect(() => {  react-hooks/set-state-in-effect
#24 27.18 57:47  Warning: React Hook useEffect has a missing dependency: 'search'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
#24 27.18 
#24 27.18 ./src/app/settings/page.tsx
#24 27.18 12:56  Warning: React Hook useEffect has a missing dependency: 'router'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
#24 27.18 
#24 27.18 ./src/components/DbEditor.tsx
#24 27.18 21:7  Warning: Error: Calling setState synchronously within an effect can trigger cascading renders
#24 27.18 
#24 27.18 Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
#24 27.18 * Update external systems with the latest state from React.
#24 27.18 * Subscribe for updates from some external system, calling setState in a callback function when external state changes.
#24 27.18 
#24 27.18 Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).
#24 27.18 
#24 27.18 /app/src/components/DbEditor.tsx:21:7
#24 27.18   19 |   useEffect(() => {
#24 27.18   20 |     if (injectedSql) {
#24 27.18 > 21 |       setSqlQuery(injectedSql);
#24 27.18      |       ^^^^^^^^^^^ Avoid calling setState() directly within an effect
#24 27.18   22 |       onConsumed?.();
#24 27.18   23 |     }
#24 27.18   24 |   }, [injectedSql]);  react-hooks/set-state-in-effect
#24 27.18 24:6  Warning: React Hook useEffect has a missing dependency: 'onConsumed'. Either include it or remove the dependency array. If 'onConsumed' changes too often, find the parent component that defines it and wrap that definition in useCallback.  react-hooks/exhaustive-deps
#24 27.18 
#24 27.18 ./src/components/ImageGallery.tsx
#24 27.18 24:13  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
#24 27.18 
#24 27.18 ./src/components/Lightbox.tsx
#24 27.18 39:19  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
#24 27.18 39:19  Warning: img elements must have an alt prop, either with meaningful text, or an empty string for decorative images.  jsx-a11y/alt-text
#24 27.18 40:19  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
#24 27.18 40:19  Warning: img elements must have an alt prop, either with meaningful text, or an empty string for decorative images.  jsx-a11y/alt-text
#24 27.18 41:7  Warning: Using `<img>` could result in slower LCP and higher bandwidth. Consider using `<Image />` from `next/image` or a custom image loader to automatically optimize images. This may incur additional usage or cost from your provider. See: https://nextjs.org/docs/messages/no-img-element  @next/next/no-img-element
#24 27.18 
#24 27.18 ./src/components/SettingsPage.tsx
#24 27.18 14:39  Warning: '_token' is defined but never used.  @typescript-eslint/no-unused-vars
#24 27.18 14:47  Warning: 'user' is defined but never used.  @typescript-eslint/no-unused-vars
#24 27.18 27:6  Warning: React Hook useEffect has a missing dependency: 'apiFetch'. Either include it or remove the dependency array. If 'apiFetch' changes too often, find the parent component that defines it and wrap that definition in useCallback.  react-hooks/exhaustive-deps
#24 27.18 
#24 27.18 ./src/components/StorageConfig.tsx
#24 27.18 41:21  Warning: Error: Calling setState synchronously within an effect can trigger cascading renders
#24 27.18 
#24 27.18 Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
#24 27.18 * Update external systems with the latest state from React.
#24 27.18 * Subscribe for updates from some external system, calling setState in a callback function when external state changes.
#24 27.18 
#24 27.18 Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).
#24 27.18 
#24 27.18 /app/src/components/StorageConfig.tsx:41:21
#24 27.18   39 |   }, [apiFetch]);
#24 27.18   40 |
#24 27.18 > 41 |   useEffect(() => { load(); }, [load]);
#24 27.18      |                     ^^^^ Avoid calling setState() directly within an effect
#24 27.18   42 |
#24 27.18   43 |   function startEdit() {
#24 27.18   44 |     setForm({  react-hooks/set-state-in-effect
#24 27.18 
#24 27.18 ./src/components/TableBrowser.tsx
#24 27.18 35:21  Warning: Error: Calling setState synchronously within an effect can trigger cascading renders
#24 27.18 
#24 27.18 Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
#24 27.18 * Update external systems with the latest state from React.
#24 27.18 * Subscribe for updates from some external system, calling setState in a callback function when external state changes.
#24 27.18 
#24 27.18 Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).
#24 27.18 
#24 27.18 /app/src/components/TableBrowser.tsx:35:21
#24 27.18   33 |   }
#24 27.18   34 |
#24 27.18 > 35 |   useEffect(() => { fetchTables(); }, [refreshKey]);
#24 27.18      |                     ^^^^^^^^^^^ Avoid calling setState() directly within an effect
#24 27.18   36 |
#24 27.18   37 |   async function loadTableData(tableName: string) {
#24 27.18   38 |     setTableLoading(true);  react-hooks/set-state-in-effect
#24 27.18 35:39  Warning: React Hook useEffect has a missing dependency: 'fetchTables'. Either include it or remove the dependency array.  react-hooks/exhaustive-deps
#24 27.18 
#24 27.18 ./src/components/UserManager.tsx
#24 27.18 51:21  Warning: Error: Calling setState synchronously within an effect can trigger cascading renders
#24 27.18 
#24 27.18 Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
#24 27.18 * Update external systems with the latest state from React.
#24 27.18 * Subscribe for updates from some external system, calling setState in a callback function when external state changes.
#24 27.18 
#24 27.18 Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).
#24 27.18 
#24 27.18 /app/src/components/UserManager.tsx:51:21
#24 27.18   49 |   }
#24 27.18   50 |
#24 27.18 > 51 |   useEffect(() => { fetchUsers(1, search); }, []);
#24 27.18      |                     ^^^^^^^^^^ Avoid calling setState() directly within an effect
#24 27.18   52 |
#24 27.18   53 |   function openEdit(u: User) {
#24 27.18   54 |     setEditId(u.id);  react-hooks/set-state-in-effect
#24 27.18 51:47  Warning: React Hook useEffect has missing dependencies: 'fetchUsers' and 'search'. Either include them or remove the dependency array.  react-hooks/exhaustive-deps
#24 27.18 
#24 27.18 ./src/lib/api.tsx
#24 27.18 26:16  Warning: Error: Calling setState synchronously within an effect can trigger cascading renders
#24 27.18 
#24 27.18 Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
#24 27.18 * Update external systems with the latest state from React.
#24 27.18 * Subscribe for updates from some external system, calling setState in a callback function when external state changes.
#24 27.18 
#24 27.18 Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).
#24 27.18 
#24 27.18 /app/src/lib/api.tsx:26:16
#24 27.18   24 |   useEffect(() => {
#24 27.18   25 |     const saved = localStorage.getItem("shareit_token");
#24 27.18 > 26 |     if (saved) setToken(saved);
#24 27.18      |                ^^^^^^^^ Avoid calling setState() directly within an effect
#24 27.18   27 |   }, []);
#24 27.18   28 |
#24 27.18   29 |   // Validate token and fetch user  react-hooks/set-state-in-effect
#24 27.18 31:19  Warning: Error: Calling setState synchronously within an effect can trigger cascading renders
#24 27.18 
#24 27.18 Effects are intended to synchronize state between React and external systems such as manually updating the DOM, state management libraries, or other platform APIs. In general, the body of an effect should do one or both of the following:
#24 27.18 * Update external systems with the latest state from React.
#24 27.18 * Subscribe for updates from some external system, calling setState in a callback function when external state changes.
#24 27.18 
#24 27.18 Calling setState synchronously within an effect body causes cascading renders that can hurt performance, and is not recommended. (https://react.dev/learn/you-might-not-need-an-effect).
#24 27.18 
#24 27.18 /app/src/lib/api.tsx:31:19
#24 27.18   29 |   // Validate token and fetch user
#24 27.18   30 |   useEffect(() => {
#24 27.18 > 31 |     if (!token) { setUser(null); return; }
#24 27.18      |                   ^^^^^^^ Avoid calling setState() directly within an effect
#24 27.18   32 |     let cancelled = false;
#24 27.18   33 |     apiRaw(token, "/auth/me").then(async (r) => {
#24 27.18   34 |       if (cancelled) return;  react-hooks/set-state-in-effect
#24 27.18 
#24 27.18 info  - Need to disable some ESLint rules? Learn more here: https://nextjs.org/docs/app/api-reference/config/eslint#disabling-rules
#24 27.18    Collecting page data ...
#24 29.24    Generating static pages (0/8) ...
#24 30.35    Generating static pages (2/8) 
#24 30.37    Generating static pages (4/8) 
#24 30.37    Generating static pages (6/8) 
#24 30.37  ✓ Generating static pages (8/8)
#24 31.09    Finalizing page optimization ...
#24 31.09    Collecting build traces ...
#24 38.30 
#24 38.30 Route (app)                                 Size  First Load JS
#24 38.30 ┌ ○ /                                    1.77 kB         104 kB
#24 38.30 ├ ○ /_not-found                            991 B         103 kB
#24 38.30 ├ ○ /admin                               7.75 kB         110 kB
#24 38.30 ├ ○ /files                               17.9 kB         120 kB
#24 38.30 └ ○ /settings                            2.42 kB         105 kB
#24 38.30 + First Load JS shared by all             102 kB
#24 38.30   ├ chunks/255-4f84124391a7dac4.js       46.2 kB
#24 38.30   ├ chunks/4bd1b696-c023c6e3521b1417.js  54.2 kB
#24 38.30   └ other shared chunks (total)          1.92 kB
#24 38.30 
#24 38.30 
#24 38.30 ○  (Static)  prerendered as static content
#24 38.30 
#24 DONE 38.4s
#25 [web] exporting to image
#25 exporting layers
#25 exporting layers 1.3s done
#25 exporting manifest sha256:d1730f7062a509bd9686cc523a7d828ef1061a41b53b48d9f8b525ff5d990a83
#25 exporting manifest sha256:d1730f7062a509bd9686cc523a7d828ef1061a41b53b48d9f8b525ff5d990a83 done
#25 exporting config sha256:ccf0f975d17b7999b58da8ecab546e56c007200e0dedd80be431959756ce9577 done
#25 exporting attestation manifest sha256:3170447927f4d93570adcbd531e8454335ab993b3ce9edd643fae54dcd9566ff done
#25 exporting manifest list sha256:98697ffc942d46c5865ec6b87dfe7ce1b0b88448642f7d9c0bf9aaab721c59aa done
#25 naming to docker.io/library/projects-web:latest done
#25 unpacking to docker.io/library/projects-web:latest
#25 unpacking to docker.io/library/projects-web:latest 0.3s done
#25 DONE 1.7s
#26 [web] resolving provenance for metadata file
#26 DONE 0.0s
 Image projects-api Built 
 Image projects-web Built 
 Container projects-caddy-1 Running 
 Container projects-api-1 Recreate 
 Container projects-web-1 Recreate 
 Container projects-web-1 Recreated 
 Container projects-api-1 Recreated 
 Container projects-api-1 Starting 
 Container projects-web-1 Starting 
 Container projects-web-1 Started 
 Container projects-api-1 Started 
Total reclaimed space: 0B
✅ Deploy complete — https://***
===============================================
✅ Successfully executed commands to all hosts.
===============================================