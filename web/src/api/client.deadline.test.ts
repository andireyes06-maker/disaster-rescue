import {it,expect,vi} from 'vitest';
vi.mock('../firebase-auth',()=>({getFirebaseAuth:()=>({currentUser:null})}));
import {api,ApiError,type ApiOptions} from './client';
it('a stalled mutation times out as uncertain and aborts its request',async()=>{
 vi.stubEnv('VITE_API_BASE_URL','http://audit.invalid/api');vi.useFakeTimers();let signal:AbortSignal|undefined;
 vi.stubGlobal('fetch',vi.fn((_url,init)=>{signal=init.signal;return new Promise(()=>{});}));
 try{
  const options:ApiOptions&{timeoutMs:number}={method:'POST',getToken:async()=> 'audit',timeoutMs:20};
  const outcome=api('/reports',options).catch((e:unknown)=>e);
  await vi.advanceTimersByTimeAsync(30);
  const error=await outcome;
  expect(error).toBeInstanceOf(ApiError);expect(error).toMatchObject({status:0,code:'timeout'});expect(signal?.aborted).toBe(true);
 }finally{vi.useRealTimers();vi.unstubAllGlobals();vi.unstubAllEnvs();}
});
