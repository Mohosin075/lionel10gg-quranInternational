require('ts-node/register/transpile-only')
const {test,afterEach,mock}=require('node:test')
const assert=require('node:assert/strict')
const {User}=require('../src/app/modules/user/user.model')
const {InAppPurchase}=require('../src/app/modules/in-app-purchase/in-app-purchase.model')
const {InAppPurchasePlan}=require('../src/app/modules/in-app-purchase/in-app-purchase-package.model')
const {nativeIapService}=require('../src/app/modules/in-app-purchase/native-iap.service')
const {inAppPurchaseService}=require('../src/app/modules/in-app-purchase/in-app-purchase.service')
const {Hadith}=require('../src/app/modules/hadith/hadith.model')
const {HadithServices}=require('../src/app/modules/hadith/hadith.service')
const {getContentSnapshot}=require('../src/app/modules/offline-pack/content-snapshot')
const {Subscription}=require('../src/app/modules/subscription/subscription.model')
const {applyReadingEvents,readingSyncSchema}=require('../src/app/modules/user/reading-sync')
const {appConfigSchema}=require('../src/app/modules/app-config/app-config.validation')
afterEach(()=>mock.restoreAll())
const owner='507f1f77bcf86cd799439011', other='507f1f77bcf86cd799439012', planId='507f1f77bcf86cd799439013'
const expiry=new Date(Date.now()+86400000)
function receipt(existing=null) {
 mock.method(User,'findById',async()=>({_id:owner}))
 mock.method(InAppPurchasePlan,'findById',async()=>({_id:planId,isActive:true,googleProductId:'monthly',interval:'year'}))
 mock.method(nativeIapService,'verifyGoogleReceipt',async()=>({isValid:true,productId:'monthly',transactionId:'transaction-1',purchaseDate:new Date(),expiryDate:expiry}))
 mock.method(InAppPurchase,'findOne',async()=>existing)
 let activated=0
 mock.method(User,'findByIdAndUpdate',async()=>{activated++})
 return ()=>activated
}
const request={planId,platform:'android',productId:'monthly',receiptData:'synthetic'}
test('receipt owned by another account is rejected without granting premium',async()=>{
 const activated=receipt({userId:owner,planId,platform:'android'})
 await assert.rejects(inAppPurchaseService.verifyPurchase(other,request),/another account/)
 assert.equal(activated(),0)
})
test('client product cannot be substituted for a different catalog SKU',async()=>{
 const activated=receipt()
 await assert.rejects(inAppPurchaseService.verifyPurchase(owner,{...request,productId:'cheap'}),/not configured/)
 assert.equal(nativeIapService.verifyGoogleReceipt.mock.callCount(),0)
 assert.equal(activated(),0)
})
test('store expiry is authoritative and same-owner replay does not extend it',async()=>{
 const existing={userId:owner,planId,platform:'android',save:async()=>{}}
 const activated=receipt(existing)
 await inAppPurchaseService.verifyPurchase(owner,request)
 assert.equal(existing.expiryDate.getTime(),expiry.getTime())
 assert.equal(activated(),1)
})
test('expired and incomplete store verification cannot grant access',async()=>{
 const activated=receipt()
 nativeIapService.verifyGoogleReceipt.mock.mockImplementation(async()=>({isValid:true,productId:'monthly',transactionId:'t',expiryDate:new Date(0)}))
 await assert.rejects(inAppPurchaseService.verifyPurchase(owner,request),/expired/)
 assert.equal(activated(),0)
})
test('a concurrent duplicate purchase insert cannot grant the losing account access',async()=>{
 const activated=receipt()
 mock.method(InAppPurchase,'create',async()=>{throw Object.assign(new Error('duplicate'),{code:11000})})
 await assert.rejects(inAppPurchaseService.verifyPurchase(owner,request),/already been processed/)
 assert.equal(activated(),0)
})
test('low-version edits, creates and deletes change the content checkpoint',async()=>{
 let rows=[{_id:'a',version:5,updatedAt:'2026-10-01'},{_id:'b',version:1,updatedAt:'2026-09-01'}]
 mock.method(Hadith,'aggregate',async()=>rows)
 const before=await HadithServices.getVersion('en')
 rows=[rows[0],{...rows[1],version:2,updatedAt:'2026-10-02'}]
 assert.equal((await HadithServices.checkSyncMetadata('en',before)).updateAvailable,true)
 const edited=await HadithServices.getVersion('en')
 rows=[...rows,{_id:'c',version:1,updatedAt:'2026-10-02'}]
 assert.notEqual(await HadithServices.getVersion('en'),edited)
 const created=await HadithServices.getVersion('en')
 rows=rows.slice(0,2)
 assert.notEqual(await HadithServices.getVersion('en'),created)
})
test('snapshot rejects a changed revision instead of publishing inconsistent pages',async()=>{
 mock.method(Hadith,'aggregate',async()=>[{_id:'a',version:1}])
 let output,error
 await getContentSnapshot({params:{module:'hadith'},query:{lang:'en',revision:'old'}},{json:value=>{output=value}},value=>{error=value})
 assert.equal(error.statusCode,409)
 assert.equal(output,undefined)
})
test('trialing is included in the active entitlement query with expiry enforcement',async()=>{
 let filter
 mock.method(Subscription,'findOne',value=>{filter=value;return {populate:async()=>null}})
 await Subscription.findActiveByUserId(owner)
 assert.ok(filter.status.$in.includes('trialing'))
 assert.ok(filter.$or.some(item=>item.currentPeriodEnd?.$gt instanceof Date))
})
test('Hasanat replay uses one atomic deduplicating increment for every event ID',async()=>{
 const seen=new Set();let total=0
 mock.method(User,'updateOne',async(filter,update)=>{
   assert.equal(filter._id,owner)
   const id=filter.hasanatEventIds.$ne
   if(!seen.has(id)){seen.add(id);total+=update.$inc.totalHasanat}
 })
 const event={id:'reading-event-1',kind:'hasanat',payload:{amount:100}}
 await applyReadingEvents(owner,{events:[event,event]})
 await applyReadingEvents(owner,{events:[event]})
 assert.equal(total,100)
})
test('invalid outbox batches and malformed reminder time fail validation',()=>{
 assert.equal(readingSyncSchema.safeParse({events:[{id:'event-invalid',kind:'hasanat',payload:{amount:-3}}]}).success,false)
 assert.equal(readingSyncSchema.safeParse({events:[{id:'event-invalid',kind:'bookmark',payload:{surahNumber:1,ayahNumber:1}}]}).success,false)
 assert.equal(appConfigSchema.safeParse({dailyReminder:{time:'28:90'}}).success,false)
 assert.equal(appConfigSchema.safeParse({maintenanceMode:{minAppVersion:'1.2.0'}}).success,true)
})
