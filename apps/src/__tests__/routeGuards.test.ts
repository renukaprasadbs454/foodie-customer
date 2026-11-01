import {
  shouldShowAuthNavigator,
  shouldShowMainNavigator,
  shouldShowProfileCompletion,
  shouldShowSuspended,
} from '../navigation/routeGuards';

describe('routeGuards (P2-AUTH-01)', () => {
  it('shows Main only when authenticated, not isNewUser, and not isSuspended', () => {
    expect(shouldShowMainNavigator('authenticated', false)).toBe(true);
    expect(shouldShowMainNavigator('authenticated', false, false)).toBe(true);
    expect(shouldShowMainNavigator('authenticated', false, true)).toBe(false);
    expect(shouldShowMainNavigator('authenticated', true)).toBe(false);
    expect(shouldShowMainNavigator('unauthenticated')).toBe(false);
    expect(shouldShowMainNavigator('idle')).toBe(false);
  });

  it('shows ProfileCompletion when authenticated isNewUser and not suspended', () => {
    expect(shouldShowProfileCompletion('authenticated', true)).toBe(true);
    expect(shouldShowProfileCompletion('authenticated', true, false)).toBe(true);
    expect(shouldShowProfileCompletion('authenticated', true, true)).toBe(false);
    expect(shouldShowProfileCompletion('authenticated', false)).toBe(false);
  });

  it('shows Suspended only when authenticated and isSuspended', () => {
    expect(shouldShowSuspended('authenticated', true)).toBe(true);
    expect(shouldShowSuspended('authenticated', false)).toBe(false);
    expect(shouldShowSuspended('unauthenticated', true)).toBe(false);
    expect(shouldShowSuspended('idle', true)).toBe(false);
  });

  it('shows Auth when unauthenticated or idle', () => {
    expect(shouldShowAuthNavigator('unauthenticated')).toBe(true);
    expect(shouldShowAuthNavigator('idle')).toBe(true);
    expect(shouldShowAuthNavigator('authenticated')).toBe(false);
  });
});

