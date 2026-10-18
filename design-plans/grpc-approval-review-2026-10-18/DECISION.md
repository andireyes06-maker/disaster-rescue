# gRPC follow-up review and decision — 18 October 2026

## Decision

Approve **@grpc/grpc-js 1.14.5** for the web package, with reproducible lockfile regeneration and a fresh isolated npm ci verification before transferring the reviewed package changes into the integration. Do not blindly delete a nested lockfile record or change otherwise-clean API/rules dependency trees. Record the resulting npm ls dependency tree and npm audit output, then rerun the web checks and affected end-to-end checks. Preserve the production-only emulator guard. No commit, push, merge or deployment is authorized.

Unkeyed uploads remain accepted with a server-generated internal attempt identity. This decision was already approved; it does not promise client retry deduplication. Unresolved reconciliation records remain durable with capped daily rechecks and count/age/call visibility.

## Additional direct evidence from this review

The earlier rules experiment used Firestore4.8.0 through Firebase11.10.0, whereas the web app uses Firestore4.18.0 through Firebase13.0.0. Browser checks do not exercise gRPC. To close that narrower gap, this review loaded the exact isolated web installation with grpc-js1.14.5 in Node and connected explicitly to the local demo-full-audit-2026-10-18 Auth9799/Firestore8690 emulators.

Five checks passed: emulator sign-in, own-profile server read, permission denial on another account's profile, server query listener, and a server read after disabling/enabling networking. HTTP/2 instrumentation recorded actual `/google.firestore.v1.Firestore/Listen` RPCs. It recorded paths only, not authorization metadata or report content. Source package versions and call records are in node-sdk-http2.json. No hosted Firestore/Auth, TLS/certificate-server configuration, physical device or production behavior was tested.

The first probe attempted to instrument Client prototype methods, but gRPC generated clients capture requester functions when make-client.js loads. Functional checks passed but that probe could not establish transport use, so it correctly marked itself failed. The corrected HTTP/2 instrumentation established the transport and passed. Both raw results are retained; the first is a harness limitation, not an SDK failure.

## End-to-end selector baseline

A read-only browser check against the current integration dev server with no override reproduced the ambiguity: getByLabel('Password') matches two elements, while getByLabel('Password', {exact:true}) matches exactly one visible field. This establishes that this selector failure occurs without the override; it is not a demonstrated dependency regression. Fix the existing login smoke selector and rerun the real spec. This review did not change the selector or rerun the entire e2e suite. Temporary syntax-error harness output was corrected before the successful check; no product edit resulted.

## Scope

No integration source, package manifest or lockfile was edited by this review. The integration still has no overrides. Broader 497-web /424-API /159-rules /20-adapter results are the continuation author's experiment evidence, not rerun here. The additional direct Node and baseline-selector probes above are independent. Keep provider, hosted, cross-browser, native-device/release, hotline/privacy and retention gates open.
