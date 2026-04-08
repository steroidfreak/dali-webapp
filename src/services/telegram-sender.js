// Central fault-alert dispatcher — single source of truth for all alerting.
// mqtt-bridge calls sendFaultAlert(); returns true if this was a NEW fault
// (edge trigger: ok → fault transition).

const { buildFaultAlert } = require('./telegram-notify');
const { sendFaultAlertEmail } = require('./email-notify');

let _bot = null;
const previousFaultStates = {};

function registerBot(bot) {
  _bot = bot;
}

function isFaulty(light) {
  return (
    light.lampFail || light.gearFail ||
    light.lightOpenCircuit || light.lightShortCircuit
  );
}

// Returns true if this is a NEW fault (was ok, now faulty)
function sendFaultAlert(light) {
  const addr = light.addr ?? 0;
  const wasFaulty = previousFaultStates[addr] || false;
  const nowFaulty = isFaulty(light);

  if (!wasFaulty && nowFaulty) {
    // Edge trigger: new fault detected
    const text = buildFaultAlert(light);

    // Telegram — fan out to all registered users via the bot singleton
    if (_bot && _bot.handleFaultAlert) {
      _bot.handleFaultAlert(light);
    }

    // Email (if configured)
    sendFaultAlertEmail(light).catch(() => {});
  }

  previousFaultStates[addr] = nowFaulty;
  return !wasFaulty && nowFaulty;
}

module.exports = { registerBot, sendFaultAlert };
