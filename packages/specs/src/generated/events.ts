import assert from 'assert'
import {Chain, ChainContext, EventContext, Event, Result, Option} from './support'
import * as v62 from './v62'

export class Erc20PegErc20DepositDelayedEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'Erc20Peg.Erc20DepositDelayed')
        this._chain = ctx._chain
        this.event = event
    }

    /**
     * An erc20 deposit has been delayed.
     */
    get isV62(): boolean {
        return this._chain.getEventHash('Erc20Peg.Erc20DepositDelayed') === '7bddd0192ee62f7e18579873088880f6a97e2c367b37cefd418d302ea869dbe9'
    }

    /**
     * An erc20 deposit has been delayed.
     */
    get asV62(): {paymentId: bigint, scheduledBlock: number, amount: bigint, beneficiary: Uint8Array, assetId: number} {
        assert(this.isV62)
        return this._chain.decodeEvent(this.event)
    }
}

export class Erc20PegErc20WithdrawEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'Erc20Peg.Erc20Withdraw')
        this._chain = ctx._chain
        this.event = event
    }

    /**
     * Tokens were burnt for withdrawal on Ethereum as ERC20s
     */
    get isV62(): boolean {
        return this._chain.getEventHash('Erc20Peg.Erc20Withdraw') === 'a154f61254045648667deab1ab8d4f312729ba977aa7a6387a2886cc6627bd90'
    }

    /**
     * Tokens were burnt for withdrawal on Ethereum as ERC20s
     */
    get asV62(): {assetId: number, amount: bigint, beneficiary: Uint8Array, source: Uint8Array} {
        assert(this.isV62)
        return this._chain.decodeEvent(this.event)
    }
}

export class Erc20PegErc20WithdrawalDelayedEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'Erc20Peg.Erc20WithdrawalDelayed')
        this._chain = ctx._chain
        this.event = event
    }

    /**
     * A withdrawal has been delayed.
     */
    get isV62(): boolean {
        return this._chain.getEventHash('Erc20Peg.Erc20WithdrawalDelayed') === '913bf03e427a61dfb477581793b9be5cf737342a89555e783b6ecde6a7c5e532'
    }

    /**
     * A withdrawal has been delayed.
     */
    get asV62(): {paymentId: bigint, scheduledBlock: number, amount: bigint, beneficiary: Uint8Array, assetId: number, source: Uint8Array} {
        assert(this.isV62)
        return this._chain.decodeEvent(this.event)
    }
}

export class EthBridgeChallengedEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'EthBridge.Challenged')
        this._chain = ctx._chain
        this.event = event
    }

    /**
     * An event has been challenged
     */
    get isV62(): boolean {
        return this._chain.getEventHash('EthBridge.Challenged') === 'f13ede920010f1f929df30f6700c08937e0b119c03bb7cee0ce3e7dd047ff71c'
    }

    /**
     * An event has been challenged
     */
    get asV62(): {eventClaimId: bigint, challenger: Uint8Array} {
        assert(this.isV62)
        return this._chain.decodeEvent(this.event)
    }
}

export class EthBridgeEventSendEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'EthBridge.EventSend')
        this._chain = ctx._chain
        this.event = event
    }

    /**
     * An event proof has been sent for signing by ethy-gadget
     */
    get isV62(): boolean {
        return this._chain.getEventHash('EthBridge.EventSend') === '8445301382c067f7d818907e8c8f3a29d91f267f933630045cba612192ae9380'
    }

    /**
     * An event proof has been sent for signing by ethy-gadget
     */
    get asV62(): {eventProofId: bigint, signingRequest: v62.EthySigningRequest} {
        assert(this.isV62)
        return this._chain.decodeEvent(this.event)
    }
}

export class EthBridgeEventSubmitEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'EthBridge.EventSubmit')
        this._chain = ctx._chain
        this.event = event
    }

    /**
     * An event has been submitted from Ethereum
     */
    get isV62(): boolean {
        return this._chain.getEventHash('EthBridge.EventSubmit') === '849db1c6ed3ac794063c7f3e35113ae673c612e5321bc418c2ed2e79a6227334'
    }

    /**
     * An event has been submitted from Ethereum
     */
    get asV62(): {eventClaimId: bigint, eventClaim: v62.EventClaim, processAt: number} {
        assert(this.isV62)
        return this._chain.decodeEvent(this.event)
    }
}

export class EthBridgeProcessingFailedEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'EthBridge.ProcessingFailed')
        this._chain = ctx._chain
        this.event = event
    }

    /**
     * Processing an event failed
     */
    get isV62(): boolean {
        return this._chain.getEventHash('EthBridge.ProcessingFailed') === '6bdaedd0e82eb25e47c8ded57adf06ba9d911add7f85725dd68f94b7aa3509eb'
    }

    /**
     * Processing an event failed
     */
    get asV62(): {eventClaimId: bigint, routerError: v62.EventRouterError} {
        assert(this.isV62)
        return this._chain.decodeEvent(this.event)
    }
}

export class EthBridgeProcessingOkEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'EthBridge.ProcessingOk')
        this._chain = ctx._chain
        this.event = event
    }

    /**
     * Processing an event succeeded
     */
    get isV62(): boolean {
        return this._chain.getEventHash('EthBridge.ProcessingOk') === '3072e9e1f29290cbd3c1affe6840e6df4a9de5f083312b260f1dbec47b36fc93'
    }

    /**
     * Processing an event succeeded
     */
    get asV62(): {eventClaimId: bigint} {
        assert(this.isV62)
        return this._chain.decodeEvent(this.event)
    }
}

export class EthBridgeProofDelayedEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'EthBridge.ProofDelayed')
        this._chain = ctx._chain
        this.event = event
    }

    /**
     * Generating event proof delayed as bridge is paused
     */
    get isV62(): boolean {
        return this._chain.getEventHash('EthBridge.ProofDelayed') === '38492cb9615462879e10e4f1c01a363a2bedd2a36882ded9d897ef64e80f0c20'
    }

    /**
     * Generating event proof delayed as bridge is paused
     */
    get asV62(): {eventProofId: bigint} {
        assert(this.isV62)
        return this._chain.decodeEvent(this.event)
    }
}

export class NftPegErc721WithdrawEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'NftPeg.Erc721Withdraw')
        this._chain = ctx._chain
        this.event = event
    }

    /**
     * An ERC721 withdraw was made
     */
    get isV62(): boolean {
        return this._chain.getEventHash('NftPeg.Erc721Withdraw') === '898aa53692870d80702233124628fc1b17a62e89378e94b6df3690b0ba9045cd'
    }

    /**
     * An ERC721 withdraw was made
     */
    get asV62(): {origin: Uint8Array, collectionIds: number[], serialNumbers: number[][], destination: Uint8Array} {
        assert(this.isV62)
        return this._chain.decodeEvent(this.event)
    }
}

export class XrplBridgeProcessingFailedEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'XRPLBridge.ProcessingFailed')
        this._chain = ctx._chain
        this.event = event
    }

    /**
     * Processing an event failed
     */
    get isV62(): boolean {
        return this._chain.getEventHash('XRPLBridge.ProcessingFailed') === '3104367ebf7193ef991442d5c1fd5fb8ab492aa90ef47dd616ba88519d575ca5'
    }

    /**
     * Processing an event failed
     */
    get asV62(): [bigint, Uint8Array, v62.DispatchError] {
        assert(this.isV62)
        return this._chain.decodeEvent(this.event)
    }
}

export class XrplBridgeProcessingOkEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'XRPLBridge.ProcessingOk')
        this._chain = ctx._chain
        this.event = event
    }

    /**
     * Processing an event succeeded
     */
    get isV62(): boolean {
        return this._chain.getEventHash('XRPLBridge.ProcessingOk') === '09513f9f1bcec9bc3630deb1e527f244187d51df4109ee1db4350bdd0300a1a1'
    }

    /**
     * Processing an event succeeded
     */
    get asV62(): [bigint, Uint8Array] {
        assert(this.isV62)
        return this._chain.decodeEvent(this.event)
    }
}

