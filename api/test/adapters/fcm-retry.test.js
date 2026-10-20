import { it, expect } from 'vitest';
import { createFcmSender } from '../../src/adapters/fcmSender.js';
it('propagates transient per-token failures so durable work is not acknowledged',async()=>{
 const sender=createFcmSender({sendEachForMulticast:async()=>({responses:[{success:false,error:{code:'messaging/server-unavailable'}}]})});
 await expect(sender.send(['fictional-token'],{title:'New report',body:'A report'})).rejects.toThrow('retry');
});
it('still returns permanently invalid tokens for removal',async()=>{
 const sender=createFcmSender({sendEachForMulticast:async()=>({responses:[{success:false,error:{code:'messaging/registration-token-not-registered'}}]})});
 expect(await sender.send(['fictional-dead-token'],{title:'New report',body:'A report'})).toEqual({failedTokens:['fictional-dead-token']});
});
