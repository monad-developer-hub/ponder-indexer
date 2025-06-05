import { ponder } from "ponder:registry";
import { blocks, contractUsage } from "ponder:schema";

// Efficient transaction type classifier based on method signatures only
function classifyTransactionByMethodSig(input: string): string {
  const methodSig = input.slice(0, 10).toLowerCase();
  
  const signatures = {
    // ERC20 Transfer
    "0xa9059cbb": "transfer", // transfer(address,uint256)
    "0x23b872dd": "transfer", // transferFrom(address,address,uint256)
    
    // DEX Swaps
    "0x7ff36ab5": "swap", // swapExactETHForTokens
    "0x18cbafe5": "swap", // swapExactTokensForETH
    "0x38ed1739": "swap", // swapExactTokensForTokens
    "0x8803dbee": "swap", // swapTokensForExactTokens
    "0x5c11d795": "swap", // swapExactTokensForTokensSupportingFeeOnTransferTokens
    "0x791ac947": "swap", // swapExactTokensForETHSupportingFeeOnTransferTokens
    "0x022c0d9f": "swap", // swap(uint256,uint256,address,bytes)
    
    // Minting
    "0x40c10f19": "mint", // mint(address,uint256)
    "0xa0712d68": "mint", // mint(uint256)
    "0x4f02c420": "mint", // mintPosition
    
    // Burning
    "0x42966c68": "burn", // burn(uint256)
    "0x9dc29fac": "burn", // burn(address,uint256)
    "0xa399b6a2": "burn", // burnPosition
    
    // Staking
    "0xa694fc3a": "stake", // stake(uint256)
    "0x2e1a7d4d": "stake", // withdraw(uint256) - could be unstaking
    "0xb6b55f25": "stake", // deposit(uint256)
    "0xe2bbb158": "stake", // deposit(uint256,address)
    "0x379607f5": "stake", // claim()
    "0x4e71d92d": "stake", // claim(address)
  };

  return signatures[methodSig as keyof typeof signatures] || "other";
}

ponder.on("monadBlocks:block", async ({ event, context }) => {
  const { block } = event;
  const { client, db } = context;
  
  // Get full block with transactions for analysis
  const fullBlock = await client.getBlock({
    blockNumber: block.number,
    includeTransactions: true,
  });
  
  const transactionCount = fullBlock.transactions?.length || 0;
  
  // Track contract usage
  const contractStats = new Map<string, {
    transactionCount: number;
    gasUsed: bigint;
    transactionType: string;
  }>();
  
  // Analyze transaction types efficiently (no RPC calls, just method signatures)
  const txTypeCounts = {
    transfer: 0,
    swap: 0,
    mint: 0,
    burn: 0,
    stake: 0,
    other: 0,
  };
  
  for (const tx of fullBlock.transactions || []) {
    const input = tx.input || "0x";
    const gasUsed = BigInt(tx.gas || 0);
    
    let txType: string;
    let contractAddress: string | null = null;
    
    // Simple ETH transfer
    if (tx.value && BigInt(tx.value) > 0n && (input === "0x" || input.length <= 10)) {
      txType = "transfer";
      txTypeCounts.transfer++;
      // For ETH transfers, we can still track the recipient if it's a contract
      if (tx.to) {
        contractAddress = tx.to;
      }
    } else {
      // Contract interaction - classify by method signature
      txType = classifyTransactionByMethodSig(input);
      txTypeCounts[txType as keyof typeof txTypeCounts]++;
      contractAddress = tx.to;
    }
    
    // Track contract usage (only for contract interactions)
    if (contractAddress) {
      const existing = contractStats.get(contractAddress);
      if (existing) {
        existing.transactionCount++;
        existing.gasUsed += gasUsed;
        // Keep the first transaction type we see, or you could implement more sophisticated logic
      } else {
        contractStats.set(contractAddress, {
          transactionCount: 1,
          gasUsed,
          transactionType: txType,
        });
      }
    }
  }
  
  const currentTime = new Date().toISOString();
  const blockTime = new Date(Number(block.timestamp) * 1000).toISOString();
  
  // Store block with transaction type data
  await db.insert(blocks).values({
    number: block.number,
    hash: block.hash,
    timestamp: block.timestamp,
    transactionCount,
    gasUsed: block.gasUsed,
    gasLimit: block.gasLimit,
    transferCount: txTypeCounts.transfer,
    swapCount: txTypeCounts.swap,
    mintCount: txTypeCounts.mint,
    burnCount: txTypeCounts.burn,
    stakeCount: txTypeCounts.stake,
    otherCount: txTypeCounts.other,
  });
  
  // Store contract usage data
  for (const [contractAddress, stats] of contractStats) {
    await db.insert(contractUsage).values({
      id: `${block.number}-${contractAddress}`,
      blockNumber: block.number,
      blockTimestamp: block.timestamp,
      contractAddress: contractAddress as `0x${string}`,
      transactionCount: stats.transactionCount,
      gasUsed: stats.gasUsed,
      transactionType: stats.transactionType,
    });
  }
  
  console.log(`📦 Block ${block.number.toLocaleString()} processed at ${currentTime}`);
  console.log(`   ⏰ Block Time: ${blockTime}`);
  console.log(`   📊 Transactions: ${transactionCount}`);
  console.log(`   💸 Transfers: ${txTypeCounts.transfer}`);
  console.log(`   🔄 Swaps: ${txTypeCounts.swap}`);
  console.log(`   🏭 Mints: ${txTypeCounts.mint}`);
  console.log(`   🔥 Burns: ${txTypeCounts.burn}`);
  console.log(`   🥩 Stakes: ${txTypeCounts.stake}`);
  console.log(`   ❓ Other: ${txTypeCounts.other}`);
  console.log(`   📋 Unique Contracts: ${contractStats.size}`);
  console.log(`   ⛽ Gas Used: ${block.gasUsed.toLocaleString()}`);
  console.log(`   💡 Gas Utilization: ${((Number(block.gasUsed) / Number(block.gasLimit)) * 100).toFixed(2)}%`);
  console.log("─".repeat(60));
});


