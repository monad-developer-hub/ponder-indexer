import { 
  blocks, 
  transactions,
  contractUsage, 
  walletContractInteractions, 
  walletGasUsage, 
  monTransfers, 
  monWalletActivity 
} from "ponder:schema";
import { sql, desc, asc, gte, and, eq, or } from "ponder";

// Helper: Get timestamp for 24 hours ago
const get24hAgo = () => BigInt(Math.floor(Date.now() / 1000) - 24 * 60 * 60);
const get7dAgo = () => BigInt(Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60);

// ==============================================
// 🏗️ CONTRACT ANALYTICS
// ==============================================

// 1. 📊 Most Used Contracts (24h) with Unique Wallet Count
export async function getMostUsedContracts24h(db: any, limit = 10) {
  const oneDayAgo = get24hAgo();
  
  return await db
    .select({
      contractAddress: contractUsage.contractAddress,
      totalTransactions: sql<number>`sum(${contractUsage.transactionCount})`,
      totalGasUsed: sql<bigint>`sum(${contractUsage.gasUsed})`,
      avgGasPerTx: sql<bigint>`sum(${contractUsage.gasUsed}) / sum(${contractUsage.transactionCount})`,
      primaryTransactionType: sql<string>`mode() within group (order by ${contractUsage.transactionType})`,
    })
    .from(contractUsage)
    .where(gte(contractUsage.blockTimestamp, oneDayAgo))
    .groupBy(contractUsage.contractAddress)
    .orderBy(desc(sql`sum(${contractUsage.transactionCount})`))
    .limit(limit);
}

// 2. 👥 Most Popular Contracts by Unique Wallets (24h)
export async function getMostPopularContractsByWallets24h(db: any, limit = 10) {
  const oneDayAgo = get24hAgo();
  
  return await db
    .select({
      contractAddress: walletContractInteractions.contractAddress,
      uniqueWallets: sql<number>`count(distinct ${walletContractInteractions.walletAddress})`,
      totalTransactions: sql<number>`sum(${walletContractInteractions.transactionCount})`,
      totalGasUsed: sql<bigint>`sum(${walletContractInteractions.gasUsed})`,
      avgTransactionsPerWallet: sql<number>`sum(${walletContractInteractions.transactionCount})::float / count(distinct ${walletContractInteractions.walletAddress})`,
      avgGasPerWallet: sql<bigint>`sum(${walletContractInteractions.gasUsed}) / count(distinct ${walletContractInteractions.walletAddress})`,
    })
    .from(walletContractInteractions)
    .where(gte(walletContractInteractions.blockTimestamp, oneDayAgo))
    .groupBy(walletContractInteractions.contractAddress)
    .orderBy(desc(sql`count(distinct ${walletContractInteractions.walletAddress})`))
    .limit(limit);
}

// 3. ⛽ Top Gas-Consuming Contracts (24h)
export async function getTopGasContracts24h(db: any, limit = 10) {
  const oneDayAgo = get24hAgo();
  
  return await db
    .select({
      contractAddress: contractUsage.contractAddress,
      totalGasUsed: sql<bigint>`sum(${contractUsage.gasUsed})`,
      totalTransactions: sql<number>`sum(${contractUsage.transactionCount})`,
      avgGasPerTx: sql<bigint>`sum(${contractUsage.gasUsed}) / sum(${contractUsage.transactionCount})`,
      gasPercentOfTotal: sql<number>`(sum(${contractUsage.gasUsed})::float / (
        SELECT sum(${blocks.gasUsed}) FROM ${blocks} WHERE ${blocks.timestamp} >= ${oneDayAgo}
      )) * 100`,
    })
    .from(contractUsage)
    .where(gte(contractUsage.blockTimestamp, oneDayAgo))
    .groupBy(contractUsage.contractAddress)
    .orderBy(desc(sql`sum(${contractUsage.gasUsed})`))
    .limit(limit);
}

