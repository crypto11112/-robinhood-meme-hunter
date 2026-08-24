constVERSION="V61";

constCHAIN_ID=4663;
constCHAIN_NAME="RobinhoodChain";

constPUBLIC_RPC=
"https://rpc.mainnet.chain.robinhood.com";

constPOOL_MANAGER=
"0x8366a39cc670b4001a1121b8f6a443a643e40951";

constENTRY_CONTRACTS=[
"0x0000ffffbe8efe702c8703ae3477ff5de3d319c0",
"0x00004c4ccc709ef590f7c81102c0689f0263d4e9"
];

constLAUNCHPADS=[
"0x23f8209572b4a1c2ad88a42749e830791fb027f1",
"0xad44d55e7f8337c3ce113fbb591486e85be104b2",
"0x60d73b21cdf2ea846ab3d58699bbbb8f29d72491",
"0xce57498d3474dcc244dfb6710ffbe6d4441cd2b2"
];

constMINT_FAST_LAUNCHPAD=
"0xd61998ae9b29e1f19dfb70ba890bc85895c83f1b";

constDISCOVERY_CONTRACTS=[
...ENTRY_CONTRACTS,
...LAUNCHPADS,
MINT_FAST_LAUNCHPAD
];

constZERO=
"0x0000000000000000000000000000000000000000";

constTRANSFER_TOPIC=
"0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a1f";

constSCORE_THRESHOLD=60;

constDISCOVERY_BLOCKS=10;
constV4_BLOCKS=10;
constACTIVITY_BLOCKS=10;

constRPC_TIMEOUT_MS=2500;

constMAX_DISCOVERY_CALLS=7;
constMAX_TOKEN_CHECKS=10;


/*=========================================================
ADDRESSHELPERS
=========================================================*/

functionisAddress(value){
return/^0x[a-fA-F0-9]{40}$/.test(value||"");
}

functionisZeroAddress(value){
return(
!value||
value.toLowerCase()===ZERO
);
}

functionisValidToken(value){
return(
isAddress(value)&&
!isZeroAddress(value)
);
}

functionunique(values){
return[
...newSet(
values
.filter(Boolean)
.map(x=>x.toLowerCase())
)
];
}

functiontopicAddress(topic){
if(
!topic||
typeoftopic!=="string"
){
returnnull;
}

constclean=
topic.startsWith("0x")
?topic.slice(2)
:topic;

if(
clean.length!==64||
!/^[0-9a-fA-F]+$/.test(clean)
){
returnnull;
}

constaddress=
"0x"+clean.slice(24);

returnisValidToken(address)
?address.toLowerCase()
:null;
}


/*=========================================================
SAFEHEX/BIGINTHELPERS
=========================================================*/

functionsafeBigInt(value){
if(
typeofvalue!=="string"||
value.length===0||
value==="0x"
){
returnnull;
}

try{
returnBigInt(value);
}catch{
returnnull;
}
}

functionsafeNumber(value){
constn=safeBigInt(value);

if(n===null){
returnnull;
}

constnumber=Number(n);

returnNumber.isSafeInteger(number)
?number
:null;
}

functionhexWord(data,index){
if(
typeofdata!=="string"||
!data.startsWith("0x")
){
returnnull;
}

constclean=data.slice(2);

conststart=index*64;
constend=start+64;

if(
end>clean.length
){
returnnull;
}

return(
"0x"+
clean.slice(start,end)
);
}


/*=========================================================
RPCPROVIDERS
=========================================================*/

functionalchemyEndpoint(env){
if(!env.ALCHEMY_API_KEY){
returnnull;
}

return(
"https://robinhood-mainnet.g.alchemy.com/v2/"+
env.ALCHEMY_API_KEY
);
}

