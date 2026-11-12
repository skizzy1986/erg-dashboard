import { canonicalSquatUrl, isSquatPath } from '../squatRoute.js';
// The hash grammar moved to squat/utils/squatHash.js; its tests went with it.

describe('canonicalSquatUrl', () => {
  it('drops the trailing slash and keeps query and hash', () => {
    expect(
      canonicalSquatUrl({
        pathname: '/squat/',
        search: '?a=1',
        hash: '#paused',
      })
    ).toBe('/squat?a=1#paused');
    expect(canonicalSquatUrl({ pathname: '/squat/' })).toBe('/squat');
  });
  it('leaves every other path alone', () => {
    expect(canonicalSquatUrl({ pathname: '/squat' })).toBeNull();
    expect(canonicalSquatUrl({ pathname: '/' })).toBeNull();
  });
});

describe('isSquatPath', () => {
  it('matches /squat with and without the trailing slash', () => {
    expect(isSquatPath('/squat')).toBe(true);
    expect(isSquatPath('/squat/')).toBe(true);
  });

  it('does not match the dashboard or look-alikes', () => {
    expect(isSquatPath('/')).toBe(false);
    expect(isSquatPath('/squats')).toBe(false);
    expect(isSquatPath('/squat/extra')).toBe(false);
    expect(isSquatPath('/SQUAT')).toBe(false);
  });
});