// 4. 🔧 Most Gas-Efficient Contracts (24h)
export async function getMostEfficientContracts24h(db: any, minTxs = 100, limit = 10) {
  const oneDayAgo = get24hAgo();
  
  return await db
    .select({
      contractAddress: contractUsage.contractAddress,
      avgGasPerTx: sql<bigint>`sum(${contractUsage.gasUsed}) / sum(${contractUsage.transactionCount})`,
      totalTransactions: sql<number>`sum(${contractUsage.transactionCount})`,
      totalGasUsed: sql<bigint>`sum(${contractUsage.gasUsed})`,
    })
    .from(contractUsage)
    .where(gte(contractUsage.blockTimestamp, oneDayAgo))
    .groupBy(contractUsage.contractAddress)
    .having(sql`sum(${contractUsage.transactionCount}) >= ${minTxs}`)
    .orderBy(asc(sql`sum(${contractUsage.gasUsed}) / sum(${contractUsage.transactionCount})`))
    .limit(limit);
}

// ==============================================
// 👛 WALLET ANALYTICS
// ==============================================

// 5. ⛽ Top Gas-Spending Wallets (24h)
export async function getTopGasWallets24h(db: any, limit = 10) {
  const oneDayAgo = get24hAgo();
  
  return await db
    .select({
      walletAddress: walletGasUsage.walletAddress,
      totalGasUsed: sql<bigint>`sum(${walletGasUsage.totalGasUsed})`,
      totalTransactions: sql<number>`sum(${walletGasUsage.transactionCount})`,
      avgGasPerTx: sql<bigint>`sum(${walletGasUsage.totalGasUsed}) / sum(${walletGasUsage.transactionCount})`,
      uniqueContracts: sql<number>`sum(${walletGasUsage.contractsInteracted})`,
      gasPercentOfTotal: sql<number>`(sum(${walletGasUsage.totalGasUsed})::float / (
        SELECT sum(${blocks.gasUsed}) FROM ${blocks} WHERE ${blocks.timestamp} >= ${oneDayAgo}
      )) * 100`,
    })
    .from(walletGasUsage)
    .where(gte(walletGasUsage.blockTimestamp, oneDayAgo))
    .groupBy(walletGasUsage.walletAddress)
    .orderBy(desc(sql`sum(${walletGasUsage.totalGasUsed})`))
    .limit(limit);
}

// 6. 🔗 Most Active Wallets by Contract Interactions (24h)
export async function getMostActiveWallets24h(db: any, limit = 10) {
  const oneDayAgo = get24hAgo();
  
  return await db
    .select({
      walletAddress: walletGasUsage.walletAddress,
      uniqueContracts: sql<number>`sum(${walletGasUsage.contractsInteracted})`,
      totalTransactions: sql<number>`sum(${walletGasUsage.transactionCount})`,
      totalGasUsed: sql<bigint>`sum(${walletGasUsage.totalGasUsed})`,
      avgTxPerContract: sql<number>`sum(${walletGasUsage.transactionCount})::float / sum(${walletGasUsage.contractsInteracted})`,
    })
    .from(walletGasUsage)
    .where(gte(walletGasUsage.blockTimestamp, oneDayAgo))
    .groupBy(walletGasUsage.walletAddress)
    .orderBy(desc(sql`sum(${walletGasUsage.contractsInteracted})`))
    .limit(limit);
}

// ==============================================
// 💰 MON TOKEN ANALYTICS
// ==============================================

