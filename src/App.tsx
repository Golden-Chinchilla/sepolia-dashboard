import React, { useState, useEffect } from 'react';
import { ChevronDown, Wallet, Copy, ExternalLink } from 'lucide-react';
import { JsonRpcProvider } from "ethers";
import './App.css'

const infuraKey = import.meta.env.VITE_INFURA_KEY;

// 网络配置
const NETWORKS = {
  mainnet: {
    chainId: '0x1',
    chainName: 'Ethereum Mainnet',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://mainnet.infura.io/v3/'],
    blockExplorerUrls: ['https://etherscan.io/'],
  },
  sepolia: {
    chainId: '0xaa36a7',
    chainName: 'Ethereum Sepolia',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    rpcUrls: ['https://sepolia.infura.io/v3/'],
    blockExplorerUrls: ['https://sepolia.etherscan.io/'],
  },
};

interface WalletState {
  isConnected: boolean;
  address: string;
  chainId: string;
  balance: string;
  ensName: string | null;
  ensAvatar: string | null;
}

const WalletConnect: React.FC = () => {
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    address: '',
    chainId: '',
    balance: '0',
    ensName: null,
    ensAvatar: null,
  });

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const isMetaMaskInstalled = () => {
    return typeof window !== 'undefined' && window.ethereum && window.ethereum.isMetaMask;
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (num === 0) return '0 ETH';
    if (num < 0.001) return '<0.001 ETH';
    return `${num.toFixed(4)} ETH`;
  };

  const getNetworkName = (chainId: string) => {
    switch (chainId) {
      case '0x1': return 'Ethereum Mainnet';
      case '0xaa36a7': return 'Ethereum Sepolia';
      default: return 'Unknown Network';
    }
  };

  const getBalance = async (address: string) => {
    try {
      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [address, 'latest'],
      });
      const ethBalance = parseInt(balance, 16) / Math.pow(10, 18);
      return ethBalance.toString();
    } catch (error) {
      return '0';
    }
  };

  const connectWallet = async () => {
    if (!isMetaMaskInstalled()) return;

    setIsConnecting(true);
    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length > 0) {
        const address = accounts[0];
        const chainId = await window.ethereum.request({
          method: 'eth_chainId',
        });
        const balance = await getBalance(address);

        const { name, avatar } = await resolveENS(address);

        setWallet({
          isConnected: true,
          address,
          chainId,
          balance,
          ensName: name,
          ensAvatar: avatar,
        });
      }
    } catch (error) {
      console.error('连接失败:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const switchNetwork = async (networkKey: keyof typeof NETWORKS) => {
    if (!isMetaMaskInstalled()) return;

    const network = NETWORKS[networkKey];
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: network.chainId }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [network],
          });
        } catch (addError) {
          console.error('添加网络失败:', addError);
        }
      }
    }
    setIsDropdownOpen(false);
  };

  const copyAddress = async () => {
    if (wallet.address) {
      await navigator.clipboard.writeText(wallet.address);
    }
  };

  // 3) 新增一个工具函数：解析 ENS 名称与头像
  const resolveENS = async (address: string) => {
    try {
      // 若当前链不是主网，用主网 RPC 专门解析 ENS（替换成你的 RPC）
      const mainnet = new JsonRpcProvider(`https://mainnet.infura.io/v3/${infuraKey}`);
      const name = await mainnet.lookupAddress(address);      // 反查 ENS 名
      const avatar = name ? await mainnet.getAvatar(name) : null; // 查头像
      return { name, avatar };
    } catch {
      return { name: null as string | null, avatar: null as string | null };
    }
  }

  useEffect(() => {
    if (isMetaMaskInstalled()) {
      console.log(infuraKey);

      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          setWallet({
            isConnected: false,
            address: '',
            chainId: '',
            balance: '0',
            ensName: null,
            ensAvatar: null,
          });
        } else {
          connectWallet();
        }
      };

      const handleChainChanged = (chainId: string) => {
        setWallet(prev => ({ ...prev, chainId }));
        if (wallet.address) {
          getBalance(wallet.address).then(balance => {
            setWallet(prev => ({ ...prev, balance }));
          });
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      window.ethereum.request({ method: 'eth_accounts' })
        .then((accounts: string[]) => {
          if (accounts.length > 0) {
            connectWallet();
          }
        });

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [wallet.address]);

  if (!wallet.isConnected) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={connectWallet}
          disabled={isConnecting}
          className="hover:cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium flex items-center space-x-2 transition-colors disabled:opacity-50 shadow-lg"
        >
          <Wallet size={20} />
          <span>{isConnecting ? '连接中...' : '连接钱包'}</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4 min-w-[320px]">
        {/* 网络选择器 */}
        <div className="relative mb-4">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg px-4 py-2 flex items-center justify-between text-sm font-medium transition-colors"
          >
            <span>{getNetworkName(wallet.chainId)}</span>
            <ChevronDown size={16} className={`transform transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10">
              <button
                onClick={() => switchNetwork('mainnet')}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm flex items-center justify-between"
              >
                <span>Ethereum Mainnet</span>
                {wallet.chainId === '0x1' && (
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </button>
              <button
                onClick={() => switchNetwork('sepolia')}
                className="w-full px-4 py-2 text-left hover:bg-gray-50 text-sm flex items-center justify-between border-t border-gray-100"
              >
                <span>Ethereum Sepolia</span>
                {wallet.chainId === '0xaa36a7' && (
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </button>
            </div>
          )}
        </div>

        {/* 用户信息 */}
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium">
              {wallet.ensAvatar ? (
                <img
                  src={wallet.ensAvatar}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <span>{wallet.address.slice(2, 4).toUpperCase()}</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900 truncate">
                  {wallet.ensName || formatAddress(wallet.address)}
                </span>
                <button
                  onClick={copyAddress}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="复制地址"
                >
                  <Copy size={14} />
                </button>
                <a
                  href={`${wallet.chainId === '0x1' ? 'https://etherscan.io' : 'https://sepolia.etherscan.io'}/address/${wallet.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="在区块浏览器中查看"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
              {wallet.ensName && (
                <div className="text-xs text-gray-500 truncate">
                  {formatAddress(wallet.address)}
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-500 mb-1">余额</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatBalance(wallet.balance)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default WalletConnect;