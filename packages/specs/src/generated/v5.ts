import type {Result, Option} from './support'

export type EthyChainId = EthyChainId_Ethereum | EthyChainId_Xrpl

export interface EthyChainId_Ethereum {
    __kind: 'Ethereum'
}

export interface EthyChainId_Xrpl {
    __kind: 'Xrpl'
}
