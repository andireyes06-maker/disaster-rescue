import {createHash} from 'node:crypto';
import {readFileSync,readdirSync,lstatSync} from 'node:fs';
import path from 'node:path';
// Hash the actual web inputs, not branch names or the presence of one sentence.
// Excludes generated captures, credentials, caches and dependency installation paths.
export function sourceFingerprint(root) {
 const files=[];
 function walk(relative){const full=path.join(root,relative);for(const entry of readdirSync(full).sort()){if(entry.startsWith('.')||entry==='node_modules'||entry==='dist')continue;const name=path.join(relative,entry);const stat=lstatSync(path.join(root,name));if(stat.isSymbolicLink())continue;if(stat.isDirectory())walk(name);else if(stat.isFile())files.push(name);}}
 walk('src');walk('public');
 for(const file of ['index.html','package.json','package-lock.json','vite.config.js','scripts/source-identity.mjs'])files.push(file);
 const hash=createHash('sha256');for(const file of files.sort()){hash.update(file.replaceAll(path.sep,'/'));hash.update('\0');hash.update(readFileSync(path.join(root,file)));hash.update('\0');}return hash.digest('hex');
}
export function sourceIdentityPlugin(root){return{name:'rescue-source-identity',configureServer(server){server.middlewares.use('/build-identity.json',(_req,res)=>{res.setHeader('content-type','application/json');res.setHeader('cache-control','no-store');res.end(JSON.stringify({fingerprint:sourceFingerprint(root)}));});},generateBundle(){this.emitFile({type:'asset',fileName:'build-identity.json',source:JSON.stringify({fingerprint:sourceFingerprint(root)})});}};}
