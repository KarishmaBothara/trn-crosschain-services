# XLS-20 Daemon (XLS20D)

## Concepts

1. XLS20D purpose is to facilitate the NFT Minting requests between XRPL and The Root Network (TRN).

- Serve Mint Request: receive events from the XLS20 Contract, then submit mint requests to XPRL network to "reserve" the unique Token ID.
- Fulfill Mint Request: The other part of the process, listen to certain events on the Mint Account to collect the Token IDs to register it back to the XLS20 Contract.

XLS20D similar to other crosschain services, consists eof 2 main processor group, `inbox` and `outbox`.

### With Server

```
yarn call outbox processRootSide --key=XLS20D-ObxRootStatus
yarn call outbox processXrplSide --key=XLS20D-ObxXrplStatus
```

### Without Server

```
yarn call:main outbox processRootSide
yarn call:main outbox processXrplSide
```

```mermaid
sequenceDiagram
    participant Contract as XLS-20 Contract
    actor TrnSide as Processor (TRN)
    participant Account as Door Account
    actor XrplSide as Processor (XRPL)

    alt XLS-20 on TRN
        Contract-->>TrnSide: "MintRequested" event
        TrnSide->>TrnSide: "MintRequested" handler
        TrnSide->>Account: "NFTokenMint" request
        Account-->>XrplSide: "NFTokenMint" tx
        XrplSide->>XrplSide: "NFTokenMintTx" handler
    else XLS-20 on XRPL
        Account-->>XrplSide: "NFTokenAcceptOffer" tx
        XrplSide->>XrplSide: "NFTokenAcceptOfferTx" handler
        XrplSide->>Contract: "registerTokenBridge" call
    end


```

2. XLS20D is also responsible for bridging nfts from XRPL -> TRN and TRN -> XRPL

Bridging NFT consists of 3 main processor groups, `inbox`, `outbox` and `ticket` which handle deposit, withdrawal and ticket monitor flows respectively. Each processor group is then split in 2 sides, XrplSide and RootSide; with one exception for `ticket` flow which only consists of one side: Root Side.

### Deposit

> Deposit flow, XrplSide Processor will initiate the request to TRN Chain

### With Server

```
yarn call inbox processXrplSide --key=XLS20D-IbxXrplStatus
yarn call inbox processRootSide --key=XLS20D-IbxRootStatus
```

### Without Server

```
yarn call:main inbox processRootSide
yarn call:main inbox processXrplSide
```

```mermaid
sequenceDiagram
    actor XrplSide as Alice
    participant Account as Door Account
    actor XrplSide as Processor (XPRL)
    participant Pallet as XRPL Bridge Pallet
    actor TrnSide as Processor (TRN)

    Alice->>XrplSide: "NFTokenCreateOffer" tx for nft "xyz" (dest = door, amount = 0, memo = trnAddress)
    XrplSide->>XrplSide: "NFTokenCreateOfferTx" hanlder (saves offerid, trn address to mongodb)
    Alice->>XrplSide: "Payment" tx (dest = door, amount = txFee, memo = nftId:"xyz")
    XrplSide->>XrplSide: "PaymentTx" hanlder
    XrplSide->>Pallet: "xbdBridge.generateNftAcceptOffer" extrinsic
    Pallet->>TrnSide: "NFTokenAcceptOffer related" event with event proof
    TrnSide->>TrnSide: "NFTokenAcceptOfferTx" submission for door account
    TrnSide->>Account: Door account recieves nft "xyz"
    Account->>XrplSide: "Listen NFTokenAcceptOffer" from door account
    XrplSide->>XrplSide: "NFTokenAcceptOfferTx" handler
    XrplSide->>Pallet: "xrplBridge.submitTransaction(ledgerIndex, transactionHash, txData)" extrinsic
    Pallet->>TrnSide: "BridgeTransactionAdded" event
    TrnSide->>TrnSide: "BridgeTransactionAdded" handler
    alt Ok (10 mins of challenge period)
        Pallet-->>TrnSide: "ProcessingOk" event
        TrnSide->>TrnSide: "ProcessingOk" handler
    else Failed
        Pallet-->>TrnSide: "ProcessingFailed" event
        TrnSide->>TrnSide: "ProcessingFailed" handler
    end
```

### Withdrawal

> Withdrawal flow, RootSide Processor will initiate the request to XRPL Chain

### With Server

```
yarn call outbox processRootSide --key=XLS20D-ObxRootStatus
yarn call outbox processXrplSide --key=XLS20D-ObxXrplStatus
```

### Without Server

```
yarn call:main outbox processRootSide
yarn call:main outbox processXrplSide
```

```mermaid
sequenceDiagram
    actor TrnSide as Alice
    participant Pallet as Bridge Pallet
    actor TrnSide as Processor (TRN)
    participant Account as Door Account
    actor XrplSide as Processor (XPRL)
    participant Pallet as NFT Bridge Pallet
    actor TrnSide as Processor (TRN)

    Alice->>Pallet: "WithdrawNft"
    Pallet-->>TrnSide: "EventSend" event (with event proof for NFTokenCreateOffer)
    TrnSide->>TrnSide: "EventSend" handler
    TrnSide->>Account: "NFTokenCreateOffer" request (submit NFTokenCreateOffer)
    Account-->>XrplSide: "NFTokenAcceptOffer" tx (listen to AcceptOffer for CreateOffer)
    XrplSide->>XrplSide: "NFTokenAcceptOffer" handler
```
