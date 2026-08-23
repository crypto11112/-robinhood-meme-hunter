/**
*RobinhoodChainMemeHunterV33
*
*KV-FREE/D1-FREE/PAID-API-FREE
*
*Chain:
*RobinhoodChain
*chainId:4663
*
*Architecture:
*-Statelessrolling-windowscanner
*-Oneeth_getLogsrequestperscan
*-Bothlaunchcontractsqueriedtogether
*-NoretrylooponRPC429
*-Maximum5DEXScreenerrequests
*-Telegramonlyforqualifyingcandidates
*
*IMPORTANT:
*WithoutKV/DO,theWorkercannotpersistacursor.
*V33thereforescansarecentrollingblockwindoweachtime.
*/

constVERSION="V33";

constCHAIN_ID=4663;
constCHAIN_SLUG="robinhood";

constRPC_URL="https://rpc.mainnet.chain.robinhood.com";

constDEX_URL=
"https://api.dexscreener.com/tokens/v1/"+CHAIN_SLUG+"/";

constTELEGRAM_API=
"https://api.telegram.org/bot";

constTELEGRAM_CHAT_ID=
"-1004466114680";

/*
*PutyourTelegrambottokeninaCloudflareSecretcalled:
*
*TELEGRAM_BOT_TOKEN
*
*DoNOTputthetokendirectlyintothissourcecode.
*/

/*
*TokenCreated(address)
*/
constTOKEN_CREATED_TOPIC=
"0x2e2b3f61b70d2d131b2a807371103cc98d51adcaa5e9a8f9c32658ad8426e74e";

/*
*RobinhoodChainlaunchcontractsdiscoveredbypreviousversions.
*/
constLAUNCH_CONTRACTS=[
"0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
"0x00004c4ccc709ef590f7c81102c0689f0263d4e9"
];

/*
*Keepthisdeliberatelysmall.
*
*TheRPCendpointpreviouslyreturned429sevenwhile
*theWorkeritselfwaswithinCloudflare'srequestbudget.
*
*Asmallrollingwindowissaferthanrepeatedlysplitting
*failedranges.
*/
constDEFAULT_BLOCK_WINDOW=250;

constMIN_BLOCK_WINDOW=25;

constMAX_BLOCK_WINDOW=500;

/*
*WeintentionallybudgetfarbelowCloudflareFree's
*50external-subrequestlimit.
*/
constMAX_RPC_REQUESTS=2;
constMAX_DEX_REQUESTS=5;

constMAX_TOTAL_EXTERNAL_REQUESTS=
MAX_RPC_REQUESTS+MAX_DEX_REQUESTS+1;

/*
*Candidatefilters.
*
*Thesearedeliberatelyconservative.Atokenmusthave
*aDEXpairandenoughliquidity/volume/activitytomake
*thecandidateworthinvestigating.
*/
constMIN_LIQUIDITY_USD=1000;
constMIN_VOLUME_24H_USD=500;
constMIN_TXNS_24H=10;

constMAX_CANDIDATES_FOR_ALERTING=5;


/*---------------------------------------------------------
*Utility
*---------------------------------------------------------*/

functionjson(data,status=200){
returnnewResponse(
JSON.stringify(data,null,2),
{
status,
headers:{
"content-type":"application/json;charset=utf-8",
"cache-control":"no-store"
}
}
);
}

functionnow(){
returnnewDate().toISOString();
}

functionhexToNumber(hex){
try{
returnNumber.parseInt(hex,16);
}catch{
returnnull;
}
}

functionclamp(value,min,max){
returnMath.max(min,Math.min(max,value));
}

functionnormaliseAddress(address){
if(!address)returnnull;

constclean=String(address).toLowerCase();

if(!/^0x[a-f0-9]{40}$/.test(clean)){
returnnull;
}

returnclean;
}


/*---------------------------------------------------------
*RPC
*---------------------------------------------------------*/

