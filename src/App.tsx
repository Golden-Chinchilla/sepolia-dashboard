import { WalletConnect } from './WalletConnect.tsx'
import { USDCTransferDashboard } from './TxDashboard.tsx'
import { SubgraphViewer } from './SubgraphViewer.tsx'

export default function App() {
    return (
        <div>
            <WalletConnect></WalletConnect>
            <USDCTransferDashboard></USDCTransferDashboard>
            <SubgraphViewer></SubgraphViewer>
        </div>
    )
}