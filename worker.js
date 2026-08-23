export default {
  async fetch(request, env) {
    return new Response(
      JSON.stringify({
        agent: "Robinhood Chain Meme Hunter",
        status: "ONLINE",
        timestamp: new Date().toISOString()
      }),
      {
        headers: {
          "content-type": "application/json"
        }
      }
    );
  },

  async scheduled(event, env, ctx) {
    console.log(
      "Robinhood Chain scan:",
      new Date().toISOString()
    );
  }
};
