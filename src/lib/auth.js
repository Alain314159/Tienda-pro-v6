import { account } from './appwrite'
import { ID } from 'appwrite'

export async function registrar(email, password, nombre) {
  await account.create(ID.unique(), email, password, nombre)
  return await login(email, password)
}
export async function login(email, password) {
  await account.createEmailPasswordSession(email, password)
  return await account.get()
}
export async function sesionActual() {
  try { return await account.get() } catch (e) { return null }
}
export async function logout() {
  try { await account.deleteSession('current') } catch (e) {}
  salirModoLocal()
}
export const esModoLocal = () => localStorage.getItem('tp6_modo') === 'local'
export function entrarModoLocal() { localStorage.setItem('tp6_modo', 'local') }
export function salirModoLocal() { localStorage.removeItem('tp6_modo') }
