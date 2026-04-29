import PocketBase from 'pocketbase'

export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)

// Auto-cancel pending requests on auth change
pb.autoCancellation(false)