asyncfunctionrpcCall(method,params,requestState){
if(requestState.rpcRequests>=MAX_RPC_REQUESTS){
thrownewError("RPC_BUDGET_EXCEEDED");
}

requestState.rpcRequests++;

letresponse;

try{
response=awaitfetch(RPC_URL,{
method:"POST",
headers:{
"content-type":"application/json"
},
body:JSON.stringify({
jsonrpc:"2.0",
id:requestState.rpcRequests,
method,
params
})
});
}catch(error){
thrownewError(
"RPC_NETWORK_ERROR:"+
String(error?.message||error)
);
}

consttext=awaitresponse.text();

if(response.status===429){
thrownewError("RPC_RATE_LIMITED");
}

if(!response.ok){
thrownewError(
"RPC_HTTP_"+
response.status+
":"+
text.slice(0,300)
);
}

letpayload;

try{
payload=JSON.parse(text);
}catch{
thrownewError("RPC_INVALID_JSON");
}

if(payload.error){
constcode=payload.error.code;

if(
code===429||
code===-32005||
String(payload.error.message||"")
.toLowerCase()
.includes("rate")
){
thrownewError("RPC_RATE_LIMITED");
}

thrownewError(
"RPC_JSONRPC_ERROR:"+
JSON.stringify(payload.error)
);
}

returnpayload.result;
}


/*---------------------------------------------------------
*Latestblock
*---------------------------------------------------------*/

asyncfunctiongetLatestBlock(requestState){
constresult=awaitrpcCall(
"eth_blockNumber",
[],
requestState
);

constblock=hexToNumber(result);

if(!Number.isFinite(block)){
thrownewError("INVALID_LATEST_BLOCK");
}

returnblock;
}


/*---------------------------------------------------------
*Tokenextraction
*---------------------------------------------------------*/

/*
*Supportsthetwocommonpossibilities:
*
*1.Tokenaddressindexedintopics[1]
*2.Tokenaddressencodedineventdata
*/
functionextractTokenAddress(log){
if(!log)returnnull;

consttopics=Array.isArray(log.topics)
?log.topics
:[];

if(topics.length>1){
consttopic=String(topics[1]);

if(topic.length>=42){
constaddress=
"0x"+topic.slice(-40);

constvalid=
normaliseAddress(address);

if(valid)returnvalid;
}
}

constdata=String(log.data||"");

if(
data.startsWith("0x")&&
data.length>=66
){
constaddress=
"0x"+data.slice(-40);

constvalid=
normaliseAddress(address);

if(valid)returnvalid;
}

returnnull;
}


/*---------------------------------------------------------
*TokenCreateddiscovery
*---------------------------------------------------------*/

asyncfunctiondiscoverTokens(
latestBlock,
requestState
){
/*
*Statelessrollingscan.
*
*WedoNOTtrytorecursivelysplitfailedranges.
*ThatwasthemainsourceofRPCrequestexplosions
*inearlierversions.
*/

letwindow=
clamp(
Number(DEFAULT_BLOCK_WINDOW),
MIN_BLOCK_WINDOW,
MAX_BLOCK_WINDOW
);

letfromBlock=
Math.max(0,latestBlock-window+1);

constfilter={
fromBlock:
"0x"+fromBlock.toString(16),

toBlock:
"0x"+latestBlock.toString(16),

address:
LAUNCH_CONTRACTS,

topics:[
TOKEN_CREATED_TOPIC
]
};

letlogs;

try{
logs=awaitrpcCall(
"eth_getLogs",
[filter],
requestState
);
}catch(error){
return{
ok:false,
error:String(error.message||error),
fromBlock,
toBlock:latestBlock,
blocksScanned:window,
rawLogs:0,
tokens:[]
};
}

constunique=newMap();

for(constlogoflogs||[]){
constaddress=
extractTokenAddress(log);

if(!address)continue;

unique.set(
address,
{
address,
block:
hexToNumber(log.blockNumber),
transaction:
log.transactionHash||null,
launchContract:
normaliseAddress(log.address)
}
);
}

return{
ok:true,
fromBlock,
toBlock:latestBlock,
blocksScanned:window,
rawLogs:Array.isArray(logs)
?logs.length
:0,
tokens:Array.from(unique.values())
};
}


