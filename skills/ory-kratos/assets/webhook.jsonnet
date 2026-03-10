// Webhook payload template for registration hook
// This is sent to your external API when a user registers

local claims = std.extVar('identity');

{
  user_id: claims.id,
  email: claims.traits.email,
  created_at: claims.created_at,
  
  [if 'name' in claims.traits then 'name']: claims.traits.name,
  [if 'newsletter' in claims.traits then 'newsletter']: claims.traits.newsletter
}