// 7. 📤 Top MON Senders (24h)
export async function getTopMonSenders24h(db: any, limit = 10) {
  const oneDayAgo = get24hAgo();
  
  return await db
    .select({
      walletAddress: monWalletActivity.walletAddress,
      totalSent: sql<bigint>`sum(${monWalletActivity.totalSent})`,
      totalReceived: sql<bigint>`sum(${monWalletActivity.totalReceived})`,
      netFlow: sql<bigint>`sum(${monWalletActivity.totalSent}) - sum(${monWalletActivity.totalReceived})`,
      sentCount: sql<number>`sum(${monWalletActivity.sentCount})`,
      receivedCount: sql<number>`sum(${monWalletActivity.receivedCount})`,
      avgSentPerTx: sql<bigint>`sum(${monWalletActivity.totalSent}) / sum(${monWalletActivity.sentCount})`,
    })
    .from(monWalletActivity)
    .where(gte(monWalletActivity.blockTimestamp, oneDayAgo))
    .groupBy(monWalletActivity.walletAddress)
    .orderBy(desc(sql`sum(${monWalletActivity.totalSent})`))
    .limit(limit);
}

// 8. 📥 Top MON Receivers (24h)
export async function getTopMonReceivers24h(db: any, limit = 10) {
  const oneDayAgo = get24hAgo();
  
  return await db
    .select({
      walletAddress: monWalletActivity.walletAddress,
      totalReceived: sql<bigint>`sum(${monWalletActivity.totalReceived})`,
      totalSent: sql<bigint>`sum(${monWalletActivity.totalSent})`,
      netFlow: sql<bigint>`sum(${monWalletActivity.totalReceived}) - sum(${monWalletActivity.totalSent})`,
      receivedCount: sql<number>`sum(${monWalletActivity.receivedCount})`,
      sentCount: sql<number>`sum(${monWalletActivity.sentCount})`,
      avgReceivedPerTx: sql<bigint>`sum(${monWalletActivity.totalReceived}) / sum(${monWalletActivity.receivedCount})`,
    })
    .from(monWalletActivity)
    .where(gte(monWalletActivity.blockTimestamp, oneDayAgo))
    .groupBy(monWalletActivity.walletAddress)
    .orderBy(desc(sql`sum(${monWalletActivity.totalReceived})`))
    .limit(limit);
}

// 9. 💎 Largest Single MON Transfers (24h)
export async function getLargestMonTransfers24h(db: any, limit = 20) {
  const oneDayAgo = get24hAgo();
  
  return await db
    .select({
      transactionHash: monTransfers.transactionHash,
      fromAddress: monTransfers.fromAddress,
      toAddress: monTransfers.toAddress,
      amount: monTransfers.amount,
      amountInMon: sql<number>`${monTransfers.amount}::float / 1e18`,
      gasUsed: monTransfers.gasUsed,
      blockNumber: monTransfers.blockNumber,
      blockTimestamp: monTransfers.blockTimestamp,
    })
    .from(monTransfers)
    .where(gte(monTransfers.blockTimestamp, oneDayAgo))
    .orderBy(desc(monTransfers.amount))
    .limit(limit);
}

// 10. 🔄 Most Active MON Traders by Volume (24h)
export async function getMostActiveMonTraders24h(db: any, limit = 10) {
  const oneDayAgo = get24hAgo();
  
  return await db
    .select({
      walletAddress: monWalletActivity.walletAddress,
      totalVolume: sql<bigint>`sum(${monWalletActivity.totalSent}) + sum(${monWalletActivity.totalReceived})`,
      totalTransfers: sql<number>`sum(${monWalletActivity.transferCount})`,
      avgTransferSize: sql<bigint>`(sum(${monWalletActivity.totalSent}) + sum(${monWalletActivity.totalReceived})) / sum(${monWalletActivity.transferCount})`,
      sentReceiveRatio: sql<number>`sum(${monWalletActivity.totalSent})::float / sum(${monWalletActivity.totalReceived})`,
      totalSent: sql<bigint>`sum(${monWalletActivity.totalSent})`,
      totalReceived: sql<bigint>`sum(${monWalletActivity.totalReceived})`,
    })
    .from(monWalletActivity)
    .where(gte(monWalletActivity.blockTimestamp, oneDayAgo))
    .groupBy(monWalletActivity.walletAddress)
    .orderBy(desc(sql`sum(${monWalletActivity.totalSent}) + sum(${monWalletActivity.totalReceived})`))
    .limit(limit);
}

