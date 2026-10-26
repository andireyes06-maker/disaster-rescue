export interface Position {
  lat: number;
  lng: number;
}

// The responder's current position from the browser. The API refuses acknowledgements and updates
// that do not come from within the incident's reach, so this must succeed before the action is sent.
export function currentPosition(timeoutMs = 15_000): Promise<Position> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('location_unavailable'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
      () => reject(new Error('location_unavailable')),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 30_000 },
    );
  });
}
