
import React from 'react';
import { Clock, Waves, Ban, Repeat, Users } from 'lucide-react';
import { DriftType } from './types';

export const DRIFT_CONFIG = {
  [DriftType.DELAYED]: {
    label: 'Delayed Transfer',
    description: 'Release full amount after a fixed delay',
    icon: <Clock className="w-5 h-5" />,
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/30'
  },
  [DriftType.STREAMING]: {
    label: 'Streaming Payment',
    description: 'Gradually release funds over time',
    icon: <Waves className="w-5 h-5" />,
    color: 'text-cyan-400',
    bg: 'bg-cyan-400/10',
    border: 'border-cyan-400/30'
  },
  [DriftType.CANCELABLE]: {
    label: 'Cancelable Transfer',
    description: 'Executes unless canceled before deadline',
    icon: <Ban className="w-5 h-5" />,
    color: 'text-purple-400',
    bg: 'bg-purple-400/10',
    border: 'border-purple-400/30'
  },
  [DriftType.RECURRING]: {
    label: 'Recurring Payment',
    description: 'Periodic micro-payments (Weekly)',
    icon: <Repeat className="w-5 h-5" />,
    color: 'text-pink-400',
    bg: 'bg-pink-400/10',
    border: 'border-pink-400/30'
  }
};

export const MOCK_WALLET_ADDRESS = "0xArc...7drift";
export const ARC_TESTNET_EXPLORER = "https://explorer.arc.io/tx/";
