import { AccountObjectsResponse, Client } from "xrpl";
import { slackMentions } from "../config";
import { createSlackLogger, LoggerChannel, LoggerChild } from "@trncs/xbd/utils/createSlackLogger";
import { IssuerMapInterface } from "@trncs/xbd/commands/trustline/listenAccountLines";
const slack = createSlackLogger(LoggerChannel.Incoming, LoggerChild.Xrpl);

export async function checkAccountLines(client: Client, account: string, xrplCurrencies: Record<string,
    {
        symbol: string;
        decimals: number;
    }
    >, issuerMap: IssuerMapInterface) {
    let lastMarker: AccountObjectsResponse["result"]["marker"];

    do {
        console.log("Inside check account lines::", account);
        const query = await client.request({
            command: "account_lines",
            account,
            marker: lastMarker,
        });
        query.result.lines.forEach((trustLine) => {
            const { currency, balance, limit, account } = trustLine
            const issuer = issuerMap[currency.toLowerCase()];
            if (xrplCurrencies[currency.toLowerCase()] && issuer === account) { // if we support the currency check if balance is equal to limit
                if (parseInt(balance) === parseInt(limit)) {
                    slack.warn(`Trustline balance: (${balance}) for door account: ${account} for currency (${currency}) is too close to its limit (${limit}), 
                    please update the limit, ATN: ${slackMentions}`);
                }
            } else {
                console.log(`Issuer ${account} is not registered on chain, the right issuer is ${issuer} for currency ${currency}`);
            }
        });

        lastMarker = query.result.marker;
    } while (lastMarker);

}