asyncfunctionrpcRequest(
endpoint,
method,
params
){
constcontroller=
newAbortController();

consttimer=
setTimeout(
()=>controller.abort(),
RPC_TIMEOUT_MS
);

try{
constresponse=
awaitfetch(
endpoint,
{
method:"POST",

headers:{
"content-type":
"application/json"
},

body:
JSON.stringify({
jsonrpc:"2.0",
id:
Date.now()+
Math.random(),

method,
params
}),

signal:
controller.signal
}
);

consttext=
awaitresponse.text();

letdata;

try{
data=
JSON.parse(text);
}catch{
thrownewError(
`RPCinvalidJSONHTTP${response.status}`
);
}

if(!response.ok){
thrownewError(
`RPCHTTP${response.status}`
);
}

if(data.error){
thrownewError(
data.error.message||
"RPCerror"
);
}

returndata.result;

}finally{
clearTimeout(timer);
}
}


/*=========================================================
PUBLICRPCPRIMARY/ALCHEMYFALLBACK
=========================================================*/

asyncfunctionrpc(
env,
method,
params=[]
){
constproviders=[];

providers.push({
name:
"ROBINHOOD_PUBLIC_RPC",

endpoint:
PUBLIC_RPC
});

constalchemy=
alchemyEndpoint(env);

if(alchemy){
providers.push({
name:
"ALCHEMY",

endpoint:
alchemy
});
}

letlastError=
"NO_RPC_PROVIDER";

for(
constproviderof
providers
){
try{
constresult=
awaitrpcRequest(
provider.endpoint,
method,
params
);

return{
result,
provider:
provider.name,
error:null
};

}catch(error){
lastError=
error?.message||
String(error);
}
}

return{
result:null,
provider:null,
error:
lastError
};
}


/*=========================================================
BLOCKNUMBER
=========================================================*/

asyncfunctionlatestBlock(env){
constresponse=
awaitrpc(
env,
"eth_blockNumber"
);

if(
!response.result
){
thrownewError(
response.error||
"Unabletoreadlatestblock"
);
}

constblock=
safeBigInt(
response.result
);

if(block===null){
thrownewError(
"Invalidblocknumber"
);
}

returnNumber(block);
}


/*=========================================================
LOGQUERY
=========================================================*/

asyncfunctiongetLogs(
env,
filter
){
constresponse=
awaitrpc(
env,
"eth_getLogs",
[filter]
);

return{
logs:
Array.isArray(
response.result
)
?response.result
:[],

provider:
response.provider,

error:
response.error
};
}

functionblockHex(block){
return(
"0x"+
block.toString(16)
);
}


/*=========================================================
GENERICCONTRACTLOGS
=========================================================*/

asyncfunctiongetContractLogs(
env,
contract,
fromBlock,
toBlock,
topics=undefined
){
if(
!isAddress(contract)
){
return{
logs:[],
provider:null,
error:
"INVALID_CONTRACT"
};
}

constfilter={
address:
contract,

fromBlock:
blockHex(fromBlock),

toBlock:
blockHex(toBlock)
};

if(
topics!==undefined
){
filter.topics=
topics;
}

returngetLogs(
env,
filter
);
}


/*=========================================================
V4INITIALIZEEVENT
=========================================================*/

/*
UniswapV4Initialize:

eventInitialize(
PoolIdindexedid,
Currencyindexedcurrency0,
Currencyindexedcurrency1,
uint24fee,
int24tickSpacing,
IHookshooks,
uint160sqrtPriceX96,
int24tick
);

Therefore:

topics[0]=eventsignature
topics[1]=poolId
topics[2]=currency0
topics[3]=currency1

TheremainingfieldsareABI-encodedindata.

Weintentionallydecodethecurrencypositionsdirectly.
*/

