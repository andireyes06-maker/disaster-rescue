# Technical walkthrough

The final delivery includes `Rescue-Reports-Technical-Walkthrough.mp4` and matching SRT captions. Narration uses the macOS Samantha synthetic voice, explicitly disclosed in the video and script. Fictional accounts and incidents run against the dedicated local API/Auth/Firestore stack. No real resident data or production credentials appear.

`NARRATION.md` contains the spoken explanation. It covers technologies, all five roles, the resident-to-dispatcher-to-responder workflow, live updates, closure, monitoring/admin, Flutter scope, database relationships, reliability/access challenges, verification limits and submission requirements. Real member participation and contribution confirmation remain owner tasks.

`capture-workflow.cjs` records actual web interactions and verifies the final Closed result through the API. The complete local rehearsal passed with no page exceptions. Source footage includes actual submit, verify, assign, acknowledge, progress, resolve and close operations on fictional data. Video segments are edited excerpts; static scenes explain architecture and limits. Phrase captions use approximate boundaries.

`build-walkthrough.py` is the rendering source retained from the preparation environment; its absolute scratch paths identify the evidence inputs and must be adjusted to re-render elsewhere. The delivery MP4 is standalone. The older `Flutter-Chrome-Preview.mp4` is historical silent support footage, not the narrated final.

The user guide uses current Flutter Chrome screenshots; its notification image is an explicitly identified widget fixture. Android emulator checks and physical-phone limits are documented in the final verification record.

Output follow-up: earlier monitor/admin/analytics screenshots caught loading states. The capture harness now waits for content and visible skeleton dismissal, then specific data controls. A full local workflow rerun passed, and the affected screenshots and video excerpts were replaced. Current report screenshots come from the dated output appendix. Set RESCUE_REHEARSAL_DIR and RESCUE_MEDIA_WORK when rebuilding the video.
