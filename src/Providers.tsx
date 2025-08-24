// @noErrors: 2307 2580 2339 - cannot find 'process', cannot find './wagmi', cannot find 'import.meta'
'use client';

import type { ReactNode } from 'react';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { sepolia } from 'wagmi/chains';

export function Providers(props: { children: ReactNode }) {
    return (
        <OnchainKitProvider
            apiKey={import.meta.env.VITE_PUBLIC_ONCHAINKIT_API_KEY}
            chain={sepolia}
        >
            {props.children}
        </OnchainKitProvider>
    );
}