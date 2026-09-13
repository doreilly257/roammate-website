import { describe, it, expect } from 'vitest';
import { handoffQuery, consumeQuery } from '../../src/lib/search-handoff';
describe('private one-time query handoff', () => {
  it('bounds and consumes a query once, navigating only to a clean path', () => {
    const map = new Map<string,string>();
    const storage = { getItem: (k:string) => map.get(k) ?? null, setItem: (k:string,v:string) => {map.set(k,v);}, removeItem: (k:string) => {map.delete(k);} };
    let path = '';
    handoffQuery(' x'.repeat(400), () => storage, p => {path = p;});
    expect(path).toBe('/search/');
    expect(consumeQuery(() => storage).length).toBeLessThanOrEqual(200);
    expect(consumeQuery(() => storage)).toBe('');
    handoffQuery('   ', () => storage, p => {path = p;});
    expect(consumeQuery(() => storage)).toBe('');
  });
  it('survives storage denial without URL transport', () => {
    const denied = () => {throw new Error('denied');};
    expect(() => handoffQuery('private', denied, path => expect(path).toBe('/search/'))).not.toThrow();
    expect(consumeQuery(denied)).toBe('');
    expect(consumeQuery(() => ({getItem:()=> 'private',removeItem:denied}))).toBe('');
  });
});
