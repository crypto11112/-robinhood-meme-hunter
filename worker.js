const RPC_URL = "https://rpc.mainnet.chain.robinhood.com";
const BLOCKSCOUT_API = "https://robinhoodchain.blockscout.com/api";

async function rpc(method, params = []) {
  const response = await fetch(RPC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method,
      params,
      id: 1
    })
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || "RPC error");
  }

  return data.result;
}

async function blockscout(params) {
  const url = new URL(BLOCKSCOUT_API);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url.toString());
  const data = await response.json();

  if (!response.ok) {
    throw new Error(`Blockscout HTTP ${response.status}`);
  }

  return data;
}

async function readContract(address, selector) {
  return rpc("eth_call", [
    {
      to: address,
      data: selector
    },
    "latest"
  ]);
}

function decodeUint(hex) {
  if (!hex || hex === "0x") return null;

  try {
    return BigInt(hex).toString();
  } catch {
    return null;
  }
}

function decodeBytes32(hex) {
  if (!hex || hex === "0x") return null;

  try {
    const bytes = hex.slice(2);
    let output = "";

    for (let i = 0; i < bytes.length; i += 2) {
      const value = parseInt(bytes.slice(i, i + 2), 16);

      if (value === 0) break;

      if (value >= 32 && value <= 126) {
        output += String.fromCharCode(value);
      }
    }

    return output || null;
  } catch {
    return null;
  }
}

async function getTokenMetadata(address) {
  const metadata = {
    name: "DATA UNVERIFIED",
    symbol: "DATA UNVERIFIED",
    decimals: "DATA UNVERIFIED",
    totalSupply: "DATA UNVERIFIED"
  };

  try {
    const result = await readContract(
      address,
      "0x06fdde03"
    );

    metadata.name = decodeBytes32(result) || "DATA UNVERIFIED";
  } catch {}

  try {
    const result = await readContract(
      address,
      "0x95d89b41"
    );

    metadata.symbol = decodeBytes32(result) || "DATA UNVERIFIED";
  } catch {}

  try {
    const result = await readContract(
      address,
      "0x313ce567"
    );

    metadata.decimals = decodeUint(result) ?? "DATA UNVERIFIED";
  } catch {}

  try {
    const result = await readContract(
      address,
      "0x18160ddd"
    );

    metadata.totalSupply =
      decodeUint(result) ?? "DATA UNVERIFIED";
  } catch {}

  return metadata;
}

export default {
  async fetch(request, env, ctx) {
    try {
      // --------------------------------
      // 1. Verify Robinhood Chain
      // --------------------------------

      const chainHex = await rpc("eth_chainId");
      const chainId = parseInt(chainHex, 16);

      if (chainId !== 4663) {
        return json({
          agent: "Robinhood Chain Meme Hunter",
          version: "V4",
          status: "ERROR",
          detectedChainId: chainId
        }, 500);
      }

      // --------------------------------
      // 2. Get latest block
      // --------------------------------

      const latestBlockHex =
        await rpc("eth_blockNumber");

      const latestBlock =
        parseInt(latestBlockHex, 16);

      // --------------------------------
      // 3. Read latest block
      // --------------------------------

      const block = await rpc(
        "eth_getBlockByNumber",
        [latestBlockHex, true]
      );

      const transactions =
        block?.transactions || [];

      // --------------------------------
      // 4. Find contract deployments
      // --------------------------------

      const deployments = [];

      for (const tx of transactions) {
        if (tx.to === null) {
          deployments.push({
            transactionHash: tx.hash,
            creator: tx.from,
            blockNumber: latestBlock
          });
        }
      }

      // --------------------------------
      // 5. Blockscout health check
      // --------------------------------

      let blockscoutStatus = "CONNECTED";

      try {
        await blockscout({
          module: "stats",
          action: "ethsupply"
        });
      } catch {
        blockscoutStatus = "UNAVAILABLE";
      }

      // --------------------------------
      // 6. Return scanner status
      // --------------------------------

      return json({
        agent: "Robinhood Chain Meme Hunter",
        version: "V4",
        status: "ONLINE",

        chain: {
          name: "Robinhood Chain",
          chainId: 4663,
          rpcStatus: "CONNECTED"
        },

        explorer: {
          name: "Blockscout",
          status: blockscoutStatus
        },

        scan: {
          latestBlock,
          transactionsChecked:
            transactions.length,
          contractCreationsFound:
            deployments.length
        },

        deployments,

        dataIntegrity: {
          chainId: "CONFIRMED",
          latestBlock: "CONFIRMED",
          contractDeployments: "CONFIRMED",
          tokenName: "NOT YET SCANNED",
          tokenSymbol: "NOT YET SCANNED",
          holders: "DATA UNVERIFIED",
          liquidity: "DATA UNVERIFIED",
          volume: "DATA UNVERIFIED",
          marketCap: "DATA UNVERIFIED",
          whaleActivity: "DATA UNVERIFIED",
          smartMoney: "DATA UNVERIFIED",
          socialMomentum: "DATA UNVERIFIED"
        },

        nextStage:
          "ERC20 token discovery and verification",

        timestamp:
          new Date().toISOString()
      });

    } catch (error) {
      return json({
        agent: "Robinhood Chain Meme Hunter",
        version: "V4",
        status: "ERROR",
        error: error.message,
        timestamp:
          new Date().toISOString()
      }, 500);
    }
  }
};

function json(data, status = 200) {
  return new Response(
    JSON.stringify(data, null, 2),
    {
      status,
      headers: {
        "Content-Type": "application/json"
      }
    }
  );
}
