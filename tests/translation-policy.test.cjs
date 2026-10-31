require('ts-node/register/transpile-only')
const {test}=require('node:test'), assert=require('node:assert/strict')
const {translationSourceLanguage,parseTranslationResponse,assertFullTranslationInput}=require('../src/app/modules/offline-pack/translation-policy')
const result=(text,finish_reason='stop')=>({response:{status_code:200,body:{choices:[{finish_reason,message:{content:text}}]}}})
test('translation sources use a single original language per module',()=>{
 assert.equal(translationSourceLanguage('book'),'de');assert.equal(translationSourceLanguage('knowledge'),'de');assert.equal(translationSourceLanguage('tafsir'),'ar');assert.equal(translationSourceLanguage('dua'),'en')
})
test('translation importer rejects truncated, refused and malformed content',()=>{
 assert.throws(()=>parseTranslationResponse('book',result('TITLE: Titel\nCONTENT: body','length')))
 assert.throws(()=>parseTranslationResponse('book',result('TITLE: Titel\nCONTENT: ')))
 assert.throws(()=>parseTranslationResponse('book',result('A body with no structural markers')))
 const refused=result('TITLE: Titel\nCONTENT: body');refused.response.body.choices[0].message.refusal='refused';assert.throws(()=>parseTranslationResponse('book',refused))
 assert.deepEqual(parseTranslationResponse('book',result('TITLE: Titel\nCONTENT: Full paragraph one.\n\nFull paragraph two.')),{TITLE:'Titel',CONTENT:'Full paragraph one.\n\nFull paragraph two.'})
})
test('large translation input fails before submission instead of silently cutting content',()=>{
 assert.doesNotThrow(()=>assertFullTranslationInput('complete body','1'))
 assert.throws(()=>assertFullTranslationInput('x'.repeat(6001),'book-1'),/complete manual translation/)
})