functiondecodeInitialize(log){
if(
!Array.isArray(log?.topics)
){
returnnull;
}

if(
log.topics.length<4
){
returnnull;
}

constcurrency0=
topicAddress(
log.topics[2]
);

constcurrency1=
topicAddress(
log.topics[3]
);

constpoolId=
log.topics[1]||
null;

if(
!poolId||
!/^0x[0-9a-fA-F]{64}$/.test(poolId)
){
returnnull;
}

letfee=null;
lettickSpacing=null;
lethooks=null;
letsqrtPriceX96=null;
lettick=null;

constfeeWord=
hexWord(log.data,0);

consttickSpacingWord=
hexWord(log.data,1);

consthooksWord=
hexWord(log.data,2);

constsqrtPriceWord=
hexWord(log.data,3);

consttickWord=
hexWord(log.data,4);

if(feeWord){
fee=
safeNumber(
feeWord
);
}

if(tickSpacingWord){
constraw=
safeBigInt(
tickSpacingWord
);

if(raw!==null){
constvalue=
Number(raw);

/*
ABIint24valuesaresign-extended.
*/

tickSpacing=
value>=0x800000
?value-0x1000000
:value;
}
}

if(hooksWord){
hooks=
topicAddress(
hooksWord
);
}

if(sqrtPriceWord){
sqrtPriceX96=
safeBigInt(
sqrtPriceWord
)?.toString()||
null;
}

if(tickWord){
constraw=
safeBigInt(
tickWord
);

if(raw!==null){
constvalue=
Number(raw);

tick=
value>=0x800000
?value-0x1000000
:value;
}
}

return{
poolId:
poolId.toLowerCase(),

currency0,

currency1,

fee,

tickSpacing,

hooks,

sqrtPriceX96,

tick,

txHash:
log.transactionHash||
null,

blockNumber:
log.blockNumber||
null,

logIndex:
log.logIndex||
null
};
}


/*=========================================================
V4DISCOVERY
=========================================================*/

asyncfunctiondiscoverV4(
env,
latest
){
constfrom=
Math.max(
0,
latest-
V4_BLOCKS+
1
);

/*
Wedonotusebroadunfilteredaddressextraction.

WefilterspecificallytoPoolManageranddecode
theInitializeevent.
*/

constresult=
awaitgetContractLogs(
env,
POOL_MANAGER,
from,
latest
);

constinitializeEvents=
[];

consttokenCandidates=
newMap();

for(
constlogof
result.logs
){
constdecoded=
decodeInitialize(
log
);

if(!decoded){
continue;
}

initializeEvents.push(
decoded
);

constcurrencies=[
decoded.currency0,
decoded.currency1
];

for(
consttokenof
currencies
){
if(
!isValidToken(token)
){
continue;
}

/*
Nativecurrencyisrepresentedbyaddress(0)
andisdeliberatelyexcluded.
*/

if(
!tokenCandidates.has(
token
)
){
tokenCandidates.set(
token,
{
token,

source:
"V4_INITIALIZE",

contract:
POOL_MANAGER,

poolId:
decoded.poolId,

currency0:
decoded.currency0,

currency1:
decoded.currency1,

fee:
decoded.fee,

tickSpacing:
decoded.tickSpacing,

hooks:
decoded.hooks,

sqrtPriceX96:
decoded.sqrtPriceX96,

tick:
decoded.tick,

txHash:
decoded.txHash,

blockNumber:
decoded.blockNumber,

v4Evidence:
true,

launchEvidence:
false
}
);
}
}
}

return{
fromBlock:
from,

toBlock:
latest,

rawLogs:
result.logs.length,

initializeEvents,

swapEvents:[],

candidates:
[...tokenCandidates.values()],

rpcError:
result.error,

provider:
result.provider
};
}


/*=========================================================
LAUNCHPADDISCOVERY
=========================================================*/

asyncfunctiondiscoverLaunchpads(
env,
latest
){
constfrom=
Math.max(
0,
latest-
DISCOVERY_BLOCKS+
1
);

constcandidates=
newMap();

constobservations=
[];

for(
constcontractof
DISCOVERY_CONTRACTS
){
constresult=
awaitgetContractLogs(
env,
contract,
from,
latest
);

constobservation={
contract,

logsFound:
result.logs.length,

provider:
result.provider,

error:
result.error
};

observations.push(
observation
);

/*
Launchpadlogsarenotassumedtohavea
universalABI.Weinspectindexedtopics/data,
butV4getsitsownexactdecoderabove.
*/

for(
constlogof
result.logs
){
if(
!Array.isArray(
log.topics
)
){
continue;
}

for(
consttopicof
log.topics.slice(1)
){
constaddress=
topicAddress(
topic
);

if(
!isValidToken(
address
)
){
continue;
}

if(
address===
contract.toLowerCase()
){
continue;
}

if(
!candidates.has(
address
)
){
candidates.set(
address,
{
token:
address,

source:
"LAUNCHPAD_LOG",

contract,

txHash:
log.transactionHash||
null,

blockNumber:
log.blockNumber||
null,

launchEvidence:
true,

v4Evidence:
false
}
);
}
}
}
}

return{
fromBlock:
from,

toBlock:
latest,

blocks:
latest-from+1,

contractsChecked:
DISCOVERY_CONTRACTS.length,

observations,

candidates:
[...candidates.values()]
};
}


