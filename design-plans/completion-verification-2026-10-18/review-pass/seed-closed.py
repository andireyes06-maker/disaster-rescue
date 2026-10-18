import json, urllib.request
BASE = "http://127.0.0.1:8690/v1/projects/demo-full-audit-2026-10-18/databases/(default)/documents"
H = {"Authorization": "Bearer owner", "content-type": "application/json"}
def send(method, path, body):
    req = urllib.request.Request(f"{BASE}/{path}", data=json.dumps(body).encode(), headers=H, method=method)
    with urllib.request.urlopen(req) as r: return json.load(r)
def ts(s): return {"timestampValue": s}
def s(v): return {"stringValue": v}
RID = "closed-render-alpha-1"
base_t = "2026-10-18T06:00:00Z"
report = {"fields": {
  "reference": s("DR-CLOSED1"), "type": s("flood"), "description": s("Flooded street near the market; two families need transport."),
  "addressText": s("Market Road, sample barangay"), "reporterId": s("demo-resident-a"), "assignedTeamId": s("demo-team-alpha"),
  "status": s("Closed"), "priority": s("high"), "verified": {"booleanValue": True}, "photos": {"arrayValue": {"values": []}},
  "location": {"mapValue": {"fields": {"lat": {"doubleValue": 14.5995}, "lng": {"doubleValue": 120.9842}, "source": s("manual")}}},
  "coarseLocation": {"mapValue": {"fields": {"lat": {"doubleValue": 14.6}, "lng": {"doubleValue": 120.98}}}},
  "createdAt": ts(base_t), "updatedAt": ts("2026-10-18T14:00:00Z"), "assignedAt": ts("2026-10-18T06:30:00Z")}}
send("PATCH", f"reports/{RID}", report)
for i in range(1, 25):
    kind = "acknowledge" if i % 4 == 0 else "update"
    at = f"2026-10-18T{6 + i // 4:02d}:{(i * 7) % 60:02d}:00Z"
    fields = {"kind": s(kind), "status": s("Rescue in Progress" if kind == "update" else "Team Assigned"),
              "at": ts(at), "actorUid": s("demo-responder-a"), "note": s(f"Crew update {i}: checked the road and reached household {i}.")}
    if kind == "update": fields["peopleRescued"] = {"integerValue": str(i % 3)}
    send("PATCH", f"reports/{RID}/updates/u{i:02d}", {"fields": fields})
print("seeded", RID)
