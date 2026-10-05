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
  DROPOFF_REQUESTED: '#F5B82E',
  PRESENT: '#39A844',
  PICKUP_REQUESTED: '#F5B82E',
  PICKED_UP: '#39A844',
};

// Brand palette: blue = action, green = arrived/present/picked up, amber =
// waiting on someone, red = warnings only. White text is unreadable on
// Warm Amber, so the waiting statuses use Deep Trust Blue text.
export const CHILD_STATUS_TEXT_COLOR: Record<ChildStatus, string> = {
  AT_HOME: '#FFFFFF',
  DROPOFF_REQUESTED: '#123B6D',
  PRESENT: '#FFFFFF',
  PICKUP_REQUESTED: '#123B6D',
  PICKED_UP: '#FFFFFF',
};
