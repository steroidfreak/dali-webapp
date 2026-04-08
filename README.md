# SpiderWeb

My AI lab — real systems you can try.

Built on Express with live demos for DALI lighting control, content tools, and automation. Everything runs on a single DigitalOcean droplet.

## Run locally

```bash
npm install
npm start
```

The app starts on `PORT` or `3000`.

## Environment variables

| Variable | Description |
|---|---|
| `PORT` | HTTP port for the site |
| `MQTT_BROKER` | MQTT broker URL for the DALI bridge |
| `NUM_LIGHTS` | Number of DALI lights shown in the demo |
| `TELEGRAM_BOT_TOKEN` | Bot token for fault alert notifications |
| `TELEGRAM_CHAT_ID` | Chat ID to send Telegram alerts to |

## Services

- **DALI Lighting Control** — real-time MQTT/Socket.IO dashboard
- **Content Tools** — document generator and YouTube transcription

## Content updates

- Edit service page copy in `content/services/*.md`
- Add new blog posts in `content/blog/*.md`

## DigitalOcean deployment

1. Create a droplet with Node.js installed.
2. Copy the project to the server.
3. Run `npm install --production`.
4. Set environment variables.
5. Start with `npm start`, `pm2 start server.js`, or a `systemd` service.
