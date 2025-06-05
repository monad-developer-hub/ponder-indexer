import { onchainTable } from "ponder";

export const blocks = onchainTable("blocks", (t) => ({
  number: t.bigint().primaryKey(),
  hash: t.hex(),
  timestamp: t.bigint(),
  transactionCount: t.integer(),
  gasUsed: t.bigint(),
  gasLimit: t.bigint(),
  // Transaction type counts
  transferCount: t.integer().default(0),
  swapCount: t.integer().default(0),
  mintCount: t.integer().default(0),
  burnCount: t.integer().default(0),
  stakeCount: t.integer().default(0),
  otherCount: t.integer().default(0),
}));

// New table for contract usage tracking
export const contractUsage = onchainTable("contract_usage", (t) => ({
  id: t.text().primaryKey(), // Format: `${blockNumber}-${contractAddress}`
  blockNumber: t.bigint(),
  blockTimestamp: t.bigint(),
  contractAddress: t.hex(),
  transactionCount: t.integer(),
  gasUsed: t.bigint(),
  transactionType: t.text(), // transfer, swap, mint, burn, stake, other
}));
