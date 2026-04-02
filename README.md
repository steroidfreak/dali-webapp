# DALI Service Studio

Express-based website scaffold with:

- a DALI Control service page backed by MQTT and Socket.IO
- a Document Generator service page with a simple demo
- a YouTube Transcription service page with a simple demo
- markdown-driven service and blog content
- a blog section ready for new posts

## Run locally

```bash
npm install
npm start
```

The app starts on `PORT` or `3000`.

## Environment variables

- `PORT`: HTTP port for the site
- `MQTT_BROKER`: MQTT broker URL for the DALI bridge
- `NUM_LIGHTS`: number of DALI lights shown in the demo

## Content updates

- Edit service page copy in `content/services/*.md`
- Add new blog posts in `content/blog/*.md`

## DigitalOcean deployment notes

1. Create a droplet with Node.js installed.
2. Copy the project to the server.
3. Run `npm install --production`.
4. Set `PORT`, `MQTT_BROKER`, and `NUM_LIGHTS`.
5. Start with `npm start`, `pm2 start server.js`, or a `systemd` service.
