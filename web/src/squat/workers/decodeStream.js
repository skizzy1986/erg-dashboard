// Download-and-unpack, kept out of the worker file so it can be tested without
// one. Bytes are counted as they arrive (the progress bar) and streamed
// straight into the gzip decoder, so the compressed copy is never held whole.

/**
 * @param {ReadableStream<Uint8Array>} stream the response body
 * @param {number} total expected compressed bytes (progress denominator)
 * @param {(loaded: number, total: number) => void} [onProgress]
 * @returns {Promise<ArrayBuffer>} the decompressed bytes
 */
export async function decodeStream(stream, total, onProgress) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('DecompressionStream is not available.');
  }
  const ds = new DecompressionStream('gzip');
  // Start draining before writing: a writer awaiting backpressure with nobody
  // reading the other end never resolves.
  const out = new Response(ds.readable).arrayBuffer();
  // If a write fails first, `out` rejects too; it is awaited below only on
  // success, so mark it handled to keep that second rejection from surfacing
  // as unhandled. The write error is the one that is rethrown.
  out.catch(() => {});
  const writer = ds.writable.getWriter();
  const reader = stream.getReader();
  let loaded = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      loaded += value.byteLength;
      onProgress?.(loaded, total);
      await writer.write(value);
    }
    await writer.close();
  } catch (error) {
    writer.abort(error).catch(() => {});
    reader.cancel(error).catch(() => {});
    throw error;
  }
  return out;
}
