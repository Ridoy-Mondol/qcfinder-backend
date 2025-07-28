const sessionLocks = {};

async function withLock(sessionKey, fn) {
  while (sessionLocks[sessionKey]) {
    await new Promise((res) => setTimeout(res, 100));
  }

  sessionLocks[sessionKey] = true;

  try {
    return await fn();
  } finally {
    sessionLocks[sessionKey] = false;
  }
}

module.exports = { withLock };
