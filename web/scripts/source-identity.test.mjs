import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {sourceFingerprint} from './source-identity.mjs';
test('source identity changes for real input edits and ignores generated credentials/cache',()=>{
 const root=mkdtempSync(path.join(tmpdir(),'rescue-identity-'));
 try{for(const folder of ['src','public','scripts'])mkdirSync(path.join(root,folder));for(const name of ['src/app.ts','index.html','package.json','package-lock.json','vite.config.js','scripts/source-identity.mjs'])writeFileSync(path.join(root,name),'before');const first=sourceFingerprint(root);writeFileSync(path.join(root,'.env.local'),'not-read');assert.equal(sourceFingerprint(root),first);writeFileSync(path.join(root,'src/app.ts'),'after');assert.notEqual(sourceFingerprint(root),first);}finally{rmSync(root,{recursive:true,force:true});}
});