// ==============================================
// 📊 NETWORK ANALYTICS
// ==============================================

// 11. 🌐 Network Overview (24h)
export async function getNetworkOverview24h(db: any) {
  const oneDayAgo = get24hAgo();
  
  const blockStats = await db
    .select({
      totalBlocks: sql<number>`count(*)`,
      totalTransactions: sql<number>`sum(${blocks.transactionCount})`,
      totalGasUsed: sql<bigint>`sum(${blocks.gasUsed})`,
      avgGasPerBlock: sql<bigint>`sum(${blocks.gasUsed}) / count(*)`,
      avgTxPerBlock: sql<number>`sum(${blocks.transactionCount}) / count(*)`,
      avgGasUtilization: sql<number>`(sum(${blocks.gasUsed})::float / sum(${blocks.gasLimit})) * 100`,
    })
    .from(blocks)
    .where(gte(blocks.timestamp, oneDayAgo));

  const contractStats = await db
    .select({
      uniqueContracts: sql<number>`count(distinct ${contractUsage.contractAddress})`,
      totalContractTxs: sql<number>`sum(${contractUsage.transactionCount})`,
    })
    .from(contractUsage)
    .where(gte(contractUsage.blockTimestamp, oneDayAgo));

  const walletStats = await db
    .select({
      uniqueWallets: sql<number>`count(distinct ${walletGasUsage.walletAddress})`,
      totalWalletTxs: sql<number>`sum(${walletGasUsage.transactionCount})`,
    })
    .from(walletGasUsage)
    .where(gte(walletGasUsage.blockTimestamp, oneDayAgo));

  const monStats = await db
    .select({
      totalMonTransfers: sql<number>`count(*)`,
      totalMonVolume: sql<bigint>`sum(${monTransfers.amount})`,
      uniqueMonSenders: sql<number>`count(distinct ${monTransfers.fromAddress})`,
      uniqueMonReceivers: sql<number>`count(distinct ${monTransfers.toAddress})`,
    })
    .from(monTransfers)
    .where(gte(monTransfers.blockTimestamp, oneDayAgo));

  return {
    blocks: blockStats[0],
    contracts: contractStats[0],
    wallets: walletStats[0],
    mon: monStats[0],
  };
}

// 12. 📈 Transaction Type Breakdown (24h)
export async function getTransactionTypeBreakdown24h(db: any) {
  const oneDayAgo = get24hAgo();
  
  return await db
    .select({
      transferCount: sql<number>`sum(${blocks.transferCount})`,
      swapCount: sql<number>`sum(${blocks.swapCount})`,
      mintCount: sql<number>`sum(${blocks.mintCount})`,
      burnCount: sql<number>`sum(${blocks.burnCount})`,
      stakeCount: sql<number>`sum(${blocks.stakeCount})`,
      otherCount: sql<number>`sum(${blocks.otherCount})`,
      totalTransactions: sql<number>`sum(${blocks.transactionCount})`,
    })
    .from(blocks)
    .where(gte(blocks.timestamp, oneDayAgo));
}

// ==============================================
// 🔍 DETAILED LOOKUPS
// ==============================================

// 13. Get Contract Details
export async function getContractDetails(db: any, contractAddress: string, days = 7) {
  const daysAgo = BigInt(Math.floor(Date.now() / 1000) - days * 24 * 60 * 60);
  
  const usage = await db
    .select({
      totalTransactions: sql<number>`sum(${contractUsage.transactionCount})`,
      totalGasUsed: sql<bigint>`sum(${contractUsage.gasUsed})`,
      avgGasPerTx: sql<bigint>`sum(${contractUsage.gasUsed}) / sum(${contractUsage.transactionCount})`,
      primaryType: sql<string>`mode() within group (order by ${contractUsage.transactionType})`,
    })
    .from(contractUsage)
    .where(
      and(
        eq(contractUsage.contractAddress, contractAddress as `0x${string}`),
        gte(contractUsage.blockTimestamp, daysAgo)
      )
    )
    .groupBy(contractUsage.contractAddress);

  const walletInteractions = await db
    .select({
      uniqueWallets: sql<number>`count(distinct ${walletContractInteractions.walletAddress})`,
      totalInteractions: sql<number>`sum(${walletContractInteractions.transactionCount})`,
    })
    .from(walletContractInteractions)
    .where(
      and(
        eq(walletContractInteractions.contractAddress, contractAddress as `0x${string}`),
        gte(walletContractInteractions.blockTimestamp, daysAgo)
      )
    );

  return {
    usage: usage[0],
    interactions: walletInteractions[0],
  };
}