/*=========================================================
ERC20CALL
=========================================================*/

asyncfunctionethCall(
env,
address,
data
){
if(
!isValidToken(address)
){
returnnull;
}

constresponse=
awaitrpc(
env,
"eth_call",
[
{
to:
address,

data
},

"latest"
]
);

if(
!response.result||
response.result===
"0x"
){
returnnull;
}

returnresponse.result;
}


/*=========================================================
ABITEXTDECODER
=========================================================*/

functiondecodeText(value){
if(
typeofvalue!=="string"||
value==="0x"||
value.length<2
){
returnnull;
}

constclean=
value.slice(2);

try{
/*
bytes32/string-compatiblereturn.

SomeERC20contractsreturnstringdynamically.
*/

if(
clean.length>=128
){
constoffset=
safeNumber(
"0x"+
clean.slice(
0,
64
)
);

if(
offset!==null
){
conststart=
offset*2;

if(
start+64<=
clean.length
){
constlength=
safeNumber(
"0x"+
clean.slice(
start,
start+64
)
);

if(
length!==null
){
constdataStart=
start+64;

constdataEnd=
dataStart+
length*2;

if(
dataEnd<=
clean.length
){
constbytes=
[];

for(
leti=
dataStart;
i<
dataEnd;
i+=2
){
bytes.push(
parseInt(
clean.slice(
i,
i+2
),
16
)
);
}

consttext=
newTextDecoder()
.decode(
newUint8Array(
bytes
)
)
.replace(
/\0/g,
""
)
.trim();

if(
text
){
returntext;
}
}
}
}
}
}

/*
bytes32fallback.
*/

if(
clean.length>=64
){
constbytes=
[];

for(
leti=0;
i<64;
i+=2
){
constbyte=
parseInt(
clean.slice(
i,
i+2
),
16
);

if(
byte===0
){
break;
}

bytes.push(
byte
);
}

if(
bytes.length
){
returnnewTextDecoder()
.decode(
newUint8Array(
bytes
)
)
.trim();
}
}

}catch{
returnnull;
}

returnnull;
}


/*=========================================================
ERC20VERIFICATION
=========================================================*/

asyncfunctionverifyERC20(
env,
token
){
if(
!isValidToken(token)
){
return{
validERC20:
false,

reason:
"ZERO_OR_INVALID_ADDRESS"
};
}

constname=
awaitethCall(
env,
token,
"0x06fdde03"
);

constsymbol=
awaitethCall(
env,
token,
"0x95d89b41"
);

constdecimals=
awaitethCall(
env,
token,
"0x313ce567"
);

constsupply=
awaitethCall(
env,
token,
"0x18160ddd"
);

constdecodedName=
decodeText(name);

constdecodedSymbol=
decodeText(symbol);

constdecodedDecimals=
safeNumber(
decimals
);

constdecodedSupply=
safeBigInt(
supply
);

/*
RequireallfourbasicERC20calls.

Thisdeliberatelyrejectscontractsthatmerely
happentolookliketokenaddresses.
*/

constvalid=
!!decodedName&&
!!decodedSymbol&&
decodedDecimals!==null&&
decodedSupply!==null;

return{
validERC20:
valid,

reason:
valid
?"ERC20_VERIFIED"
:"ERC20_METHODS_NOT_VERIFIED",

name:
decodedName||
null,

symbol:
decodedSymbol||
null,

decimals:
decodedDecimals,

totalSupply:
decodedSupply!==null
?decodedSupply.toString()
:null
};
}


