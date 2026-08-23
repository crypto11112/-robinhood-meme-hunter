const RPC_URL = "https://rpc.mainnet.chain.robinhood.com";

export default {
  async fetch(request, env, ctx) {
    try {
      const response = await fetch(RPC_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_chainId",
          params: [],
          id: 1
        })
      });

      const data = await response.json();

      return new Response(JSON.stringify({
        agent: "Robinhood Chain Meme Hunter",
        status: "ONLINE",
        robinhoodChain: {
          expectedChainId: 4663,
          detectedChainId: data.result
        },
        rpcStatus: data.result === "0x1237" ? "CONNECTED" : "CHECK_REQUIRED",
        timestamp: new Date().toISOString()
      }, null, 2), {
        headers: {
          "Content-Type": "application/json"
        }
      });

    } catch (error) {
      return new Response(JSON.stringify({
        agent: "Robinhood Chain Meme Hunter",
        status: "ERROR",
        error: error.message
      }, null, 2), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
  }
};