/*---------------------------------------------------------
*DEXScreener
*---------------------------------------------------------*/

asyncfunctiondexLookup(
addresses,
requestState
){
if(!addresses.length){
return{
ok:true,
pairs:[]
};
}

if(
requestState.dexRequests>=MAX_DEX_REQUESTS
){
return{
ok:false,
error:"DEX_BUDGET_EXCEEDED",
pairs:[]
};
}

/*
*DEXScreenersupportsmultipletokenaddresses
*inthetokenendpoint.Keepthebatchdeliberately
*smalltostaywellbelowWorkerlimits.
*/
constbatch=
addresses
.slice(0,30)
.join(",");

consturl=
DEX_URL+batch;

requestState.dexRequests++;

letresponse;

try{
response=awaitfetch(url,{
method:"GET",
headers:{
"accept":"application/json"
}
});
}catch(error){
return{
ok:false,
error:
"DEX_NETWORK_ERROR:"+
String(error?.message||error),
pairs:[]
};
}

consttext=
awaitresponse.text();

if(response.status===429){
return{
ok:false,
error:"DEX_RATE_LIMITED",
pairs:[]
};
}

if(!response.ok){
return{
ok:false,
error:
"DEX_HTTP_"+
response.status,
pairs:[]
};
}

letdata;

try{
data=JSON.parse(text);
}catch{
return{
ok:false,
error:"DEX_INVALID_JSON",
pairs:[]
};
}

return{
ok:true,
pairs:
Array.isArray(data)
?data
:[]
};
}


/*---------------------------------------------------------
*Candidatescoring
*---------------------------------------------------------*/

functionsafeNumber(value){
constnumber=
Number(value);

returnNumber.isFinite(number)
?number
:0;
}

functionscorePair(pair){
constliquidity=
safeNumber(
pair?.liquidity?.usd
);

constvolume24h=
safeNumber(
pair?.volume?.h24
);

consttxns24h=
safeNumber(
pair?.txns?.h24?.buys
)+
safeNumber(
pair?.txns?.h24?.sells
);

constbuys24h=
safeNumber(
pair?.txns?.h24?.buys
);

constsells24h=
safeNumber(
pair?.txns?.h24?.sells
);

letscore=0;

if(
liquidity>=
MIN_LIQUIDITY_USD
){
score+=30;
}

if(
volume24h>=
MIN_VOLUME_24H_USD
){
score+=30;
}

if(
txns24h>=
MIN_TXNS_24H
){
score+=20;
}

/*
*Rewardpositivebuy/sellimbalance,
*butdon'tcallit"smartmoney".
*/
if(buys24h>sells24h){
score+=10;
}

if(
liquidity>=10000
){
score+=5;
}

if(
volume24h>=5000
){
score+=5;
}

return{
score,
liquidity,
volume24h,
txns24h,
buys24h,
sells24h
};
}


/*---------------------------------------------------------
*Candidateanalysis
*---------------------------------------------------------*/

