const test = require('node:test');
const assert = require('node:assert/strict');
require('ts-node/register/transpile-only');
const {getReportWindow} = require('../src/app/modules/dashboard/report-range.ts');

test('report windows include today and handle a leap-day month in UTC', () => {
 const week = getReportWindow('7d', new Date('2024-03-01T23:00:00Z'));
 assert.equal(week.start.toISOString(), '2024-02-24T00:00:00.000Z');
 assert.equal(week.end.toISOString(), '2024-03-02T00:00:00.000Z');
 const month = getReportWindow('month', new Date('2024-02-29T12:00:00Z'));
 assert.equal(month.start.toISOString(), '2024-02-01T00:00:00.000Z');
 assert.equal((month.end - month.start) / 86400000, 29);
 const thirty = getReportWindow('30d', new Date('2026-01-01T00:05:00Z'));
 assert.equal(thirty.start.toISOString(), '2025-12-03T00:00:00.000Z');
});

test('admin content lists retain the requested language and escape literal searches', async () => {
 const {KnowledgeArticle} = require('../src/app/modules/knowledge-library/knowledge-library.model.ts');
 const {KnowledgeLibraryServices} = require('../src/app/modules/knowledge-library/knowledge-library.service.ts');
 const originalCount = KnowledgeArticle.countDocuments, originalFind = KnowledgeArticle.find;
 const queries = [];
 KnowledgeArticle.countDocuments = async query => query.lang === 'bn' ? 0 : 10;
 KnowledgeArticle.find = query => {queries.push(query); const chain = {sort: () => chain, skip: () => chain, limit: () => chain, lean: async () => []}; return chain;};
 try {
   const result = await KnowledgeLibraryServices.getAllArticles('bn', 'Unknown', 2, 20, {strictLang: true, searchTerm: 'a.*'});
   assert.equal(result.data.length, 0);
   assert.equal(queries.length, 1);
   assert.equal(queries[0].lang, 'bn');
   assert.equal(queries[0].$and[0].$or[0].title.test('abc'), false);
   assert.equal(queries[0].$and[0].$or[0].title.test('a.*'), true);
 } finally {KnowledgeArticle.countDocuments = originalCount; KnowledgeArticle.find = originalFind;}
});
