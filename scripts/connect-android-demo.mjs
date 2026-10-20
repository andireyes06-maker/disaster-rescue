#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
const adb=process.env.RESCUE_ADB_BIN||'adb';
function exec(args){const r=spawnSync(adb,args,{encoding:'utf8'});if(r.error)throw r.error;if(r.status!==0)throw Error(r.stderr||r.stdout||'adb failed');return r.stdout;}
try{
 const devices=exec(['devices']).split('\n').slice(1).map(x=>x.trim().split(/\s+/)).filter(x=>x[1]==='device').map(x=>x[0]);
 const arg=process.argv.indexOf('--device');const serial=arg>=0?process.argv[arg+1]:(devices.length===1?devices[0]:null);
 if(!serial||!devices.includes(serial))throw Error('Connect and authorize one Android phone/emulator, or choose --device SERIAL. No device was changed.');
 const apkArg=process.argv.indexOf('--apk');const apk=resolve(apkArg>=0?process.argv[apkArg+1]:'artifacts/Rescue-Reports-USB-Test.apk');
 if(!existsSync(apk))throw Error('APK not found: '+apk+'. Build it with scripts/build-android-demo.sh, or pass --apk.');
 for(const port of [3407,9407,8407])console.log(exec(['-s',serial,'reverse',`tcp:${port}`,`tcp:${port}`]).trim());
 console.log(exec(['-s',serial,'install','-r',apk]));
 console.log(exec(['-s',serial,'shell','am','start','-n','local.rescuereports.app/.MainActivity']));
 console.log('Local demo installed. Keep USB and the submission demo stack running.');
}catch(e){console.error(e.message);process.exitCode=1;}
