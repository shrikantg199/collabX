const { createClient } = require("redis");

const REDIS_URL = process.env.REDIS_URL?.trim() || "";

let pubClient = null;
let subClient = null;
let connectPromise = null;
let redisEnabled = Boolean(REDIS_URL);
let redisReady = false;
let disabledReason = REDIS_URL
  ? ""
  : "REDIS_URL is not configured. Using local Socket.IO broadcast only.";
let hasLoggedDisabledReason = false;

function registerClientEvents(client, label) {
  client.on("error", (error) => {
    console.error(`Redis ${label} error`, error);
  });
}

function logDisabledReason() {
  if (!disabledReason || hasLoggedDisabledReason) {
    return;
  }

  console.warn(`Redis disabled: ${disabledReason}`);
  hasLoggedDisabledReason = true;
}

async function connectRedis() {
  if (!redisEnabled) {
    logDisabledReason();
    return null;
  }

  if (pubClient?.isOpen && subClient?.isOpen) {
    return { pubClient, subClient };
  }

  if (!connectPromise) {
    connectPromise = (async () => {
      pubClient = createClient({
        url: REDIS_URL,
        socket: {
          connectTimeout: 5000,
          reconnectStrategy: false,
        },
      });
      subClient = pubClient.duplicate();

      registerClientEvents(pubClient, "publisher");
      registerClientEvents(subClient, "subscriber");

      await Promise.all([pubClient.connect(), subClient.connect()]);
      redisReady = true;
      console.log(`Redis connected at ${REDIS_URL}`);

      return { pubClient, subClient };
    })().catch((error) => {
      redisEnabled = false;
      redisReady = false;
      disabledReason = error.message || `Could not connect to Redis at ${REDIS_URL}.`;
      logDisabledReason();
      connectPromise = null;
      return disconnectRedis().then(() => null);
    });
  }

  return connectPromise;
}

async function publish(channel, payload) {
  const clients = await connectRedis();
  if (!clients?.pubClient) {
    return false;
  }

  await clients.pubClient.publish(channel, JSON.stringify(payload));
  return true;
}

async function subscribe(channel, handler) {
  const clients = await connectRedis();
  if (!clients?.subClient) {
    return false;
  }

  await clients.subClient.subscribe(channel, (message) => {
    try {
      handler(JSON.parse(message));
    } catch (error) {
      console.error(`Failed to process Redis message on ${channel}`, error);
    }
  });

  return true;
}

async function disconnectRedis() {
  await Promise.allSettled([pubClient?.quit(), subClient?.quit()]);
  connectPromise = null;
  pubClient = null;
  subClient = null;
  redisReady = false;
}

function isRedisEnabled() {
  return redisEnabled;
}

function isRedisReady() {
  return redisReady;
}

module.exports = {
  connectRedis,
  publish,
  subscribe,
  disconnectRedis,
  isRedisEnabled,
  isRedisReady,
};