functionanalyseCandidates(
tokens,
pairs
){
constbyToken=
newMap();

for(constpairofpairs){
constbase=
normaliseAddress(
pair?.baseToken?.address
);

if(!base)continue;

conststats=
scorePair(pair);

constprevious=
byToken.get(base);

if(
!previous||
stats.score>
previous.stats.score
){
byToken.set(
base,
{
pair,
stats
}
);
}
}

constcandidates=[];

for(consttokenoftokens){
constitem=
byToken.get(
token.address
);

if(!item){
continue;
}

const{
pair,
stats
}=item;

/*
*Hardminimum.
*/
if(
stats.liquidity<
MIN_LIQUIDITY_USD
){
continue;
}

if(
stats.volume24h<
MIN_VOLUME_24H_USD
){
continue;
}

if(
stats.txns24h<
MIN_TXNS_24H
){
continue;
}

candidates.push({
address:
token.address,

name:
pair?.baseToken?.name||
"UNKNOWN",

symbol:
pair?.baseToken?.symbol||
"UNKNOWN",

pairAddress:
pair?.pairAddress||
null,

dexId:
pair?.dexId||
null,

url:
pair?.url||
null,

priceUsd:
safeNumber(
pair?.priceUsd
),

marketCap:
safeNumber(
pair?.marketCap
),

fdv:
safeNumber(
pair?.fdv
),

liquidityUsd:
stats.liquidity,

volume24h:
stats.volume24h,

txns24h:
stats.txns24h,

buys24h:
stats.buys24h,

sells24h:
stats.sells24h,

score:
stats.score,

launchBlock:
token.block,

transaction:
token.transaction
});
}

candidates.sort(
(a,b)=>
b.score-a.score
);

returncandidates.slice(
0,
MAX_CANDIDATES_FOR_ALERTING
);
}


/*---------------------------------------------------------
*Telegram
*---------------------------------------------------------*/

asyncfunctionsendTelegram(
env,
candidates
){
if(
!env.TELEGRAM_BOT_TOKEN
){
return{
sent:false,
reason:
"TELEGRAM_BOT_TOKEN_NOT_CONFIGURED"
};
}

if(!candidates.length){
return{
sent:false,
reason:"NO_ALERT_CANDIDATES"
};
}

constlines=[
`🚨RobinhoodChainMemeHunter${VERSION}`,
"",
`Found${candidates.length}qualifyingearly-stagecandidate(s).`,
""
];

for(
constcandidate
ofcandidates
){
lines.push(
`🔥${candidate.name}($${candidate.symbol})`
);

lines.push(
`Score:${candidate.score}/100`
);

lines.push(
`Liquidity:$${candidate.liquidityUsd.toFixed(0)}`
);

lines.push(
`24hvolume:$${candidate.volume24h.toFixed(0)}`
);

lines.push(
`24htxns:${candidate.txns24h}`
);

lines.push(
`Buys/Sells:${candidate.buys24h}/${candidate.sells24h}`
);

if(
candidate.marketCap>0
){
lines.push(
`Marketcap:$${candidate.marketCap.toFixed(0)}`
);
}

lines.push(
`Contract:${candidate.address}`
);

if(candidate.url){
lines.push(
candidate.url
);
}

lines.push("");
}

lines.push(
"⚠️On-chainlaunchverified.MarketmetricsfromDEXScreener.Smart-money/holderdatanotclaimed."
);

consturl=
TELEGRAM_API+
env.TELEGRAM_BOT_TOKEN+
"/sendMessage";

try{
constresponse=
awaitfetch(url,{
method:"POST",
headers:{
"content-type":
"application/json"
},
body:JSON.stringify({
chat_id:
TELEGRAM_CHAT_ID,

text:
lines.join("\n"),

disable_web_page_preview:
true
})
});

consttext=
awaitresponse.text();

if(!response.ok){
return{
sent:false,
error:
"TELEGRAM_HTTP_"+
response.status,
response:
text.slice(0,300)
};
}

return{
sent:true
};

}catch(error){
return{
sent:false,
error:
String(
error?.message||
error
)
};
}
}


/*---------------------------------------------------------
*Scan
*---------------------------------------------------------*/

