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

const {subscriptionService}=require('../src/app/modules/subscription/subscription.service')
const {stripeService}=require('../src/app/modules/subscription/stripe.service')
test('checkout verification cannot claim another account session',async()=>{
 mock.method(stripeService,'getCheckoutSession',async()=>({metadata:{userId:other},status:'complete',payment_status:'paid'}))
 await assert.rejects(subscriptionService.verifyCheckoutEntitlement(owner,'cs_fixture'),/another account/)
})
test('pending checkout does not write a subscription or grant premium',async()=>{
 mock.method(stripeService,'getCheckoutSession',async()=>({metadata:{userId:owner},status:'open',payment_status:'unpaid'}))
 mock.method(subscriptionService,'getEntitlement',async()=>null)
 mock.method(Subscription,'findOneAndUpdate',async()=>assert.fail('pending purchase was activated'))
 const result=await subscriptionService.verifyCheckoutEntitlement(owner,'cs_fixture')
 assert.equal(result.state,'pending')
 assert.equal(result.entitlement,null)
})
test('completed trial is reconciled from provider data without a payment-row dependency',async()=>{
 const start=Math.floor(Date.now()/1000),end=start+86400
 mock.method(stripeService,'getCheckoutSession',async()=>({id:'cs_trial',created:start,status:'complete',payment_status:'no_payment_required',mode:'subscription',customer:'cus_fixture',subscription:'sub_fixture',metadata:{userId:owner,planId,priceId:'price_fixture'},line_items:{data:[{price:{id:'price_fixture'}}]}}))
 mock.method(stripeService,'getSubscription',async()=>({id:'sub_fixture',status:'trialing',customer:'cus_fixture',metadata:{userId:owner},trial_start:start,current_period_start:start,current_period_end:end,items:{data:[{price:{id:'price_fixture'}}]}}))
 mock.method(subscriptionService,'getPlanById',async()=>({_id:planId,interval:'month',stripePriceId:'price_fixture'}))
 mock.method(subscriptionService,'getEntitlement',async()=>null)
 let saved,user
 mock.method(Subscription,'findOneAndUpdate',async(filter,update)=>{saved=update.$set})
 mock.method(User,'findByIdAndUpdate',async(id,update)=>{user=update.$set})
 const result=await subscriptionService.verifyCheckoutEntitlement(owner,'cs_trial')
 assert.equal(result.state,'complete')
 assert.equal(saved.status,'trialing')
 assert.equal(saved.currentPeriodEnd.getTime(),end*1000)
 assert.equal(user.trialUsed,true)
})
test('lifetime checkout verification replay keeps the original purchase expiry',async()=>{
 const created=1700000000
 mock.method(stripeService,'getCheckoutSession',async()=>({id:'cs_lifetime',created,status:'complete',payment_status:'paid',mode:'payment',customer:'cus_fixture',metadata:{userId:owner,planId},line_items:{data:[{price:{id:'price_fixture'}}]}}))
 mock.method(subscriptionService,'getPlanById',async()=>({_id:planId,interval:'lifetime',stripePriceId:'price_fixture'}))
 mock.method(subscriptionService,'getEntitlement',async()=>null)
 const saved=[]
 mock.method(Subscription,'findOneAndUpdate',async(filter,update)=>{saved.push(update.$set.currentPeriodEnd)})
 mock.method(User,'findByIdAndUpdate',async()=>{})
 await subscriptionService.verifyCheckoutEntitlement(owner,'cs_lifetime')
 await subscriptionService.verifyCheckoutEntitlement(owner,'cs_lifetime')
 assert.equal(saved[0].getTime(),saved[1].getTime())
 assert.equal(saved[0].getFullYear(),new Date(created*1000).getFullYear()+100)
})
test('trialing is accepted by the persisted subscription schema',()=>{
 const document=new Subscription({userId:owner,planId,stripeCustomerId:'fixture',stripeSubscriptionId:'fixture',stripePriceId:'fixture',status:'trialing',currentPeriodStart:new Date(),currentPeriodEnd:expiry})
 assert.equal(document.validateSync(),undefined)
})

const {isCompleteSurah}=require('../src/app/modules/quran/quran-completeness')
test('partial, duplicate, missing-Arabic or blank-translation surahs are not considered complete',()=>{const rows=Array.from({length:7},(_,i)=>({ayah:i+1,arabicText:'\u0627',text:'Translation'}));assert.equal(isCompleteSurah(rows,7),true);assert.equal(isCompleteSurah(rows.slice(0,6),7),false);assert.equal(isCompleteSurah([...rows.slice(0,6),rows[0]],7),false);assert.equal(isCompleteSurah(rows.map(row=>({...row,arabicText:'not Arabic'})),7),false);assert.equal(isCompleteSurah(rows.map(row=>({...row,text:''})),7),false)})

