import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import PHANTOM_ABI from './abis/phantom.json'
import { CONTRACTS } from './constants/contracts';

// USDC合约地址 (sepolia测试网)
const USDC_CONTRACT_ADDRESS = CONTRACTS.USDCtest_CONTRACT;

interface TransactionDetails {
    hash: string;
    from: string;
    to: string;
    value: string;
    status: 'pending' | 'confirmed' | 'failed';
    blockNumber?: number;
    timestamp?: number;
    gasUsed?: string;
    gasPrice?: string;
}

export const USDCTransferDashboard: React.FC = () => {
    const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
    const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
    const [account, setAccount] = useState<string>('');

    // 转账相关状态
    const [recipient, setRecipient] = useState<string>('');
    const [amount, setAmount] = useState<string>('');
    const [isTransferring, setIsTransferring] = useState<boolean>(false);

    // 交易查询相关状态
    const [txHash, setTxHash] = useState<string>('');
    const [txDetails, setTxDetails] = useState<TransactionDetails | null>(null);
    const [isQuerying, setIsQuerying] = useState<boolean>(false);

    // 初始化provider和signer
    useEffect(() => {
        const initializeProvider = async () => {
            if (typeof window.ethereum !== 'undefined') {
                const provider = new ethers.BrowserProvider(window.ethereum);
                setProvider(provider);

                // 检查是否已连接
                try {
                    const accounts = await provider.send('eth_accounts', []);
                    if (accounts.length > 0) {
                        const signer = await provider.getSigner();
                        setSigner(signer);
                        setAccount(accounts[0]);
                    }
                } catch (error) {
                    console.error('获取账户失败:', error);
                }
            }
        };

        initializeProvider();

        // 监听账户变化
        if (window.ethereum) {
            const handleAccountsChanged = async (accounts: string[]) => {
                if (accounts.length > 0) {
                    const provider = new ethers.BrowserProvider(window.ethereum);
                    const signer = await provider.getSigner();
                    setSigner(signer);
                    setAccount(accounts[0]);
                } else {
                    setSigner(null);
                    setAccount('');
                }
            };

            window.ethereum.on('accountsChanged', handleAccountsChanged);

            return () => {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
            };
        }
    }, []);

    // USDC转账
    const transferUSDC = async () => {
        if (!signer || !recipient || !amount) {
            alert('请填写完整信息');
            return;
        }

        setIsTransferring(true);
        try {
            const contract = new ethers.Contract(USDC_CONTRACT_ADDRESS, PHANTOM_ABI, signer);
            const decimals = await contract.decimals();
            const amountInWei = ethers.parseUnits(amount, decimals);

            const tx = await contract.transfer(recipient, amountInWei);

            // 设置交易详情（pending状态）
            setTxDetails({
                hash: tx.hash,
                from: account,
                to: recipient,
                value: amount,
                status: 'pending'
            });

            // 等待交易确认
            const receipt = await tx.wait();

            if (receipt.status === 1) {
                setTxDetails(prev => prev ? {
                    ...prev,
                    status: 'confirmed',
                    blockNumber: receipt.blockNumber,
                    gasUsed: receipt.gasUsed.toString(),
                    gasPrice: receipt.gasPrice?.toString() || '0'
                } : null);

                // 清空输入框
                setRecipient('');
                setAmount('');

                alert('转账成功!');
            } else {
                setTxDetails(prev => prev ? { ...prev, status: 'failed' } : null);
                alert('转账失败');
            }
        } catch (error) {
            console.error('转账失败:', error);
            setTxDetails(prev => prev ? { ...prev, status: 'failed' } : null);
            alert('转账失败: ' + (error as Error).message);
        } finally {
            setIsTransferring(false);
        }
    };

    // 查询交易详情
    const queryTransaction = async () => {
        if (!provider || !txHash) {
            alert('请输入交易哈希');
            return;
        }

        setIsQuerying(true);
        try {
            const tx = await provider.getTransaction(txHash);
            const receipt = await provider.getTransactionReceipt(txHash);

            if (tx) {
                let status: 'pending' | 'confirmed' | 'failed' = 'pending';
                if (receipt) {
                    status = receipt.status === 1 ? 'confirmed' : 'failed';
                }

                const block = receipt ? await provider.getBlock(receipt.blockNumber) : null;

                // 对于ERC20转账，需要解析合约调用的金额
                let transferValue = '0';
                if (receipt && receipt.logs.length > 0) {
                    try {
                        const contract = new ethers.Contract(USDC_CONTRACT_ADDRESS, PHANTOM_ABI, provider);
                        const parsedLog = contract.interface.parseLog({
                            topics: receipt.logs[0].topics,
                            data: receipt.logs[0].data
                        });
                        if (parsedLog && parsedLog.name === 'Transfer') {
                            const decimals = await contract.decimals();
                            transferValue = ethers.formatUnits(parsedLog.args[2], decimals);
                        }
                    } catch (parseError) {
                        // 如果解析失败，使用ETH值
                        transferValue = ethers.formatEther(tx.value);
                    }
                } else {
                    transferValue = ethers.formatEther(tx.value);
                }

                setTxDetails({
                    hash: tx.hash,
                    from: tx.from,
                    to: tx.to || '',
                    value: transferValue,
                    status,
                    blockNumber: receipt?.blockNumber,
                    timestamp: block?.timestamp,
                    gasUsed: receipt?.gasUsed.toString(),
                    gasPrice: tx.gasPrice?.toString()
                });
            } else {
                alert('未找到该交易');
            }
        } catch (error) {
            console.error('查询交易失败:', error);
            alert('查询交易失败');
        } finally {
            setIsQuerying(false);
        }
    };

    // 等待动画组件
    const PendingAnimation = () => (
        <div className="flex items-center justify-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce"></div>
            <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-4 h-4 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
    );

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg mt-4 mr-80">
            <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">USDC转账系统</h1>

            {/* 连接状态提示 */}
            {!account && (
                <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-center">
                        请使用右上角的钱包连接组件连接您的钱包
                    </p>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-8">
                {/* 转账区域 */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-800">USDC转账</h2>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            接收地址
                        </label>
                        <input
                            type="text"
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            placeholder="请输入接收方地址"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isTransferring}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            转账金额 (USDC)
                        </label>
                        <input
                            type="number"
                            step="0.000001"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="请输入转账金额"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={isTransferring}
                        />
                    </div>

                    <button
                        onClick={transferUSDC}
                        disabled={!account || isTransferring || !recipient || !amount}
                        className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
                    >
                        {isTransferring ? (
                            <div className="flex items-center justify-center space-x-2">
                                <PendingAnimation />
                                <span>转账中...</span>
                            </div>
                        ) : (
                            '发送USDC'
                        )}
                    </button>
                </div>

                {/* 交易查询区域 */}
                <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-gray-800">交易查询</h2>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            交易哈希
                        </label>
                        <input
                            type="text"
                            value={txHash}
                            onChange={(e) => setTxHash(e.target.value)}
                            placeholder="请输入交易哈希"
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>

                    <button
                        onClick={queryTransaction}
                        disabled={!provider || isQuerying || !txHash}
                        className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition duration-200"
                    >
                        {isQuerying ? (
                            <div className="flex items-center justify-center space-x-2">
                                <PendingAnimation />
                                <span>查询中...</span>
                            </div>
                        ) : (
                            '查询交易'
                        )}
                    </button>
                </div>
            </div>

            {/* 交易详情显示区域 */}
            {txDetails && (
                <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">交易详情</h3>

                    <div className="grid gap-3">
                        <div className="flex items-center space-x-3">
                            <span className="font-medium text-gray-700">状态:</span>
                            {txDetails.status === 'pending' ? (
                                <div className="flex items-center space-x-2">
                                    <PendingAnimation />
                                    <span className="text-orange-600 font-medium">等待确认中...</span>
                                </div>
                            ) : txDetails.status === 'confirmed' ? (
                                <span className="text-green-600 font-medium flex items-center">
                                    <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    已确认
                                </span>
                            ) : (
                                <span className="text-red-600 font-medium flex items-center">
                                    <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    失败
                                </span>
                            )}
                        </div>

                        <div>
                            <span className="font-medium text-gray-700">交易哈希:</span>
                            <p className="font-mono text-sm bg-gray-100 p-2 rounded mt-1 break-all">{txDetails.hash}</p>
                        </div>

                        <div>
                            <span className="font-medium text-gray-700">发送方:</span>
                            <p className="font-mono text-sm bg-gray-100 p-2 rounded mt-1 break-all">{txDetails.from}</p>
                        </div>

                        <div>
                            <span className="font-medium text-gray-700">接收方:</span>
                            <p className="font-mono text-sm bg-gray-100 p-2 rounded mt-1 break-all">{txDetails.to}</p>
                        </div>

                        <div>
                            <span className="font-medium text-gray-700">金额:</span>
                            <p className="text-lg font-semibold text-green-600">{txDetails.value} USDC</p>
                        </div>

                        {txDetails.blockNumber && (
                            <div>
                                <span className="font-medium text-gray-700">区块高度:</span>
                                <p className="font-mono">{txDetails.blockNumber}</p>
                            </div>
                        )}

                        {txDetails.timestamp && (
                            <div>
                                <span className="font-medium text-gray-700">确认时间:</span>
                                <p>{new Date(txDetails.timestamp * 1000).toLocaleString()}</p>
                            </div>
                        )}

                        {txDetails.gasUsed && (
                            <div>
                                <span className="font-medium text-gray-700">Gas使用量:</span>
                                <p className="font-mono">{txDetails.gasUsed}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};