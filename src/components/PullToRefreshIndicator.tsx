import { forwardRef } from 'react';
import type { PullToRefreshState } from '../utils/usePullToRefresh';

interface Props {
  state: PullToRefreshState;
}

export const PullToRefreshIndicator = forwardRef<HTMLDivElement, Props>(
  function PullToRefreshIndicator({ state }, ref) {
    const { armed, refreshing } = state;

    return (
      <div ref={ref} aria-hidden="true" className="pull-refresh-indicator">
        <div className={`ptr-pill ${armed ? 'armed' : ''} ${refreshing ? 'refreshing' : ''}`}>
          <svg
            className={`ptr-icon ${refreshing ? 'spin' : ''}`}
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          <span>
            {refreshing ? 'Syncing…' : armed ? 'Release to sync' : 'Pull to sync'}
          </span>
        </div>
      </div>
    );
  }
);
