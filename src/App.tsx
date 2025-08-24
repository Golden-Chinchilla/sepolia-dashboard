import '@coinbase/onchainkit/styles.css';
import { Swap } from '@coinbase/onchainkit/swap';
import type { Token } from '@coinbase/onchainkit/token';
import { Providers } from './Providers';
import { WalletButton } from './walletButton';
import './App.css'

const eth: Token = {
  name: 'sepoliaETH',
  address: '',
  symbol: 'ETH',
  decimals: 18,
  image:
    'https://wallet-api-production.s3.amazonaws.com/uploads/tokens/eth_288.png',
  chainId: 11155111,
};

const usdt: Token = {
  name: 'sepoliaUSDT',
  address: '0x7169D38820dfd117C3FA1f22a697dBA58d90BA06', // Sepolia USDT
  symbol: 'USDT',
  decimals: 6,
  image:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/0/01/USDT_Logo.png/1200px-USDT_Logo.png?20240524104709',
  chainId: 11155111,
};


function App() {


  return (
    <Providers>
      <WalletButton />
      <Swap
        from={[eth]}
        to={[usdt]}
      />
    </Providers>
  )
}

export default App
