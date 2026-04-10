import { patchBrokenServerStorage } from '@/lib/storage-polyfill';

export async function register() {
  patchBrokenServerStorage();
}