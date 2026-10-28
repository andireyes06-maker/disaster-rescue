// The one shape an account is shown in to its owner. It never carries the stored photo record (publicId)
// or any other internal field, only the delivery URL of the profile photo.
export function userView(user) {
  return {
    uid: user.uid,
    name: user.name ?? null,
    email: user.email ?? null,
    phone: user.phone ?? null,
    role: user.role ?? null,
    active: user.active === true,
    photoUrl: user.photo?.url ?? null,
  };
}
