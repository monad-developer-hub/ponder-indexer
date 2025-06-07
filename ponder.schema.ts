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

// Individual transactions table - stores every transaction with full details
export const transactions = onchainTable("transactions", (t) => ({
  hash: t.hex().primaryKey(),
  blockNumber: t.bigint(),
  blockTimestamp: t.bigint(),
  transactionIndex: t.integer(),
  fromAddress: t.hex(),
  toAddress: t.hex(),
  value: t.bigint(), // MON amount transferred (in wei)
  gasUsed: t.bigint(),
  gasPrice: t.bigint(),
  gasLimit: t.bigint(),
  transactionType: t.text(), // transfer, swap, mint, burn, stake, other
  methodSignature: t.text(), // First 10 chars of input data (0x + 8 hex chars)
  inputData: t.text(), // Full input data (optional, can be large)
  success: t.boolean(), // Transaction success status
  nonce: t.bigint(),
  contractAddress: t.hex(), // For contract interactions
}));

// Contract usage tracking (aggregated per block)
export const contractUsage = onchainTable("contract_usage", (t) => ({
  id: t.text().primaryKey(), // Format: `${blockNumber}-${contractAddress}`
  blockNumber: t.bigint(),
  blockTimestamp: t.bigint(),
  contractAddress: t.hex(),
  transactionCount: t.integer(),
  gasUsed: t.bigint(), // Total gas consumed by all transactions to this contract
  avgGasPerTx: t.bigint(), // Average gas per transaction
  transactionType: t.text(), // transfer, swap, mint, burn, stake, other
}));

// Wallet-contract interactions (for unique wallet counting)
export const walletContractInteractions = onchainTable("wallet_contract_interactions", (t) => ({
  id: t.text().primaryKey(), // Format: `${blockNumber}-${walletAddress}-${contractAddress}`
  blockNumber: t.bigint(),
  blockTimestamp: t.bigint(),
  walletAddress: t.hex(),
  contractAddress: t.hex(),
  transactionCount: t.integer(), // How many times this wallet interacted with this contract in this block
  gasUsed: t.bigint(), // Gas used by this wallet for this contract in this block
  avgGasPerTx: t.bigint(),
  transactionType: t.text(),
}));

// Wallet gas usage tracking (aggregated per block per wallet)
export const walletGasUsage = onchainTable("wallet_gas_usage", (t) => ({
  id: t.text().primaryKey(), // Format: `${blockNumber}-${walletAddress}`
  blockNumber: t.bigint(),
  blockTimestamp: t.bigint(),
  walletAddress: t.hex(),
  totalGasUsed: t.bigint(), // Total gas spent by this wallet in this block
  transactionCount: t.integer(), // Total transactions by this wallet in this block
  avgGasPerTx: t.bigint(),
  contractsInteracted: t.integer(), // Number of unique contracts this wallet interacted with
}));

// Native MON token transfers tracking
export const monTransfers = onchainTable("mon_transfers", (t) => ({
  id: t.text().primaryKey(), // Format: `${blockNumber}-${txIndex}`
  blockNumber: t.bigint(),
  blockTimestamp: t.bigint(),
  transactionHash: t.hex(),
  fromAddress: t.hex(),
  toAddress: t.hex(),
  amount: t.bigint(), // Amount of MON transferred (in wei)
  gasUsed: t.bigint(), // Gas used for this transfer
}));

// MON wallet balances (aggregated per block)
export const monWalletActivity = onchainTable("mon_wallet_activity", (t) => ({
  id: t.text().primaryKey(), // Format: `${blockNumber}-${walletAddress}`
  blockNumber: t.bigint(),
  blockTimestamp: t.bigint(),
  walletAddress: t.hex(),
  totalSent: t.bigint(), // Total MON sent by this wallet in this block
  totalReceived: t.bigint(), // Total MON received by this wallet in this block
  transferCount: t.integer(), // Number of MON transfers involving this wallet
  sentCount: t.integer(), // Number of times this wallet sent MON
  receivedCount: t.integer(), // Number of times this wallet received MON
}));
