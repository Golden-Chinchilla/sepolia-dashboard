1. 用 the Graph 读取链上数据
   - 使用 uniswap/Coinbase sdk 做一个简单的 swap，然后读出这笔 tx
     - UniversalRouter on sepolia: `0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD`
     - Coinbase OnchainKit: https://docs.base.org/onchainkit/getting-started
   - 部署一个自己的合约至测试网，emit 一个事件，然后读出来
     - 发个测试币，读取 Mint，Burn 事件

2. 前端 dashboard
   - 右上角钱包功能（连接/切换等）