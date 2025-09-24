import envHelper from "@scolastico-dev/env-helper";
const { $str, $min, $int, $list, $bool, $range } = envHelper;
import { PeerServer } from "peer";

const peer = new PeerServer({
  port: $range("PORT", 1, 65535, 9000),
  path: $str("PEERJS_PATH", "/"),
  allow_discovery: $bool("ALLOW_DISCOVERY", false),
  proxied: $bool("PROXIED", true),
  concurrent_limit: $min("CONCURRENT_LIMIT", 1, 5_000),
  alive_timeout: $min("ALIVE_TIMEOUT", 1, 60_000),
  expire_timeout: $min("EXPIRE_TIMEOUT", 1, 60_000),
  key: $str("KEY", "peerjs"),
  corsOptions: {
    origin: $str("CORS_ORIGIN", "*"),
    methods: $list("CORS_METHODS", ["GET", "POST", "PUT", "DELETE", "OPTIONS"]),
    allowedHeaders: $list("CORS_ALLOWED_HEADERS", ["Origin", "X-Requested-With", "Content-Type", "Accept"]),
    credentials: $bool("CORS_CREDENTIALS", true),
    optionsSuccessStatus: $int("CORS_OPTIONS_SUCCESS_STATUS", 204),
    exposedHeaders: $list("CORS_EXPOSED_HEADERS", []),
    maxAge: $int("CORS_MAX_AGE", 86400),
    preflightContinue: $bool("CORS_PREFLIGHT_CONTINUE", false),
  },
});

peer.on("connection", (client) => {
  console.log(`Client connected: ${client.getId()}`);
});

peer.on("disconnect", (client) => {
  console.log(`Client disconnected: ${client.getId()}`);
});
