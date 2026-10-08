const transientCodes = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "ECONNREFUSED",
  "EHOSTUNREACH",
  "57P01",
  "53300",
]);

export function isTransientDatabaseError(error: unknown) {
  const code = (error as NodeJS.ErrnoException | null)?.code;
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return transientCodes.has(code ?? "") || /timeout expired|connection terminated unexpectedly|server closed the connection unexpectedly/.test(message);
}

export async function retryTransientDatabaseRead<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isTransientDatabaseError(error) || attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
    }
  }

  throw new Error("Database read failed.");
}