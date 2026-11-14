export const SETUP_NAMEDROP_CTA = "Set Up NameDrop";

export const NAMEDROP_APPLE_NOTICE =
  "NameDrop is an Apple feature. Your CeleYou link can be saved in your iPhone contact card, but Apple determines which details are transferred.";

export const SAVE_CONTACT_IOS_HINT =
  "On iPhone, Safari can open Add to Contacts. Choose Create New Contact or update an existing one. If a file downloads instead, open it from Files and tap Add.";

export const SAVE_CONTACT_ANDROID_HINT =
  "On Android, the contact file opens in Contacts or downloads to Files. Open the .vcf and choose Add to contacts.";

export const SAVE_CONTACT_DESKTOP_HINT =
  "The contact file downloads as a .vcf. Open it in Contacts, People, or Outlook. Then copy the CeleYou website into your phone if you want it on NameDrop.";

export const SHARE_CONTACT_FILE_HINT =
  "This shares the contact file through the phone’s own share sheet. AirDrop or Quick Share can appear there. CeleYou cannot pick a nearby phone or finish the transfer for you.";

export const NAMEDROP_STEPS = [
  "Download your CeleYou contact.",
  "Open it in iPhone Contacts.",
  "Confirm the CeleYou website appears on the contact.",
  "Set this contact as your personal card in Contacts.",
  "On iPhone, turn on Bringing Devices Together in AirDrop settings.",
  "Use Apple’s NameDrop with another compatible iPhone.",
] as const;

export function namedropClaimsUrlTransfer(): false {
  return false;
}

export function contactSaveHint(platform: "ios-safari" | "android-chrome" | "android-other" | "desktop" | "unknown"): string {
  if (platform === "ios-safari") return SAVE_CONTACT_IOS_HINT;
  if (platform === "android-chrome" || platform === "android-other") return SAVE_CONTACT_ANDROID_HINT;
  return SAVE_CONTACT_DESKTOP_HINT;
}

export function contactSaveHintKey(
  platform: "ios-safari" | "android-chrome" | "android-other" | "desktop" | "unknown"
): "celeyou.save_hint_ios" | "celeyou.save_hint_android" | "celeyou.save_hint_desktop" {
  if (platform === "ios-safari") return "celeyou.save_hint_ios";
  if (platform === "android-chrome" || platform === "android-other") return "celeyou.save_hint_android";
  return "celeyou.save_hint_desktop";
}

export function namedropGuidance(): {
  title: string;
  notice: string;
  steps: readonly string[];
  limit: string;
} {
  return {
    title: SETUP_NAMEDROP_CTA,
    notice: NAMEDROP_APPLE_NOTICE,
    steps: NAMEDROP_STEPS,
    limit:
      "CeleYou cannot insert a website into NameDrop or guarantee Apple will send that field. Save Contact and AirDrop of the profile link remain the reliable paths.",
  };
}