// 14. Get Wallet Details  
export async function getWalletDetails(db: any, walletAddress: string, days = 7) {
  const daysAgo = BigInt(Math.floor(Date.now() / 1000) - days * 24 * 60 * 60);
  
  const gasUsage = await db
    .select({
      totalGasUsed: sql<bigint>`sum(${walletGasUsage.totalGasUsed})`,
      totalTransactions: sql<number>`sum(${walletGasUsage.transactionCount})`,
      uniqueContracts: sql<number>`sum(${walletGasUsage.contractsInteracted})`,
    })
    .from(walletGasUsage)
    .where(
      and(
        eq(walletGasUsage.walletAddress, walletAddress as `0x${string}`),
        gte(walletGasUsage.blockTimestamp, daysAgo)
      )
    );

  const monActivity = await db
    .select({
      totalSent: sql<bigint>`sum(${monWalletActivity.totalSent})`,
      totalReceived: sql<bigint>`sum(${monWalletActivity.totalReceived})`,
      totalTransfers: sql<number>`sum(${monWalletActivity.transferCount})`,
    })
    .from(monWalletActivity)
    .where(
      and(
        eq(monWalletActivity.walletAddress, walletAddress as `0x${string}`),
        gte(monWalletActivity.blockTimestamp, daysAgo)
      )
    );

  return {
    gas: gasUsage[0],
    mon: monActivity[0],
  };
}

// ==============================================
// 💳 INDIVIDUAL TRANSACTION QUERIES
// ==============================================

// 15. Get Recent Transactions (for Transaction Log)
export async function getRecentTransactions(db: any, limit = 50) {
  return await db
    .select({
      hash: transactions.hash,
      blockNumber: transactions.blockNumber,
      blockTimestamp: transactions.blockTimestamp,
      transactionIndex: transactions.transactionIndex,
      fromAddress: transactions.fromAddress,
      toAddress: transactions.toAddress,
      value: transactions.value,
      valueInMon: sql<number>`${transactions.value}::float / 1e18`,
      gasUsed: transactions.gasUsed,
      gasPrice: transactions.gasPrice,
      transactionType: transactions.transactionType,
      methodSignature: transactions.methodSignature,
      success: transactions.success,
      contractAddress: transactions.contractAddress,
    })
    .from(transactions)
    .orderBy(desc(transactions.blockTimestamp), desc(transactions.transactionIndex))
    .limit(limit);
}

// 16. Get Transactions by Block Number
export async function getTransactionsByBlock(db: any, blockNumber: bigint) {
  return await db
    .select({
      hash: transactions.hash,
      transactionIndex: transactions.transactionIndex,
      fromAddress: transactions.fromAddress,
      toAddress: transactions.toAddress,
      value: transactions.value,
      valueInMon: sql<number>`${transactions.value}::float / 1e18`,
      gasUsed: transactions.gasUsed,
      gasPrice: transactions.gasPrice,
      transactionType: transactions.transactionType,
      methodSignature: transactions.methodSignature,
      success: transactions.success,
      contractAddress: transactions.contractAddress,
    })
    .from(transactions)
    .where(eq(transactions.blockNumber, blockNumber))
    .orderBy(asc(transactions.transactionIndex));
}

