/** Bound the complete SDK operation, including session locks and response parsing. */
export async function accountDeadline(operation) {
  let timer;
  try {
    return await Promise.race([
      operation,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Error('Llogaria po vonohet.')), 12000);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}

export const accountSession = (client) => accountDeadline(client.auth.getSession());
