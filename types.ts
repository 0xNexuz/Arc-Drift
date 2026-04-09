
export enum DriftType {
  DELAYED = 'DELAYED',
  STREAMING = 'STREAMING',
  CANCELABLE = 'CANCELABLE',
  RECURRING = 'RECURRING'
}

export enum DriftStatus {
  PENDING = 'PENDING',
  STREAMING = 'STREAMING',
  EXECUTED = 'EXECUTED',
  CANCELED = 'CANCELED'
}

export interface DriftRule {
  id: string;
  sender: string;
  recipient: string;
  amount: number;
  withdrawn: number;
  startTime: number;
  endTime: number;
  type: DriftType;
  status: DriftStatus;
  createdAt: number;
  label?: string;
}

export interface DriftStats {
  totalValueLocked: number;
  activeDrifts: number;
  totalVolume: number;
  longestDriftDays: number;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}
