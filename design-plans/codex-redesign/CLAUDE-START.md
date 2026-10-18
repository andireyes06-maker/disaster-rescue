Continue work on `/Users/rien/Documents/FINAL_PROJECT` for Airen. Codex has implemented the web and Flutter redesign; inspect the current product instead of restarting from old audit prompts.

Latest change: read `design-plans/codex-redesign/NOTIFICATION-BELL-HANDOFF.md`. Resident notifications now live behind a header bell; preserve this and keep the long notification card off the dashboard.

Also read `design-plans/codex-redesign/MOTION-IMPLEMENTATION.md`: Airen requested a dynamic website, and the page/notification/landing motion is now implemented. Preserve it while continuing verification.

Latest: read `design-plans/codex-redesign/STATE-MOTION-HANDOFF.md` for shared UI state motion, including registration error text, form repositioning, messages, and dialog exits/focus.

Read `AGENTS.md` if present, `PRODUCT.md`, root `DESIGN.md`, `design-plans/CODEX-IMPLEMENTATION-SPEC.md`, and `design-plans/codex-redesign/HANDOFF.md` first. Then open the final screenshots and inspect `http://localhost:5174/` yourself. The handoff distinguishes completed implementation, checked behavior, and remaining gaps.

Use the installed design/frontend, Impeccable, accessibility, motion/performance, and Flutter skills relevant to each task. Read their actual instructions; report unavailable tooling honestly. Preserve existing auth/provisioning, role guards, API/rules, demo isolation, and draft/recovery fixes. The working tree contains earlier Claude work too; never reset it wholesale.

Start with an independent regression review across public, resident, staff/admin, and native surfaces. Verify remaining real-device behavior if a device is available. Inspect loading, empty, validation, failure, retry, keyboard, contrast, reduced motion, responsive layout, long content, and authorization states. Fix concrete findings, keep evidence, and rerun checks appropriate to the changes. Use local emulators and fake data for mutations; never invent operational information or treat samples as live incidents.

Keep the implemented direction unless Airen requests a new one. This is an entire-product continuation, so do not stop after one dashboard or one milestone and imply the rest is done. Be explicit about unverified behavior. Do not commit, push, deploy, or alter production without Airen's instruction.