/*=========================================================
TOKENACTIVITY
=========================================================*/

asyncfunctionactivity(
env,
token,
latest
){
if(
!isValidToken(token)
){
return{
transfers:0,
wallets:0,
provider:null,
rpcError:
"INVALID_TOKEN"
};
}

constfrom=
Math.max(
0,
latest-
ACTIVITY_BLOCKS+
1
);

constresult=
awaitgetContractLogs(
env,
token,
from,
latest,
[
TRANSFER_TOPIC
]
);

lettransfers=0;

constwallets=
[];

for(
constlogof
result.logs
){
if(
log.topics?.[0]
?.toLowerCase()!==
TRANSFER_TOPIC
){
continue;
}

transfers++;

constfromWallet=
topicAddress(
log.topics?.[1]
);

consttoWallet=
topicAddress(
log.topics?.[2]
);

if(
fromWallet
){
wallets.push(
fromWallet
);
}

if(
toWallet
){
wallets.push(
toWallet
);
}
}

return{
transfers,

wallets:
unique(
wallets
).length,

provider:
result.provider,

rpcError:
result.error
};
}


/*=========================================================
SCORE
=========================================================*/

functionscore(candidate){
letvalue=0;

if(
candidate.validERC20
){
value+=30;
}

if(
candidate.launchEvidence
){
value+=15;
}

if(
candidate.v4Evidence
){
value+=20;
}

if(
candidate.transfers>0
){
value+=Math.min(
15,
candidate.transfers
);
}

if(
candidate.wallets>0
){
value+=Math.min(
10,
candidate.wallets
);
}

if(
candidate.name&&
candidate.symbol
){
value+=10;
}

returnMath.min(
100,
value
);
}


/*=========================================================
TELEGRAM
=========================================================*/

