const RPC_URL = "https://rpc.mainnet.chain.robinhood.com";

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

async function callContract(address, data) {
  return rpc("eth_call", [
    {
      to: address,
      data
    },
    "latest"
  ]);
}

function decodeString(hex) {
  if (!hex || hex === "0x") return null;

  try {
    const bytes = hex.slice(2);

    // Standard ABI dynamic string
    if (bytes.length >= 128) {
      const offset = parseInt(bytes.slice(0, 64), 16) * 2;
      const length = parseInt(bytes.slice(offset, offset + 64), 16);

      const start = offset + 64;
      const raw = bytes.slice(start, start + length * 2);

      return hexToText(raw);
    }

    // bytes32-style string
    return hexToText(bytes.slice(0, 64));
  } catch {
    return null;
  }
}

function hexToText(hex) {
  let output = "";

  for (let i = 0; i < hex.length; i += 2) {
    const value = parseInt(hex.slice(i, i + 2), 16);

    if (value === 0) break;

    if (value >= 32 && value <= 126) {
      output += String.fromCharCode(value);
    }
  }

  return output || null;
}

function decodeUint(hex) {
  if (!hex || hex === "0x") return null;

  try {
    return BigInt(hex).toString();
  } catch {
    return null;
  }
}

async function getTokenMetadata(address) {
  const results = {};

  // ERC-20 name()
  try {
    results.name = decodeString(
      await callContract(
        address,
        "0x06fdde03"
      )
    );
  } catch {
    results.name = "DATA UNVERIFIED";
  }

  // ERC-20 symbol()
  try {
    results.symbol = decodeString(
      await callContract(
        address,
        "0x95d89b41"
      )
    );
  } catch {
    results.symbol = "DATA UNVERIFIED";
  }

  // ERC-20 decimals()
  try {
    const value = await callContract(
      address,
      "0x313ce567"
    );

    results.decimals = decodeUint(value);
  } catch {
    results.decimals = "DATA UNVERIFIED";
  }

  // ERC-20 totalSupply()
  try {
    const value = await callContract(
      address,
      "0x18160ddd"
    );

    results.totalSupply = decodeUint(value);
  } catch {
    results.totalSupply = "DATA UNVERIFIED";
  }

  return results;
}

export default {
  async fetch(request, env, ctx) {
    try {
      const chainHex = await rpc("eth_chainId");
      const chainId = parseInt(chainHex, 16);

      if (chainId !== 4663) {
        return json({
          status: "ERROR",
          message: "Unexpected chain",
          detectedChainId: chainId
        }, 500);
      }

      const latestBlockHex = await rpc("eth_blockNumber");
      const latestBlock = parseInt(latestBlockHex, 16);

      const block = await rpc(
        "eth_getBlockByNumber",
        [latestBlockHex, true]
      );

      const deployments = [];

      // Limit processing to prevent excessive RPC usage.
      const transactions = (block.transactions || []).slice(0, 100);

      for (const tx of transactions) {
        if (tx.to !== null) continue;

        deployments.push({
          transactionHash: tx.hash,
          creator: tx.from,
          blockNumber: latestBlock
        });
      }

      const candidates = [];

      // Check a small number of new contracts.
      for (const deployment of deployments.slice(0, 10)) {
        try {
          const metadata = await getTokenMetadata(
            deployment.transactionHash
          );

          candidates.push({
            ...deployment,
            metadata
          });
        } catch {
          candidates.push({
            ...deployment,
            metadata: "DATA UNVERIFIED"
          });
        }
      }

      return json({
        agent: "Robinhood Chain Meme Hunter",
        version: "V2",

        status: "ONLINE",

        chain: {
          name: "Robinhood Chain",
          chainId,
          rpcStatus: "CONNECTED"
        },

        scan: {
          latestBlock,
          transactionsChecked: transactions.length,
          contractCreationsFound: deployments.length
        },

        candidates,

        dataIntegrity: {
          contractDeployments: "CONFIRMED",
          tokenMetadata: "PARTIALLY VERIFIED",
          marketCap: "DATA UNVERIFIED",
          liquidity: "DATA UNVERIFIED",
          holders: "DATA UNVERIFIED",
          volume: "DATA UNVERIFIED",
          smartMoney: "DATA UNVERIFIED",
          socialMomentum: "DATA UNVERIFIED"
        },

        timestamp: new Date().toISOString()
      });

    } catch (error) {
      return json({
        agent: "Robinhood Chain Meme Hunter",
        version: "V2",
        status: "ERROR",
        error: error.message,
        timestamp: new Date().toISOString()
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
