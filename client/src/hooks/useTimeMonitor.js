import { useEffect } from 'react';

export const useTimeMonitor = (tasks, onRefresh) => {
  useEffect(() => {
    // No automatic deadline status logic or auto-refresh triggers.
  }, [tasks, onRefresh]);
};

export default useTimeMonitor;