asyncfunctionsendTelegram(
env,
candidate
){
/*
Absolutesafetychecks.
*/

if(
!isValidToken(
candidate.address
)
){
return{
sent:false,

reason:
"BLOCKED_INVALID_OR_ZERO_TOKEN_ADDRESS"
};
}

if(
candidate.validERC20!==
true
){
return{
sent:false,

reason:
"BLOCKED_UNVERIFIED_ERC20"
};
}

if(
!env.TELEGRAM_BOT_TOKEN||
!env.TELEGRAM_CHAT_ID
){
return{
sent:false,

reason:
"TELEGRAM_NOT_CONFIGURED"
};
}

consttext=
[
"🚨ROBINHOODCHAINMEMEHUNTER",

"",

`⭐Score:${candidate.score}/100`,

`🪙${candidate.name}`,

`🔹${candidate.symbol}`,

"",

`📍${candidate.address}`,

"",

`🚀Source:${candidate.source}`,

`📊Transfers:${candidate.transfers}`,

`👛Wallets:${candidate.wallets}`,

candidate.poolId
?`🏊Pool:${candidate.poolId}`
:"",

candidate.fee!==null&&
candidate.fee!==undefined
?`💰Fee:${candidate.fee}`
:"",

"",

"✅VerifiedERC20",

"✅Non-zerotokenaddress",

candidate.v4Evidence
?"✅V4poolevidence"
:"",

"",

"⚠️Marketcapunverified",

"⚠️Liquidityunverified",

"⚠️Holderconcentrationunverified",

"⚠️Smartmoneyunverified",

"",

`RobinhoodChainMemeHunter${VERSION}`
]
.filter(Boolean)
.join("\n");

try{
constresponse=
awaitfetch(
`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
{
method:
"POST",

headers:{
"content-type":
"application/json"
},

body:
JSON.stringify({
chat_id:
env.TELEGRAM_CHAT_ID,

text,

disable_web_page_preview:
true
})
}
);

constresult=
awaitresponse.json();

if(
!response.ok||
!result.ok
){
return{
sent:false,

reason:
result.description||
"TELEGRAM_SEND_FAILED"
};
}

return{
sent:true,

messageId:
result.result?.message_id||
null
};

}catch(error){
return{
sent:false,

reason:
error?.message||
"TELEGRAM_REQUEST_FAILED"
};
}
}


/*=========================================================
SCAN
=========================================================*/

asyncfunctionrunScan(env){
conststart=
Date.now();

constlatest=
awaitlatestBlock(
env
);

/*
RunV4discoveryfirstbecausethisisnow
theprimarysourceofcorrectlydecodedtoken
candidates.
*/

constv4=
awaitdiscoverV4(
env,
latest
);

/*
Launchpaddiscoveryremainsavailableasa
secondarysource.
*/

constlaunchpads=
awaitdiscoverLaunchpads(
env,
latest
);

constcandidateMap=
newMap();

/*
V4candidates.
*/

for(
constitemof
v4.candidates
){
if(
!isValidToken(
item.token
)
){
continue;
}

candidateMap.set(
item.token,
{
...item
}
);
}

/*
Launchpadcandidates.

IfaV4candidatealreadyexists,mergethe
launchpadevidenceratherthanduplicatingit.
*/

for(
constitemof
launchpads.candidates
){
if(
!isValidToken(
item.token
)
){
continue;
}

constexisting=
candidateMap.get(
item.token
);

if(
existing
){
existing.launchEvidence=
true;

if(
existing.source===
"V4_INITIALIZE"
){
existing.source=
"V4_INITIALIZE_PLUS_LAUNCHPAD";
}

}else{
candidateMap.set(
item.token,
{
...item,

launchEvidence:
true,

v4Evidence:
false
}
);
}
}

/*
PrioritiseV4candidates.
*/

constrawCandidates=
[
...candidateMap.values()
]
.sort(
(a,b)=>
Number(
!!b.v4Evidence
)-
Number(
!!a.v4Evidence
)
)
.slice(
0,
MAX_TOKEN_CHECKS
);

constcandidates=
[];

constvalidationResults=
[];

/*
Sequentialvalidationkeepstheworkerbounded.
*/

for(
constrawof
rawCandidates
){
consttoken=
raw.token
?.toLowerCase();

if(
!isValidToken(token)
){
continue;
}

constverification=
awaitverifyERC20(
env,
token
);

validationResults.push({
address:
token,

validERC20:
verification.validERC20,

name:
verification.name,

symbol:
verification.symbol,

reason:
verification.reason
});

if(
!verification.validERC20
){
continue;
}

constusage=
awaitactivity(
env,
token,
latest
);

constcandidate={
address:
token,

name:
verification.name,

symbol:
verification.symbol,

decimals:
verification.decimals,

totalSupply:
verification.totalSupply,

validERC20:
true,

source:
raw.source,

contract:
raw.contract,

poolId:
raw.poolId||
null,

currency0:
raw.currency0||
null,

currency1:
raw.currency1||
null,

fee:
raw.fee??
null,

tickSpacing:
raw.tickSpacing??
null,

hooks:
raw.hooks||
null,

sqrtPriceX96:
raw.sqrtPriceX96||
null,

tick:
raw.tick??
null,

txHash:
raw.txHash||
null,

blockNumber:
raw.blockNumber||
null,

launchEvidence:
!!raw.launchEvidence,

v4Evidence:
!!raw.v4Evidence,

transfers:
usage.transfers,

wallets:
usage.wallets,

activityProvider:
usage.provider,

activityRpcError:
usage.rpcError||
null
};

candidate.score=
score(candidate);

candidates.push(
candidate
);
}

candidates.sort(
(a,b)=>
b.score-
a.score
);

constqualifying=
candidates.filter(
candidate=>
candidate.score>=
SCORE_THRESHOLD&&
candidate.validERC20===
true&&
isValidToken(
candidate.address
)
);

lettelegramResult={
sent:false,

reason:
"NO_VERIFIED_QUALIFYING_CANDIDATE"
};

if(
qualifying.length>0
){
telegramResult=
awaitsendTelegram(
env,
qualifying[0]
);
}

return{
agent:
"RobinhoodChainMemeHunter",

version:
VERSION,

success:
true,

scan:{
status:
"OK",

durationMs:
Date.now()-
start,

latestBlock:
latest,

discoveryWindow:{
fromBlock:
Math.min(
v4.fromBlock,
launchpads.fromBlock
),

toBlock:
latest,

blocks:
latest-
Math.min(
v4.fromBlock,
launchpads.fromBlock
)+
1
},

launchpadDiscovery:{
contractsChecked:
launchpads.contractsChecked,

logsFound:
launchpads.observations.reduce(
(
total,
item
)=>
total+
item.logsFound,
0
),

candidatesExtracted:
launchpads.candidates.length,

observations:
launchpads.observations
},

v4:{
poolManager:
POOL_MANAGER,

fromBlock:
v4.fromBlock,

toBlock:
v4.toBlock,

rawLogs:
v4.rawLogs,

initializeEvents:
v4.initializeEvents.length,

swapEvents:
v4.swapEvents.length,

decodedPools:
v4.initializeEvents.map(
event=>({
poolId:
event.poolId,

currency0:
event.currency0,

currency1:
event.currency1,

fee:
event.fee,

tickSpacing:
event.tickSpacing,

hooks:
event.hooks,

txHash:
event.txHash,

blockNumber:
event.blockNumber
})
),

tokenCandidates:
v4.candidates.length,

rpcError:
v4.rpcError||
null,

provider:
v4.provider
},

uniqueTokenCandidates:
candidateMap.size,

tokenValidationChecks:
validationResults.length,

validERC20Tokens:
candidates.length,

validationResults,

candidates,

qualifyingCandidates:
qualifying.length,

telegramCandidates:
qualifying.length,

telegram:
telegramResult,

dataIntegrity:{
noFabricatedMetrics:
true,

zeroAddressProtection:
true,

boundedRPCWorkload:
true,

publicRpcPrimary:
true,

alchemyFallback:
true,

safeEmptyRPCResults:
true,

exactV4CurrencyDecoding:
true,

tokenContract:
"ERC20_CALL_VERIFIED",

telegramTokenSafety:
"NON_ZERO_VERIFIED_ERC20_ONLY",

walletActivity:
"ERC20_TRANSFER_LOG_BASED",

marketCap:
"UNVERIFIED",

liquidity:
"UNVERIFIED",

holderConcentration:
"UNVERIFIED",

smartMoney:
"UNVERIFIED",

whaleActivity:
"UNVERIFIED",

socialMomentum:
"UNVERIFIED"
},

architecture:
"V61_EXACT_V4_CURRENCY_DECODER_PUBLIC_RPC_PRIMARY_ALCHEMY_FALLBACK",

chain:{
name:
CHAIN_NAME,

chainId:
CHAIN_ID
}
},

timestamp:
newDate().toISOString()
};
}


/*=========================================================
HEALTH
=========================================================*/

asyncfunctionhealth(env){
letblock=
null;

letstatus=
"UNKNOWN";

letprovider=
null;

leterror=
null;

try{
constresult=
awaitrpc(
env,
"eth_blockNumber"
);

if(
result.result
){
constparsed=
safeBigInt(
result.result
);

if(
parsed!==null
){
block=
Number(parsed);

status=
"CONNECTED";

provider=
result.provider;

}else{
status=
"ERROR";

error=
"INVALID_BLOCK_NUMBER";
}

}else{
status=
"ERROR";

error=
result.error;
}

}catch(err){
status=
"ERROR";

error=
err?.message||
String(err);
}

return{
agent:
"RobinhoodChainMemeHunter",

version:
VERSION,

status:
"ONLINE",

routes:[
"/health",
"/rpc-test",
"/scan",
"/test-telegram"
],

chain:{
name:
CHAIN_NAME,

chainId:
CHAIN_ID,

rpc:
"ROBINHOOD_PUBLIC_RPC+ALCHEMY_FALLBACK"
},

providers:{
robinhoodPublicRpc:
PUBLIC_RPC,

alchemyConfigured:
!!env.ALCHEMY_API_KEY
},

rpcStatus:
status,

rpcProvider:
provider,

latestBlock:
block,

error,

rpcTimeoutMs:
RPC_TIMEOUT_MS,

discoveryBlocks:
DISCOVERY_BLOCKS,

maxTokenChecks:
MAX_TOKEN_CHECKS,

telegram:{
configured:
!!env.TELEGRAM_BOT_TOKEN&&
!!env.TELEGRAM_CHAT_ID,

automaticCalls:
true,

minimumScore:
SCORE_THRESHOLD,

tokenVerification:
"REQUIRED",

zeroAddressProtection:
true
},

architecture:
"V61_EXACT_V4_CURRENCY_DECODER_PUBLIC_RPC_PRIMARY_ALCHEMY_FALLBACK",

timestamp:
newDate().toISOString()
};
}


/*=========================================================
RPCTEST
=========================================================*/

asyncfunctionrpcTest(env){
constlatest=
awaitlatestBlock(
env
);

constfrom=
Math.max(
0,
latest-2
);

constrange=
awaitgetContractLogs(
env,
POOL_MANAGER,
from,
latest
);

constdecoded=
[];

for(
constlogof
range.logs
){
constevent=
decodeInitialize(
log
);

if(
event
){
decoded.push(
event
);
}
}

return{
agent:
"RobinhoodChainMemeHunter",

version:
VERSION,

success:
true,

rpcTest:
true,

chain:{
name:
CHAIN_NAME,

chainId:
CHAIN_ID
},

latestBlock:
latest,

fromBlock:
from,

toBlock:
latest,

blockRange:
latest-from+1,

poolManager:{
address:
POOL_MANAGER,

logs:
range.logs.length,

decodedInitializeEvents:
decoded.length,

provider:
range.provider,

error:
range.error
},

decoded:
decoded,

interpretation:{
poolManager:
"Address-filteredeth_getLogs",

initialize:
"ExactV4Initializetopicpositions",

currency0:
"topics[2]",

currency1:
"topics[3]",

tokenDiscovery:
"Currencyaddressesaredecodeddirectly"
},

timestamp:
newDate().toISOString()
};
}


/*=========================================================
ZEROADDRESSTELEGRAMTEST
=========================================================*/

asyncfunctiontelegramTest(env){
constresult=
awaitsendTelegram(
env,
{
address:
ZERO,

validERC20:
true,

score:
100,

name:
"ZERO",

symbol:
"ZERO"
}
);

return{
agent:
"RobinhoodChainMemeHunter",

version:
VERSION,

success:
result.sent===false,

safetyTest:
"ZERO_ADDRESS_BLOCKED",

response:
result,

timestamp:
newDate().toISOString()
};
}


/*=========================================================
RESPONSE
=========================================================*/

functionresponse(
data,
status=200
){
returnnewResponse(
JSON.stringify(
data,
null,
2
),
{
status,

headers:{
"content-type":
"application/json;charset=utf-8",

"cache-control":
"no-store"
}
}
);
}


/*=========================================================
WORKER
=========================================================*/

exportdefault{
asyncfetch(
request,
env
){
consturl=
newURL(
request.url
);

try{
if(
url.pathname===
"/health"
){
returnresponse(
awaithealth(
env
)
);
}

if(
url.pathname===
"/rpc-test"
){
returnresponse(
awaitrpcTest(
env
)
);
}

if(
url.pathname===
"/scan"
){
returnresponse(
awaitrunScan(
env
)
);
}

if(
url.pathname===
"/test-telegram"
){
returnresponse(
awaittelegramTest(
env
)
);
}

returnresponse({
agent:
"RobinhoodChainMemeHunter",

version:
VERSION,

status:
"ONLINE",

routes:[
"/health",
"/rpc-test",
"/scan",
"/test-telegram"
]
});

}catch(error){
returnresponse(
{
agent:
"RobinhoodChainMemeHunter",

version:
VERSION,

success:
false,

error:
error?.message||
String(error),

timestamp:
newDate().toISOString()
},
500
);
}
}
};
