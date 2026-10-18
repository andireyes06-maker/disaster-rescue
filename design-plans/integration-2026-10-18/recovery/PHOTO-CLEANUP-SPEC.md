# Next repair: abandoned upload reconciliation

Proposed design, not implemented. Actual Cloudinary remains unconfigured locally.

The current uploader allocates provider IDs during upload and returns them afterwards. A crash between provider acceptance and the return/commit can leave assets whose identity was never saved. Deleting by elapsed time or by a report's temporary absence would risk an upload that is still being attached.

Required design:

1. Reserve unique, non-reused asset IDs and a minimal server-only ledger before sending bytes. Scope each to the submission owner/generation and reserved report ID. Preserve authenticated private delivery, validation and existing file limits. Do not store raw photos/contact text in the ledger.
2. Give the provider those pre-reserved IDs without overwrite. Record accepted upload metadata durably. A timeout/unknown outcome remains ambiguous rather than becoming a confirmed failure.
3. In the same report transaction, attach only assets owned by the winning generation and mark their ledger entries committed. A worker fenced out by a takeover must not attach an asset already scheduled for deletion.
4. A bounded cleanup worker may lease abandoned entries only after transactional checks show that no winning report references them and that the original attempt can no longer commit them. Keep cleanup retries durable when provider destruction fails.
5. Late provider completion matters: a deletion returning “not found” while an earlier upload is still in flight must not permanently complete cleanup. Define bounded upload cancellation/timeouts plus reconciliation for unknown/late results. Unique IDs must never be reused, and uncertain cleanup tombstones must not be expired prematurely.
6. Existing untracked historical assets need an explicit inventory/migration policy; do not bulk-delete them in this task.

Acceptance: crash before upload, during unknown upload, after provider acceptance before response, before report commit, and after report commit; stale worker after takeover; losing-versus-winning assets; provider destroy failure and later recovery; late upload after an initial not-found delete; concurrent cleanup workers; read/write denial from all client roles. Use a fake provider to inject failures, real Firestore for ownership/commit decisions, then non-production Cloudinary to verify actual public IDs/private URLs/delete behavior. Keep simulated evidence distinct.

No production assets, credentials or policy decisions are authorized here. This design does not close the real-upload or retention-policy gates.
