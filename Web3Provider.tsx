
import React from 'react';
import '@rainbow-me/rainbowkit/styles.css';
import {
  getDefaultConfig,
  RainbowKitProvider,
  darkTheme,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import { defineChain } from 'viem';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";

// Define Arc Testnet custom chain
export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'USDC',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: { http: ['https://5042002.rpc.thirdweb.com'] },
  },
  blockExplorers: {
    default: { name: 'Arc Explorer', url: 'https://explorer.arc.io' },
  },
  testnet: true,
});

const config = getDefaultConfig({
  appName: 'ARC Drift',
  projectId: '044601f6521483247d5399c689183002', // Public placeholder
  chains: [arcTestnet],
  ssr: false,
});

const queryClient = new QueryClient();

export const Web3Provider = ({ children }: { children: React.ReactNode }) => {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={darkTheme({
          accentColor: '#8B5CF6',
          accentColorForeground: 'white',
          borderRadius: 'large',
          overlayBlur: 'small',
        })}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
};
