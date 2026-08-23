const RPC_URL = "https://rpc.mainnet.chain.robinhood.com";
const BLOCKSCOUT_V2 =
  "https://robinhoodchain.blockscout.com/api/v2";

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

async function blockscout(path) {
  const response = await fetch(
    `${BLOCKSCOUT_V2}${path}`
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      `Blockscout HTTP ${response.status}`
    );
  }

  return data;
}

function numberOrNull(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function scoreToken(token) {
  let score = 0;

  const marketCap =
    numberOrNull(token.market_cap);

  const holders =
    numberOrNull(
      token.holders_count ??
      token.holders
    );

  const price =
    numberOrNull(token.exchange_rate);

  if (marketCap !== null) {
    score += 20;

    if (
      marketCap > 0 &&
      marketCap < 500000000
    ) {
      score += 10;
    }
  }

  if (holders !== null) {
    if (holders >= 100) score += 10;
    if (holders >= 500) score += 10;
    if (holders >= 1000) score += 10;
  }

  if (price !== null && price > 0) {
    score += 5;
  }

  return Math.min(score, 100);
}

export default {
  async fetch(request, env, ctx) {
    try {
      // -----------------------------
      // 1. Verify Robinhood Chain
      // -----------------------------

      const chainHex =
        await rpc("eth_chainId");

      const chainId =
        parseInt(chainHex, 16);

      if (chainId !== 4663) {
        return json({
          agent:
            "Robinhood Chain Meme Hunter",
          version: "V5",
          status: "ERROR",
          detectedChainId: chainId
        }, 500);
      }

      // -----------------------------
      // 2. Get latest block
      // -----------------------------

      const latestBlockHex =
        await rpc("eth_blockNumber");

      const latestBlock =
        parseInt(latestBlockHex, 16);

      // -----------------------------
      // 3. Get ERC-20 token list
      // -----------------------------

      const tokenData =
        await blockscout(
          "/tokens?type=ERC-20"
        );

      const rawTokens =
        Array.isArray(tokenData.items)
          ? tokenData.items
          : [];

      // -----------------------------
      // 4. Filter obvious official
      //    stock-token names
      // -----------------------------

      const excludedSymbols = new Set([
        "AAPL",
        "AMZN",
        "AMD",
        "COIN",
        "GOOGL",
        "META",
        "MSFT",
        "NFLX",
        "NVDA",
        "PLTR",
        "SPY",
        "TSLA",
        "QQQ"
      ]);

      const candidates =
        rawTokens
          .filter(token => {
            const symbol =
              String(
                token.symbol || ""
              ).toUpperCase();

            const name =
              String(
                token.name || ""
              ).toLowerCase();

            if (
              excludedSymbols.has(symbol)
            ) {
              return false;
            }

            if (
              name.includes(
                "robinhood token"
              )
            ) {
              return false;
            }

            return true;
          })
          .map(token => ({
            name:
              token.name ||
              "DATA UNVERIFIED",

            symbol:
              token.symbol ||
              "DATA UNVERIFIED",

            contract:
              token.address ||
              token.address_hash ||
              "DATA UNVERIFIED",

            type:
              token.type ||
              "DATA UNVERIFIED",

            price:
              token.exchange_rate ??
              "DATA UNVERIFIED",

            marketCap:
              token.market_cap ??
              token.circulating_market_cap ??
              "DATA UNVERIFIED",

            holders:
              token.holders_count ??
              token.holders ??
              "DATA UNVERIFIED",

            totalSupply:
              token.total_supply ??
              "DATA UNVERIFIED",

            decimals:
              token.decimals ??
              "DATA UNVERIFIED"
          }))
          .map(token => ({
            ...token,
            discoveryScore:
              scoreToken({
                market_cap:
                  token.marketCap,
                holders_count:
                  token.holders
              })
          }))
          .sort(
            (a, b) =>
              b.discoveryScore -
              a.discoveryScore
          )
          .slice(0, 25);

      // -----------------------------
      // 5. Return results
      // -----------------------------

      return json({
        agent:
          "Robinhood Chain Meme Hunter",

        version: "V5",

        status: "ONLINE",

        chain: {
          name:
            "Robinhood Chain",
          chainId: 4663,
          rpcStatus:
            "CONNECTED"
        },

        explorer: {
          name:
            "Blockscout",
          apiVersion: "V2",
          status:
            "CONNECTED"
        },

        scan: {
          latestBlock,
          tokensReturned:
            rawTokens.length,
          candidatesReturned:
            candidates.length
        },

        candidates,

        scoring: {
          type:
            "PRELIMINARY DISCOVERY SCORE",
          warning:
            "NOT AN INVESTMENT SCORE",
          maximum: 100
        },

        dataIntegrity: {
          tokenName:
            "VERIFIED WHERE INDEXED",

          tokenSymbol:
            "VERIFIED WHERE INDEXED",

          contract:
            "VERIFIED WHERE INDEXED",

          price:
            "VERIFIED WHERE INDEXED",

          marketCap:
            "VERIFIED WHERE INDEXED",

          holders:
            "VERIFIED WHERE INDEXED",

          liquidity:
            "DATA UNVERIFIED",

          volume:
            "DATA UNVERIFIED",

          whaleActivity:
            "DATA UNVERIFIED",

          smartMoney:
            "DATA UNVERIFIED",

          socialMomentum:
            "DATA UNVERIFIED"
        },

        nextStage:
          "Liquidity, volume and holder-activity analysis",

        timestamp:
          new Date().toISOString()
      });

    } catch (error) {
      return json({
        agent:
          "Robinhood Chain Meme Hunter",

        version: "V5",

        status: "ERROR",

        error:
          error.message,

        timestamp:
          new Date().toISOString()
      }, 500);
    }
  }
};

function json(data, status = 200) {
  return new Response(
    JSON.stringify(
      data,
      null,
      2
    ),
    {
      status,
      headers: {
        "Content-Type":
          "application/json"
      }
    }
  );
}
