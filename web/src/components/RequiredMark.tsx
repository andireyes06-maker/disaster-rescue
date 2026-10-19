export default function RequiredMark() {
  return <span className="required-mark" aria-hidden="true" />;
}

export function RequiredNote() {
  return <p className="required-note"><RequiredMark /> Required</p>;
}
