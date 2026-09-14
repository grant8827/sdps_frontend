import type { ChildStatus } from '../types';

export const CHILD_STATUS_LABEL: Record<ChildStatus, string> = {
  AT_HOME: 'At Home',
  DROPOFF_REQUESTED: 'Drop-off Requested',
  PRESENT: 'Present',
  PICKUP_REQUESTED: 'Pick-up Requested',
  PICKED_UP: 'Picked Up',
};

export const CHILD_STATUS_COLOR: Record<ChildStatus, string> = {
  AT_HOME: '#9CA3AF',
  DROPOFF_REQUESTED: '#F59E0B',
  PRESENT: '#16A34A',
  PICKUP_REQUESTED: '#F59E0B',
  PICKED_UP: '#6B7280',
};
