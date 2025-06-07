import { ponder } from "ponder:registry";
import { blocks, transactions, contractUsage, walletContractInteractions, walletGasUsage, monTransfers, monWalletActivity } from "ponder:schema";

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
  
  // Track contract usage (aggregated)
  const contractStats = new Map<string, {
    transactionCount: number;
    gasUsed: bigint;
    transactionType: string;
  }>();
  
  // Track wallet-contract interactions
  const walletContractStats = new Map<string, {
    transactionCount: number;
    gasUsed: bigint;
    transactionType: string;
  }>();
  
  // Track wallet gas usage (per wallet)
  const walletGasStats = new Map<string, {
    totalGasUsed: bigint;
    transactionCount: number;
    contractsInteracted: Set<string>;
  }>();
  
  // Track MON transfers
  const monTransfersList: Array<{
    id: string;
    transactionHash: string;
    fromAddress: string;
    toAddress: string;
    amount: bigint;
    gasUsed: bigint;
  }> = [];
  
  // Track MON wallet activity
  const monWalletStats = new Map<string, {
    totalSent: bigint;
    totalReceived: bigint;
    transferCount: number;
    sentCount: number;
    receivedCount: number;
  }>();
  
  // Analyze transaction types efficiently
  const txTypeCounts = {
    transfer: 0,
    swap: 0,
    mint: 0,
    burn: 0,
    stake: 0,
    other: 0,
  };
  
  const txList = fullBlock.transactions || [];
  for (let i = 0; i < txList.length; i++) {
    const tx = txList[i];
    if (!tx) continue;
    
    const input = tx.input || "0x";
    const gasUsed = BigInt(tx.gas || 0);
    const walletAddress = tx.from;
    const monAmount = BigInt(tx.value || 0);
    
    let txType: string;
    let contractAddress: string | null = null;
    
    // Check if this transaction includes MON transfer (value > 0)
    if (monAmount > 0n) {
      // Record MON transfer
      monTransfersList.push({
        id: `${block.number}-${i}`,
        transactionHash: tx.hash,
        fromAddress: tx.from,
        toAddress: tx.to || "0x0000000000000000000000000000000000000000",
        amount: monAmount,
        gasUsed,
      });
      
      // Update sender stats
      const senderStats = monWalletStats.get(tx.from);
      if (senderStats) {
        senderStats.totalSent += monAmount;
        senderStats.transferCount++;
        senderStats.sentCount++;
      } else {
        monWalletStats.set(tx.from, {
          totalSent: monAmount,
          totalReceived: 0n,
          transferCount: 1,
          sentCount: 1,
          receivedCount: 0,
        });
      }
      
      // Update receiver stats (if not a contract creation)
      if (tx.to) {
        const receiverStats = monWalletStats.get(tx.to);
        if (receiverStats) {
          receiverStats.totalReceived += monAmount;
          receiverStats.transferCount++;
          receiverStats.receivedCount++;
        } else {
          monWalletStats.set(tx.to, {
            totalSent: 0n,
            totalReceived: monAmount,
            transferCount: 1,
            sentCount: 0,
            receivedCount: 1,
          });
        }
      }
    }
    
    // Classify transaction type
    if (monAmount > 0n && (input === "0x" || input.length <= 10)) {
      txType = "transfer";
      txTypeCounts.transfer++;
      if (tx.to) {
        contractAddress = tx.to;
      }
    } else {
      txType = classifyTransactionByMethodSig(input);
      txTypeCounts[txType as keyof typeof txTypeCounts]++;
      contractAddress = tx.to;
    }
    
    // Track contract usage (aggregated per contract)
    if (contractAddress) {
      const existing = contractStats.get(contractAddress);
      if (existing) {
        existing.transactionCount++;
        existing.gasUsed += gasUsed;
      } else {
        contractStats.set(contractAddress, {
          transactionCount: 1,
          gasUsed,
          transactionType: txType,
        });
      }
      
      // Track wallet-contract interactions
      const walletContractKey = `${walletAddress}-${contractAddress}`;
      const existingWalletContract = walletContractStats.get(walletContractKey);
      if (existingWalletContract) {
        existingWalletContract.transactionCount++;
        existingWalletContract.gasUsed += gasUsed;
      } else {
        walletContractStats.set(walletContractKey, {
          transactionCount: 1,
          gasUsed,
          transactionType: txType,
        });
      }
    }
    
    // Track wallet gas usage (per wallet across all interactions)
    const existingWallet = walletGasStats.get(walletAddress);
    if (existingWallet) {
      existingWallet.totalGasUsed += gasUsed;
      existingWallet.transactionCount++;
      if (contractAddress) {
        existingWallet.contractsInteracted.add(contractAddress);
      }
    } else {
      const contractsSet = new Set<string>();
      if (contractAddress) {
        contractsSet.add(contractAddress);
      }
      walletGasStats.set(walletAddress, {
        totalGasUsed: gasUsed,
        transactionCount: 1,
        contractsInteracted: contractsSet,
      });
    }

    // Store individual transaction details
    await db.insert(transactions).values({
      hash: tx.hash as `0x${string}`,
      blockNumber: block.number,
      blockTimestamp: block.timestamp,
      transactionIndex: i,
      fromAddress: tx.from as `0x${string}`,
      toAddress: (tx.to || "0x0000000000000000000000000000000000000000") as `0x${string}`,
      value: monAmount,
      gasUsed: gasUsed,
      gasPrice: BigInt(tx.gasPrice || 0),
      gasLimit: BigInt(tx.gas || 0),
      transactionType: txType,
      methodSignature: input.slice(0, 10),
      inputData: input.length > 1000 ? input.slice(0, 1000) + "..." : input, // Truncate very long input data
      success: true, // Assume success for now (we'd need receipt to determine this)
      nonce: BigInt(tx.nonce || 0),
      contractAddress: (contractAddress || "0x0000000000000000000000000000000000000000") as `0x${string}`,
    });
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
      avgGasPerTx: stats.gasUsed / BigInt(stats.transactionCount),
      transactionType: stats.transactionType,
    });
  }
  
  // Store wallet-contract interaction data
  for (const [walletContractKey, stats] of walletContractStats) {
    const [walletAddress, contractAddress] = walletContractKey.split('-');
    await db.insert(walletContractInteractions).values({
      id: `${block.number}-${walletAddress}-${contractAddress}`,
      blockNumber: block.number,
      blockTimestamp: block.timestamp,
      walletAddress: walletAddress as `0x${string}`,
      contractAddress: contractAddress as `0x${string}`,
      transactionCount: stats.transactionCount,
      gasUsed: stats.gasUsed,
      avgGasPerTx: stats.gasUsed / BigInt(stats.transactionCount),
      transactionType: stats.transactionType,
    });
  }
  
  // Store wallet gas usage data
  for (const [walletAddress, stats] of walletGasStats) {
    await db.insert(walletGasUsage).values({
      id: `${block.number}-${walletAddress}`,
      blockNumber: block.number,
      blockTimestamp: block.timestamp,
      walletAddress: walletAddress as `0x${string}`,
      totalGasUsed: stats.totalGasUsed,
      transactionCount: stats.transactionCount,
      avgGasPerTx: stats.totalGasUsed / BigInt(stats.transactionCount),
      contractsInteracted: stats.contractsInteracted.size,
    });
  }
  
  // Store MON transfers
  for (const transfer of monTransfersList) {
    await db.insert(monTransfers).values({
      id: transfer.id,
      blockNumber: block.number,
      blockTimestamp: block.timestamp,
      transactionHash: transfer.transactionHash as `0x${string}`,
      fromAddress: transfer.fromAddress as `0x${string}`,
      toAddress: transfer.toAddress as `0x${string}`,
      amount: transfer.amount,
      gasUsed: transfer.gasUsed,
    });
  }
  
  // Store MON wallet activity
  for (const [walletAddress, stats] of monWalletStats) {
    await db.insert(monWalletActivity).values({
      id: `${block.number}-${walletAddress}`,
      blockNumber: block.number,
      blockTimestamp: block.timestamp,
      walletAddress: walletAddress as `0x${string}`,
      totalSent: stats.totalSent,
      totalReceived: stats.totalReceived,
      transferCount: stats.transferCount,
      sentCount: stats.sentCount,
      receivedCount: stats.receivedCount,
    });
  }
  
  const uniqueWallets = walletGasStats.size;
  const totalMonTransferred = monTransfersList.reduce((sum, transfer) => sum + transfer.amount, 0n);
  const avgGasPerWallet = uniqueWallets > 0 ? Array.from(walletGasStats.values()).reduce((sum, wallet) => sum + wallet.totalGasUsed, 0n) / BigInt(uniqueWallets) : 0n;
  
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
  console.log(`   👛 Unique Wallets: ${uniqueWallets}`);
  console.log(`   💰 MON Transfers: ${monTransfersList.length}`);
  console.log(`   💎 Total MON Moved: ${(Number(totalMonTransferred) / 1e18).toFixed(4)} MON`);
  console.log(`   ⛽ Total Gas Used: ${block.gasUsed.toLocaleString()}`);
  console.log(`   💰 Avg Gas per Wallet: ${avgGasPerWallet.toLocaleString()}`);
  console.log(`   💡 Gas Utilization: ${((Number(block.gasUsed) / Number(block.gasLimit)) * 100).toFixed(2)}%`);
  console.log("─".repeat(60));
});


