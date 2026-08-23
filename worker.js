const RPC_URL = "https://rpc.mainnet.chain.robinhood.com";

const COINGECKO_NETWORK = "robinhood";

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

async function coinGecko(path, apiKey) {
  const response = await fetch(
    `https://api.coingecko.com${path}`,
    {
      headers: {
        "x-cg-demo-api-key": apiKey
      }
    }
  );

  const text = await response.text();

  let data;

  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("CoinGecko returned invalid JSON");
  }

  if (!response.ok) {
    throw new Error(
      `CoinGecko HTTP ${response.status}: ${
        data.error || data.status?.error_message || "API error"
      }`
    );
  }

  return data;
}

export default {
  async fetch(request, env, ctx) {
    try {
      if (!env.COINGECKO_API_KEY) {
        return json({
          agent: "Robinhood Chain Meme Hunter",
          status: "ERROR",
          error: "COINGECKO_API_KEY secret is missing"
        }, 500);
      }

      // Verify Robinhood Chain
      const chainHex = await rpc("eth_chainId");
      const chainId = parseInt(chainHex, 16);

      if (chainId !== 4663) {
        return json({
          agent: "Robinhood Chain Meme Hunter",
          status: "ERROR",
          detectedChainId: chainId
        }, 500);
      }

      // Verify CoinGecko API access.
      // We intentionally use a lightweight endpoint first.
      const network = await coinGecko(
        `/api/v3/onchain/networks/${COINGECKO_NETWORK}`,
        env.COINGECKO_API_KEY
      );

      return json({
        agent: "Robinhood Chain Meme Hunter",
        version: "V3",
        status: "ONLINE",

        chain: {
          name: "Robinhood Chain",
          chainId: 4663,
          rpcStatus: "CONNECTED"
        },

        coinGecko: {
          status: "CONNECTED",
          network: COINGECKO_NETWORK,
          networkData: network.data || null
        },

        dataIntegrity: {
          rpc: "CONFIRMED",
          chainId: "CONFIRMED",
          coinGeckoConnection: "CONFIRMED",
          tokenDiscovery: "NOT YET BUILT",
          marketCap: "NOT YET BUILT",
          liquidity: "NOT YET BUILT",
          volume: "NOT YET BUILT",
          holders: "NOT YET BUILT",
          smartMoney: "NOT YET BUILT",
          socialMomentum: "NOT YET BUILT"
        },

        timestamp: new Date().toISOString()
      });

    } catch (error) {
      return json({
        agent: "Robinhood Chain Meme Hunter",
        version: "V3",
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