asyncfunctionrunScan(env){
conststarted=
Date.now();

constrequestState={
rpcRequests:0,
dexRequests:0
};

letlatestBlock;

try{
latestBlock=
awaitgetLatestBlock(
requestState
);
}catch(error){
return{
agent:
"RobinhoodChainMemeHunter",

version:VERSION,

status:
String(error.message)===
"RPC_RATE_LIMITED"
?"RPC_RATE_LIMITED"
:"RPC_ERROR",

rpc:{
primary:
RPC_URL
},

discovery:{
source:
"ETH_GETLOGS_TOKEN_CREATED_STATELESS",

tokensDiscovered:
0
},

marketData:{
source:
"DEX_SCREENER_BATCH",

status:
"NOT_CALLED"
},

candidates:[],

alerts:[],

scan:{
requestCount:
requestState.rpcRequests,

rpcRequests:
requestState.rpcRequests,

dexRequests:
requestState.dexRequests,

durationMs:
Date.now()-started
},

diagnostics:[
{
type:"rpc",
error:
String(error.message)
}
],

dataIntegrity:{
noFabricatedMetrics:
true,

unavailableData:
"UNVERIFIED"
},

timestamp:
now()
};
}

constdiscovery=
awaitdiscoverTokens(
latestBlock,
requestState
);

if(!discovery.ok){
return{
agent:
"RobinhoodChainMemeHunter",

version:VERSION,

status:
discovery.error===
"RPC_RATE_LIMITED"
?"RPC_RATE_LIMITED"
:"DISCOVERY_ERROR",

chain:{
name:
"RobinhoodChain",

chainId:
CHAIN_ID,

rpc:
RPC_URL
},

discovery:{
source:
"ETH_GETLOGS_TOKEN_CREATED_STATELESS",

latestBlock,

startBlock:
discovery.fromBlock,

endBlock:
discovery.toBlock,

blocksScanned:
discovery.blocksScanned,

rawLogs:
discovery.rawLogs,

tokensDiscovered:
0
},

marketData:{
source:
"DEX_SCREENER_BATCH",

status:
"NOT_CALLED"
},

candidates:[],

alerts:[],

scan:{
requestCount:
requestState.rpcRequests+
requestState.dexRequests,

rpcRequests:
requestState.rpcRequests,

dexRequests:
requestState.dexRequests,

durationMs:
Date.now()-started
},

diagnostics:[
{
type:"rpc",
error:
discovery.error
}
],

dataIntegrity:{
noFabricatedMetrics:
true,

unavailableData:
"UNVERIFIED"
},

timestamp:
now()
};
}

consttokens=
discovery.tokens;

if(!tokens.length){
return{
agent:
"RobinhoodChainMemeHunter",

version:VERSION,

status:
"ONLINE_NO_NEW_TOKENS",

chain:{
name:
"RobinhoodChain",

chainId:
CHAIN_ID,

rpc:
RPC_URL
},

discovery:{
source:
"ETH_GETLOGS_TOKEN_CREATED_STATELESS",

latestBlock,

startBlock:
discovery.fromBlock,

endBlock:
discovery.toBlock,

blocksScanned:
discovery.blocksScanned,

rawLogs:
discovery.rawLogs,

tokensDiscovered:
0,

verifiedTokenAddresses:
[]
},

marketData:{
source:
"DEX_SCREENER_BATCH",

status:
"NOT_CALLED",

candidatesAnalysed:
0
},

candidates:[],

alerts:[],

scan:{
requestCount:
requestState.rpcRequests,

rpcRequests:
requestState.rpcRequests,

dexRequests:
requestState.dexRequests,

durationMs:
Date.now()-started
},

dataIntegrity:{
noFabricatedMetrics:
true,

unavailableData:
"UNVERIFIED"
},

timestamp:
now()
};
}

/*
*OnlyONEDEXrequestforalldiscoveredtokens.
*/
constdex=
awaitdexLookup(
tokens.map(
token=>
token.address
),
requestState
);

if(!dex.ok){
return{
agent:
"RobinhoodChainMemeHunter",

version:VERSION,

status:
"DEX_LOOKUP_UNAVAILABLE",

chain:{
name:
"RobinhoodChain",

chainId:
CHAIN_ID,

rpc:
RPC_URL
},

discovery:{
source:
"ETH_GETLOGS_TOKEN_CREATED_STATELESS",

latestBlock,

startBlock:
discovery.fromBlock,

endBlock:
discovery.toBlock,

blocksScanned:
discovery.blocksScanned,

rawLogs:
discovery.rawLogs,

tokensDiscovered:
tokens.length,

verifiedTokenAddresses:
tokens
},

marketData:{
source:
"DEX_SCREENER_BATCH",

status:
dex.error,

pairsReturned:
0
},

candidates:[],

alerts:[],

scan:{
requestCount:
requestState.rpcRequests+
requestState.dexRequests,

rpcRequests:
requestState.rpcRequests,

dexRequests:
requestState.dexRequests,

durationMs:
Date.now()-started
},

diagnostics:[
{
type:"dex",
error:
dex.error
}
],

dataIntegrity:{
noFabricatedMetrics:
true,

unavailableData:
"UNVERIFIED"
},

timestamp:
now()
};
}

constcandidates=
analyseCandidates(
tokens,
dex.pairs
);

constalerts=
candidates.length
?awaitsendTelegram(
env,
candidates
)
:{
sent:false,
reason:
"NO_QUALIFYING_CANDIDATES"
};

return{
agent:
"RobinhoodChainMemeHunter",

version:VERSION,

status:
"ONLINE",

objective:
"Discoverearly-stageRobinhoodChainmemecoinsusingastatelessultra-low-RPCarchitecture.",

chain:{
name:
"RobinhoodChain",

chainId:
CHAIN_ID,

rpc:
RPC_URL
},

architecture:{
storage:
"NONE",

cursor:
"NONE—rollingwindow",

paidApiKeyRequired:
false,

maxExternalRequests:
MAX_TOTAL_EXTERNAL_REQUESTS,

rpcRequests:
requestState.rpcRequests,

dexRequests:
requestState.dexRequests
},

discovery:{
source:
"ETH_GETLOGS_TOKEN_CREATED_STATELESS",

event:
"TokenCreated(address)",

eventTopic:
TOKEN_CREATED_TOPIC,

launchContracts:
LAUNCH_CONTRACTS,

latestBlock,

startBlock:
discovery.fromBlock,

endBlock:
discovery.toBlock,

blocksScanned:
discovery.blocksScanned,

rawLogs:
discovery.rawLogs,

tokensDiscovered:
tokens.length,

verifiedTokenAddresses:
tokens
},

marketData:{
source:
"DEX_SCREENER",

lookupMode:
"BATCH_MULTI_TOKEN",

pairsReturned:
dex.pairs.length,

candidatesAnalysed:
candidates.length
},

candidates,

alerts:[
alerts
],

telegram:{
configured:
Boolean(
env.TELEGRAM_BOT_TOKEN
),

chatId:
TELEGRAM_CHAT_ID,

alertsSent:
alerts.sent
?1
:0
},

scan:{
requestCount:
requestState.rpcRequests+
requestState.dexRequests,

rpcRequests:
requestState.rpcRequests,

dexRequests:
requestState.dexRequests,

durationMs:
Date.now()-started
},

validation:{
tokenDiscovery:
"VERIFIEDTOKEN_CREATEDEVENT",

tokenAddress:
"VERIFIEDFROMEVENT",

dexPairDiscovery:
"DEXSCREENER",

liquidity:
"DEXSCREENERWHENAVAILABLE",

volume:
"DEXSCREENERWHENAVAILABLE",

buySellPressure:
"BUY/SELLFLOWONLY",

holderConcentration:
"UNVERIFIED",

walletActivity:
"UNVERIFIED",

smartMoney:
"UNVERIFIED",

accumulationDistribution:
"BUY/SELLFLOWONLY"
},

dataIntegrity:{
noFabricatedMetrics:
true,

unavailableData:
"UNVERIFIED"
},

timestamp:
now()
};
}