const {PremiumBenefit}=require('../src/app/modules/subscription/subscription-plan.model')
test('premium benefit API resolves requested translations and labels their language',async()=>{mock.method(PremiumBenefit,'find',()=>({sort(){return this},lean:async()=>[{serialNumber:1,text:'Default',defaultLanguage:'en',translations:{bn:'Localized'}}]}));const localized=await subscriptionService.getAllPremiumBenefits('bn');assert.equal(localized[0].text,'Localized');assert.equal(localized[0].language,'bn');const defaultText=await subscriptionService.getAllPremiumBenefits('de');assert.equal(defaultText[0].text,'Default');assert.equal(defaultText[0].language,'en')})

const {seedPremiumBenefits}=require('../src/app/modules/subscription/subscription.seed')
test('startup preserves published premium benefits and translations',async()=>{mock.method(PremiumBenefit,'exists',async()=>({_id:planId}));mock.method(PremiumBenefit,'deleteMany',async()=>assert.fail('existing benefits deleted'));mock.method(PremiumBenefit,'insertMany',async()=>assert.fail('existing benefits overwritten'));await seedPremiumBenefits()})

const {publishedContentFilter}=require('../src/app/modules/offline-pack/content-publication')
test('publication rejects blank content and mislabeled Bengali bodies without hiding source records',()=>{const en=publishedContentFilter('hadith','en');assert.equal(en.translation.test(''),false);assert.equal(en.translation.test('Readable'),true);const bn=publishedContentFilter('book','bn');assert.equal(bn.content.test('German body'),false);assert.equal(bn.content.test(String.fromCharCode(0x985)),true);assert.equal(bn.lang,'bn');assert.equal(bn.isActive.$ne,false)})

const {TafsirService}=require('../src/app/modules/tafsir/tafsir.service')
const {Tafsir}=require('../src/app/modules/tafsir/tafsir.model')
test('direct Bengali Tafsir reads apply the same publication rules as snapshots',async()=>{let filter;mock.method(Tafsir,'findOne',value=>{filter=value;return{lean:async()=>null}});assert.equal(await TafsirService.getTafsir(1,1,'fixture','bn'),null);assert.equal(filter.text.test('German body'),false);assert.equal(filter.text.test(String.fromCharCode(0x985)),true)})

const {KnowledgeLibraryController}=require('../src/app/modules/knowledge-library/knowledge-library.controller')
const {KnowledgeLibraryServices}=require('../src/app/modules/knowledge-library/knowledge-library.service')
test('dashboard book requests retain source-record visibility through the controller',async()=>{let options;mock.method(KnowledgeLibraryServices,'getAllBooks',async(lang,page,limit,opts)=>{options=opts;return{meta:{},data:[]}});const res={status(){return this},json(){}};await KnowledgeLibraryController.getAllBooks({query:{lang:'bn',includeUnavailable:'true'}},res,error=>{throw error});assert.equal(options.includeUnavailable,true)})

const {completeEditionKeys}=require('../src/app/modules/quran/available-editions')
const {SURAH_LIST}=require('../src/app/modules/quran/quran.constants')
test('selectable Quran editions require complete readable data for all canonical Surahs',()=>{const rows=SURAH_LIST.map(s=>({_id:{edition:'ready',lang:'en',surah:s.number},count:s.numberOfAyahs,valid:s.numberOfAyahs,first:1,last:s.numberOfAyahs}));assert.deepEqual(completeEditionKeys(rows),['ready']);assert.deepEqual(completeEditionKeys(rows.slice(0,113)),[]);assert.deepEqual(completeEditionKeys(rows.map((r,i)=>i===0?{...r,valid:6}:r)),[]);assert.deepEqual(completeEditionKeys(rows.map((r,i)=>i===0?{...r,_id:{...r._id,lang:'bn'}}:r)),[])})

const {hasAllContentModules,REQUIRED_CONTENT_MODULES}=require('../src/app/modules/offline-pack/content-availability')
test('language eligibility requires valid data in every content section',()=>{const complete=Object.fromEntries(REQUIRED_CONTENT_MODULES.map(name=>[name,1]));assert.equal(hasAllContentModules(complete),true);for(const name of REQUIRED_CONTENT_MODULES){assert.equal(hasAllContentModules({...complete,[name]:0}),false,'missing '+name)}})
test('Quran sync request validation preserves pagination beyond the first page',()=>{
 const {QuranValidations}=require('../src/app/modules/quran/quran.validation')
 const {query}=QuranValidations.downloadSyncValidationSchema.parse({query:{edition:'german_bubenheim',fromVersion:'0',page:'2',limit:'1000'}})
 assert.equal(query.page,'2');assert.equal(query.limit,'1000')
 assert.throws(()=>QuranValidations.downloadSyncValidationSchema.parse({query:{edition:'en',page:'0'}}))
})
