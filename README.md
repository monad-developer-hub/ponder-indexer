# 🏗️ Monad Ponder Indexer

A high-performance blockchain indexer for the Monad testnet built with [Ponder](https://ponder.sh). This service indexes blocks, transactions, and extracts analytics data in real-time from the Monad blockchain.

## 🌟 Features

### 📊 **Real-time Indexing**
- Indexes every block and transaction on Monad testnet
- Processes 100+ blocks efficiently with configurable windows
- Real-time transaction classification (transfer, swap, mint, burn, stake)

### 📈 **Analytics Engine**
- Contract usage tracking and analytics
- Wallet interaction monitoring
- MON token transfer analysis
- Gas usage optimization insights

### 🔌 **APIs & Interfaces**
- **GraphQL API** - Query indexed data with powerful filtering
- **REST Analytics API** - Pre-built analytics endpoints
- **WebSocket Server** - Real-time event streaming

### 🎯 **Transaction Classification**
Automatically classifies transactions by method signature:
- `transfer` - ERC20 transfers and native MON transfers
- `swap` - DEX transactions and token swaps
- `mint` - Token/NFT minting operations
- `burn` - Token burning operations
- `stake` - Staking and yield farming
- `other` - All other contract interactions

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL 12+
- Access to Monad testnet RPC

### Installation

1. **Clone and install dependencies**
   ```bash
   git clone <repository-url>
   cd monad-ponder-indexer
   npm install
   ```

2. **Configure environment**
   ```bash
   # Set RPC URL (optional, defaults to Monad testnet)
   export PONDER_RPC_URL_1="https://testnet-rpc.monad.xyz"
   
   # Set start block (optional, defaults to latest)
   export PONDER_START_BLOCK="1000000"
   ```

3. **Set up database**
   ```bash
   # Create PostgreSQL database
   createdb monad_ponder_indexer
   
   # Generate schema and run migrations
   npm run codegen
   ```

4. **Start the indexer**
   ```bash
   # Development mode (with hot reload)
   npm run dev
   
   # Production mode
   npm run start
   ```

## 🛠️ Configuration

### Environment Variables
```bash
# RPC Configuration
PONDER_RPC_URL_1="https://testnet-rpc.monad.xyz"

# Start Block (optional)
PONDER_START_BLOCK="1000000"  # Or latest block

# Database (handled by Ponder)
DATABASE_URL="postgresql://user:pass@localhost:5432/monad_ponder_indexer"

# TPS Calculation Window
TPS_WINDOW_BLOCKS="100"  # Number of blocks for TPS calculation
```

### Ponder Configuration (`ponder.config.ts`)
```typescript
export default createConfig({
  chains: {
    monad_testnet: {
      id: 10143,
      rpc: "https://testnet-rpc.monad.xyz",
    },
  },
  blocks: {
    monadBlocks: {
      chain: "monad_testnet", 
      startBlock: 1000000,  // Or latest
      interval: 1,  // Index every block
    },
  },
});
```

## 📡 API Reference

### GraphQL API
**Endpoint:** `http://localhost:42069/graphql`

```graphql
# Get recent blocks with transaction counts
query RecentBlocks {
  blockss(orderBy: "number", orderDirection: "desc", limit: 10) {
    items {
      number
      timestamp
      transactionCount
      gasUsed
      transferCount
      swapCount
    }
  }
}

# Get transactions by wallet
query WalletTransactions($wallet: String!) {
  transactionss(
    where: { 
      OR: [
        { fromAddress: $wallet }
        { toAddress: $wallet }
      ]
    }
    limit: 50
  ) {
    items {
      hash
      blockNumber
      fromAddress
      toAddress
      value
      transactionType
    }
  }
}
```

### REST Analytics API
**Base URL:** `http://localhost:42069/analytics`

```bash
# Network overview
GET /analytics/network/overview

# Top contracts by usage
GET /analytics/contracts/most-used?limit=10

# Top gas-spending wallets  
GET /analytics/wallets/top-gas?limit=10

# Largest MON transfers
GET /analytics/mon/largest-transfers?limit=20

# Recent transactions
GET /analytics/transactions/recent?limit=50

# Transaction by hash
GET /analytics/transactions/0xabc123...

# Wallet activity
GET /analytics/wallet/0x123...?days=7

# Contract details
GET /analytics/contract/0x456...?days=30
```

### WebSocket API
**Endpoint:** `ws://localhost:8080`

```javascript
// Connect and subscribe to events
const ws = new WebSocket('ws://localhost:8080');

// Subscribe to specific event types
ws.send(JSON.stringify({
  type: 'subscribe',
  events: ['block', 'transaction', 'networkStats']
}));

// Handle real-time events
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'block':
      console.log('New block:', data.data);
      break;
    case 'transaction':
      console.log('New transaction:', data.data);
      break;
    case 'networkStats':
      console.log('TPS:', data.data.tps);
      break;
  }
};
```

## 📊 Database Schema

The indexer creates several optimized tables:

### Core Tables
- **`blocks`** - Block data with transaction type counts
- **`transactions`** - Individual transaction records
- **`mon_transfers`** - Native MON token transfers

### Analytics Tables  
- **`contract_usage`** - Contract interaction aggregates
- **`wallet_gas_usage`** - Wallet gas consumption tracking
- **`wallet_contract_interactions`** - Wallet-contract relationship data
- **`mon_wallet_activity`** - MON token activity by wallet

## 🔍 Monitoring & Status

### Check Indexer Status
```bash
# Run the status checker
node check-status.js
```

Example output:
```
📊 INDEXER STATUS:
   🏗️  Current Network Block: 1,234,567
   📦 Latest Indexed Block:  1,234,560
   ⏰ Block Time: 2024-01-15 10:30:45
   🔄 Blocks Behind: 7
   ⏱️  Time Delay: 14.2 seconds
   ✅ INDEXER IS UP TO DATE!
```

### Health Endpoints
```bash
# Ponder health
GET http://localhost:42069/_meta

# WebSocket status
GET http://localhost:8080/health
```

## ⚡ Performance

### Optimizations
- **Batch Processing** - Processes multiple transactions per block efficiently
- **Selective Indexing** - Only indexes relevant data fields
- **Optimized Queries** - Pre-aggregated analytics tables
- **Connection Pooling** - Efficient database connections

### Benchmarks
- **Processing Speed**: ~50-100 blocks/second (depending on transaction volume)
- **Memory Usage**: ~500MB-1GB (with 100-block window)
- **Storage**: ~2GB per 1M blocks indexed

## 🧪 Development

### Available Scripts
```bash
npm run dev        # Start with hot reload
npm run start      # Production start
npm run codegen    # Generate schema
npm run lint       # Lint code
npm run typecheck  # Type checking
```

### Adding New Analytics
1. **Update Schema** (`ponder.schema.ts`)
2. **Modify Indexer** (`src/index.ts`) 
3. **Add Queries** (`src/queries-examples.ts`)
4. **Update API** (`src/api/analytics.ts`)

### Example: Adding New Event Tracking
```typescript
// In src/index.ts
ponder.on("monadBlocks:block", async ({ event, context }) => {
  // Your custom indexing logic
  const customMetric = calculateCustomMetric(block);
  
  await context.db.insert(customTable).values({
    blockNumber: block.number,
    customValue: customMetric,
    // ...
  });
});
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-analytics`)
3. Add your changes with tests
4. Run linting: `npm run lint`
5. Submit a Pull Request

## 📝 License

MIT License - see [LICENSE](LICENSE) for details.

## 🔗 Related Projects

- [Monad DevHub Frontend](../monad-devhub-fe/) - Web interface for analytics
- [Monad DevHub Backend](../monad-devhub-be/) - Project management API
- [Indexer Interface](../monad-devhub-indexer-interface/) - Data interface service

---

**Built for the Monad ecosystem** 🚀 