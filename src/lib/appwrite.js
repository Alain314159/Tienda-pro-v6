import { Client, Account, Databases, Storage, ID } from 'appwrite'

export const ENDPOINT = 'https://nyc.cloud.appwrite.io/v1'
export const PROJECT_ID = '6a88868a0013fb655590'
export const DB_ID = 'tiendapro'
export const COL_REG = 'registros'
export const BUCKET_ID = '6a8887f800073e890e6e'

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID)
export const account = new Account(client)
export const databases = new Databases(client)
export const storage = new Storage(client)
export { ID }