// 17. Get Transactions by Wallet Address
export async function getTransactionsByWallet(db: any, walletAddress: string, limit = 50) {
  return await db
    .select({
      hash: transactions.hash,
      blockNumber: transactions.blockNumber,
      blockTimestamp: transactions.blockTimestamp,
      transactionIndex: transactions.transactionIndex,
      fromAddress: transactions.fromAddress,
      toAddress: transactions.toAddress,
      value: transactions.value,
      valueInMon: sql<number>`${transactions.value}::float / 1e18`,
      gasUsed: transactions.gasUsed,
      gasPrice: transactions.gasPrice,
      transactionType: transactions.transactionType,
      methodSignature: transactions.methodSignature,
      success: transactions.success,
      contractAddress: transactions.contractAddress,
      direction: sql<string>`CASE 
        WHEN ${transactions.fromAddress} = ${walletAddress} THEN 'sent'
        WHEN ${transactions.toAddress} = ${walletAddress} THEN 'received'
        ELSE 'unknown'
      END`,
    })
    .from(transactions)
    .where(
      or(
        eq(transactions.fromAddress, walletAddress as `0x${string}`),
        eq(transactions.toAddress, walletAddress as `0x${string}`)
      )
    )
    .orderBy(desc(transactions.blockTimestamp), desc(transactions.transactionIndex))
    .limit(limit);
}

// 18. Get Transaction by Hash
export async function getTransactionByHash(db: any, hash: string) {
  const result = await db
    .select({
      hash: transactions.hash,
      blockNumber: transactions.blockNumber,
      blockTimestamp: transactions.blockTimestamp,
      transactionIndex: transactions.transactionIndex,
      fromAddress: transactions.fromAddress,
      toAddress: transactions.toAddress,
      value: transactions.value,
      valueInMon: sql<number>`${transactions.value}::float / 1e18`,
      gasUsed: transactions.gasUsed,
      gasPrice: transactions.gasPrice,
      gasLimit: transactions.gasLimit,
      transactionType: transactions.transactionType,
      methodSignature: transactions.methodSignature,
      inputData: transactions.inputData,
      success: transactions.success,
      nonce: transactions.nonce,
      contractAddress: transactions.contractAddress,
    })
    .from(transactions)
    .where(eq(transactions.hash, hash as `0x${string}`))
    .limit(1);
    
  return result[0] || null;
}

// 19. Get Transactions by Type
export async function getTransactionsByType(db: any, txType: string, limit = 50) {
  return await db
    .select({
      hash: transactions.hash,
      blockNumber: transactions.blockNumber,
      blockTimestamp: transactions.blockTimestamp,
      fromAddress: transactions.fromAddress,
      toAddress: transactions.toAddress,
      value: transactions.value,
      valueInMon: sql<number>`${transactions.value}::float / 1e18`,
      gasUsed: transactions.gasUsed,
      transactionType: transactions.transactionType,
      methodSignature: transactions.methodSignature,
      contractAddress: transactions.contractAddress,
    })
    .from(transactions)
    .where(eq(transactions.transactionType, txType))
    .orderBy(desc(transactions.blockTimestamp), desc(transactions.transactionIndex))
    .limit(limit);
}

// 20. Get Transactions by Contract Address
export async function getTransactionsByContract(db: any, contractAddress: string, limit = 50) {
  return await db
    .select({
      hash: transactions.hash,
      blockNumber: transactions.blockNumber,
      blockTimestamp: transactions.blockTimestamp,
      fromAddress: transactions.fromAddress,
      value: transactions.value,
      valueInMon: sql<number>`${transactions.value}::float / 1e18`,
      gasUsed: transactions.gasUsed,
      transactionType: transactions.transactionType,
      methodSignature: transactions.methodSignature,
    })
    .from(transactions)
    .where(eq(transactions.contractAddress, contractAddress as `0x${string}`))
    .orderBy(desc(transactions.blockTimestamp), desc(transactions.transactionIndex))
    .limit(limit);
} 