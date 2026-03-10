// Maps Google OAuth claims to identity traits
// Available variables:
// - claims: The ID token claims from Google
// - raw_claims: The raw JSON object

local claims = std.extVar('claims');

{
  identity: {
    traits: {
      // Required: email
      [if 'email' in claims then 'email']: claims.email,
      
      // Optional: name
      [if 'given_name' in claims then 'name']: {
        first: claims.given_name,
        [if 'family_name' in claims then 'last']: claims.family_name
      },
      
      // Optional: avatar URL
      [if 'picture' in claims then 'avatar']: claims.picture,
      
      // Optional: locale
      [if 'locale' in claims then 'locale']: claims.locale
    }
  }
}