export class XrplBridgeTicketSequenceThresholdReachedEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'XRPLBridge.TicketSequenceThresholdReached')
        this._chain = ctx._chain
        this.event = event
    }

    /**
     * ticket sequence threshold reached for the XRPL door account
     */
    get isV62(): boolean {
        return this._chain.getEventHash('XRPLBridge.TicketSequenceThresholdReached') === 'e143129a66dd2bd417c9392bff7f67c1290d640012f999ccc4ec80cb79333188'
    }

    /**
     * ticket sequence threshold reached for the XRPL door account
     */
    get asV62(): {doorAccount: v62.XRPLDoorAccount, currentTicket: number} {
        assert(this.isV62)
        return this._chain.decodeEvent(this.event)
    }
}

export class XrplBridgeTransactionAddedEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'XRPLBridge.TransactionAdded')
        this._chain = ctx._chain
        this.event = event
    }

    get isV62(): boolean {
        return this._chain.getEventHash('XRPLBridge.TransactionAdded') === '09513f9f1bcec9bc3630deb1e527f244187d51df4109ee1db4350bdd0300a1a1'
    }

    get asV62(): [bigint, Uint8Array] {
        assert(this.isV62)
        return this._chain.decodeEvent(this.event)
    }
}

export class XrplBridgeWithdrawDelayedEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'XRPLBridge.WithdrawDelayed')
        this._chain = ctx._chain
        this.event = event
    }

    /**
     * A withdrawal was delayed as it was above the min_payment threshold
     */
    get isV62(): boolean {
        return this._chain.getEventHash('XRPLBridge.WithdrawDelayed') === 'bbf7b0bdcdd35a4ec5436f5aeab103aaa49c7c4922843486009e70422da56539'
    }

    /**
     * A withdrawal was delayed as it was above the min_payment threshold
     */
    get asV62(): {sender: Uint8Array, assetId: number, amount: bigint, destination: Uint8Array, delayedPaymentId: bigint, paymentBlock: number} {
        assert(this.isV62)
        return this._chain.decodeEvent(this.event)
    }
}

export class XrplBridgeWithdrawRequestEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'XRPLBridge.WithdrawRequest')
        this._chain = ctx._chain
        this.event = event
    }

    /**
     * Request to withdraw some XRP amount to XRPL
     */
    get isV62(): boolean {
        return this._chain.getEventHash('XRPLBridge.WithdrawRequest') === '9c6b69564c031adba833f389dbbd736298a47b7a68517bc2909fb60ba9c7da7b'
    }

    /**
     * Request to withdraw some XRP amount to XRPL
     */
    get asV62(): {proofId: bigint, sender: Uint8Array, assetId: number, amount: bigint, destination: Uint8Array} {
        assert(this.isV62)
        return this._chain.decodeEvent(this.event)
    }
}

export class Xls20Xls20MintRequestEvent {
    private readonly _chain: Chain
    private readonly event: Event

    constructor(ctx: EventContext)
    constructor(ctx: ChainContext, event: Event)
    constructor(ctx: EventContext, event?: Event) {
        event = event || ctx.event
        assert(event.name === 'Xls20.Xls20MintRequest')
        this._chain = ctx._chain
        this.event = event
    }

    /**
     * Request sent to XLS20 Relayer
     */
    get isV62(): boolean {
        return this._chain.getEventHash('Xls20.Xls20MintRequest') === '7d3af7930e1e04f44e802ed71f09f15e2c2c5a89cdb2454b3bd40edaf2c900f0'
    }

    /**
     * Request sent to XLS20 Relayer
     */
    get asV62(): {collectionId: number, serialNumbers: number[], tokenUris: Uint8Array[]} {
        assert(this.isV62)
        return this._chain.decodeEvent(this.event)
    }
}
