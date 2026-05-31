'use client';
import React from 'react';

interface LoadingProps {
  message?: string;
  error?: string | null;
}

export function Loading({ message = 'Loading…', error }: LoadingProps) {
  if (error) {
    return (
      <div className="loading-error">
        <span className="loading-error-icon">!</span>
        <span>{error}</span>
      </div>
    );
  }
  return (
    <div className="loading-state">
      <span className="loading-spinner" />
      <span>{message}</span>
    </div>
  );
}