/*---------------------------------------------------------
*Health
*---------------------------------------------------------*/

functionhealth(){
returnjson({
agent:
"RobinhoodChainMemeHunter",

version:
VERSION,

status:
"ONLINE",

routes:[
"/health",
"/scan",
"/test-telegram"
],

chainId:
CHAIN_ID,

chain:
"RobinhoodChain",

rpc:{
primary:
RPC_URL,

mode:
"PRIMARY_ONLY_STATELESS"
},

discovery:
"ETH_GETLOGS_TOKEN_CREATED_STATELESS",

marketData:
"DEX_SCREENER_BATCH",

telegram:
"CONFIGURED_BY_SECRET",

kvRequired:
false,

d1Required:
false,

paidApiKeyRequired:
false,

persistentCursor:
false,

architecture:
"ULTRA_LOW_RPC_STATELESS",

maxExternalRequests:
MAX_TOTAL_EXTERNAL_REQUESTS,

cron:
"ENABLED_VIA_WRANGLER",

timestamp:
now()
});
}


/*---------------------------------------------------------
*Telegramtest
*---------------------------------------------------------*/

asyncfunctiontestTelegram(env){
if(
!env.TELEGRAM_BOT_TOKEN
){
returnjson({
agent:
"RobinhoodChainMemeHunter",

version:
VERSION,

success:
false,

error:
"TELEGRAM_BOT_TOKEN_NOT_CONFIGURED"
},500);
}

consturl=
TELEGRAM_API+
env.TELEGRAM_BOT_TOKEN+
"/sendMessage";

try{
constresponse=
awaitfetch(url,{
method:"POST",

headers:{
"content-type":
"application/json"
},

body:JSON.stringify({
chat_id:
TELEGRAM_CHAT_ID,

text:
`✅RobinhoodChainMemeHunter${VERSION}Telegramtest\n\n${now()}`
})
});

consttext=
awaitresponse.text();

letresult;

try{
result=
JSON.parse(text);
}catch{
result=
text;
}

returnjson({
agent:
"RobinhoodChainMemeHunter",

version:
VERSION,

telegramConfigured:
true,

success:
response.ok,

response:
result,

timestamp:
now()
});

}catch(error){
returnjson({
agent:
"RobinhoodChainMemeHunter",

version:
VERSION,

success:
false,

error:
String(
error?.message||
error
)
},500);
}
}


