import express from "express";
import axios from "axios";
import crypto from "crypto";

const app = express();
const port = process.env.PORT || 3000;
const cache = new Map();

app.get("/:org/:repo", async (req, res) => {
  console.log(`[${req.params.org}/${req.params.repo}] request from ${req.ip}`);
  const { org, repo } = req.params;
  const pat = process.env[`CFG_${org.toUpperCase()}_PAT`];
  const fakeHashes = process.env[`CFG_${org.toUpperCase()}_FAKE_HASHES`] === "true";
  if (!pat && !fakeHashes) return res.status(403).send("Access denied: PAT not set for organization");

  const ttl = parseInt(process.env[`CFG_${org.toUpperCase()}_TTL`] || "3600", 10);
  const salt = process.env[`CFG_${org.toUpperCase()}_SALT`] || "";

  const cacheKey = `${org}/${repo}`;
  const now = Date.now();

  if (cache.has(cacheKey)) {
    const { timestamp, hash } = cache.get(cacheKey);
    if (now - timestamp < ttl * 1000) return res.type("text/plain").send(hash);
  }

  try {
    if (!pat) throw new Error("PAT not set, generating fake hash");
    
    const headers = { Authorization: `token ${pat}` };
    const { data } = await axios.get(`https://api.github.com/repos/${org}/${repo}/branches`, { headers });
    
    const branch = data.find(b => b.name === "main") || data.find(b => b.name === "master") || data[0];
    if (!branch) throw new Error("No branches found, generating fake hash");

    const commitHash = branch.commit.sha;
    const hashed = salt ? crypto.createHash("sha256").update(commitHash + salt).digest("hex") : commitHash;
    
    console.log(`[${org}/${repo}] caching ${commitHash} => ${hashed}`);
    cache.set(cacheKey, { timestamp: now, hash: hashed });
    res.type("text/plain").send(hashed);
  } catch (err) {
    console.error(err);
    if (fakeHashes) {
      const fakeHash = crypto.randomBytes(32).toString("hex");
      console.log(`[${org}/${repo}] caching fake hash ${fakeHash}`);
      cache.set(cacheKey, { timestamp: now, hash: fakeHash });
      return res.type("text/plain").send(fakeHash);
    }
    res.status(500).send("Error fetching commit");
  }
});

app.listen(port, () => console.log(`Server running on port ${port}`));
