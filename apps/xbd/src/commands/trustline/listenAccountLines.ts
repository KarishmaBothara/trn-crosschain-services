import { xrplDoorAccount } from "@trncs/xbd/config";
import { getXrplClient } from "@trncs/xbd/utils/getXrplClient";
import { checkAccountLines } from "@trncs/xbd/utils/checkAccountLines";
import { getRootApi } from "@trncs/xbd/utils/getRootApi";
import currenciesPorcini from "@trncs/xbd/xrpl_currencies_porcini.json";
import currenciesRoot from "@trncs/xbd/xrpl_currencies_root.json";
import { encodeAccountID } from "xrpl";
import { hexToString } from "@polkadot/util";

export const command = "checkAccountLines";
export const desc = `Monitor all the trust line for "${xrplDoorAccount} account"`;

export interface IssuerMapInterface {
    [key: string]: string; // Allows any string key with any value type
}

export async function handler() {
    const xrplClient = await getXrplClient();
    const rootApi = await getRootApi();
    const chainName = (await rootApi.rpc.system.chain()).toString().toLowerCase();
    const issuerMap: IssuerMapInterface = {};
    const allEntries = await rootApi.query.xrplBridge.assetIdToXRPL.entries();
    allEntries.forEach(([{ args: [assetId] }, value]) => {
        const issuerData: { issuer: string, symbol: { nonStandard: string , standard: string} } = JSON.parse(value as any);
        const issuer = issuerData.issuer;
        const symbol = issuerData.symbol.nonStandard ? issuerData.symbol.nonStandard.toString() : hexToString(issuerData.symbol.standard).toLowerCase();
        if (symbol) {
            const symbolNoHex = symbol.length > 3 ? symbol.substring(2): symbol;
            const issuerNoHex = issuer.substring(2);
            const encodeIssuer = encodeAccountID(Buffer.from(issuerNoHex, 'hex'));
            issuerMap[symbolNoHex] = encodeIssuer;
        }
    });

    const xrplCurrencies: Record<string,
        {
            symbol: string;
            decimals: number;
        }
        > = chainName === 'porcini' ? currenciesPorcini : currenciesRoot;
    setInterval(function(){
        checkAccountLines(xrplClient, xrplDoorAccount, xrplCurrencies, issuerMap)
    }, 300000); // calling function after every 5 minutes to check trust line
}
