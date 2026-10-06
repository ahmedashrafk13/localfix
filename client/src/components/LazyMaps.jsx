import { lazy, Suspense } from 'react';
import { Skeleton } from './ui/States.jsx';

const Maps = {
  LocationMap: lazy(() => import('./Maps.jsx').then((m) => ({ default: m.LocationMap }))),
  LocationPicker: lazy(() => import('./Maps.jsx').then((m) => ({ default: m.LocationPicker }))),
  RequestsMap: lazy(() => import('./Maps.jsx').then((m) => ({ default: m.RequestsMap }))),
};

function withFallback(Component, height) {
  return function Wrapped(props) {
    return (
      <Suspense fallback={<Skeleton className={`${props.className || height} w-full rounded-card`} />}>
        <Component {...props} />
      </Suspense>
    );
  };
}

export const LocationMap = withFallback(Maps.LocationMap, 'h-64');
export const LocationPicker = withFallback(Maps.LocationPicker, 'h-72');
export const RequestsMap = withFallback(Maps.RequestsMap, 'h-[32rem]');
