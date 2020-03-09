<p align="center">
    <img alt="Goblin Base Server" src="https://gbase-public-static.ams3.cdn.digitaloceanspaces.com/rmg.png" width="300">
  </a>
</p>

<p align="center">
  Goblin Base Server is an open-source backend based on Node.js, Redis and MongoDB made for game/web/apps developers. It's scalable enough to cover thousands of requests per second, tens of thousands DAU, and provide a comfortable realtime multiplayer for a growing player base.
</p>

---

[![GPLv3 License](https://img.shields.io/badge/License-GPL%20v3-yellow.svg)](https://opensource.org/licenses/)
[![Discord Chat](https://img.shields.io/discord/635771686133694464.svg)](https://discord.gg/CuJeNV4)

[![NPM](https://nodei.co/npm/goblin-base-server.png?downloads=true)](https://www.npmjs.com/package/goblin-base-server)

Here are some theses to help you understand Goblin Base Server better:
 - It protects requests with HMAC sign;
 - It keeps no state in app memory instead the state split between 7 Redis instances. So you can scale your cluster up & down far away;
 - Realtime PvP is decoupled into separate nodes cluster - a rooms farm. Each room represents a horizontal Node.js cluster with any amount of apps coupled with separate Redis instance;
 - A matchmaking mechanism selects the freest room for pair. You can scale rooms farm up & down adding or removing rooms, tuning their capacity to find an ideal balance between performance and size of the cluster;
 - It implements Cloud Functions with rich API: read/write profiles data, leaderboards, in-app purchases, matchmaking and PvP, simple PvE. Cloud Functions implements the idea of solving hard problems with casual JavaScript;
 - It implements its Transactions mechanism so doesn't need to work with a database with Transactions functionality;
 - Goblin Base Server work in conjunction with client-side SDKs to make networking maximum casual and to fence out developer from complicated backend-side engineering;
 - Integrates with social networks.

Find out more here: https://goblinserver.com/

# Early access note :pencil:
Right now Goblin Tech Stack is in alpha version (early access) and not feature-complete - some strings here will be noted as (WIP). Check out our roadmap to discover interesting things: https://github.com/orgs/red-machine-games/projects/1

# What is Goblin Tech Stack
It's a set of tools: a Server, a set of client SDKs (WIP), a clustered benchmark tool and deployment & cluster orchestration & any DevOps tool (WIP). In conjunction, they form a rich stack to make & operate high load clouds and get hard problems done with casual javascript.

# Features overview:
 - Accounts & profiles - to login and store schemaless data;
 - Leaderboards;
 - Matchmaking - for searching other players(users);
 - PvE & PvP - a comprehensive engine to develop realtime multiplayer easily (you will never mess with `sockets` anymore);
 - Social networks integrations(WIP) - Facebook, VK.com, OK.ru and much more incoming;
 - Cloud Functions & authoritarian modes - to develop server-side logic easily and make games and apps fully authoritarian;
 - Grouping and Chats(WIP) - a rich API to group players, organize chat rooms or tête-à-tête.

# Getting started
To make it work you need Node.js, Redis and MongoDB of the latest versions. We will start by running it locally and then move to instant cloud deployments.

## Running Goblin Base Server locally
To begin you need to install and run [Node.js](https://nodejs.org/en/), [Redis](https://redis.io/) and [MongoDB](https://www.mongodb.com/) of latest versions.

Note: if you use Windows - try this: https://github.com/microsoftarchive/redis/releases or just order a cloud instance for free: https://redislabs.com/redis-enterprise-cloud/essentials-pricing/.

Goblin Base Server delivered as a usual module that you should require. First of all create a new Node.js empty project with `npm init`, then install the Server: `npm install --save goblin-base-server`. All API presented as `GoblinBase` instance:
```javascript
goblinBase = GoblinBase.getGoblinBase()

// ... a chain-call configurations

start(1337, '127.0.0.1', 'api/', callback);
```
The Server doesn't implement: configurations delivery, logging and process management - it means that it's up to you to pick the most appropriate set of technologies.

At configuration stage you should: configure Redis & MongoDB, include features, insert credentials(if needed), add client-side platforms(with version control and HMAC secrets), hook on logs and require cloud functions like this:
```javascript
goblinBase = GoblinBase.getGoblinBase()
    .hookLogs({ info: console.log, warn: console.log, error: console.error, fatal: console.error })
    .configureDatabase({ connectionUrl: `mongodb://127.0.0.1:27017/the-dev-db` })
    .configureRedis(new GoblinBase.RedisConfig()
        .setupSessionsClient('127.0.0.1', 6379, { db: 0 })
        .setupLeaderboardClient('127.0.0.1', 6379, { db: 1 })
        .setupMatchmakingClient('127.0.0.1', 6379, { db: 2 })
        .setupPvpRoomClient('127.0.0.1', 6379, { db: 3 })
        .setupSimpleGameplayClient('127.0.0.1', 6379, { db: 4 })
        .setupServiceClient('127.0.0.1', 6379, { db: 5 })
        .setupMaintenanceClient('127.0.0.1', 6379, { db: 6 })
        .setupResourceLockerClient('127.0.0.1', 6379, { db: 7 })
    )
    .includeAccounts()
    .includeProfiles()
    .includeCloudFunctions()
    .requireAsCloudFunction(`./cloudFunctions/buyChest.js`)
    .start(1337, '127.0.0.1', 'api/');
```
Note: databases are configured with default values.
Check out a bootstrap project with Goblin Base Server configured by default: https://github.com/red-machine-games/goblin-base-server-bootstrap

Now run the code - you should see GoblinBaseServer logo in the console and "Goblin Base Server run" phrase.

## An example of Cloud Function
```javascript
await lock.self();  // Need to lock self before interactions. Find out more late

var myGold = await getProfileNode('profileData.resources.gold'),    // Read this data from profile
    myCards = await getProfileNode('profileData.cards');

var idOfTargetCard = clientParams.cid;  // Btw we can read client-side argument
if(!idOfTargetCard){    // Check the argument
    return FunctionResponse({ success: false, message: 'No cid parameter' });

if(myGold >= 100){  // Check that player has enough gold
    myGold -= 100;
} else {
    return FunctionResponse({ success: false, message: 'Need more gold' });

var targetCard = myCards.find(e => e.id === idOfTargetCard)

if(!targetCard){    // Check that player has target card and increment level
    return FunctionResponse({ success: false, message: 'No such card' });
} else {
    targetCard.level++;

setProfileNode('profileData.resources.gold', myGold);   // Persist it
setProfileNode('profileData.cards', myCards)

FunctionResponse({ success: true });    // Report success
```
Head to the doc to find out more: https://goblinserver.com/doc/api/cloudFunctions/

Check out the full getting started doc here: https://goblinserver.com/doc/gettingStarted/

## Deploy on Digital Ocean
It's super easy to up & run a virtual machine with the Server on it. Find out how to do it from [This blog post](https://blog.goblinserver.com/blogs/engineering/20191025-up-and-running-goblin-base-server-and-digitalocean/)

## Working from client
To make work with the Server easy enough to not mess with networking and backend infrastructure stuff we keep client-side SDKs that incapsulates as many complicated things as possible:
 - JS SDK: https://github.com/red-machine-games/goblin-javascript-asset
 - Unity SDK: https://github.com/red-machine-games/goblin-unity3d-asset (on very WIP stage)

Head to the links to find out more.

# Scalability
As a Node.js app Goblin Base Server can be run as a single-thread with Redis and MongoDB in localhost but it designed to scale as a cluster as well. Logically we can split cluster into two parts: main web app - for http API, meta features, etc. and farm of PvP rooms - instances carrying multiplayer pairs and crowds(crowds are WIP).

Here are some theses to help you understand Goblin Base Server's scalability:
 - All Node.js apps are state-free while holding state into Redis. Main web app connected with 7 Redis instances(or it can be the same instance but with different `db` option);
 - Main web app and PvP rooms farm communicating through `Matchmaking Redis`;
 - Every single PvP room is designed as the same hierarchy as the main web app - N running Node.js instances orchestrated by single Redis instance, every single PvP room has it's own orchestrating Redis;
 - There is no balancing between PvP rooms and they don't interact with each other - by matchmaking player(user) gets an address of the most uncrowded PvP room and connects directly;P
 - All Node.js instances are connected with the one MongoDB instance (separated connection for atomic acts is WIP).
 - To scale Goblin Base Server horizontally, first of all, you should add more main web apps - add more cores or physical hosts, secondly - scale MongoDB, thirdly add more PvP rooms to meet higher capacity. Try to tune `capacity to rooms count` ratio to balance between comfortable event loop lag and players capacity, add more cores/hosts/Node.js apps inside a single PvP room to increase workforce and reduce event loop lag.
 - Redis is the most performant in this band hence 1-7 single-threaded Redis instances will be enough for a few thousands of RPS.

<p align="center">
    <img alt="Goblin Base Server" src="https://gbase-public-static.ams3.cdn.digitaloceanspaces.com/goblin-base-server-diagram-2.png">
  </a>
</p>

# Benchmarking
Before going public it's a good idea to simulate future workloads. Do you plan a marketing campaign? How much DAU do you plan? Maybe 100k? It's already ~3000 CCU and at least 1000 requests per second or 1000 websocket connections. To benchmark your backend you can use [Goblin Base Benchmark](https://github.com/red-machine-games/goblin-base-benchmark/): it runs on plain javascript scenario and fully distributed.

It means that you can run one scenario on N machines with M cores got `N * M` workers simulating a workload.

Also, we can run benchmarks with any numbers in the cloud for you. Contact us to find out more: hello@goblinserver.com

# Further moves
Check out the full documentation: https://goblinserver.com/doc/

Submit tickets if something wrong

# Security bugs & vulnerabilities
Please don't post information about vulnerabilities in public issues. Email us at security@goblinserver.com instead.

# Managed cloud & Premium support
We offer Goblin Cloud Server - a version with cloud-only features and fully automated DevOps. It means that:
- Server deployment;
- Monitoring and problem solving;
- Updating;
- Scaling up & down;
- Daily backups;
- Data migration;
- Automated benchmarking with [Goblin Base Benchmark](https://github.com/red-machine-games/goblin-base-benchmark/);
- All backend metrics along with CCU, users base size and more metrics by request with Grafana;
- A subdomain with SSL;
- Static files hosting.

Also, you'll be able to operate Goblin Cloud instance from the browser(WIP):
- Seamlessly upload Cloud Functions;
- See live metrics;
- Developer console to operate everything via Cloud Function on-fly.

Premium support includes:
- HelpDesk access;
- Priority help;
- Feature requests;
- Private chat with developers to question us directly.
and more.

Contact us: hello@goblinserver.com

---

# LICENSE

MIT