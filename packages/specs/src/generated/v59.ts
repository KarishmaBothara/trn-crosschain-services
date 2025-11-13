import type {Result, Option} from './support'

export type XRPLDoorAccount = XRPLDoorAccount_Main | XRPLDoorAccount_NFT

export interface XRPLDoorAccount_Main {
    __kind: 'Main'
}

export interface XRPLDoorAccount_NFT {
    __kind: 'NFT'
}