/*---------------------------------------------------------
*Worker
*---------------------------------------------------------*/

exportdefault{
asyncfetch(request,env,ctx){
consturl=
newURL(request.url);

constpath=
url.pathname.replace(
/\/+$/,
""
)||"/";

if(
request.method!==
"GET"&&
request.method!==
"POST"
){
returnnewResponse(
"MethodNotAllowed",
{
status:405
}
);
}

if(
path==="/"||
path==="/health"
){
returnhealth();
}

if(
path==="/scan"
){
constresult=
awaitrunScan(env);

returnjson(
result,
result.status===
"RPC_RATE_LIMITED"
?429
:200
);
}

if(
path==="/test-telegram"
){
returntestTelegram(
env
);
}

/*
*V33deliberatelyhasno/resetroutebecause
*thereisnopersistentKVcursortoreset.
*/
if(
path==="/reset"
){
returnjson({
agent:
"RobinhoodChainMemeHunter",

version:
VERSION,

status:
"STATELESS",

message:
"NopersistentcursorexistsinV33.Nothingneedsresetting."
});
}

returnjson({
agent:
"RobinhoodChainMemeHunter",

version:
VERSION,

error:
"NOT_FOUND",

routes:[
"/health",
"/scan",
"/test-telegram",
"/reset"
]
},404);
},


/*
*Cronrunsthesamestatelessscanner.
*
*BecausethereisnoKVcursor,eachrunchecks
*thelatestrollingblockwindow.
*/
asyncscheduled(event,env,ctx){
ctx.waitUntil(
runScan(env)
.catch(
()=>{}
)
);
}
};
