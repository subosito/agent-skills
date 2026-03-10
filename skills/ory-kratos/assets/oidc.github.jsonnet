// Maps GitHub OAuth claims to identity traits
// Available variables:
// - claims: The user info claims from GitHub
// - raw_claims: The raw JSON object

local claims = std.extVar('claims');

{
  identity: {
    traits: {
      // Email (may need to be fetched separately depending on scope)
      [if 'email' in claims && claims.email != '' then 'email']: claims.email,
      
      // Name parsing (GitHub provides a single name field)
      [if 'name' in claims && claims.name != '' then 'name']: {
        // Try to split full name into first/last
        first: std.split(claims.name, ' ')[0],
        [if std.length(std.split(claims.name, ' ')) > 1 then 'last']: 
          std.join(' ', std.slice(std.split(claims.name, ' '), 1, std.length(std.split(claims.name, ' ')), 1))
      },
      
      // GitHub username
      [if 'login' in claims then 'username']: claims.login,
      
      // Avatar URL
      [if 'avatar_url' in claims then 'avatar']: claims.avatar_url,
      
      // GitHub profile URL
      [if 'html_url' in claims then 'github_url']: claims.html_url
    }
  }
}
