import test from 'node:test';
import assert from 'node:assert/strict';
import {assess,questions} from '../check-in.js';
import {shelves} from '../reading-shelves.js';
test('five shelves with 50 distinct attributed cards each',()=>{
  assert.equal(Object.keys(shelves).length,5);
  const texts=new Set();
  for(const shelf of Object.values(shelves)){
    assert.equal(shelf.length,50);
    for(const [text,source,url] of shelf){assert.ok(source);assert.match(url,/^https:/);texts.add(text);}
  }
  assert.equal(texts.size,250);
});
test('12 questions; unanswered items do not become resources; preference is separate',()=>{
  assert.equal(new Set(questions.map(q=>q[0])).size,12);
  assert.equal(assess({}).answered.length,0);
  const result=assess({sleep:2,focus:1,rest:0,next:2,mood:12});
  assert.deepEqual([result.answered.length,result.load.length,result.mixed.length,result.resources.length],[4,1,1,1]);
  assert.match(result.next,/разговор/);
});
