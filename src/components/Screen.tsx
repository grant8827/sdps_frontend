import React from 'react';

interface ScreenProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

/** Shared layout shell so every screen looks consistent — ported from mobile_app's Screen. */
export function Screen({ title, subtitle, children }: ScreenProps) {
  return (
    <div className="screen">
      <h1 className="screen-title">{title}</h1>
      {subtitle ? <p className="screen-subtitle">{subtitle}</p> : null}
      <div className="screen-body">{children}</div>
    </div>
  );
}
