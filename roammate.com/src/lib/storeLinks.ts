/**
 * App store links with campaign attribution on BOTH platforms.
 *
 * iOS has always carried Apple Campaign tokens (pt/ct). Google Play links were bare,
 * so roughly half of all installs could not be attributed to any page or campaign.
 * Play carries attribution in a single `referrer` parameter whose value is itself a
 * URL-encoded query string, read by the Play Install Referrer API on first launch.
 *
 * Both builders take the SAME campaign token, so iOS `ct` and Android `utm_campaign`
 * line up and the two platforms can be compared directly.
 */

const APP_STORE_ID = '6758834253';
const DEFAULT_PT = '118224460';
const PLAY_PACKAGE = 'com.roammate.app.android';

export function appStoreUrl(campaign: string, pt: string = DEFAULT_PT): string {
  return `https://apps.apple.com/app/id${APP_STORE_ID}?pt=${pt}&ct=${campaign}&mt=8`;
}

export function playStoreUrl(campaign: string): string {
  // Encoded as one unit: Play expects `referrer` to be a single percent-encoded value.
  const referrer = encodeURIComponent(
    `utm_source=roammate.com&utm_medium=web&utm_campaign=${campaign}`
  );
  return `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}&referrer=${referrer}`;
}
