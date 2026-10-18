import Brand from './Brand';
import { Skeleton, SkeletonRows } from './calm/Skeleton';

export default function PageLoading({ label = 'Loading page…' }: { label?: string }) {
  return <main className="route-loading" tabIndex={-1}>
    <div className="route-loading__brand"><Brand /></div>
    <Skeleton label={label}>
      <p className="route-loading__label">{label}</p>
      <SkeletonRows rows={3} height={56} />
    </Skeleton>
  </main>;
}
