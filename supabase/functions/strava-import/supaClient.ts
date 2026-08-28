// supaClient.ts — the one place in this feature that VALUE-imports supabase-js.
//
// It is split out of importer.ts so that importer.ts can import SupabaseClient
// as a type only. Deno erases a type-only import without loading the module, so
// runImport can be driven by a fake `supa` in test.ts without the real client
// (and a reachable jsr registry) appearing anywhere in the test's module graph.
// Move createClient back into importer.ts and every runImport test stops being
// runnable offline.
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

/** Service-role client. Never constructed with the anon key. */
export function serviceClient(url: string, serviceKey: string): SupabaseClient {
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
