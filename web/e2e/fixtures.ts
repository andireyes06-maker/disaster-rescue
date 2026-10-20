import {test as base,expect} from '@playwright/test';
import {fileURLToPath} from 'node:url';
import {sourceFingerprint} from '../scripts/source-identity.mjs';
const root=fileURLToPath(new URL('..',import.meta.url));
export const test=base.extend<{sourceIdentity:void}>({sourceIdentity:[async({baseURL,request},use)=>{
 expect(baseURL,'An explicit baseURL is required').toBeTruthy();
 const response=await request.get(new URL('/build-identity.json',baseURL!).href);
 expect(response.ok(),'Refusing an unknown server without build identity').toBe(true);
 expect((await response.json()).fingerprint,'Server source does not match this checkout').toBe(sourceFingerprint(root));
 await use();
},{auto:true}]});
export {expect};

export type {Page} from '@playwright/test';
