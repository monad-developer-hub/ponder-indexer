import { ponder } from "ponder:registry";
import { eventEmitter, updateBlockTracking } from './websocket';

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
  const { client } = context;
  
  // Get full block with transactions for analysis
  const fullBlock = await client.getBlock({
    blockNumber: block.number,
    includeTransactions: true,
  });
  
  const transactionCount = fullBlock.transactions?.length || 0;
  
  // Update block tracking for TPS calculation
  updateBlockTracking(block.number, block.timestamp, transactionCount);
  
  // Track transaction type counts
  const txTypeCounts = {
    transfer: 0,
    swap: 0,
    mint: 0,
    burn: 0,
    stake: 0,
    other: 0,
  };
  
  // Emit block event
  eventEmitter.emit({
    type: 'block',
    data: {
      number: block.number,
      hash: block.hash,
      timestamp: block.timestamp,
      transactionCount: fullBlock.transactions.length,
      gasUsed: block.gasUsed,
      gasLimit: block.gasLimit
    },
    timestamp: Date.now()
  });

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

    // Emit transaction event
    eventEmitter.emit({
      type: 'transaction',
      data: {
        hash: tx.hash,
        blockNumber: block.number,
        blockTimestamp: block.timestamp,
        fromAddress: tx.from,
        toAddress: tx.to || '',
        value: tx.value,
        gasUsed: tx.gas || 0n,
        gasPrice: tx.gasPrice || 0n,
        transactionType: txType,
        methodSignature: tx.input.slice(0, 10),
        success: true,
        contractAddress: tx.to || ''
      },
      timestamp: Date.now()
    });

    // If it's a MON transfer, emit transfer event
    if (monAmount > 0n) {
      eventEmitter.emit({
        type: 'monTransfer',
        data: {
          transactionHash: tx.hash,
          fromAddress: tx.from,
          toAddress: tx.to || '',
          amount: tx.value,
          gasUsed: tx.gas || 0n
        },
        timestamp: Date.now()
      });

      // Update and emit wallet activity
      eventEmitter.emit({
        type: 'monWalletActivity',
        data: {
          walletAddress: tx.from,
          totalSent: tx.value,
          totalReceived: 0n,
          transferCount: 1,
          sentCount: 1,
          receivedCount: 0
        },
        timestamp: Date.now()
      });

      if (tx.to) {
        eventEmitter.emit({
          type: 'monWalletActivity',
          data: {
            walletAddress: tx.to,
            totalSent: 0n,
            totalReceived: tx.value,
            transferCount: 1,
            sentCount: 0,
            receivedCount: 1
          },
          timestamp: Date.now()
        });
      }
    }

    // If it's a contract interaction, emit contract usage event
    if (contractAddress) {
      eventEmitter.emit({
        type: 'contractUsage',
        data: {
          contractAddress: tx.to || '',
          transactionCount: 1,
          gasUsed: tx.gas || 0n,
          avgGasPerTx: tx.gas || 0n,
          transactionType: txType
        },
        timestamp: Date.now()
      });

      // Emit wallet-contract interaction event
      eventEmitter.emit({
        type: 'walletContractInteraction',
        data: {
          walletAddress: tx.from,
          contractAddress: tx.to || '',
          transactionCount: 1,
          gasUsed: tx.gas || 0n,
          avgGasPerTx: tx.gas || 0n,
          transactionType: txType
        },
        timestamp: Date.now()
      });
    }

    // Emit wallet gas usage event
    eventEmitter.emit({
      type: 'walletGasUsage',
      data: {
        walletAddress: tx.from,
        totalGasUsed: tx.gas || 0n,
        transactionCount: 1,
        avgGasPerTx: tx.gas || 0n,
        contractsInteracted: 1
      },
      timestamp: Date.now()
    });
  }

  // Log block processing info
  console.log(`📦 Block ${block.number.toLocaleString()} processed`);
  console.log(`   📊 Transactions: ${txList.length}`);
  console.log(`   💸 Transfers: ${txTypeCounts.transfer}`);
  console.log(`   🔄 Swaps: ${txTypeCounts.swap}`);
  console.log(`   🏭 Mints: ${txTypeCounts.mint}`);
  console.log(`   🔥 Burns: ${txTypeCounts.burn}`);
  console.log(`   🥩 Stakes: ${txTypeCounts.stake}`);
  console.log(`   ❓ Other: ${txTypeCounts.other}`);
  console.log("─".repeat(60));
});


