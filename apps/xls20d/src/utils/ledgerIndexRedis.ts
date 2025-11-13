import { getRedisClient } from "@trncs/xls20d/utils/getRedisClient";

const REDIS_KEY = "XLS20D-Ledger-Block-Index";

export async function getLastLedgerIndexFromRedis() {
	const redis = getRedisClient();
	const ledgerBlock: string | null = await redis.get(REDIS_KEY);
	const ledgerBlockIndex = ledgerBlock ? ledgerBlock.split("-") : null;
	return ledgerBlockIndex;
}

export async function storeLedgerIndex(
	currentLedger: number,
	blockHeight: number
) {
	const redis = getRedisClient();
	const ledgerBlockIndex = `${currentLedger}-${blockHeight}`;
	await redis.set(REDIS_KEY, ledgerBlockIndex);
}
