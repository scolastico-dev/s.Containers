const express = require('express');
const bodyParser = require('body-parser');
const sdk = require('matrix-js-sdk');

const app = express();
const port = 3000;

// Environment Variables
const sharedSecret = process.env.SHARED_SECRET;
const serverUrl = process.env.SERVER_URL;
const username = process.env.USERNAME;
const password = process.env.PASSWORD;

// Middleware
app.use(bodyParser.json());

// Global Matrix Client
let globalClient = null;

async function initializeMatrixClient() {
  try {
      // Ensure the configuration is passed as an object with baseUrl
      const client = sdk.createClient({
          baseUrl: serverUrl
      });
      const response = await client.login("m.login.password", {
          user: username,
          password: password
      });
      client.setAccessToken(response.access_token);
      globalClient = client; // Set the global client
      console.log("Logged in to Matrix and set global client.");
  } catch (error) {
      console.error("Failed to login to Matrix:", error);
      process.exit(1); // Exit if cannot login
  }
}

// Route
app.post('/:channelUrl', async (req, res) => {
    const { channelUrl } = req.params;
    const { key } = req.query;
    const { message } = req.body;

    console.log('Request received from:', req.ip);

    // Check shared secret
    if (key !== sharedSecret) {
        return res.status(401).send({ error: 'Unauthorized: Invalid shared secret.' });
    }

    // Ensure the client is initialized
    if (!globalClient) {
        return res.status(500).send({ error: 'Matrix client not initialized.' });
    }

    console.log(`Received message to send to channel ${channelUrl}:`, message);

    try {
        // Attempt to join the room before sending the message
        await globalClient.joinRoom(channelUrl).then(() => {
            console.log(`Joined room: ${channelUrl}`);
        }, (err) => {
            // If joining fails, log the error but attempt to send the message anyway
            // This is because the client might already be in the room, or it's a public room where joining is not necessary
            console.error(`Error joining room ${channelUrl}:`, err);
        });
        
        // Send the message to the specified channel
        await globalClient.sendEvent(channelUrl, "m.room.message", {
            body: message,
            msgtype: "m.text"
        }, "");
        res.send({ success: true, message: 'Message sent successfully.' });
    } catch (error) {
        console.error('Error sending message to Matrix channel:', error);

        // Attempt to refresh login on specific error types indicating token issues
        if (error.message.includes("invalid token")) {
            try {
                await initializeMatrixClient(); // Refresh the client
                // Retry sending the message after refreshing the client
                await globalClient.sendEvent(channelUrl, "m.room.message", {
                    body: message,
                    msgtype: "m.text"
                }, "");
                res.send({ success: true, message: 'Message sent successfully after refreshing session.' });
            } catch (retryError) {
                console.error('Error after retrying with new session:', retryError);
                res.status(500).send({ error: 'Internal Server Error after retry' });
            }
        } else {
            res.status(500).send({ error: 'Internal Server Error' });
        }
    }
});

// Start the server and initialize Matrix client
initializeMatrixClient().then(() => {
    app.listen(port, () => {
        console.log(`Server running on port ${port}`);
    });
});