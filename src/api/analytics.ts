import { Hono } from "hono";
import { db } from "ponder:api";
import * as queries from "../queries-examples";

const app = new Hono();

// ==============================================
// 🏗️ CONTRACT ANALYTICS ENDPOINTS
// ==============================================

// Most used contracts by transaction count
app.get("/contracts/most-used", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "10");
    const result = await queries.getMostUsedContracts24h(db, limit);
    return c.json({
      success: true,
      data: result,
      meta: {
        description: "Most used contracts by transaction count (24h)",
        limit,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// Most popular contracts by unique wallets
app.get("/contracts/most-popular", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "10");
    const result = await queries.getMostPopularContractsByWallets24h(db, limit);
    return c.json({
      success: true,
      data: result,
      meta: {
        description: "Most popular contracts by unique wallet count (24h)",
        limit,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// Top gas-consuming contracts
app.get("/contracts/top-gas", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "10");
    const result = await queries.getTopGasContracts24h(db, limit);
    return c.json({
      success: true,
      data: result,
      meta: {
        description: "Top gas-consuming contracts (24h)",
        limit,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// Most gas-efficient contracts
app.get("/contracts/most-efficient", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "10");
    const minTxs = parseInt(c.req.query("minTxs") || "100");
    const result = await queries.getMostEfficientContracts24h(db, minTxs, limit);
    return c.json({
      success: true,
      data: result,
      meta: {
        description: "Most gas-efficient contracts (24h)",
        limit,
        minTxs,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// ==============================================
// 👛 WALLET ANALYTICS ENDPOINTS
// ==============================================

// Top gas-spending wallets
app.get("/wallets/top-gas", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "10");
    const result = await queries.getTopGasWallets24h(db, limit);
    return c.json({
      success: true,
      data: result,
      meta: {
        description: "Top gas-spending wallets (24h)",
        limit,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// Most active wallets by contract interactions
app.get("/wallets/most-active", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "10");
    const result = await queries.getMostActiveWallets24h(db, limit);
    return c.json({
      success: true,
      data: result,
      meta: {
        description: "Most active wallets by contract interactions (24h)",
        limit,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// ==============================================
// 💰 MON TOKEN ANALYTICS ENDPOINTS
// ==============================================

// Top MON senders
app.get("/mon/top-senders", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "10");
    const result = await queries.getTopMonSenders24h(db, limit);
    return c.json({
      success: true,
      data: result,
      meta: {
        description: "Top MON senders by volume (24h)",
        limit,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// Top MON receivers
app.get("/mon/top-receivers", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "10");
    const result = await queries.getTopMonReceivers24h(db, limit);
    return c.json({
      success: true,
      data: result,
      meta: {
        description: "Top MON receivers by volume (24h)",
        limit,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// Largest MON transfers
app.get("/mon/largest-transfers", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "20");
    const result = await queries.getLargestMonTransfers24h(db, limit);
    return c.json({
      success: true,
      data: result,
      meta: {
        description: "Largest single MON transfers (24h)",
        limit,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// Most active MON traders
app.get("/mon/most-active-traders", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "10");
    const result = await queries.getMostActiveMonTraders24h(db, limit);
    return c.json({
      success: true,
      data: result,
      meta: {
        description: "Most active MON traders by volume (24h)",
        limit,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// ==============================================
// 📊 NETWORK ANALYTICS ENDPOINTS
// ==============================================

// Network overview
app.get("/network/overview", async (c) => {
  try {
    const result = await queries.getNetworkOverview24h(db);
    return c.json({
      success: true,
      data: result,
      meta: {
        description: "Network overview statistics (24h)",
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// Transaction type breakdown
app.get("/network/transaction-types", async (c) => {
  try {
    const result = await queries.getTransactionTypeBreakdown24h(db);
    return c.json({
      success: true,
      data: result,
      meta: {
        description: "Transaction type breakdown (24h)",
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// ==============================================
// 🔍 DETAILED LOOKUP ENDPOINTS
// ==============================================

// Get contract details
app.get("/contract/:address", async (c) => {
  try {
    const address = c.req.param("address");
    const days = parseInt(c.req.query("days") || "7");
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return c.json({ 
        success: false, 
        error: "Invalid contract address format" 
      }, 400);
    }
    
    const result = await queries.getContractDetails(db, address, days);
    return c.json({
      success: true,
      data: result,
      meta: {
        description: `Contract details for ${address}`,
        address,
        days,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// Get wallet details
app.get("/wallet/:address", async (c) => {
  try {
    const address = c.req.param("address");
    const days = parseInt(c.req.query("days") || "7");
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return c.json({ 
        success: false, 
        error: "Invalid wallet address format" 
      }, 400);
    }
    
    const result = await queries.getWalletDetails(db, address, days);
    return c.json({
      success: true,
      data: result,
      meta: {
        description: `Wallet details for ${address}`,
        address,
        days,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// ==============================================
// 💳 INDIVIDUAL TRANSACTION ENDPOINTS
// ==============================================

// Get recent transactions (for Transaction Log interface)
app.get("/transactions/recent", async (c) => {
  try {
    const limit = parseInt(c.req.query("limit") || "50");
    const result = await queries.getRecentTransactions(db, limit);
    return c.json({
      success: true,
      data: result,
      meta: {
        description: "Recent transactions across all blocks",
        limit,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// Get transactions by block number
app.get("/transactions/block/:blockNumber", async (c) => {
  try {
    const blockNumber = BigInt(c.req.param("blockNumber"));
    const result = await queries.getTransactionsByBlock(db, blockNumber);
    return c.json({
      success: true,
      data: result,
      meta: {
        description: `Transactions in block ${blockNumber}`,
        blockNumber: blockNumber.toString(),
        count: result.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// Get transactions by wallet address
app.get("/transactions/wallet/:address", async (c) => {
  try {
    const address = c.req.param("address");
    const limit = parseInt(c.req.query("limit") || "50");
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return c.json({ 
        success: false, 
        error: "Invalid wallet address format" 
      }, 400);
    }
    
    const result = await queries.getTransactionsByWallet(db, address, limit);
    return c.json({
      success: true,
      data: result,
      meta: {
        description: `Transactions for wallet ${address}`,
        address,
        limit,
        count: result.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// Get transaction by hash
app.get("/transactions/:hash", async (c) => {
  try {
    const hash = c.req.param("hash");
    
    if (!hash || !/^0x[a-fA-F0-9]{64}$/.test(hash)) {
      return c.json({ 
        success: false, 
        error: "Invalid transaction hash format" 
      }, 400);
    }
    
    const result = await queries.getTransactionByHash(db, hash);
    
    if (!result) {
      return c.json({ 
        success: false, 
        error: "Transaction not found" 
      }, 404);
    }
    
    return c.json({
      success: true,
      data: result,
      meta: {
        description: `Transaction details for ${hash}`,
        hash,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// Get transactions by type
app.get("/transactions/type/:type", async (c) => {
  try {
    const txType = c.req.param("type");
    const limit = parseInt(c.req.query("limit") || "50");
    
    const validTypes = ["transfer", "swap", "mint", "burn", "stake", "other"];
    if (!validTypes.includes(txType)) {
      return c.json({ 
        success: false, 
        error: `Invalid transaction type. Valid types: ${validTypes.join(", ")}` 
      }, 400);
    }
    
    const result = await queries.getTransactionsByType(db, txType, limit);
    return c.json({
      success: true,
      data: result,
      meta: {
        description: `${txType} transactions`,
        type: txType,
        limit,
        count: result.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// Get transactions by contract address
app.get("/transactions/contract/:address", async (c) => {
  try {
    const address = c.req.param("address");
    const limit = parseInt(c.req.query("limit") || "50");
    
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return c.json({ 
        success: false, 
        error: "Invalid contract address format" 
      }, 400);
    }
    
    const result = await queries.getTransactionsByContract(db, address, limit);
    return c.json({
      success: true,
      data: result,
      meta: {
        description: `Transactions for contract ${address}`,
        address,
        limit,
        count: result.length,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error instanceof Error ? error.message : "Unknown error" }, 500);
  }
});

// ==============================================
// 📋 API DOCUMENTATION ENDPOINT
// ==============================================

// API documentation
app.get("/", async (c) => {
  return c.json({
    success: true,
    message: "Monad Analytics API",
    version: "1.0.0",
    endpoints: {
      contracts: {
        "/contracts/most-used": "Most used contracts by transaction count (24h)",
        "/contracts/most-popular": "Most popular contracts by unique wallets (24h)",
        "/contracts/top-gas": "Top gas-consuming contracts (24h)",
        "/contracts/most-efficient": "Most gas-efficient contracts (24h)"
      },
      wallets: {
        "/wallets/top-gas": "Top gas-spending wallets (24h)",
        "/wallets/most-active": "Most active wallets by contract interactions (24h)"
      },
      mon: {
        "/mon/top-senders": "Top MON senders by volume (24h)",
        "/mon/top-receivers": "Top MON receivers by volume (24h)",
        "/mon/largest-transfers": "Largest single MON transfers (24h)",
        "/mon/most-active-traders": "Most active MON traders by volume (24h)"
      },
      network: {
        "/network/overview": "Network overview statistics (24h)",
        "/network/transaction-types": "Transaction type breakdown (24h)"
      },
      lookups: {
        "/contract/:address": "Get detailed contract analytics",
        "/wallet/:address": "Get detailed wallet analytics"
      },
      transactions: {
        "/transactions/recent": "Get recent transactions (for Transaction Log)",
        "/transactions/block/:blockNumber": "Get all transactions in a specific block",
        "/transactions/wallet/:address": "Get transactions for a specific wallet",
        "/transactions/:hash": "Get transaction details by hash",
        "/transactions/type/:type": "Get transactions by type (transfer, swap, mint, burn, stake, other)",
        "/transactions/contract/:address": "Get transactions for a specific contract"
      }
    },
    parameters: {
      "limit": "Number of results to return (default: 10)",
      "days": "Number of days to look back (default: 7)",
      "minTxs": "Minimum transactions for efficiency ranking (default: 100)"
    },
          examples: {
        "Most used contracts": "/analytics/contracts/most-used?limit=20",
        "Top gas wallets": "/analytics/wallets/top-gas?limit=15",
        "Contract details": "/analytics/contract/0x123...?days=30",
        "Network overview": "/analytics/network/overview",
        "Recent transactions": "/analytics/transactions/recent?limit=100",
        "Wallet transactions": "/analytics/transactions/wallet/0x123...?limit=50",
        "Transaction by hash": "/analytics/transactions/0xabc123...",
        "Swap transactions": "/analytics/transactions/type/swap?limit=25"
      }
  });
});

export default app; 