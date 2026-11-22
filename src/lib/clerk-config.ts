export const isClerkConfigured = (): boolean => {
  const pubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() ?? "";
  const secretKey = process.env.CLERK_SECRET_KEY?.trim() ?? "";

  const hasValidPub =
    (pubKey.startsWith("pk_test_") || pubKey.startsWith("pk_live_")) &&
    !pubKey.includes("replace_with");
  const hasValidSecret =
    (secretKey.startsWith("sk_test_") || secretKey.startsWith("sk_live_")) &&
    !secretKey.includes("replace_with");

  return hasValidPub && hasValidSecret;
};
